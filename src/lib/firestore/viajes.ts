import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import { asegurarEmpresaId } from "@/lib/firestore/empresas";

export interface Viaje {
  id: string;
  fecha: Date;
  rutaId: string;
  autobusId: string;
  choferId: string;
  estado: "programado" | "en_curso" | "completado";
  empresaId: string;
  createdAt?: Date | null;
}

const mapViaje = (docSnap: QueryDocumentSnapshot<DocumentData>): Viaje => {
  const data = docSnap.data();
  const fechaRaw = data.fecha;
  const createdAtRaw = data.createdAt;
  const fecha =
    fechaRaw instanceof Timestamp ? fechaRaw.toDate() : fechaRaw?.toDate?.() ?? new Date();
  const createdAt =
    createdAtRaw instanceof Timestamp
      ? createdAtRaw.toDate()
      : createdAtRaw?.toDate?.() ?? null;

  return {
    id: docSnap.id,
    fecha,
    rutaId: data.rutaId ?? "",
    autobusId: data.autobusId ?? "",
    choferId: data.choferId ?? "",
    estado: (data.estado as Viaje["estado"]) ?? "programado",
    empresaId: data.empresaId ?? "",
    createdAt,
  };
};

export const obtenerViajesPorMes = async (
  mes: number,
  año: number,
  empresaIdParam?: string,
): Promise<Viaje[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const primerDia = new Date(año, mes - 1, 1);
  const mesSiguiente = new Date(año, mes, 1);
  const q = query(
    collection(db, "viajes"),
    where("empresaId", "==", empresaId),
    where("fecha", ">=", Timestamp.fromDate(primerDia)),
    where("fecha", "<", Timestamp.fromDate(mesSiguiente)),
    orderBy("fecha", "asc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapViaje);
};

export const crearViaje = async (
  viaje: Omit<Viaje, "id" | "empresaId" | "createdAt">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const functions = getFunctions();
  const callable = httpsCallable(functions, "crearViajeSeguro");
  const result = await callable({
    ...viaje,
    empresaId,
    fecha: viaje.fecha.toISOString(),
  });
  const data = result.data as { id?: string };
  if (!data?.id) {
    throw new Error("No se pudo crear el viaje.");
  }
  return data.id;
};

export const actualizarViaje = async (
  id: string,
  data: Partial<Omit<Viaje, "id" | "empresaId" | "createdAt">>,
): Promise<void> => {
  const payload: Record<string, unknown> = { ...data };
  if (data.fecha) {
    payload.fecha = Timestamp.fromDate(data.fecha);
  }
  if (data.estado) {
    payload.estado = data.estado;
  }
  await updateDoc(doc(db, "viajes", id), payload);
};

export const eliminarViaje = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "viajes", id));
};
