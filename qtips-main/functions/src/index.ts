import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();
const db = admin.firestore();

// GET /getRestaurant?restaurantId=xxx
// El colega llama esto al cargar su página para obtener empleados y nombre del restaurante
export const getRestaurant = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");

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

    const employees = employeesSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name ?? "",
      role: d.data().role ?? "",
    }));

    res.status(200).json({
      restaurant: {
        name: data.name ?? "",
        address: data.address ?? "",
        category: data.category ?? "",
      },
      employees,
    });
  });

export const registerTip = functions
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

    const {
      restaurantId,
      employeeId,
      employeeName,
      amount,
      stripePaymentId,
    } = req.body;

    const WEBHOOK_SECRET = process.env.QTIPS_WEBHOOK_SECRET;
    const incomingSecret = req.headers["x-qtips-secret"];
    if (!WEBHOOK_SECRET || incomingSecret !== WEBHOOK_SECRET) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!restaurantId || !amount || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ error: "restaurantId y amount son obligatorios" });
      return;
    }

    if (stripePaymentId) {
      const existing = await db
        .collection("tips")
        .where("stripePaymentId", "==", stripePaymentId)
        .limit(1)
        .get();

      if (!existing.empty) {
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }
    }

    await db.collection("tips").add({
      restaurantId,
      employeeId: employeeId ?? null,
      employeeName: employeeName ?? "Anónimo",
      amount,
      stripePaymentId: stripePaymentId ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ ok: true });
  });
