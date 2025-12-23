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
exports.slackOAuthCallback = exports.slackWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const crypto_1 = __importDefault(require("crypto"));
const node_fetch_1 = __importDefault(require("node-fetch"));
admin.initializeApp();
const CATEGORIAS = ["Combustible", "Mantenimiento", "Peajes", "Sueldos", "Otros"];
/* ===============================
   CONFIG HELPERS
================================ */
function cfg(path) {
    const parts = path.split(".");
    let cur = functions.config();
    for (const p of parts) {
        if (!cur || typeof cur !== "object")
            return undefined;
        cur = cur[p];
    }
    return typeof cur === "string" ? cur : undefined;
}
function getSlackBotToken() {
    const token = process.env.SLACK_BOT_TOKEN || cfg("slack.bot_token");
    if (!token)
        throw new Error("Missing Slack bot token");
    return token;
}
function getSlackSigningSecret() {
    const secret = process.env.SLACK_SIGNING_SECRET || cfg("slack.signing_secret");
    return secret;
}
function getSlackClientId() {
    return process.env.SLACK_CLIENT_ID || cfg("slack.client_id");
}
function getSlackClientSecret() {
    return process.env.SLACK_CLIENT_SECRET || cfg("slack.client_secret");
}
/* ===============================
   BASIC UTILS
================================ */
function getString(v) {
    return typeof v === "string" ? v : undefined;
}
function parseBoolean(value) {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return value !== 0;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "si", "sí", "yes", "y"].includes(normalized))
            return true;
        if (["false", "0", "no", "n"].includes(normalized))
            return false;
    }
    return undefined;
}
function parseAmount(input) {
    const cleaned = input.replace(/[^0-9,.-]/g, "").trim();
    if (!cleaned)
        return null;
    const hasComma = cleaned.includes(",");
    const hasDot = cleaned.includes(".");
    let normalized = cleaned;
    if (hasComma && hasDot)
        normalized = cleaned.replace(/,/g, "");
    else if (hasComma && !hasDot)
        normalized = cleaned.replace(/,/g, ".");
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
}
function respondJson(res, payload) {
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(payload));
}
function getRawBodyText(req) {
    var _a;
    const rawBodyValue = req.rawBody;
    if (typeof rawBodyValue === "string")
        return rawBodyValue;
    return (_a = rawBodyValue === null || rawBodyValue === void 0 ? void 0 : rawBodyValue.toString("utf8")) !== null && _a !== void 0 ? _a : "";
}
/* ===============================
   PARSE SLACK BODY (ROBUSTO)
   - Slack manda x-www-form-urlencoded.
   - A veces rawBody no viene como esperas, entonces caemos a req.body.
================================ */
function parseSlackBody(req) {
    const contentTypeHeader = req.headers["content-type"];
    const contentType = Array.isArray(contentTypeHeader)
        ? contentTypeHeader.join(";")
        : contentTypeHeader;
    const rawBody = getRawBodyText(req);
    const bodyText = rawBody ||
        (typeof req.body === "string"
            ? req.body
            : Buffer.isBuffer(req.body)
                ? req.body.toString("utf8")
                : "");
    if (typeof contentType === "string" &&
        contentType.toLowerCase().includes("application/x-www-form-urlencoded")) {
        if (bodyText) {
            return Object.fromEntries(new URLSearchParams(bodyText).entries());
        }
        if (req.body && typeof req.body === "object") {
            return req.body;
        }
        return {};
    }
    if (req.body && typeof req.body === "object")
        return req.body;
    if (bodyText) {
        try {
            return JSON.parse(bodyText);
        }
        catch {
            return {};
        }
    }
    return {};
}
/* ===============================
   SLACK SIGNATURE VERIFY
================================ */
function verifySlackSignature(req) {
    const secret = getSlackSigningSecret();
    if (!secret)
        return true;
    const timestamp = getString(req.headers["x-slack-request-timestamp"]);
    const signature = getString(req.headers["x-slack-signature"]);
    if (!timestamp || !signature)
        return false;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts))
        return false;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > 60 * 5)
        return false;
    const rawBody = getRawBodyText(req);
    const base = `v0:${timestamp}:${rawBody}`;
    const digest = crypto_1.default.createHmac("sha256", secret).update(base).digest("hex");
    const computed = `v0=${digest}`;
    if (computed.length !== signature.length)
        return false;
    return crypto_1.default.timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(signature, "utf8"));
}
/* ===============================
   SLACK API
================================ */
async function slackApi(method, payload) {
    const response = await (0, node_fetch_1.default)(`https://slack.com/api/${method}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${getSlackBotToken()}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    const data = (await response.json());
    if (!(data === null || data === void 0 ? void 0 : data.ok))
        console.error(`❌ Slack API error (${method}):`, data);
    return data;
}
async function sendMessage(channel, text, blocks) {
    const payload = { channel, text };
    if (blocks === null || blocks === void 0 ? void 0 : blocks.length)
        payload.blocks = blocks;
    await slackApi("chat.postMessage", payload);
}
/* ===============================
   FIRESTORE HELPERS
================================ */
async function getAuthorizedChannel(channelId) {
    var _a, _b, _c, _d, _e;
    const normalizedChannelId = channelId.trim();
    const collection = admin.firestore().collection("slack_channels");
    let doc = await collection.doc(normalizedChannelId).get();
    if (!doc.exists) {
        const snap = await collection.where("channelId", "==", normalizedChannelId).limit(1).get();
        if (snap.empty)
            return null;
        doc = snap.docs[0];
    }
    if (!doc.exists)
        return null;
    const data = (_a = doc.data()) !== null && _a !== void 0 ? _a : {};
    const activo = parseBoolean((_c = (_b = data.activo) !== null && _b !== void 0 ? _b : data.active) !== null && _c !== void 0 ? _c : data.autorizado);
    if (activo !== true)
        return null;
    const empresaId = ((_e = getString((_d = data.empresaId) !== null && _d !== void 0 ? _d : data.empresa_id)) !== null && _e !== void 0 ? _e : "").trim();
    if (!empresaId)
        return null;
    return { empresaId };
}
async function getSucursales(empresaId) {
    const snap = await admin.firestore()
        .collection("sucursales")
        .where("empresaId", "==", empresaId)
        .limit(200)
        .get();
    return snap.docs
        .map((d) => ({
        id: d.id,
        label: d.data().nombre || d.id,
        activa: d.data().activa !== false,
    }))
        .filter((s) => s.activa)
        .map(({ id, label }) => ({ id, label }));
}
async function getAutobuses(sucursalId) {
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
            label: data.numeroUnidad || data.placa || d.id,
            estado: data.estado || "activo",
        };
    })
        .filter((b) => b.estado === "activo")
        .map(({ id, label }) => ({ id, label }));
}
/* ===============================
   UI BLOCKS
================================ */
function buildButtonBlocks(headerText, items, actionId) {
    const blocks = [{ type: "section", text: { type: "mrkdwn", text: headerText } }];
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
function buildConfirmBlocks(session) {
    var _a, _b, _c, _d, _e, _f;
    const resumen = `🧾 *Resumen del gasto*\n\n` +
        `• *Categoría:* ${(_a = session.categoria) !== null && _a !== void 0 ? _a : ""}\n` +
        `• *Monto:* $${(_b = session.monto) !== null && _b !== void 0 ? _b : ""}\n` +
        `• *Sucursal:* ${(_d = (_c = session.sucursalNombre) !== null && _c !== void 0 ? _c : session.sucursalId) !== null && _d !== void 0 ? _d : ""}\n` +
        `• *Autobús:* ${(_f = (_e = session.autobusNombre) !== null && _e !== void 0 ? _e : session.autobusId) !== null && _f !== void 0 ? _f : ""}\n\n` +
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
async function handleSlashCommand(body, res) {
    var _a, _b;
    const channelId = (_a = getString(body.channel_id)) === null || _a === void 0 ? void 0 : _a.trim();
    const userId = (_b = getString(body.user_id)) === null || _b === void 0 ? void 0 : _b.trim();
    if (!channelId || !userId) {
        respondJson(res, { response_type: "ephemeral", text: "❌ No se pudo identificar canal/usuario." });
        return;
    }
    const channelInfo = await getAuthorizedChannel(channelId);
    if (!channelInfo) {
        respondJson(res, { response_type: "ephemeral", text: "❌ Este canal no está autorizado para registrar gastos." });
        return;
    }
    await admin.firestore().collection("slack_sessions").doc(`${channelId}_${userId}`).set({
        channelId,
        userId,
        empresaId: channelInfo.empresaId,
        step: "CATEGORIA",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    const blocks = buildButtonBlocks("*Selecciona la categoría*", CATEGORIAS.map((c) => ({ id: c, label: c })), "categoria");
    respondJson(res, { response_type: "ephemeral", text: "Selecciona la categoría", blocks });
}
async function handleInteractive(payload) {
    var _a, _b, _c, _d;
    const action = (_a = payload.actions) === null || _a === void 0 ? void 0 : _a[0];
    const actionId = getString(action === null || action === void 0 ? void 0 : action.action_id);
    const actionValue = getString(action === null || action === void 0 ? void 0 : action.value);
    const actionText = getString((_b = action === null || action === void 0 ? void 0 : action.text) === null || _b === void 0 ? void 0 : _b.text);
    const channelId = getString((_c = payload.channel) === null || _c === void 0 ? void 0 : _c.id);
    const userId = getString((_d = payload.user) === null || _d === void 0 ? void 0 : _d.id);
    if (!channelId || !userId || !actionId)
        return;
    const sessionRef = admin.firestore().collection("slack_sessions").doc(`${channelId}_${userId}`);
    const snap = await sessionRef.get();
    if (!snap.exists) {
        await sendMessage(channelId, "❌ Sesión expirada. Usa /gasto de nuevo.");
        return;
    }
    const session = snap.data();
    if (actionId === "categoria" && session.step === "CATEGORIA") {
        if (!actionValue)
            return;
        await sessionRef.update({
            categoria: actionValue,
            step: "MONTO",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await sendMessage(channelId, "✍️ Escribe el *monto* (ej: `120` o `120.50`).");
        return;
    }
    if (actionId === "sucursal" && session.step === "SUCURSAL") {
        if (!actionValue)
            return;
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
        const blocks = buildButtonBlocks("*Selecciona el autobús*", autobuses.map((b) => ({ id: b.id, label: b.label })), "autobus");
        await sendMessage(channelId, "Selecciona el autobús", blocks);
        return;
    }
    if (actionId === "autobus" && session.step === "AUTOBUS") {
        if (!actionValue)
            return;
        const updated = {
            ...session,
            autobusId: actionValue,
            autobusNombre: actionText !== null && actionText !== void 0 ? actionText : actionValue,
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
async function handleMessageEvent(event) {
    var _a;
    if (event.type !== "message" || event.subtype || event.bot_id)
        return;
    const channelId = getString(event.channel);
    const userId = getString(event.user);
    const text = (_a = getString(event.text)) === null || _a === void 0 ? void 0 : _a.trim();
    if (!channelId || !userId || !text)
        return;
    const sessionRef = admin.firestore().collection("slack_sessions").doc(`${channelId}_${userId}`);
    const snap = await sessionRef.get();
    if (!snap.exists)
        return;
    const session = snap.data();
    if (session.step !== "MONTO")
        return;
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
exports.slackWebhook = functions.https.onRequest(async (req, res) => {
    var _a;
    try {
        if (!verifySlackSignature(req)) {
            res.status(401).send("Invalid Slack signature");
            return;
        }
        const body = parseSlackBody(req);
        // Debug (no imprime secretos)
        const ct = req.headers["content-type"];
        const keys = Object.keys(body);
        const command = (_a = getString(body.command)) === null || _a === void 0 ? void 0 : _a.trim();
        // Si Slack manda un slash command pero no lo detectamos, LO MOSTRAMOS EN SLACK (para cortar el “OK”)
        if (keys.includes("command") && command !== "/gasto") {
            respondJson(res, {
                response_type: "ephemeral",
                text: `⚠️ Recibí command="${command !== null && command !== void 0 ? command : "undefined"}" (content-type: ${ct !== null && ct !== void 0 ? ct : "?"}). Keys: ${keys.join(", ")}`,
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
                const payload = JSON.parse(payloadString);
                await handleInteractive(payload);
            }
            catch (e) {
                console.error("❌ Invalid payload JSON:", e);
            }
            return;
        }
        // 3) Events
        const event = body.event;
        if (event) {
            res.status(200).send();
            await handleMessageEvent(event);
            return;
        }
        respondJson(res, {
            response_type: "ephemeral",
            text: "⚠️ No pude detectar /gasto.\n" +
                `content-type: ${String(req.headers["content-type"])}\n` +
                `method: ${req.method}\n` +
                `hasRawBody: ${Boolean(getRawBodyText(req))}\n` +
                `bodyType: ${typeof req.body}\n` +
                `bodyKeys: ${req.body && typeof req.body === "object"
                    ? Object.keys(req.body).join(",")
                    : "N/A"}`,
        });
    }
    catch (error) {
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
exports.slackOAuthCallback = functions.https.onRequest(async (req, res) => {
    var _a, _b;
    try {
        const code = req.query.code;
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
        const response = await (0, node_fetch_1.default)("https://slack.com/api/oauth.v2.access", {
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
        console.log("✅ Slack OAuth OK:", (_a = data.team) === null || _a === void 0 ? void 0 : _a.id, (_b = data.team) === null || _b === void 0 ? void 0 : _b.name);
        res.send("✅ Slack OAuth OK");
    }
    catch (err) {
        console.error("❌ slackOAuthCallback error:", err);
        res.status(500).send("Internal Server Error");
    }
});
