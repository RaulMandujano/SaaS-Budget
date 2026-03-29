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
exports.backfillMemberships = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const tenancy_1 = require("./tenancy");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.backfillMemberships = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debes estar autenticado para ejecutar el backfill.");
    }
    const firestore = admin.firestore();
    const callerSnap = await firestore.collection("usuarios").doc(context.auth.uid).get();
    if (!callerSnap.exists) {
        throw new functions.https.HttpsError("permission-denied", "No tienes permisos para ejecutar el backfill.");
    }
    const callerData = callerSnap.data() || {};
    const callerRol = String(callerData.rol || "").toLowerCase();
    // TODO: migrate to membership model
    const callerEmpresaId = String(callerData.empresaId || "");
    const esSuperadmin = callerRol === "superadmin";
    const esAdmin = callerRol === "admin";
    if (!esSuperadmin && !esAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Solo administradores pueden ejecutar el backfill.");
    }
    const empresaObjetivo = String((data === null || data === void 0 ? void 0 : data.empresaId) || "").trim();
    if (!esSuperadmin && empresaObjetivo && empresaObjetivo !== callerEmpresaId) {
        throw new functions.https.HttpsError("permission-denied", "No puedes ejecutar el backfill para otra empresa.");
    }
    const usuariosRef = firestore.collection("usuarios");
    const usuariosSnap = esSuperadmin && !empresaObjetivo
        ? await usuariosRef.get()
        : await usuariosRef
            .where("empresaId", "==", empresaObjetivo || callerEmpresaId)
            .get();
    let usuariosConEmpresa = 0;
    let membresiasCreadas = 0;
    let empresasActualizadas = 0;
    const empresasConModulos = new Set();
    for (const usuarioDoc of usuariosSnap.docs) {
        const userData = usuarioDoc.data() || {};
        const empresaId = String(userData.empresaId || "").trim();
        if (!empresaId) {
            continue;
        }
        usuariosConEmpresa += 1;
        const role = String(userData.rol || "admin").toLowerCase() || "admin";
        const result = await (0, tenancy_1.ensureTenantInfrastructureForUser)({
            uid: usuarioDoc.id,
            empresaId,
            role,
            status: "active",
        });
        if (result.membershipCreated) {
            membresiasCreadas += 1;
        }
        if (result.createdModules.length > 0) {
            empresasConModulos.add(empresaId);
        }
    }
    empresasActualizadas = empresasConModulos.size;
    return {
        success: true,
        scope: empresaObjetivo || (esSuperadmin ? "all" : callerEmpresaId),
        usuariosRevisados: usuariosSnap.size,
        usuariosConEmpresa,
        membresiasCreadas,
        empresasActualizadas,
        modulosBase: ["dashboard", "gastos", "viajes"],
    };
});
