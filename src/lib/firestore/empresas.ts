import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";

export type PlanEmpresa = "free" | "pro" | "enterprise";

export interface Empresa {
  id: string;
  nombre: string;
  plan: PlanEmpresa;
  activo: boolean;
  logoUrl?: string;
  ruc?: string;
  fechaCreacion?: Date | null;
}

export const EMPRESA_STORAGE_KEY = "empresaActualId";

export const obtenerEmpresaLocal = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(EMPRESA_STORAGE_KEY) || "";
};

export const guardarEmpresaLocal = (empresaId: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(EMPRESA_STORAGE_KEY, empresaId);
};

export const obtenerEmpresaIdActual = (empresaId?: string): string => {
  if (empresaId) return empresaId;
  return obtenerEmpresaLocal();
};

export const establecerEmpresaActual = (empresaId: string) => {
  guardarEmpresaLocal(empresaId);
};

export const asegurarEmpresaId = (empresaId?: string): string => {
  const id = obtenerEmpresaIdActual(empresaId);
  if (!id) {
    throw new Error("No hay empresa seleccionada para realizar esta acción.");
  }
  return id;
};

const mapEmpresa = (docSnap: QueryDocumentSnapshot<DocumentData>): Empresa => {
  const data = docSnap.data();
  const fechaRaw = data.fechaCreacion;
  const fechaCreacion =
    fechaRaw instanceof Timestamp ? fechaRaw.toDate() : fechaRaw?.toDate?.() ?? null;

  return {
    id: docSnap.id,
    nombre: data.nombre ?? "",
    plan: (data.plan as PlanEmpresa) ?? "free",
    activo: data.activo !== false,
    logoUrl: data.logoUrl ?? "",
    ruc: data.ruc ?? "",
    fechaCreacion,
  };
};

export const obtenerEmpresas = async (): Promise<Empresa[]> => {
  const q = query(collection(db, "empresas"), orderBy("fechaCreacion", "desc"), limit(200));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapEmpresa);
};

export const crearEmpresa = async (
  empresa: Omit<Empresa, "id" | "fechaCreacion"> & { fechaCreacion?: Date | null },
): Promise<string> => {
  const payload = {
    ...empresa,
    plan: empresa.plan ?? "free",
    activo: empresa.activo ?? true,
    fechaCreacion: empresa.fechaCreacion
      ? Timestamp.fromDate(empresa.fechaCreacion)
      : Timestamp.now(),
  };
  const ref = await addDoc(collection(db, "empresas"), payload);
  return ref.id;
};

export const actualizarEmpresa = async (
  id: string,
  data: Partial<Omit<Empresa, "id">>,
): Promise<void> => {
  const payload = { ...data } as Record<string, unknown>;
  if (data.fechaCreacion instanceof Date) {
    payload.fechaCreacion = Timestamp.fromDate(data.fechaCreacion);
  }
  await updateDoc(doc(db, "empresas", id), payload);
};

export const eliminarEmpresa = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "empresas", id));
};
