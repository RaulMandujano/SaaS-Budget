import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

type EstadoViaje = "programado" | "en_curso" | "completado";

interface CrearViajeData {
  fecha: string;
  rutaId: string;
  autobusId: string;
  choferId: string;
  estado: EstadoViaje;
  empresaId: string;
}

const inicioDia = (fecha: Date) =>
  new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0, 0);

const finDia = (fecha: Date) =>
  new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);

const isChoferDisponible = async (choferId: string, fecha: Date): Promise<boolean> => {
  const start = inicioDia(fecha);
  const end = finDia(fecha);
  const ref = admin.firestore().collection("choferes").doc(choferId).collection("horarios");
  const snap = await ref
    .where("startDate", "<=", admin.firestore.Timestamp.fromDate(end))
    .orderBy("startDate", "desc")
    .get();

  let disponible = false;
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const startDate = data.startDate instanceof admin.firestore.Timestamp
      ? data.startDate.toDate()
      : null;
    const endDate = data.endDate instanceof admin.firestore.Timestamp
      ? data.endDate.toDate()
      : null;
    const status = String(data.status || "");
    if (!startDate || !endDate) continue;
    if (endDate.getTime() < start.getTime() || startDate.getTime() > end.getTime()) continue;
    if (status === "DESCANSO") {
      return false;
    }
    if (status === "DISPONIBLE") {
      disponible = true;
    }
  }

  return disponible;
};

export const crearViajeSeguro = functions.https.onCall(
  async (data: CrearViajeData, context) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Debes estar autenticado para crear viajes."
        );
      }

      const { fecha, rutaId, autobusId, choferId, estado, empresaId } = data;

      if (!fecha || !rutaId || !autobusId || !choferId || !estado || !empresaId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Campos requeridos: fecha, rutaId, autobusId, choferId, estado, empresaId."
        );
      }

      const callerSnap = await admin
        .firestore()
        .collection("usuarios")
        .doc(context.auth.uid)
        .get();

      if (!callerSnap.exists) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "No tienes permisos para crear viajes."
        );
      }

      const callerData = callerSnap.data() || {};
      const callerRol = String(callerData.rol || "").toLowerCase();
      const callerEmpresaId = String(callerData.empresaId || "");
      const esSuperadmin = callerRol === "superadmin";
      const puedeCrear = callerRol === "admin" || callerRol === "operaciones" || esSuperadmin;

      if (!puedeCrear) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "No tienes permisos para crear viajes."
        );
      }

      if (!esSuperadmin && empresaId !== callerEmpresaId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "No puedes crear viajes para otra empresa."
        );
      }

      const estadosValidos: EstadoViaje[] = ["programado", "en_curso", "completado"];
      if (!estadosValidos.includes(estado)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Estado inválido para el viaje."
        );
      }

      const fechaViaje = new Date(fecha);
      if (Number.isNaN(fechaViaje.getTime())) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Fecha inválida."
        );
      }

      const choferSnap = await admin.firestore().collection("choferes").doc(choferId).get();
      if (!choferSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Chofer no encontrado."
        );
      }

      const choferData = choferSnap.data() || {};
      const choferEmpresaId = String(choferData.empresaId || "");
      if (!esSuperadmin && choferEmpresaId && choferEmpresaId !== empresaId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "El chofer no pertenece a la empresa indicada."
        );
      }

      const disponible = await isChoferDisponible(choferId, fechaViaje);

      if (!disponible) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "El chofer no está disponible en la fecha seleccionada."
        );
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
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error("❌ Error crearViajeSeguro:", error);
      throw new functions.https.HttpsError(
        "unknown",
        error?.message || "Error desconocido al crear el viaje."
      );
    }
  }
);
