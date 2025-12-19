import {
  collection,
  getDocs,
  getDoc,
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

export type EstadoChofer = "Activo" | "Suspendido";

export interface Chofer {
  id: string;
  nombre: string;
  licencia: string;
  telefono: string;
  autobusId: string;
  empresaId: string;
  estado: EstadoChofer;
  createdAt?: Date | null;
}

const mapChofer = (docSnap: QueryDocumentSnapshot<DocumentData>): Chofer => {
  const data = docSnap.data();
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Timestamp ? createdAtRaw.toDate() : createdAtRaw?.toDate?.() ?? null;
  const estado: EstadoChofer = data.estado === "Suspendido" ? "Suspendido" : "Activo";

  return {
    id: docSnap.id,
    nombre: data.nombre ?? "",
    licencia: data.licencia ?? "",
    telefono: data.telefono ?? "",
    autobusId: data.autobusId ?? "",
    empresaId: data.empresaId ?? "",
    estado,
    createdAt,
  };
};

export const obtenerChoferes = async (empresaIdParam?: string): Promise<Chofer[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const q = query(
    collection(db, "choferes"),
    where("empresaId", "==", empresaId),
    limit(300),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapChofer).sort((a, b) => {
    const aTime = a.createdAt?.getTime?.() ?? 0;
    const bTime = b.createdAt?.getTime?.() ?? 0;
    return bTime - aTime;
  });
};

export const obtenerChofer = async (id: string): Promise<Chofer | null> => {
  const snap = await getDoc(doc(db, "choferes", id));
  if (!snap.exists()) return null;
  return mapChofer(snap as QueryDocumentSnapshot<DocumentData>);
};

export const crearChofer = async (
  chofer: Omit<Chofer, "id" | "createdAt" | "empresaId">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const payload = {
    ...chofer,
    empresaId,
    estado: chofer.estado ?? "Activo",
    createdAt: Timestamp.now(),
  };
  const ref = await addDoc(collection(db, "choferes"), payload);
  return ref.id;
};

export const actualizarChofer = async (
  id: string,
  data: Partial<Omit<Chofer, "id">>,
): Promise<void> => {
  await updateDoc(doc(db, "choferes", id), data);
};

export const eliminarChofer = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "choferes", id));
};
