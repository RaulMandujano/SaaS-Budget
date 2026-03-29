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
exports.ensureTenantInfrastructureForUser = exports.ensureBaseModulesForEmpresa = exports.ensureMembershipForUser = exports.BASE_MODULES = void 0;
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.BASE_MODULES = ["dashboard", "gastos", "viajes", "it"];
const ensureMembershipForUser = async ({ uid, empresaId, role, status = "active", }) => {
    const firestore = admin.firestore();
    const membershipRef = firestore
        .collection("empresas")
        .doc(empresaId)
        .collection("membresias")
        .doc(uid);
    const existingMembership = await membershipRef.get();
    const payload = {
        uid,
        empresaId,
        role,
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (!existingMembership.exists) {
        payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }
    await membershipRef.set(payload, { merge: true });
    return { created: !existingMembership.exists };
};
exports.ensureMembershipForUser = ensureMembershipForUser;
const ensureBaseModulesForEmpresa = async (empresaId) => {
    const firestore = admin.firestore();
    const createdModules = [];
    for (const moduleId of exports.BASE_MODULES) {
        const moduleRef = firestore.collection("empresas").doc(empresaId).collection("modulos").doc(moduleId);
        const moduleSnap = await moduleRef.get();
        if (moduleSnap.exists) {
            continue;
        }
        await moduleRef.set({
            enabled: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        createdModules.push(moduleId);
    }
    return createdModules;
};
exports.ensureBaseModulesForEmpresa = ensureBaseModulesForEmpresa;
const ensureTenantInfrastructureForUser = async ({ uid, empresaId, role, status = "active", }) => {
    const [membershipResult, createdModules] = await Promise.all([
        (0, exports.ensureMembershipForUser)({ uid, empresaId, role, status }),
        (0, exports.ensureBaseModulesForEmpresa)(empresaId),
    ]);
    return {
        membershipCreated: membershipResult.created,
        createdModules,
    };
};
exports.ensureTenantInfrastructureForUser = ensureTenantInfrastructureForUser;
