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
exports.crearViajeSeguro = exports.createUserAdmin = exports.whatsappWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
admin.initializeApp();
// === CONFIG ===
const VERIFY_TOKEN = "estrella-polar-webhook";
function getWhatsAppConfig() {
    const config = functions.config();
    const whatsapp = (config && config.whatsapp) || {};
    const phoneNumberId = whatsapp.phone_id || process.env.WHATSAPP_PHONE_ID || "";
    const token = whatsapp.token || process.env.WHATSAPP_TOKEN || "";
    if (!phoneNumberId || !token) {
        throw new Error("Missing WhatsApp config. Set firebase functions config " +
            "(whatsapp.phone_id, whatsapp.token) or env vars " +
            "WHATSAPP_PHONE_ID and WHATSAPP_TOKEN.");
    }
    return { phoneNumberId, token };
}
// === MENÚ ===
const MENU_TEXT = `Hola 👋

¿Qué deseas hacer?
1️⃣ Registrar gasto
2️⃣ Ver reportes
3️⃣ Ayuda

Responde con el número.`;
// === ENVIAR MENSAJE ===
async function sendWhatsAppMessage(to, text) {
    const { phoneNumberId, token } = getWhatsAppConfig();
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const response = await (0, node_fetch_1.default)(url, {
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
    const data = await response.json();
    console.log("📤 WhatsApp API response:", data);
}
// === WEBHOOK ===
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c, _d;
    // === VERIFICACIÓN META ===
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("✅ Webhook verificado por Meta");
            res.status(200).send(challenge);
            return;
        }
        res.sendStatus(403);
        return;
    }
    // === EVENTOS ===
    if (req.method === "POST") {
        try {
            const entry = (_a = req.body.entry) === null || _a === void 0 ? void 0 : _a[0];
            const change = (_b = entry === null || entry === void 0 ? void 0 : entry.changes) === null || _b === void 0 ? void 0 : _b[0];
            const value = change === null || change === void 0 ? void 0 : change.value;
            // 👇 OJO AQUÍ
            const message = (_c = value === null || value === void 0 ? void 0 : value.messages) === null || _c === void 0 ? void 0 : _c[0];
            // Si NO es mensaje de usuario → solo ACK
            if (!message || !message.from || !((_d = message.text) === null || _d === void 0 ? void 0 : _d.body)) {
                console.log("ℹ️ Evento sin mensaje de texto");
                res.sendStatus(200);
                return;
            }
            const from = message.from;
            const text = message.text.body;
            console.log("📩 MENSAJE RECIBIDO");
            console.log("De:", from);
            console.log("Texto:", text);
            // === SESIÓN ===
            const db = admin.firestore();
            const sessionRef = db.collection("whatsapp_sessions").doc(from);
            await sessionRef.set({
                phone: from,
                state: "MENU_PRINCIPAL",
                lastMessage: text,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            // === RESPUESTA ===
            await sendWhatsAppMessage(from, MENU_TEXT);
            res.sendStatus(200);
            return;
        }
        catch (error) {
            console.error("❌ Error webhook:", error);
            res.sendStatus(200);
            return;
        }
    }
    res.sendStatus(200);
    return;
});
var createUserAdmin_1 = require("./createUserAdmin");
Object.defineProperty(exports, "createUserAdmin", { enumerable: true, get: function () { return createUserAdmin_1.createUserAdmin; } });
var crearViajeSeguro_1 = require("./crearViajeSeguro");
Object.defineProperty(exports, "crearViajeSeguro", { enumerable: true, get: function () { return crearViajeSeguro_1.crearViajeSeguro; } });
