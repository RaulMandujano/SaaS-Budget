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
exports.slackOAuthCallback = void 0;
const functions = __importStar(require("firebase-functions"));
const node_fetch_1 = __importDefault(require("node-fetch"));
exports.slackOAuthCallback = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        const code = req.query.code;
        if (!code) {
            res.status(400).send("Missing OAuth code");
            return;
        }
        // ✅ LEER DESDE ENV PRIMERO (GEN 2 SAFE)
        const clientId = process.env.SLACK_CLIENT_ID ||
            ((_b = (_a = functions.config()) === null || _a === void 0 ? void 0 : _a.slack) === null || _b === void 0 ? void 0 : _b.client_id);
        const clientSecret = process.env.SLACK_CLIENT_SECRET ||
            ((_d = (_c = functions.config()) === null || _c === void 0 ? void 0 : _c.slack) === null || _d === void 0 ? void 0 : _d.client_secret);
        if (!clientId || !clientSecret) {
            console.error("❌ Missing Slack OAuth env vars", {
                clientIdExists: !!clientId,
                clientSecretExists: !!clientSecret,
            });
            res.status(500).send("Slack OAuth env vars not configured");
            return;
        }
        const response = await (0, node_fetch_1.default)("https://slack.com/api/oauth.v2.access", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: "https://us-central1-saas-budget-b3c59.cloudfunctions.net/slackOAuthCallback",
            }),
        });
        const data = await response.json();
        if (!data.ok) {
            console.error("❌ Slack OAuth failed:", data);
            res.status(400).json(data);
            return;
        }
        console.log("✅ Slack OAuth OK:", {
            team: (_e = data.team) === null || _e === void 0 ? void 0 : _e.name,
            teamId: (_f = data.team) === null || _f === void 0 ? void 0 : _f.id,
        });
        res.send("✅ Slack OAuth OK, app installed successfully.");
    }
    catch (error) {
        console.error("❌ OAuth Callback Crash:", error);
        res.status(500).send("Internal Server Error");
    }
});
