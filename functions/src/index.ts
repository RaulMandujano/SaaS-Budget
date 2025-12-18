import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

admin.initializeApp();

// === CONFIG ===
const VERIFY_TOKEN = "estrella-polar-webhook";

// ⚠️ ESTE ES EL PHONE NUMBER ID (NO el número de teléfono)
const PHONE_NUMBER_ID = functions.config().whatsapp.phone_id;

// === MENÚ ===
const MENU_TEXT = `Hola 👋

¿Qué deseas hacer?
1️⃣ Registrar gasto
2️⃣ Ver reportes
3️⃣ Ayuda

Responde con el número.`;

// === ENVIAR MENSAJE ===
async function sendWhatsAppMessage(to: string, text: string) {
  const token = functions.config().whatsapp.token;

  const url = `https://graph.facebook.com/v18.0/${918265894705639}/messages`;

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
      return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
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
        return res.sendStatus(200);
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

      return res.sendStatus(200);
    } catch (error) {
      console.error("❌ Error webhook:", error);
      return res.sendStatus(200);
    }
  }

  return res.sendStatus(200);
});
