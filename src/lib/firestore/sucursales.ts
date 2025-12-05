import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

export interface Sucursal {
  id: string;
  nombre: string;
  ciudad: string;
  activa: boolean;
  createdAt?: Date | null;
}

export const crearSucursal = async (
  sucursal: Omit<Sucursal, "id" | "createdAt">,
): Promise<string> => {
  const ref = await addDoc(collection(db, "sucursales"), {
    ...sucursal,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const obtenerSucursales = async (): Promise<Sucursal[]> => {
  const snapshot = await getDocs(collection(db, "sucursales"));
  return snapshot.docs.map((registro) => {
    const data = registro.data();
    return {
      id: registro.id,
      nombre: data.nombre ?? "",
      ciudad: data.ciudad ?? "",
      activa: Boolean(data.activa),
      createdAt: data.createdAt?.toDate?.() ?? null,
    };
  });
};

export const actualizarSucursal = async (
  id: string,
  datos: Partial<Omit<Sucursal, "id" | "createdAt">>,
): Promise<void> => {
  await updateDoc(doc(db, "sucursales", id), datos);
};

export const eliminarSucursal = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "sucursales", id));
};
