import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

admin.initializeApp();

// === CONFIG ===
const VERIFY_TOKEN = "estrella-polar-webhook";

type WhatsAppConfig = {
  phoneNumberId: string;
  token: string;
};

function getWhatsAppConfig(): WhatsAppConfig {
  const config = functions.config();
  const whatsapp = (config && config.whatsapp) || {};
  const phoneNumberId =
    whatsapp.phone_id || process.env.WHATSAPP_PHONE_ID || "";
  const token = whatsapp.token || process.env.WHATSAPP_TOKEN || "";

  if (!phoneNumberId || !token) {
    throw new Error(
      "Missing WhatsApp config. Set firebase functions config " +
        "(whatsapp.phone_id, whatsapp.token) or env vars " +
        "WHATSAPP_PHONE_ID and WHATSAPP_TOKEN."
    );
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
async function sendWhatsAppMessage(to: string, text: string) {
  const { phoneNumberId, token } = getWhatsAppConfig();

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const response = await fetch(url, {
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
export const whatsappWebhook = functions.https.onRequest(async (req, res) => {
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
      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      // 👇 OJO AQUÍ
      const message = value?.messages?.[0];

      // Si NO es mensaje de usuario → solo ACK
      if (!message || !message.from || !message.text?.body) {
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

      await sessionRef.set(
        {
          phone: from,
          state: "MENU_PRINCIPAL",
          lastMessage: text,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // === RESPUESTA ===
      await sendWhatsAppMessage(from, MENU_TEXT);

      res.sendStatus(200);
      return;
    } catch (error) {
      console.error("❌ Error webhook:", error);
      res.sendStatus(200);
      return;
    }
  }

  res.sendStatus(200);
  return;
});

export { createUserAdmin } from "./createUserAdmin";
export { crearViajeSeguro } from "./crearViajeSeguro";
