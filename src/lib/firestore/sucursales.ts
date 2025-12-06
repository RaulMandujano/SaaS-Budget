import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  limit,
} from "firebase/firestore";
import { asegurarEmpresaId } from "@/lib/firestore/empresas";

export interface Sucursal {
  id: string;
  nombre: string;
  ciudad: string;
  empresaId: string;
  activa: boolean;
  createdAt?: Date | null;
}

export const crearSucursal = async (
  sucursal: Omit<Sucursal, "id" | "createdAt" | "empresaId">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const ref = await addDoc(collection(db, "sucursales"), {
    ...sucursal,
    empresaId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const obtenerSucursales = async (empresaIdParam?: string): Promise<Sucursal[]> => {
  try {
    const empresaId = asegurarEmpresaId(empresaIdParam);
    const q = query(collection(db, "sucursales"), where("empresaId", "==", empresaId), limit(300));
    const snapshot = await getDocs(q);

    const registros = snapshot.docs.map((registro) => {
      const data = registro.data();
      return {
        id: registro.id,
        nombre: data.nombre ?? "",
        ciudad: data.ciudad ?? "",
        empresaId: data.empresaId ?? "",
        activa: Boolean(data.activa),
        createdAt: data.createdAt?.toDate?.() ?? null,
      };
    });

    registros.sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );

    const sinEmpresa = snapshot.docs.filter((d) => !d.data().empresaId);
    if (sinEmpresa.length > 0) {
      await Promise.all(
        sinEmpresa.map((docSnap) => updateDoc(doc(db, "sucursales", docSnap.id), { empresaId })),
      );
    }

    return registros;
  } catch (error) {
    console.warn("Error al obtener sucursales", error);
    return [];
  }
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
