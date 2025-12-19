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
      // 1.1️⃣ Validación: Solo admin o superadmin pueden crear usuarios
      // ---------------------------------------------------
      const callerSnap = await admin
        .firestore()
        .collection("usuarios")
        .doc(context.auth.uid)
        .get();

      if (!callerSnap.exists) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "No tienes permisos para crear usuarios."
        );
      }

      const callerData = callerSnap.data() || {};
      const callerRol = String(callerData.rol || "").toLowerCase();
      const callerEmpresaId = String(callerData.empresaId || "");
      const esSuperadmin = callerRol === "superadmin";
      const esAdmin = callerRol === "admin";

      if (!esAdmin && !esSuperadmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Solo administradores pueden crear usuarios."
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

      if (!esSuperadmin && empresaId !== callerEmpresaId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "No puedes crear usuarios para otra empresa."
        );
      }

      const rolesPermitidos = ["admin", "finanzas", "operaciones", "superadmin"];
      const rolNormalizado = String(rol || "").toLowerCase();
      if (!rolesPermitidos.includes(rolNormalizado)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Rol inválido. Usa: admin, finanzas, operaciones o superadmin."
        );
      }

      if (rolNormalizado === "superadmin" && !esSuperadmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Solo un superadmin puede crear otro superadmin."
        );
      }

      if (password.length < 6) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "La contraseña debe tener al menos 6 caracteres."
        );
      }

      const emailNormalizado = email.trim().toLowerCase();

      // ---------------------------------------------------
      // 3️⃣ Crear usuario en Firebase Authentication
      // ---------------------------------------------------
      const userRecord = await admin.auth().createUser({
        email: emailNormalizado,
        password,
        displayName: nombre,
      });

      // ---------------------------------------------------
      // 4️⃣ Guardar usuario en Firestore (colección usuarios)
      // ---------------------------------------------------
      await admin.firestore().collection("usuarios").doc(userRecord.uid).set({
        uid: userRecord.uid,
        nombre,
        email: emailNormalizado,
        rol: rolNormalizado,
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
