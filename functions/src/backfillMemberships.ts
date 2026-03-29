import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ensureTenantInfrastructureForUser } from "./tenancy";

if (!admin.apps.length) {
  admin.initializeApp();
}

interface BackfillMembershipsData {
  empresaId?: string;
}

export const backfillMemberships = functions.https.onCall(
  async (data: BackfillMembershipsData, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debes estar autenticado para ejecutar el backfill."
      );
    }

    const firestore = admin.firestore();
    const callerSnap = await firestore.collection("usuarios").doc(context.auth.uid).get();

    if (!callerSnap.exists) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "No tienes permisos para ejecutar el backfill."
      );
    }

    const callerData = callerSnap.data() || {};
    const callerRol = String(callerData.rol || "").toLowerCase();
    // TODO: migrate to membership model
    const callerEmpresaId = String(callerData.empresaId || "");
    const esSuperadmin = callerRol === "superadmin";
    const esAdmin = callerRol === "admin";

    if (!esSuperadmin && !esAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo administradores pueden ejecutar el backfill."
      );
    }

    const empresaObjetivo = String(data?.empresaId || "").trim();
    if (!esSuperadmin && empresaObjetivo && empresaObjetivo !== callerEmpresaId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "No puedes ejecutar el backfill para otra empresa."
      );
    }

    const usuariosRef = firestore.collection("usuarios");
    const usuariosSnap =
      esSuperadmin && !empresaObjetivo
        ? await usuariosRef.get()
        : await usuariosRef
            .where("empresaId", "==", empresaObjetivo || callerEmpresaId)
            .get();

    let usuariosConEmpresa = 0;
    let membresiasCreadas = 0;
    let empresasActualizadas = 0;
    const empresasConModulos = new Set<string>();

    for (const usuarioDoc of usuariosSnap.docs) {
      const userData = usuarioDoc.data() || {};
      const empresaId = String(userData.empresaId || "").trim();

      if (!empresaId) {
        continue;
      }

      usuariosConEmpresa += 1;
      const role = String(userData.rol || "admin").toLowerCase() || "admin";
      const result = await ensureTenantInfrastructureForUser({
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
  }
);
