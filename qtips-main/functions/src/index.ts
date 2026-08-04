import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import Stripe from "stripe";

admin.initializeApp();
const db = admin.firestore();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key);
}

function getAppUrl(): string {
  return process.env.APP_URL ?? "https://qtips-main.vercel.app";
}

function setCors(res: functions.Response): void {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function verifyFirebaseToken(
  req: functions.https.Request
): Promise<admin.auth.DecodedIdToken> {
  const authorization = req.headers.authorization ?? "";
  if (!authorization.startsWith("Bearer ")) {
    const err = new Error("Unauthorized") as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }
  return admin.auth().verifyIdToken(authorization.slice(7));
}

function deriveAccountStatus(account: Stripe.Account): string {
  if (!account.details_submitted) return "pending";
  if (account.requirements?.disabled_reason) return "restricted";
  if ((account.requirements?.currently_due ?? []).length > 0) return "action_required";
  if (account.charges_enabled && account.payouts_enabled) return "active";
  if (account.charges_enabled) return "charges_only";
  return "review";
}

async function updateRestaurantStripeStatus(
  restaurantRef: admin.firestore.DocumentReference,
  account: Stripe.Account
): Promise<void> {
  await restaurantRef.update({
    stripe_charges_enabled: account.charges_enabled,
    stripe_payouts_enabled: account.payouts_enabled,
    stripe_details_submitted: account.details_submitted,
    stripe_onboarding_complete: account.details_submitted && account.charges_enabled,
    stripe_account_status: deriveAccountStatus(account),
    stripe_requirements_due: account.requirements?.currently_due ?? [],
    stripe_last_synced_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ─── getRestaurant (public) ───────────────────────────────────────────────────

export const getRestaurant = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }

    const { restaurantId } = req.query;
    if (!restaurantId || typeof restaurantId !== "string") {
      res.status(400).json({ error: "restaurantId requerido" });
      return;
    }

    const restaurantSnap = await db.collection("restaurants").doc(restaurantId).get();
    if (!restaurantSnap.exists) {
      res.status(404).json({ error: "Restaurante no encontrado" });
      return;
    }

    const data = restaurantSnap.data()!;

    const employeesSnap = await db
      .collection("restaurants")
      .doc(restaurantId)
      .collection("employees")
      .get();

    const employees = employeesSnap.docs
      .filter((d) => d.data().status !== "inactive")
      .map((d) => ({
        id: d.id,
        name: d.data().name ?? "",
        role: d.data().role ?? "",
      }));

    res.status(200).json({
      restaurant: {
        name: data.name ?? "",
        address: data.address ?? "",
        category: data.category ?? "",
        tipDistributionMode: data.tip_distribution_mode ?? "restaurant",
        canReceiveTips: data.stripe_charges_enabled === true,
      },
      employees,
    });
  });

// ─── createConnectOnboardingLink (authenticated) ──────────────────────────────

export const createConnectOnboardingLink = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
      const decoded = await verifyFirebaseToken(req);
      const uid = decoded.uid;
      const stripe = getStripe();
      const APP_URL = getAppUrl();

      const restaurantRef = db.collection("restaurants").doc(uid);
      const restaurantSnap = await restaurantRef.get();
      if (!restaurantSnap.exists) {
        res.status(404).json({ error: "Restaurante no encontrado" });
        return;
      }

      const data = restaurantSnap.data()!;
      let stripeAccountId: string = data.stripe_account_id ?? "";

      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          controller: {
            stripe_dashboard: { type: "express" },
            fees: { payer: "application" },
            losses: { payments: "application" },
          },
          country: "ES",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            name: (data.name as string | undefined) ?? undefined,
            url: (data.website as string | undefined) ?? undefined,
          },
          metadata: { firebase_uid: uid },
        });
        stripeAccountId = account.id;
        await restaurantRef.update({
          stripe_account_id: stripeAccountId,
          stripe_onboarding_complete: false,
          stripe_charges_enabled: false,
          stripe_payouts_enabled: false,
          stripe_details_submitted: false,
          stripe_account_status: "pending",
          stripe_last_synced_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${APP_URL}/settings/bank?refresh=1`,
        return_url: `${APP_URL}/settings/bank?connected=1`,
        type: "account_onboarding",
      });

      res.status(200).json({ url: accountLink.url });
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 401) {
        res.status(401).json({ error: "No autorizado" });
      } else {
        console.error("createConnectOnboardingLink:", e.message);
        res.status(500).json({ error: "No se pudo generar el enlace" });
      }
    }
  });

// ─── syncStripeAccount (authenticated) ────────────────────────────────────────

export const syncStripeAccount = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
      const decoded = await verifyFirebaseToken(req);
      const uid = decoded.uid;
      const stripe = getStripe();

      const restaurantRef = db.collection("restaurants").doc(uid);
      const restaurantSnap = await restaurantRef.get();
      if (!restaurantSnap.exists) {
        res.status(404).json({ error: "Restaurante no encontrado" }); return;
      }

      const data = restaurantSnap.data()!;
      const stripeAccountId: string = data.stripe_account_id ?? "";
      if (!stripeAccountId) {
        res.status(200).json({ status: "not_connected" }); return;
      }

      const account = await stripe.accounts.retrieve(stripeAccountId);
      await updateRestaurantStripeStatus(restaurantRef, account);

      res.status(200).json({
        status: deriveAccountStatus(account),
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      });
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 401) {
        res.status(401).json({ error: "No autorizado" });
      } else {
        console.error("syncStripeAccount:", e.message);
        res.status(500).json({ error: "No se pudo sincronizar la cuenta" });
      }
    }
  });

// ─── createCheckoutSession (public) ───────────────────────────────────────────

export const createCheckoutSession = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
      const body = req.body as {
        restaurantId?: unknown;
        amount?: unknown;
        employeeId?: unknown;
        employeeName?: unknown;
      };

      const restaurantId = typeof body.restaurantId === "string" ? body.restaurantId : null;
      if (!restaurantId) {
        res.status(400).json({ error: "restaurantId inválido" }); return;
      }

      const amountNum = Number(body.amount);
      if (!Number.isFinite(amountNum) || amountNum < 0.5 || amountNum > 500) {
        res.status(400).json({ error: "Importe inválido (mínimo 0,50€ — máximo 500€)" }); return;
      }

      const restaurantSnap = await db.collection("restaurants").doc(restaurantId).get();
      if (!restaurantSnap.exists) {
        res.status(404).json({ error: "Restaurante no encontrado" }); return;
      }

      const data = restaurantSnap.data()!;
      const stripeAccountId: string = data.stripe_account_id ?? "";

      if (!stripeAccountId || data.stripe_charges_enabled !== true) {
        res.status(422).json({ error: "Este restaurante no puede recibir pagos todavía" }); return;
      }

      const amountCents = Math.round(amountNum * 100);
      const feePercent = parseFloat(process.env.QTIPS_FEE_PERCENT ?? "2.5");
      const feeCents = Math.round(amountCents * feePercent / 100);
      const APP_URL = getAppUrl();
      const stripe = getStripe();

      const safeName = String(body.employeeName ?? "").trim().slice(0, 100);
      const safeEmpId = String(body.employeeId ?? "").trim().slice(0, 128);
      const restaurantName = String(data.name ?? "Restaurante").trim();

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `Propina — ${restaurantName}`,
                description: safeName ? `Para ${safeName}` : "Propina al restaurante",
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: feeCents,
          transfer_data: { destination: stripeAccountId },
          metadata: {
            restaurant_id: restaurantId,
            employee_id: safeEmpId,
            employee_name: safeName,
            amount_cents: String(amountCents),
            fee_cents: String(feeCents),
            source: "qtips_tip_page",
          },
        },
        metadata: {
          restaurant_id: restaurantId,
          employee_id: safeEmpId,
          employee_name: safeName,
          amount_cents: String(amountCents),
          fee_cents: String(feeCents),
        },
        success_url: `${APP_URL}/tip/success?session_id={CHECKOUT_SESSION_ID}&restaurant=${restaurantId}`,
        cancel_url: `${APP_URL}/tip/${restaurantId}`,
      });

      res.status(200).json({ url: session.url, sessionId: session.id });
    } catch (err: unknown) {
      const e = err as Error;
      console.error("createCheckoutSession:", e.message);
      res.status(500).json({ error: "No se pudo iniciar el pago" });
    }
  });

// ─── stripeWebhook ────────────────────────────────────────────────────────────

export const stripeWebhook = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || !sig) {
      console.error("stripeWebhook: missing secret or signature");
      res.status(400).send("Missing signature");
      return;
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      const rawBody = (req as unknown as { rawBody: Buffer }).rawBody;
      event = stripe.webhooks.constructEvent(rawBody, sig as string, webhookSecret);
    } catch (err: unknown) {
      const e = err as Error;
      console.error("Webhook signature failed:", e.message);
      res.status(400).send(`Webhook Error: ${e.message}`);
      return;
    }

    // Idempotency check
    const eventRef = db.collection("stripe_events").doc(event.id);
    const eventSnap = await eventRef.get();
    if (eventSnap.exists) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    await eventRef.set({
      stripe_event_id: event.id,
      event_type: event.type,
      status: "processing",
      error_message: null,
      processed_at: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.payment_status === "paid") {
            await handleCheckoutCompleted(session, event.livemode);
          }
          break;
        }
        case "payment_intent.payment_failed": {
          const pi = event.data.object as Stripe.PaymentIntent;
          await handlePaymentFailed(pi, event.livemode);
          break;
        }
        case "charge.refunded": {
          const charge = event.data.object as Stripe.Charge;
          await handleRefund(charge);
          break;
        }
        case "account.updated": {
          const account = event.data.object as Stripe.Account;
          await handleAccountUpdated(account);
          break;
        }
        default:
          break;
      }

      await eventRef.update({
        status: "processed",
        processed_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err: unknown) {
      const e = err as Error;
      console.error(`stripeWebhook event ${event.id} failed:`, e.message);
      await eventRef.update({ status: "error", error_message: e.message });
    }

    res.status(200).json({ received: true });
  });

// ─── registerTip (deprecated — kept for backward compatibility) ───────────────

export const registerTip = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    const WEBHOOK_SECRET = process.env.QTIPS_WEBHOOK_SECRET;
    const incomingSecret = req.headers["x-qtips-secret"];
    if (!WEBHOOK_SECRET || incomingSecret !== WEBHOOK_SECRET) {
      res.status(401).json({ error: "Unauthorized" }); return;
    }

    const { restaurantId, employeeId, employeeName, amount, stripePaymentId } =
      req.body as {
        restaurantId?: string;
        employeeId?: string;
        employeeName?: string;
        amount?: number;
        stripePaymentId?: string;
      };

    if (!restaurantId || !amount || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ error: "restaurantId y amount son obligatorios" }); return;
    }

    if (stripePaymentId) {
      const existing = await db.collection("tips")
        .where("stripePaymentId", "==", stripePaymentId)
        .limit(1).get();
      if (!existing.empty) {
        res.status(200).json({ ok: true, duplicate: true }); return;
      }
    }

    await db.collection("tips").add({
      restaurantId,
      employeeId: employeeId ?? null,
      employeeName: employeeName ?? "Propina general",
      amount,
      amountCents: Math.round(amount * 100),
      feeCents: 0,
      currency: "eur",
      stripePaymentId: stripePaymentId ?? null,
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: null,
      status: "paid",
      isTest: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ ok: true });
  });

// ─── Internal event handlers ──────────────────────────────────────────────────

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  livemode: boolean
): Promise<void> {
  const meta = session.metadata ?? {};
  const restaurantId = meta.restaurant_id;
  const employeeId = meta.employee_id || null;
  const employeeName = meta.employee_name || "Propina general";

  if (!restaurantId) {
    console.error("handleCheckoutCompleted: missing restaurant_id in metadata");
    return;
  }

  // Idempotency by session ID
  const existing = await db.collection("tips")
    .where("stripeCheckoutSessionId", "==", session.id)
    .limit(1).get();
  if (!existing.empty) return;

  const amountCents = parseInt(meta.amount_cents ?? "0", 10);
  const feeCents = parseInt(meta.fee_cents ?? "0", 10);

  await db.collection("tips").add({
    restaurantId,
    employeeId,
    employeeName,
    amount: amountCents / 100,
    amountCents,
    feeCents,
    currency: session.currency ?? "eur",
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: session.payment_intent ?? null,
    status: "paid",
    isTest: !livemode,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function handlePaymentFailed(
  pi: Stripe.PaymentIntent,
  livemode: boolean
): Promise<void> {
  const restaurantId = pi.metadata?.restaurant_id;
  if (!restaurantId) return;

  await db.collection("tips").add({
    restaurantId,
    employeeId: pi.metadata?.employee_id || null,
    employeeName: pi.metadata?.employee_name || "Propina general",
    amount: pi.amount / 100,
    amountCents: pi.amount,
    feeCents: 0,
    currency: pi.currency,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: pi.id,
    status: "failed",
    isTest: !livemode,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    paidAt: null,
  });
}

async function handleRefund(charge: Stripe.Charge): Promise<void> {
  const piId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null;
  if (!piId) return;

  const tipsQuery = await db.collection("tips")
    .where("stripePaymentIntentId", "==", piId)
    .limit(1).get();
  if (tipsQuery.empty) return;

  await tipsQuery.docs[0].ref.update({
    status: charge.refunded ? "refunded" : "partially_refunded",
    refundedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const restaurantId = account.metadata?.firebase_uid;
  if (!restaurantId) return;

  const restaurantRef = db.collection("restaurants").doc(restaurantId);
  const snap = await restaurantRef.get();
  if (!snap.exists) return;

  await updateRestaurantStripeStatus(restaurantRef, account);
}
