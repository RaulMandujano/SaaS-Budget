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

export const crearAutobus = async (
  autobus: Omit<Autobus, "id" | "createdAt" | "empresaId">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const ref = await addDoc(collection(db, "autobuses"), {
    ...autobus,
    empresaId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const obtenerAutobuses = async (empresaIdParam?: string): Promise<Autobus[]> => {
  try {
    const empresaId = asegurarEmpresaId(empresaIdParam);
    const q = query(
      collection(db, "autobuses"),
      where("empresaId", "==", empresaId),
      limit(300),
    );
    const snapshot = await getDocs(q);

    const registros = snapshot.docs.map((registro) => {
      const data = registro.data();
      return {
        id: registro.id,
        sucursalId: data.sucursalId ?? "",
        empresaId: data.empresaId ?? "",
        numeroUnidad: data.numeroUnidad ?? "",
        placa: data.placa ?? "",
        marca: data.marca ?? "",
        modelo: data.modelo ?? "",
        anio: Number(data.anio ?? 0),
        capacidad: Number(data.capacidad ?? 0),
        estado: (data.estado ?? "activo") as EstadoAutobus,
        createdAt: data.createdAt?.toDate?.() ?? null,
      };
    });

    registros.sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );

    const sinEmpresa = snapshot.docs.filter((d) => !d.data().empresaId);
    if (sinEmpresa.length > 0) {
      await Promise.all(
        sinEmpresa.map((docSnap) => updateDoc(doc(db, "autobuses", docSnap.id), { empresaId })),
      );
    }

    return registros;
  } catch (error) {
    console.warn("Error al obtener autobuses", error);
    return [];
  }
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
