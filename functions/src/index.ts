import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as querystring from "querystring";

admin.initializeApp();

export const slackWebhook = functions.https.onRequest((req, res) => {
  try {
    /* =================================
       SLASH COMMANDS (/gasto)
    ================================== */
    if (
      req.headers["content-type"] ===
      "application/x-www-form-urlencoded"
    ) {
      const body = querystring.parse(req.rawBody.toString());

      const command = body.command as string;
      const text = body.text as string;
      const channel = body.channel_id as string;
      const user = body.user_id as string;

      console.log("⚡ Slash command recibido:", {
        command,
        text,
        channel,
        user,
      });

      if (command === "/gasto") {
        // 👉 Respuesta inmediata (OBLIGATORIA)
        res.status(200).json({
          response_type: "ephemeral",
          text: `🧾 *Registro de gasto*\n\nEscribiste:\n> ${text}\n\n(Próximo paso: parsear monto, concepto y autobús)`,
        });
        return;
      }

      res.status(200).send();
      return;
    }

    /* =================================
       EVENT SUBSCRIPTIONS (mensajes normales)
    ================================== */

    // Verificación inicial de Slack
    if (req.body?.type === "url_verification") {
      res.status(200).send(req.body.challenge);
      return;
    }

    const event = req.body?.event;

    if (!event || event.type !== "message" || event.subtype) {
      res.status(200).send("OK");
      return;
    }

    const { text, user, channel } = event;

    console.log("📩 Slack mensaje normal:", {
      text,
      user,
      channel,
    });

    admin.firestore().collection("slack_messages").add({
      text,
      user,
      channel,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error en slackWebhook:", error);
    res.status(500).send("Error");
  }
});
