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
exports.createUserAdmin = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.createUserAdmin = functions.https.onCall(async (data, context) => {
    try {
        // ---------------------------------------------------
        // 1️⃣ Validación: Solo usuarios autenticados pueden crear otros
        // ---------------------------------------------------
        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Debes estar autenticado para crear usuarios.");
        }
        // ---------------------------------------------------
        // 2️⃣ Validación: Revisar campos obligatorios
        // ---------------------------------------------------
        const { nombre, email, password, rol, empresaId } = data;
        if (!nombre || !email || !password || !rol || !empresaId) {
            throw new functions.https.HttpsError("invalid-argument", "Todos los campos son obligatorios: nombre, email, password, rol, empresaId");
        }
        // ---------------------------------------------------
        // 3️⃣ Crear usuario en Firebase Authentication
        // ---------------------------------------------------
        const userRecord = await admin.auth().createUser({
            email,
            password,
        });
        // ---------------------------------------------------
        // 4️⃣ Guardar usuario en Firestore (colección usuarios)
        // ---------------------------------------------------
        await admin.firestore().collection("usuarios").doc(userRecord.uid).set({
            uid: userRecord.uid,
            nombre,
            email,
            rol,
            activo: true,
            empresaId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // ---------------------------------------------------
        // 5️⃣ Respuesta
        // ---------------------------------------------------
        return {
            success: true,
            uid: userRecord.uid,
            message: "Usuario creado correctamente.",
        };
    }
    catch (error) {
        console.error("❌ Error createUserAdmin:", error);
        // Firebase HttpsError ya formatea correctamente
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Cualquier otro error desconocido
        throw new functions.https.HttpsError("unknown", error?.message || "Error desconocido al crear el usuario.");
    }
});
