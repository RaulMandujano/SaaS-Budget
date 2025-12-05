import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

export type EstadoAutobus = "activo" | "mantenimiento" | "fuera_servicio";

export interface Autobus {
  id: string;
  sucursalId: string;
  numeroUnidad: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  estado: EstadoAutobus;
  createdAt?: Date | null;
}

export const crearAutobus = async (
  autobus: Omit<Autobus, "id" | "createdAt">,
): Promise<string> => {
  const ref = await addDoc(collection(db, "autobuses"), {
    ...autobus,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const obtenerAutobuses = async (): Promise<Autobus[]> => {
  const snapshot = await getDocs(collection(db, "autobuses"));
  return snapshot.docs.map((registro) => {
    const data = registro.data();
    return {
      id: registro.id,
      sucursalId: data.sucursalId ?? "",
      numeroUnidad: data.numeroUnidad ?? "",
      placa: data.placa ?? "",
      marca: data.marca ?? "",
      modelo: data.modelo ?? "",
      anio: Number(data.anio ?? 0),
      estado: (data.estado ?? "activo") as EstadoAutobus,
      createdAt: data.createdAt?.toDate?.() ?? null,
    };
  });
};

export const actualizarAutobus = async (
  id: string,
  datos: Partial<Omit<Autobus, "id" | "createdAt">>,
): Promise<void> => {
  await updateDoc(doc(db, "autobuses", id), datos);
};

export const eliminarAutobus = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "autobuses", id));
};
