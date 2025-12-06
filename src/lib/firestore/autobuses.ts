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

export type EstadoAutobus = "activo" | "mantenimiento" | "fuera_servicio";

export interface Autobus {
  id: string;
  sucursalId: string;
  empresaId: string;
  numeroUnidad: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  capacidad: number;
  estado: EstadoAutobus;
  createdAt?: Date | null;
}

const mapAutobus = (docSnap: QueryDocumentSnapshot<DocumentData>): Autobus => {
  const data = docSnap.data();
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Timestamp ? createdAtRaw.toDate() : createdAtRaw?.toDate?.() ?? null;

  return {
    id: docSnap.id,
    sucursalId: data.sucursalId ?? "",
    empresaId: data.empresaId ?? "",
    numeroUnidad: data.numeroUnidad ?? "",
    placa: data.placa ?? "",
    marca: data.marca ?? "",
    modelo: data.modelo ?? "",
    anio: Number(data.anio ?? 0),
    capacidad: Number(data.capacidad ?? 0),
    estado: (data.estado as EstadoAutobus) ?? "activo",
    createdAt,
  };
};

export const obtenerAutobuses = async (empresaIdParam?: string): Promise<Autobus[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const q = query(
    collection(db, "autobuses"),
    where("empresaId", "==", empresaId),
    limit(300),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapAutobus).sort((a, b) => {
    const aTime = a.createdAt?.getTime?.() ?? 0;
    const bTime = b.createdAt?.getTime?.() ?? 0;
    return bTime - aTime;
  });
};

export const crearAutobus = async (
  autobus: Omit<Autobus, "id" | "createdAt" | "empresaId">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const payload = {
    ...autobus,
    empresaId,
    anio: Number(autobus.anio) || 0,
    capacidad: Number(autobus.capacidad) || 0,
    estado: autobus.estado ?? "activo",
    createdAt: Timestamp.now(),
  };
  const ref = await addDoc(collection(db, "autobuses"), payload);
  return ref.id;
};

export const actualizarAutobus = async (
  id: string,
  datos: Partial<Omit<Autobus, "id">>,
): Promise<void> => {
  const payload = { ...datos } as Record<string, unknown>;
  if (typeof datos.anio !== "undefined") {
    payload.anio = Number(datos.anio) || 0;
  }
  if (typeof datos.capacidad !== "undefined") {
    payload.capacidad = Number(datos.capacidad) || 0;
  }
  await updateDoc(doc(db, "autobuses", id), payload);
};

export const eliminarAutobus = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "autobuses", id));
};
