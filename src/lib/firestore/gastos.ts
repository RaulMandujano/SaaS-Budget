import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { asegurarEmpresaId } from "@/lib/firestore/empresas";

export interface Gasto {
  id: string;
  sucursalId: string;
  autobusId: string;
  empresaId: string;
  tipo: string;
  descripcion: string;
  monto: number;
  fecha: Date | null;
  createdAt?: Date | null;
}

const mapGasto = (docSnap: QueryDocumentSnapshot<DocumentData>): Gasto => {
  const data = docSnap.data();
  const fechaRaw = data.fecha;
  const createdAtRaw = data.createdAt;
  const fecha = fechaRaw instanceof Timestamp ? fechaRaw.toDate() : fechaRaw?.toDate?.() ?? null;
  const createdAt =
    createdAtRaw instanceof Timestamp ? createdAtRaw.toDate() : createdAtRaw?.toDate?.() ?? null;

  return {
    id: docSnap.id,
    sucursalId: data.sucursalId ?? "",
    autobusId: data.autobusId ?? "",
    empresaId: data.empresaId ?? "",
    tipo: data.tipo ?? "",
    descripcion: data.descripcion ?? "",
    monto: Number(data.monto ?? 0),
    fecha,
    createdAt,
  };
};

export const obtenerGastos = async (empresaIdParam?: string): Promise<Gasto[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const q = query(
    collection(db, "gastos"),
    where("empresaId", "==", empresaId),
    limit(500),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapGasto).sort((a, b) => {
    const aTime = a.createdAt?.getTime?.() ?? 0;
    const bTime = b.createdAt?.getTime?.() ?? 0;
    return bTime - aTime;
  });
};

export const crearGasto = async (
  gasto: Omit<Gasto, "id" | "createdAt" | "empresaId">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const payload = {
    ...gasto,
    empresaId,
    fecha: gasto.fecha ? Timestamp.fromDate(gasto.fecha) : null,
    monto: Number(gasto.monto) || 0,
    createdAt: Timestamp.now(),
  };
  const ref = await addDoc(collection(db, "gastos"), payload);
  return ref.id;
};

export const actualizarGasto = async (
  id: string,
  datos: Partial<Omit<Gasto, "id">>,
): Promise<void> => {
  const payload = { ...datos } as Record<string, unknown>;
  if (datos.fecha instanceof Date) {
    payload.fecha = Timestamp.fromDate(datos.fecha);
  }
  if (typeof datos.monto !== "undefined") {
    payload.monto = Number(datos.monto) || 0;
  }
  await updateDoc(doc(db, "gastos", id), payload);
};

export const eliminarGasto = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "gastos", id));
};
