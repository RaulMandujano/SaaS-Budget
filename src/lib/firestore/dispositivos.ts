import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createActivityLog } from "@/lib/firestore/activityLogs";
import { asegurarEmpresaId } from "@/lib/firestore/empresas";

export type DispositivoStatus = "available" | "assigned" | "maintenance";

export interface DispositivoIT {
  id: string;
  nombre: string;
  modelo: string;
  numeroSerie: string;
  status: DispositivoStatus;
  assignedTo: string;
  ubicacion: string;
  createdAt?: Date | null;
}

const mapDispositivo = (docSnap: QueryDocumentSnapshot<DocumentData>): DispositivoIT => {
  const data = docSnap.data();
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Timestamp ? createdAtRaw.toDate() : createdAtRaw?.toDate?.() ?? null;

  return {
    id: docSnap.id,
    nombre: data.nombre ?? "",
    modelo: data.modelo ?? "",
    numeroSerie: data.numeroSerie ?? "",
    status: (data.status as DispositivoStatus) ?? "available",
    assignedTo: data.assignedTo ?? "",
    ubicacion: data.ubicacion ?? "",
    createdAt,
  };
};

export const getDispositivos = async (empresaIdParam?: string): Promise<DispositivoIT[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const dispositivosRef = collection(db, "empresas", empresaId, "dispositivos");
  const dispositivosQuery = query(dispositivosRef, orderBy("createdAt", "desc"), limit(300));
  const snapshot = await getDocs(dispositivosQuery);
  return snapshot.docs.map(mapDispositivo);
};

export const createDispositivo = async (
  empresaIdParam: string | undefined,
  data: Omit<DispositivoIT, "id" | "createdAt">,
  userId?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);

  if (!data.nombre.trim()) {
    throw new Error("El nombre del dispositivo es obligatorio.");
  }
  if (!data.numeroSerie.trim()) {
    throw new Error("El número de serie es obligatorio.");
  }

  const dispositivosRef = collection(db, "empresas", empresaId, "dispositivos");
  const ref = await addDoc(dispositivosRef, {
    nombre: data.nombre.trim(),
    modelo: data.modelo.trim(),
    numeroSerie: data.numeroSerie.trim(),
    status: data.status,
    assignedTo: data.assignedTo.trim(),
    ubicacion: data.ubicacion.trim(),
    createdAt: Timestamp.now(),
  });

  if (userId) {
    await createActivityLog(empresaId, {
      tipo: "dispositivo",
      accion: "created",
      descripcion: `Se creó el dispositivo ${data.nombre.trim()} (${data.numeroSerie.trim()}).`,
      userId,
    });
  }

  return ref.id;
};

export const updateDispositivo = async (
  empresaIdParam: string | undefined,
  deviceId: string,
  data: Partial<Omit<DispositivoIT, "id" | "createdAt">>,
  userId?: string,
): Promise<void> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const dispositivoRef = doc(db, "empresas", empresaId, "dispositivos", deviceId);

  const payload: Record<string, unknown> = {};
  if (typeof data.nombre === "string") payload.nombre = data.nombre.trim();
  if (typeof data.modelo === "string") payload.modelo = data.modelo.trim();
  if (typeof data.numeroSerie === "string") payload.numeroSerie = data.numeroSerie.trim();
  if (typeof data.status === "string") payload.status = data.status;
  if (typeof data.assignedTo === "string") payload.assignedTo = data.assignedTo.trim();
  if (typeof data.ubicacion === "string") payload.ubicacion = data.ubicacion.trim();

  await updateDoc(dispositivoRef, payload);

  if (userId) {
    await createActivityLog(empresaId, {
      tipo: "dispositivo",
      accion: "updated",
      descripcion: `Se actualizó el dispositivo ${deviceId}.`,
      userId,
    });
  }
};
