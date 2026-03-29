import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { asegurarEmpresaId } from "@/lib/firestore/empresas";

export type ActivityLogTipo = "mantenimiento" | "inventario" | "dispositivo";

export interface ActivityLogEntry {
  id: string;
  tipo: ActivityLogTipo;
  accion: string;
  descripcion: string;
  userId: string;
  createdAt?: Date | null;
}

export interface CreateActivityLogInput {
  tipo: ActivityLogTipo;
  accion: string;
  descripcion: string;
  userId: string;
}

const mapActivityLog = (docSnap: QueryDocumentSnapshot<DocumentData>): ActivityLogEntry => {
  const data = docSnap.data();
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Timestamp ? createdAtRaw.toDate() : createdAtRaw?.toDate?.() ?? null;

  return {
    id: docSnap.id,
    tipo: data.tipo ?? "mantenimiento",
    accion: data.accion ?? "",
    descripcion: data.descripcion ?? "",
    userId: data.userId ?? "",
    createdAt,
  };
};

export const createActivityLog = async (
  empresaIdParam: string | undefined,
  data: CreateActivityLogInput,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const logsRef = collection(db, "empresas", empresaId, "activityLogs");

  const ref = await addDoc(logsRef, {
    tipo: data.tipo,
    accion: data.accion,
    descripcion: data.descripcion,
    userId: data.userId,
    createdAt: Timestamp.now(),
  });

  return ref.id;
};

export const getActivityLogs = async (empresaIdParam?: string): Promise<ActivityLogEntry[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const logsRef = collection(db, "empresas", empresaId, "activityLogs");
  const logsQuery = query(logsRef, orderBy("createdAt", "desc"), limit(300));
  const snapshot = await getDocs(logsQuery);
  return snapshot.docs.map(mapActivityLog);
};
