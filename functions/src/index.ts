import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import crypto from "crypto";
import fetch from "node-fetch";

admin.initializeApp();

/* ===============================
   TYPES
================================ */
type SlackRequestBody = Record<string, unknown>;

type SlackEvent = {
  type?: string;
  subtype?: string;
  text?: string;
  channel?: string;
  user?: string;
  bot_id?: string;
};

type SlackAction = {
  action_id?: string;
  value?: string;
  text?: { text?: string };
};

type SlackActionPayload = {
  type?: string;
  actions?: SlackAction[];
  channel?: { id?: string };
  user?: { id?: string };
};

type SlackSession = {
  channelId?: string;
  userId?: string;
  empresaId?: string;
  step?: "CATEGORIA" | "MONTO" | "SUCURSAL" | "AUTOBUS" | "CONFIRMAR";
  categoria?: string;
  monto?: number;
  sucursalId?: string;
  sucursalNombre?: string;
  autobusId?: string;
  autobusNombre?: string;
};

const CATEGORIAS = ["Combustible", "Mantenimiento", "Peajes", "Sueldos", "Otros"];

/* ===============================
   CONFIG HELPERS
================================ */
function cfg(path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = functions.config();
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

function getSlackBotToken(): string {
  const token = process.env.SLACK_BOT_TOKEN || cfg("slack.bot_token");
  if (!token) throw new Error("Missing Slack bot token");
  return token;
}

function getSlackSigningSecret(): string | undefined {
  const secret = process.env.SLACK_SIGNING_SECRET || cfg("slack.signing_secret");
  return secret;
}

function getSlackClientId(): string | undefined {
  return process.env.SLACK_CLIENT_ID || cfg("slack.client_id");
}
function getSlackClientSecret(): string | undefined {
  return process.env.SLACK_CLIENT_SECRET || cfg("slack.client_secret");
}

/* ===============================
   BASIC UTILS
================================ */
function getString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "si", "sí", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return undefined;
}

function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[^0-9,.-]/g, "").trim();
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) normalized = cleaned.replace(/,/g, "");
  else if (hasComma && !hasDot) normalized = cleaned.replace(/,/g, ".");

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function respondJson(res: functions.Response, payload: Record<string, unknown>) {
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(JSON.stringify(payload));
}

function getRawBodyText(req: functions.https.Request): string {
  const rawBodyValue = (req as { rawBody?: Buffer | string }).rawBody;
  if (typeof rawBodyValue === "string") return rawBodyValue;
  return rawBodyValue?.toString("utf8") ?? "";
}

/* ===============================
   PARSE SLACK BODY (ROBUSTO)
   - Slack manda x-www-form-urlencoded.
   - A veces rawBody no viene como esperas, entonces caemos a req.body.
================================ */
function parseSlackBody(req: functions.https.Request): SlackRequestBody {
  const contentTypeHeader = req.headers["content-type"];
  const contentType = Array.isArray(contentTypeHeader)
    ? contentTypeHeader.join(";")
    : contentTypeHeader;

  const rawBody = getRawBodyText(req);

  const bodyText =
    rawBody ||
    (typeof req.body === "string"
      ? req.body
      : Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : "");

  if (
    typeof contentType === "string" &&
    contentType.toLowerCase().includes("application/x-www-form-urlencoded")
  ) {
    if (bodyText) {
      return Object.fromEntries(new URLSearchParams(bodyText).entries());
    }
    if (req.body && typeof req.body === "object") {
      return req.body as SlackRequestBody;
    }
    return {};
  }

  if (req.body && typeof req.body === "object") return req.body as SlackRequestBody;

  if (bodyText) {
    try {
      return JSON.parse(bodyText) as SlackRequestBody;
    } catch {
      return {};
    }
  }

  return {};
}

/* ===============================
   SLACK SIGNATURE VERIFY
================================ */
function verifySlackSignature(req: functions.https.Request): boolean {
  const secret = getSlackSigningSecret();
  if (!secret) return true;

  const timestamp = getString(req.headers["x-slack-request-timestamp"]);
  const signature = getString(req.headers["x-slack-signature"]);
  if (!timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 60 * 5) return false;

  const rawBody = getRawBodyText(req);
  const base = `v0:${timestamp}:${rawBody}`;
  const digest = crypto.createHmac("sha256", secret).update(base).digest("hex");
  const computed = `v0=${digest}`;

  if (computed.length !== signature.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(computed, "utf8"),
    Buffer.from(signature, "utf8")
  );
}

/* ===============================
   SLACK API
================================ */
async function slackApi(method: string, payload: Record<string, unknown>) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSlackBotToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { ok?: boolean; error?: string };
  if (!data?.ok) console.error(`❌ Slack API error (${method}):`, data);
  return data;
}

async function sendMessage(channel: string, text: string, blocks?: unknown[]) {
  const payload: Record<string, unknown> = { channel, text };
  if (blocks?.length) payload.blocks = blocks;
  await slackApi("chat.postMessage", payload);
}

/* ===============================
   FIRESTORE HELPERS
================================ */
async function getAuthorizedChannel(channelId: string) {
  const normalizedChannelId = channelId.trim();
  const collection = admin.firestore().collection("slack_channels");

  let doc = await collection.doc(normalizedChannelId).get();
  if (!doc.exists) {
    const snap = await collection.where("channelId", "==", normalizedChannelId).limit(1).get();
    if (snap.empty) return null;
    doc = snap.docs[0];
  }
  if (!doc.exists) return null;

  const data = doc.data() ?? {};
  const activo = parseBoolean(data.activo ?? data.active ?? data.autorizado);
  if (activo !== true) return null;

  const empresaId = (getString(data.empresaId ?? data.empresa_id) ?? "").trim();
  if (!empresaId) return null;

  return { empresaId };
}

async function getSucursales(empresaId: string) {
  const snap = await admin.firestore()
    .collection("sucursales")
    .where("empresaId", "==", empresaId)
    .limit(200)
    .get();

  return snap.docs
    .map((d) => ({
      id: d.id,
      label: (d.data().nombre as string) || d.id,
      activa: d.data().activa !== false,
    }))
    .filter((s) => s.activa)
    .map(({ id, label }) => ({ id, label }));
}

async function getAutobuses(sucursalId: string) {
  const snap = await admin.firestore()
    .collection("autobuses")
    .where("sucursalId", "==", sucursalId)
    .limit(200)
    .get();

  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        label: (data.numeroUnidad as string) || (data.placa as string) || d.id,
        estado: (data.estado as string) || "activo",
      };
    })
    .filter((b) => b.estado === "activo")
    .map(({ id, label }) => ({ id, label }));
}

/* ===============================
   UI BLOCKS
================================ */
function buildButtonBlocks(
  headerText: string,
  items: Array<{ id: string; label: string }>,
  actionId: string
): unknown[] {
  const blocks: unknown[] = [{ type: "section", text: { type: "mrkdwn", text: headerText } }];

  for (let i = 0; i < items.length; i += 5) {
    blocks.push({
      type: "actions",
      elements: items.slice(i, i + 5).map((item) => ({
        type: "button",
        text: { type: "plain_text", text: item.label },
        value: item.id,
        action_id: actionId,
      })),
    });
  }

  return blocks;
}

function buildConfirmBlocks(session: SlackSession): unknown[] {
  const resumen =
    `🧾 *Resumen del gasto*\n\n` +
    `• *Categoría:* ${session.categoria ?? ""}\n` +
    `• *Monto:* $${session.monto ?? ""}\n` +
    `• *Sucursal:* ${session.sucursalNombre ?? session.sucursalId ?? ""}\n` +
    `• *Autobús:* ${session.autobusNombre ?? session.autobusId ?? ""}\n\n` +
    `¿Confirmas el gasto?`;

  return [
    { type: "section", text: { type: "mrkdwn", text: resumen } },
    {
      type: "actions",
      elements: [
        { type: "button", text: { type: "plain_text", text: "✏️ Editar monto" }, action_id: "editar_monto", value: "editar_monto" },
        { type: "button", text: { type: "plain_text", text: "❌ Cancelar" }, action_id: "cancelar", style: "danger", value: "cancelar" },
        { type: "button", text: { type: "plain_text", text: "✅ Confirmar" }, action_id: "confirmar", style: "primary", value: "confirmar" },
      ],
    },
  ];
}

/* ===============================
   FLOW HANDLERS
================================ */
async function handleSlashCommand(body: SlackRequestBody, res: functions.Response) {
  const channelId = getString(body.channel_id)?.trim();
  const userId = getString(body.user_id)?.trim();

  if (!channelId || !userId) {
    respondJson(res, { response_type: "ephemeral", text: "❌ No se pudo identificar canal/usuario." });
    return;
  }

  const channelInfo = await getAuthorizedChannel(channelId);
  if (!channelInfo) {
    respondJson(res, { response_type: "ephemeral", text: "❌ Este canal no está autorizado para registrar gastos." });
    return;
  }

  await admin.firestore().collection("slack_sessions").doc(`${channelId}_${userId}`).set(
    {
      channelId,
      userId,
      empresaId: channelInfo.empresaId,
      step: "CATEGORIA",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const blocks = buildButtonBlocks(
    "*Selecciona la categoría*",
    CATEGORIAS.map((c) => ({ id: c, label: c })),
    "categoria"
  );

  respondJson(res, { response_type: "ephemeral", text: "Selecciona la categoría", blocks });
}

async function handleInteractive(payload: SlackActionPayload) {
  const action = payload.actions?.[0];
  const actionId = getString(action?.action_id);
  const actionValue = getString(action?.value);
  const actionText = getString(action?.text?.text);
  const channelId = getString(payload.channel?.id);
  const userId = getString(payload.user?.id);

  if (!channelId || !userId || !actionId) return;

  const sessionRef = admin.firestore().collection("slack_sessions").doc(`${channelId}_${userId}`);
  const snap = await sessionRef.get();

  if (!snap.exists) {
    await sendMessage(channelId, "❌ Sesión expirada. Usa /gasto de nuevo.");
    return;
  }

  const session = snap.data() as SlackSession;

  if (actionId === "categoria" && session.step === "CATEGORIA") {
    if (!actionValue) return;

    await sessionRef.update({
      categoria: actionValue,
      step: "MONTO",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await sendMessage(channelId, "✍️ Escribe el *monto* (ej: `120` o `120.50`).");
    return;
  }

  if (actionId === "sucursal" && session.step === "SUCURSAL") {
    if (!actionValue) return;

    await sessionRef.update({
      sucursalId: actionValue,
      sucursalNombre: actionText,
      step: "AUTOBUS",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const autobuses = await getAutobuses(actionValue);
    if (!autobuses.length) {
      await sessionRef.delete();
      await sendMessage(channelId, "❌ No hay autobuses activos para esta sucursal.");
      return;
    }

    const blocks = buildButtonBlocks(
      "*Selecciona el autobús*",
      autobuses.map((b) => ({ id: b.id, label: b.label })),
      "autobus"
    );

    await sendMessage(channelId, "Selecciona el autobús", blocks);
    return;
  }

  if (actionId === "autobus" && session.step === "AUTOBUS") {
    if (!actionValue) return;

    const updated: SlackSession = {
      ...session,
      autobusId: actionValue,
      autobusNombre: actionText ?? actionValue,
      step: "CONFIRMAR",
    };

    await sessionRef.update({
      autobusId: updated.autobusId,
      autobusNombre: updated.autobusNombre,
      step: updated.step,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await sendMessage(channelId, "Confirma el gasto:", buildConfirmBlocks(updated));
    return;
  }

  if (actionId === "editar_monto") {
    await sessionRef.update({
      step: "MONTO",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await sendMessage(channelId, "✏️ Escribe el *nuevo monto*.");
    return;
  }

  if (actionId === "cancelar") {
    await sessionRef.delete();
    await sendMessage(channelId, "❌ Gasto cancelado.");
    return;
  }

  if (actionId === "confirmar") {
    const empresaId = getString(session.empresaId);
    const categoria = getString(session.categoria);
    const sucursalId = getString(session.sucursalId);
    const autobusId = getString(session.autobusId);
    const monto = typeof session.monto === "number" ? session.monto : null;

    if (!empresaId || !categoria || !sucursalId || !autobusId || !monto) {
      await sendMessage(channelId, "❌ Faltan datos. Usa /gasto de nuevo.");
      await sessionRef.delete();
      return;
    }

    await admin.firestore().collection("gastos").add({
      empresaId,
      descripcion: categoria,
      tipo: categoria,
      monto,
      sucursalId,
      autobusId,
      fecha: admin.firestore.FieldValue.serverTimestamp(),
      source: "slack",
      canalSlack: channelId,
      usuarioSlack: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await sessionRef.delete();
    await sendMessage(channelId, "✅ Gasto registrado correctamente.");
  }
}

async function handleMessageEvent(event: SlackEvent) {
  if (event.type !== "message" || event.subtype || event.bot_id) return;

  const channelId = getString(event.channel);
  const userId = getString(event.user);
  const text = getString(event.text)?.trim();

  if (!channelId || !userId || !text) return;

  const sessionRef = admin.firestore().collection("slack_sessions").doc(`${channelId}_${userId}`);
  const snap = await sessionRef.get();
  if (!snap.exists) return;

  const session = snap.data() as SlackSession;
  if (session.step !== "MONTO") return;

  const monto = parseAmount(text);
  if (!monto || monto <= 0) {
    await sendMessage(channelId, "❌ Monto inválido. Ejemplo: `120`.");
    return;
  }

  await sessionRef.update({
    monto,
    step: "SUCURSAL",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const empresaId = getString(session.empresaId);
  if (!empresaId) {
    await sessionRef.delete();
    await sendMessage(channelId, "❌ Sesión inválida. Usa /gasto de nuevo.");
    return;
  }

  const sucursales = await getSucursales(empresaId);
  if (!sucursales.length) {
    await sessionRef.delete();
    await sendMessage(channelId, "❌ No hay sucursales activas para esta empresa.");
    return;
  }

  const blocks = buildButtonBlocks("*Selecciona la sucursal*", sucursales, "sucursal");
  await sendMessage(channelId, "Selecciona la sucursal", blocks);
}

/* ===============================
   MAIN WEBHOOK
================================ */
export const slackWebhook = functions.https.onRequest(async (req, res) => {
  try {
    if (!verifySlackSignature(req)) {
      res.status(401).send("Invalid Slack signature");
      return;
    }

    const body = parseSlackBody(req);

    // Debug (no imprime secretos)
    const ct = req.headers["content-type"];
    const keys = Object.keys(body);
    const command = getString(body.command)?.trim();

    // Si Slack manda un slash command pero no lo detectamos, LO MOSTRAMOS EN SLACK (para cortar el “OK”)
    if (keys.includes("command") && command !== "/gasto") {
      respondJson(res, {
        response_type: "ephemeral",
        text: `⚠️ Recibí command="${command ?? "undefined"}" (content-type: ${ct ?? "?"}). Keys: ${keys.join(", ")}`,
      });
      return;
    }

    // 1) Slash command
    if (command === "/gasto") {
      await handleSlashCommand(body, res);
      return;
    }

    // 2) Interactivity
    const payloadString = getString(body.payload);
    if (payloadString) {
      res.status(200).send();
      try {
        const payload = JSON.parse(payloadString) as SlackActionPayload;
        await handleInteractive(payload);
      } catch (e) {
        console.error("❌ Invalid payload JSON:", e);
      }
      return;
    }

    // 3) Events
    const event = body.event as SlackEvent | undefined;
    if (event) {
      res.status(200).send();
      await handleMessageEvent(event);
      return;
    }

    respondJson(res, {
      response_type: "ephemeral",
      text:
        "⚠️ No pude detectar /gasto.\n" +
        `content-type: ${String(req.headers["content-type"])}\n` +
        `method: ${req.method}\n` +
        `hasRawBody: ${Boolean(getRawBodyText(req))}\n` +
        `bodyType: ${typeof req.body}\n` +
        `bodyKeys: ${
          req.body && typeof req.body === "object"
            ? Object.keys(req.body as Record<string, unknown>).join(",")
            : "N/A"
        }`,
    });

  } catch (error) {
    console.error("❌ Slack webhook error:", error);
    if (!res.headersSent) {
      respondJson(res, {
        response_type: "ephemeral",
        text: "❌ Error interno en slackWebhook. Revisa logs.",
      });
    }
  }
});

/* ===============================
   OAUTH CALLBACK
================================ */
export const slackOAuthCallback = functions.https.onRequest(async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      res.status(400).send("Missing OAuth code");
      return;
    }

    const clientId = getSlackClientId();
    const clientSecret = getSlackClientSecret();
    if (!clientId || !clientSecret) {
      res.status(500).send("Slack OAuth config missing");
      return;
    }

    const response = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: "https://us-central1-saas-budget-b3c59.cloudfunctions.net/slackOAuthCallback",
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      res.status(400).json(data);
      return;
    }

    console.log("✅ Slack OAuth OK:", data.team?.id, data.team?.name);
    res.send("✅ Slack OAuth OK");
  } catch (err) {
    console.error("❌ slackOAuthCallback error:", err);
    res.status(500).send("Internal Server Error");
  }
});
