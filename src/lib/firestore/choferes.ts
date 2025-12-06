import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
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

const mapearChofer = (registro: any): Chofer => {
  const data = registro.data();
  const estado: EstadoChofer = data.estado === "Suspendido" ? "Suspendido" : "Activo";
  return {
    id: registro.id,
    nombre: data.nombre ?? "",
    licencia: data.licencia ?? "",
    telefono: data.telefono ?? "",
    autobusId: data.autobusId ?? "",
    empresaId: data.empresaId ?? "",
    estado,
    createdAt: data.createdAt?.toDate?.() ?? null,
  };
};

const migrarChoferesSinEmpresa = async (empresaId: string) => {
  try {
    const snap = await getDocs(query(collection(db, "choferes"), limit(50)));
    const sinEmpresa = snap.docs.filter((d) => !d.data().empresaId);
    await Promise.all(
      sinEmpresa.map((docSnap) => updateDoc(doc(db, "choferes", docSnap.id), { empresaId })),
    );
  } catch (error) {
    console.warn("No se pudieron migrar choferes sin empresaId", error);
  }
};

export const obtenerChoferes = async (empresaIdParam?: string): Promise<Chofer[]> => {
  try {
    const empresaId = asegurarEmpresaId(empresaIdParam);
    const q = query(
      collection(db, "choferes"),
      where("empresaId", "==", empresaId),
      limit(300),
    );
    const snapshot = await getDocs(q);
    const lista = snapshot.docs.map(mapearChofer);

    lista.sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));

    const sinEmpresa = snapshot.docs.filter((d) => !d.data().empresaId);
    if (sinEmpresa.length > 0) {
      await Promise.all(
        sinEmpresa.map((docSnap) => updateDoc(doc(db, "choferes", docSnap.id), { empresaId })),
      );
    } else if (lista.length === 0) {
      await migrarChoferesSinEmpresa(empresaId);
    }

    return lista;
  } catch (error) {
    console.warn("Error al obtener choferes", error);
    return [];
  }
};

export const crearChofer = async (
  chofer: Omit<Chofer, "id" | "createdAt" | "empresaId">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const ref = await addDoc(collection(db, "choferes"), {
    ...chofer,
    empresaId,
    estado: chofer.estado ?? "Activo",
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const actualizarChofer = async (
  id: string,
  data: Partial<Omit<Chofer, "id" | "empresaId" | "createdAt">>,
): Promise<void> => {
  await updateDoc(doc(db, "choferes", id), data);
};

export const eliminarChofer = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "choferes", id));
};
