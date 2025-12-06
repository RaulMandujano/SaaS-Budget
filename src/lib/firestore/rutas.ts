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

export interface Ruta {
  id: string;
  nombre: string;
  origen: string;
  destino: string;
  empresaId: string;
  activa: boolean;
  createdAt?: Date | null;
}

export const obtenerRutas = async (empresaIdParam?: string): Promise<Ruta[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const q = query(
    collection(db, "rutas"),
    where("empresaId", "==", empresaId),
    orderBy("createdAt", "desc"),
    limit(200),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((registro) => {
    const data = registro.data();
    return {
      id: registro.id,
      nombre: data.nombre ?? "",
      origen: data.origen ?? "",
      destino: data.destino ?? "",
      empresaId: data.empresaId ?? "",
      activa: data.activa !== false,
      createdAt: data.createdAt?.toDate?.() ?? null,
    };
  });
};

export const crearRuta = async (
  ruta: Omit<Ruta, "id" | "empresaId" | "createdAt">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const ref = await addDoc(collection(db, "rutas"), {
    ...ruta,
    empresaId,
    activa: ruta.activa ?? true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const actualizarRuta = async (
  id: string,
  data: Partial<Omit<Ruta, "id" | "empresaId" | "createdAt">>,
): Promise<void> => {
  await updateDoc(doc(db, "rutas", id), data);
};

export const eliminarRuta = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "rutas", id));
};
