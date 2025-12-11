import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

interface CreateUserAdminData {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  empresaId: string;
}

export const createUserAdmin = functions.https.onCall(
  async (data: CreateUserAdminData, context) => {
    try {
      // ---------------------------------------------------
      // 1️⃣ Validación: Solo usuarios autenticados pueden crear otros
      // ---------------------------------------------------
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Debes estar autenticado para crear usuarios."
        );
      }

      // ---------------------------------------------------
      // 2️⃣ Validación: Revisar campos obligatorios
      // ---------------------------------------------------
      const { nombre, email, password, rol, empresaId } = data;

      if (!nombre || !email || !password || !rol || !empresaId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Todos los campos son obligatorios: nombre, email, password, rol, empresaId"
        );
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

    } catch (error: any) {
      console.error("❌ Error createUserAdmin:", error);

      // Firebase HttpsError ya formatea correctamente
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Cualquier otro error desconocido
      throw new functions.https.HttpsError(
        "unknown",
        error?.message || "Error desconocido al crear el usuario."
      );
    }
  }
);
