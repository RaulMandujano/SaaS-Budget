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
Object.defineProperty(exports, "__esModule", { value: true });
exports.slackWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
/* ===============================
   SLACK WEBHOOK
================================ */
exports.slackWebhook = functions.https.onRequest((req, res) => {
    var _a, _b;
    try {
        /**
         * 🔐 Verificación inicial de Slack
         */
        if (((_a = req.body) === null || _a === void 0 ? void 0 : _a.type) === "url_verification") {
            res.status(200).send(req.body.challenge);
            return;
        }
        const event = (_b = req.body) === null || _b === void 0 ? void 0 : _b.event;
        // Ignorar eventos que no sean mensajes reales
        if (!event || event.type !== "message" || event.subtype) {
            res.status(200).send("OK");
            return;
        }
        const text = event.text;
        const user = event.user;
        const channel = event.channel;
        console.log("📩 Slack message recibido:", {
            text,
            user,
            channel,
        });
        // 🔹 Guardar mensaje base
        admin
            .firestore()
            .collection("slack_messages")
            .add({
            text,
            user,
            channel,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
            .then(() => {
            // Slack solo necesita 200 OK
            res.status(200).send("OK");
        })
            .catch((error) => {
            console.error("❌ Error guardando mensaje Slack:", error);
            res.status(500).send("Error");
        });
    }
    catch (error) {
        console.error("❌ Error en slackWebhook:", error);
        res.status(500).send("Error");
    }
});
