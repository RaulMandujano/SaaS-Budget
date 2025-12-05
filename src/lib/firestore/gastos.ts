import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

export interface Gasto {
  id: string;
  sucursalId: string;
  autobusId: string;
  tipo: string;
  descripcion: string;
  monto: number;
  fecha: Date | null;
  createdAt?: Date | null;
}

export const crearGasto = async (
  gasto: Omit<Gasto, "id" | "createdAt">,
): Promise<string> => {
  const ref = await addDoc(collection(db, "gastos"), {
    ...gasto,
    fecha: gasto.fecha ? new Date(gasto.fecha) : null,
    monto: Number(gasto.monto) || 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const obtenerGastos = async (): Promise<Gasto[]> => {
  const snapshot = await getDocs(collection(db, "gastos"));
  return snapshot.docs.map((registro) => {
    const data = registro.data();
    return {
      id: registro.id,
      sucursalId: data.sucursalId ?? "",
      autobusId: data.autobusId ?? "",
      tipo: data.tipo ?? "",
      descripcion: data.descripcion ?? "",
      monto: Number(data.monto ?? 0),
      fecha: data.fecha?.toDate?.() ?? null,
      createdAt: data.createdAt?.toDate?.() ?? null,
    };
  });
};

export const eliminarGasto = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "gastos", id));
};
