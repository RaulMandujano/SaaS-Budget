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

export interface Sucursal {
  id: string;
  nombre: string;
  ciudad: string;
  empresaId: string;
  activa: boolean;
  createdAt?: Date | null;
}

const mapSucursal = (docSnap: QueryDocumentSnapshot<DocumentData>): Sucursal => {
  const data = docSnap.data();
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Timestamp ? createdAtRaw.toDate() : createdAtRaw?.toDate?.() ?? null;

  return {
    id: docSnap.id,
    nombre: data.nombre ?? "",
    ciudad: data.ciudad ?? "",
    empresaId: data.empresaId ?? "",
    activa: data.activa !== false,
    createdAt,
  };
};

export const obtenerSucursales = async (empresaIdParam?: string): Promise<Sucursal[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const q = query(
    collection(db, "sucursales"),
    where("empresaId", "==", empresaId),
    limit(300),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapSucursal).sort((a, b) => {
    const aTime = a.createdAt?.getTime?.() ?? 0;
    const bTime = b.createdAt?.getTime?.() ?? 0;
    return bTime - aTime;
  });
};

export const crearSucursal = async (
  sucursal: Omit<Sucursal, "id" | "createdAt" | "empresaId">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const payload = {
    ...sucursal,
    empresaId,
    activa: sucursal.activa ?? true,
    createdAt: Timestamp.now(),
  };
  const ref = await addDoc(collection(db, "sucursales"), payload);
  return ref.id;
};

export const actualizarSucursal = async (
  id: string,
  datos: Partial<Omit<Sucursal, "id">>,
): Promise<void> => {
  await updateDoc(doc(db, "sucursales", id), datos);
};

export const eliminarSucursal = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "sucursales", id));
};
