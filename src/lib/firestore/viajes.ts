import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { asegurarEmpresaId } from "@/lib/firestore/empresas";

export interface Viaje {
  id: string;
  autobusId: string;
  rutaId: string;
  fechaSalida: Date | null;
  empresaId: string;
  estado: string;
  createdAt?: Date | null;
}

export const obtenerViajes = async (empresaIdParam?: string): Promise<Viaje[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const q = query(
    collection(db, "viajes"),
    where("empresaId", "==", empresaId),
    orderBy("fechaSalida", "desc"),
    limit(200),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((registro) => {
    const data = registro.data();
    return {
      id: registro.id,
      autobusId: data.autobusId ?? "",
      rutaId: data.rutaId ?? "",
      fechaSalida: data.fechaSalida?.toDate?.() ?? null,
      empresaId: data.empresaId ?? "",
      estado: data.estado ?? "Programado",
      createdAt: data.createdAt?.toDate?.() ?? null,
    };
  });
};

export const crearViaje = async (
  viaje: Omit<Viaje, "id" | "empresaId" | "createdAt">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const ref = await addDoc(collection(db, "viajes"), {
    ...viaje,
    empresaId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const actualizarViaje = async (
  id: string,
  data: Partial<Omit<Viaje, "id" | "empresaId" | "createdAt">>,
): Promise<void> => {
  await updateDoc(doc(db, "viajes", id), data);
};

export const eliminarViaje = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "viajes", id));
};
