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
exports.crearViajeSeguro = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const inicioDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0, 0);
const finDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);
const isChoferDisponible = async (choferId, fecha) => {
    const start = inicioDia(fecha);
    const end = finDia(fecha);
    const ref = admin.firestore().collection("choferes").doc(choferId).collection("horarios");
    const snap = await ref
        .where("startDate", "<=", admin.firestore.Timestamp.fromDate(end))
        .orderBy("startDate", "desc")
        .get();
    let disponible = false;
    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const startDate = data.startDate instanceof admin.firestore.Timestamp
            ? data.startDate.toDate()
            : null;
        const endDate = data.endDate instanceof admin.firestore.Timestamp
            ? data.endDate.toDate()
            : null;
        const status = String(data.status || "");
        if (!startDate || !endDate)
            continue;
        if (endDate.getTime() < start.getTime() || startDate.getTime() > end.getTime())
            continue;
        if (status === "DESCANSO") {
            return false;
        }
        if (status === "DISPONIBLE") {
            disponible = true;
        }
    }
    return disponible;
};
exports.crearViajeSeguro = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Debes estar autenticado para crear viajes.");
        }
        const { fecha, rutaId, autobusId, choferId, estado, empresaId } = data;
        if (!fecha || !rutaId || !autobusId || !choferId || !estado || !empresaId) {
            throw new functions.https.HttpsError("invalid-argument", "Campos requeridos: fecha, rutaId, autobusId, choferId, estado, empresaId.");
        }
        const callerSnap = await admin
            .firestore()
            .collection("usuarios")
            .doc(context.auth.uid)
            .get();
        if (!callerSnap.exists) {
            throw new functions.https.HttpsError("permission-denied", "No tienes permisos para crear viajes.");
        }
        const callerData = callerSnap.data() || {};
        const callerRol = String(callerData.rol || "").toLowerCase();
        const callerEmpresaId = String(callerData.empresaId || "");
        const esSuperadmin = callerRol === "superadmin";
        const puedeCrear = callerRol === "admin" || callerRol === "operaciones" || esSuperadmin;
        if (!puedeCrear) {
            throw new functions.https.HttpsError("permission-denied", "No tienes permisos para crear viajes.");
        }
        if (!esSuperadmin && empresaId !== callerEmpresaId) {
            throw new functions.https.HttpsError("permission-denied", "No puedes crear viajes para otra empresa.");
        }
        const estadosValidos = ["programado", "en_curso", "completado"];
        if (!estadosValidos.includes(estado)) {
            throw new functions.https.HttpsError("invalid-argument", "Estado inválido para el viaje.");
        }
        const fechaViaje = new Date(fecha);
        if (Number.isNaN(fechaViaje.getTime())) {
            throw new functions.https.HttpsError("invalid-argument", "Fecha inválida.");
        }
        const choferSnap = await admin.firestore().collection("choferes").doc(choferId).get();
        if (!choferSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Chofer no encontrado.");
        }
        const choferData = choferSnap.data() || {};
        const choferEmpresaId = String(choferData.empresaId || "");
        if (!esSuperadmin && choferEmpresaId && choferEmpresaId !== empresaId) {
            throw new functions.https.HttpsError("permission-denied", "El chofer no pertenece a la empresa indicada.");
        }
        const disponible = await isChoferDisponible(choferId, fechaViaje);
        if (!disponible) {
            throw new functions.https.HttpsError("failed-precondition", "El chofer no está disponible en la fecha seleccionada.");
        }
        const payload = {
            fecha: admin.firestore.Timestamp.fromDate(fechaViaje),
            rutaId,
            autobusId,
            choferId,
            estado,
            empresaId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const ref = await admin.firestore().collection("viajes").add(payload);
        return {
            id: ref.id,
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error("❌ Error crearViajeSeguro:", error);
        throw new functions.https.HttpsError("unknown", (error === null || error === void 0 ? void 0 : error.message) || "Error desconocido al crear el viaje.");
    }
});
