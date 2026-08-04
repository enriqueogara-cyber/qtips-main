"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTip = exports.getRestaurant = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
admin.initializeApp();
const db = admin.firestore();
// GET /getRestaurant?restaurantId=xxx
// El colega llama esto al cargar su página para obtener empleados y nombre del restaurante
exports.getRestaurant = functions
    .region("europe-west1")
    .https.onRequest(async (req, res) => {
    var _a, _b, _c;
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
    const data = restaurantSnap.data();
    const employeesSnap = await db
        .collection("restaurants")
        .doc(restaurantId)
        .collection("employees")
        .get();
    const employees = employeesSnap.docs.map((d) => {
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
        },
        employees,
    });
});
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
    const { restaurantId, employeeId, employeeName, amount, stripePaymentId, } = req.body;
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
        employeeId: employeeId !== null && employeeId !== void 0 ? employeeId : null,
        employeeName: employeeName !== null && employeeName !== void 0 ? employeeName : "Anónimo",
        amount,
        stripePaymentId: stripePaymentId !== null && stripePaymentId !== void 0 ? stripePaymentId : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(200).json({ ok: true });
});
//# sourceMappingURL=index.js.map