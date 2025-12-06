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

export interface RegistroMantenimiento {
  id: string;
  autobusId: string;
  descripcion: string;
  fecha: Date | null;
  empresaId: string;
  costo: number;
  createdAt?: Date | null;
}

export const obtenerMantenimientos = async (empresaIdParam?: string): Promise<RegistroMantenimiento[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const q = query(
    collection(db, "mantenimientos"),
    where("empresaId", "==", empresaId),
    orderBy("fecha", "desc"),
    limit(300),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((registro) => {
    const data = registro.data();
    return {
      id: registro.id,
      autobusId: data.autobusId ?? "",
      descripcion: data.descripcion ?? "",
      fecha: data.fecha?.toDate?.() ?? null,
      empresaId: data.empresaId ?? "",
      costo: Number(data.costo ?? 0),
      createdAt: data.createdAt?.toDate?.() ?? null,
    };
  });
};

export const crearMantenimiento = async (
  mantenimiento: Omit<RegistroMantenimiento, "id" | "empresaId" | "createdAt">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const ref = await addDoc(collection(db, "mantenimientos"), {
    ...mantenimiento,
    empresaId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const actualizarMantenimiento = async (
  id: string,
  data: Partial<Omit<RegistroMantenimiento, "id" | "empresaId" | "createdAt">>,
): Promise<void> => {
  await updateDoc(doc(db, "mantenimientos", id), data);
};

export const eliminarMantenimiento = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "mantenimientos", id));
};
