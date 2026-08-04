"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTip = exports.stripeWebhook = exports.createCheckoutSession = exports.syncStripeAccount = exports.createConnectOnboardingLink = exports.getRestaurant = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const stripe_1 = require("stripe");
admin.initializeApp();
const db = admin.firestore();
// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key)
        throw new Error("STRIPE_SECRET_KEY not configured");
    return new stripe_1.default(key);
}
function getAppUrl() {
    var _a;
    return (_a = process.env.APP_URL) !== null && _a !== void 0 ? _a : "https://qtips-main.vercel.app";
}
function setCors(res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
async function verifyFirebaseToken(req) {
    var _a;
    const authorization = (_a = req.headers.authorization) !== null && _a !== void 0 ? _a : "";
    if (!authorization.startsWith("Bearer ")) {
        const err = new Error("Unauthorized");
        err.statusCode = 401;
        throw err;
    }
    return admin.auth().verifyIdToken(authorization.slice(7));
}
function deriveAccountStatus(account) {
    var _a, _b, _c;
    if (!account.details_submitted)
        return "pending";
    if ((_a = account.requirements) === null || _a === void 0 ? void 0 : _a.disabled_reason)
        return "restricted";
    if (((_c = (_b = account.requirements) === null || _b === void 0 ? void 0 : _b.currently_due) !== null && _c !== void 0 ? _c : []).length > 0)
        return "action_required";
    if (account.charges_enabled && account.payouts_enabled)
        return "active";
    if (account.charges_enabled)
        return "charges_only";
    return "review";
}
async function updateRestaurantStripeStatus(restaurantRef, account) {
    var _a, _b;
    await restaurantRef.update({
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
        stripe_details_submitted: account.details_submitted,
        stripe_onboarding_complete: account.details_submitted && account.charges_enabled,
        stripe_account_status: deriveAccountStatus(account),
        stripe_requirements_due: (_b = (_a = account.requirements) === null || _a === void 0 ? void 0 : _a.currently_due) !== null && _b !== void 0 ? _b : [],
        stripe_last_synced_at: admin.firestore.FieldValue.serverTimestamp(),
    });
}
// ─── getRestaurant (public) ───────────────────────────────────────────────────
exports.getRestaurant = functions
    .region("europe-west1")
    .https.onRequest(async (req, res) => {
    var _a, _b, _c, _d;
    setCors(res);
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
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
    const data = restaurantSnap.data();
    const employeesSnap = await db
        .collection("restaurants")
        .doc(restaurantId)
        .collection("employees")
        .get();
    const employees = employeesSnap.docs
        .filter((d) => d.data().status !== "inactive")
        .map((d) => {
        var _a, _b;
        return ({
            id: d.id,
            name: (_a = d.data().name) !== null && _a !== void 0 ? _a : "",
            role: (_b = d.data().role) !== null && _b !== void 0 ? _b : "",
        });
    });
    res.status(200).json({
        restaurant: {
            name: (_a = data.name) !== null && _a !== void 0 ? _a : "",
            address: (_b = data.address) !== null && _b !== void 0 ? _b : "",
            category: (_c = data.category) !== null && _c !== void 0 ? _c : "",
            tipDistributionMode: (_d = data.tip_distribution_mode) !== null && _d !== void 0 ? _d : "restaurant",
            canReceiveTips: data.stripe_charges_enabled === true,
        },
        employees,
    });
});
// ─── createConnectOnboardingLink (authenticated) ──────────────────────────────
exports.createConnectOnboardingLink = functions
    .region("europe-west1")
    .https.onRequest(async (req, res) => {
    var _a, _b, _c;
    setCors(res);
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
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
        const data = restaurantSnap.data();
        let stripeAccountId = (_a = data.stripe_account_id) !== null && _a !== void 0 ? _a : "";
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
                    name: (_b = data.name) !== null && _b !== void 0 ? _b : undefined,
                    url: (_c = data.website) !== null && _c !== void 0 ? _c : undefined,
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
    }
    catch (err) {
        const e = err;
        if (e.statusCode === 401) {
            res.status(401).json({ error: "No autorizado" });
        }
        else {
            console.error("createConnectOnboardingLink:", e.message);
            res.status(500).json({ error: "No se pudo generar el enlace" });
        }
    }
});
// ─── syncStripeAccount (authenticated) ────────────────────────────────────────
exports.syncStripeAccount = functions
    .region("europe-west1")
    .https.onRequest(async (req, res) => {
    var _a;
    setCors(res);
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const decoded = await verifyFirebaseToken(req);
        const uid = decoded.uid;
        const stripe = getStripe();
        const restaurantRef = db.collection("restaurants").doc(uid);
        const restaurantSnap = await restaurantRef.get();
        if (!restaurantSnap.exists) {
            res.status(404).json({ error: "Restaurante no encontrado" });
            return;
        }
        const data = restaurantSnap.data();
        const stripeAccountId = (_a = data.stripe_account_id) !== null && _a !== void 0 ? _a : "";
        if (!stripeAccountId) {
            res.status(200).json({ status: "not_connected" });
            return;
        }
        const account = await stripe.accounts.retrieve(stripeAccountId);
        await updateRestaurantStripeStatus(restaurantRef, account);
        res.status(200).json({
            status: deriveAccountStatus(account),
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
        });
    }
    catch (err) {
        const e = err;
        if (e.statusCode === 401) {
            res.status(401).json({ error: "No autorizado" });
        }
        else {
            console.error("syncStripeAccount:", e.message);
            res.status(500).json({ error: "No se pudo sincronizar la cuenta" });
        }
    }
});
// ─── createCheckoutSession (public) ───────────────────────────────────────────
exports.createCheckoutSession = functions
    .region("europe-west1")
    .https.onRequest(async (req, res) => {
    var _a, _b, _c, _d, _e;
    setCors(res);
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const body = req.body;
        const restaurantId = typeof body.restaurantId === "string" ? body.restaurantId : null;
        if (!restaurantId) {
            res.status(400).json({ error: "restaurantId inválido" });
            return;
        }
        const amountNum = Number(body.amount);
        if (!Number.isFinite(amountNum) || amountNum < 0.5 || amountNum > 500) {
            res.status(400).json({ error: "Importe inválido (mínimo 0,50€ — máximo 500€)" });
            return;
        }
        const restaurantSnap = await db.collection("restaurants").doc(restaurantId).get();
        if (!restaurantSnap.exists) {
            res.status(404).json({ error: "Restaurante no encontrado" });
            return;
        }
        const data = restaurantSnap.data();
        const stripeAccountId = (_a = data.stripe_account_id) !== null && _a !== void 0 ? _a : "";
        if (!stripeAccountId || data.stripe_charges_enabled !== true) {
            res.status(422).json({ error: "Este restaurante no puede recibir pagos todavía" });
            return;
        }
        const amountCents = Math.round(amountNum * 100);
        const feePercent = parseFloat((_b = process.env.QTIPS_FEE_PERCENT) !== null && _b !== void 0 ? _b : "2.5");
        const feeCents = Math.round(amountCents * feePercent / 100);
        const APP_URL = getAppUrl();
        const stripe = getStripe();
        const safeName = String((_c = body.employeeName) !== null && _c !== void 0 ? _c : "").trim().slice(0, 100);
        const safeEmpId = String((_d = body.employeeId) !== null && _d !== void 0 ? _d : "").trim().slice(0, 128);
        const restaurantName = String((_e = data.name) !== null && _e !== void 0 ? _e : "Restaurante").trim();
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
    }
    catch (err) {
        const e = err;
        console.error("createCheckoutSession:", e.message);
        res.status(500).json({ error: "No se pudo iniciar el pago" });
    }
});
// ─── stripeWebhook ────────────────────────────────────────────────────────────
exports.stripeWebhook = functions
    .region("europe-west1")
    .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
    }
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret || !sig) {
        console.error("stripeWebhook: missing secret or signature");
        res.status(400).send("Missing signature");
        return;
    }
    let event;
    try {
        const stripe = getStripe();
        const rawBody = req.rawBody;
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    }
    catch (err) {
        const e = err;
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
                const session = event.data.object;
                if (session.payment_status === "paid") {
                    await handleCheckoutCompleted(session, event.livemode);
                }
                break;
            }
            case "payment_intent.payment_failed": {
                const pi = event.data.object;
                await handlePaymentFailed(pi, event.livemode);
                break;
            }
            case "charge.refunded": {
                const charge = event.data.object;
                await handleRefund(charge);
                break;
            }
            case "account.updated": {
                const account = event.data.object;
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
    }
    catch (err) {
        const e = err;
        console.error(`stripeWebhook event ${event.id} failed:`, e.message);
        await eventRef.update({ status: "error", error_message: e.message });
    }
    res.status(200).json({ received: true });
});
// ─── registerTip (deprecated — kept for backward compatibility) ───────────────
exports.registerTip = functions
    .region("europe-west1")
    .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    const WEBHOOK_SECRET = process.env.QTIPS_WEBHOOK_SECRET;
    const incomingSecret = req.headers["x-qtips-secret"];
    if (!WEBHOOK_SECRET || incomingSecret !== WEBHOOK_SECRET) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const { restaurantId, employeeId, employeeName, amount, stripePaymentId } = req.body;
    if (!restaurantId || !amount || typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "restaurantId y amount son obligatorios" });
        return;
    }
    if (stripePaymentId) {
        const existing = await db.collection("tips")
            .where("stripePaymentId", "==", stripePaymentId)
            .limit(1).get();
        if (!existing.empty) {
            res.status(200).json({ ok: true, duplicate: true });
            return;
        }
    }
    await db.collection("tips").add({
        restaurantId,
        employeeId: employeeId !== null && employeeId !== void 0 ? employeeId : null,
        employeeName: employeeName !== null && employeeName !== void 0 ? employeeName : "Propina general",
        amount,
        amountCents: Math.round(amount * 100),
        feeCents: 0,
        currency: "eur",
        stripePaymentId: stripePaymentId !== null && stripePaymentId !== void 0 ? stripePaymentId : null,
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
async function handleCheckoutCompleted(session, livemode) {
    var _a, _b, _c, _d, _e;
    const meta = (_a = session.metadata) !== null && _a !== void 0 ? _a : {};
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
    if (!existing.empty)
        return;
    const amountCents = parseInt((_b = meta.amount_cents) !== null && _b !== void 0 ? _b : "0", 10);
    const feeCents = parseInt((_c = meta.fee_cents) !== null && _c !== void 0 ? _c : "0", 10);
    await db.collection("tips").add({
        restaurantId,
        employeeId,
        employeeName,
        amount: amountCents / 100,
        amountCents,
        feeCents,
        currency: (_d = session.currency) !== null && _d !== void 0 ? _d : "eur",
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: (_e = session.payment_intent) !== null && _e !== void 0 ? _e : null,
        status: "paid",
        isTest: !livemode,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
async function handlePaymentFailed(pi, livemode) {
    var _a, _b, _c;
    const restaurantId = (_a = pi.metadata) === null || _a === void 0 ? void 0 : _a.restaurant_id;
    if (!restaurantId)
        return;
    await db.collection("tips").add({
        restaurantId,
        employeeId: ((_b = pi.metadata) === null || _b === void 0 ? void 0 : _b.employee_id) || null,
        employeeName: ((_c = pi.metadata) === null || _c === void 0 ? void 0 : _c.employee_name) || "Propina general",
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
async function handleRefund(charge) {
    var _a, _b;
    const piId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : (_b = (_a = charge.payment_intent) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
    if (!piId)
        return;
    const tipsQuery = await db.collection("tips")
        .where("stripePaymentIntentId", "==", piId)
        .limit(1).get();
    if (tipsQuery.empty)
        return;
    await tipsQuery.docs[0].ref.update({
        status: charge.refunded ? "refunded" : "partially_refunded",
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
async function handleAccountUpdated(account) {
    var _a;
    const restaurantId = (_a = account.metadata) === null || _a === void 0 ? void 0 : _a.firebase_uid;
    if (!restaurantId)
        return;
    const restaurantRef = db.collection("restaurants").doc(restaurantId);
    const snap = await restaurantRef.get();
    if (!snap.exists)
        return;
    await updateRestaurantStripeStatus(restaurantRef, account);
}
//# sourceMappingURL=index.js.map