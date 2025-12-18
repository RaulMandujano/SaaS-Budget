"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
admin.initializeApp();
const VERIFY_TOKEN = "estrella-polar-webhook";
// ⚠️ CAMBIA SOLO ESTE VALOR
const PHONE_NUMBER_ID = "13853353009";
const MENU_TEXT = `Hola 👋

¿Qué deseas hacer?
1️⃣ Registrar gasto
2️⃣ Ver reportes
3️⃣ Ayuda

Responde con el número.`;
// 🔹 Helper para enviar mensajes por WhatsApp
async function sendWhatsAppMessage(to, text) {
    const token = functions.config().whatsapp.token;
    const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
    await (0, node_fetch_1.default)(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: text },
        }),
    });
}
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
    // 🔹 VERIFICACIÓN DE META (GET)
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("✅ Webhook verificado");
            res.status(200).send(challenge);
            return;
        }
        else {
            res.sendStatus(403);
            return;
        }
    }
    // 🔹 MENSAJES ENTRANTES (POST)
    if (req.method === "POST") {
        try {
            const entry = req.body.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;
            const message = value?.messages?.[0];
            if (!message || !message.from) {
                res.sendStatus(200);
                return;
            }
            const from = message.from;
            const text = message.text?.body;
            console.log("📩 MENSAJE WHATSAPP");
            console.log("De:", from);
            console.log("Texto:", text);
            // 🔹 Guardar / resetear sesión
            const db = admin.firestore();
            const sessionRef = db.collection("whatsapp_sessions").doc(from);
            const sessionSnapshot = await sessionRef.get();
            if (!sessionSnapshot.exists) {
                await sessionRef.set({
                    phone: from,
                    state: "MENU_PRINCIPAL",
                    temp: {},
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            else {
                await sessionRef.update({
                    state: "MENU_PRINCIPAL",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            // 🔹 RESPUESTA REAL POR WHATSAPP
            await sendWhatsAppMessage(from, MENU_TEXT);
            res.sendStatus(200);
            return;
        }
        catch (error) {
            console.error("❌ Error procesando mensaje:", error);
            res.sendStatus(200);
            return;
        }
    }
    res.sendStatus(200);
});
