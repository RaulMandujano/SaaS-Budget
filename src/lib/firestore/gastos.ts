import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  limit,
  updateDoc,
} from "firebase/firestore";
import { asegurarEmpresaId } from "@/lib/firestore/empresas";

export interface Gasto {
  id: string;
  sucursalId: string;
  autobusId: string;
  empresaId: string;
  tipo: string;
  descripcion: string;
  monto: number;
  fecha: Date | null;
  createdAt?: Date | null;
}

export const crearGasto = async (
  gasto: Omit<Gasto, "id" | "createdAt" | "empresaId">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const ref = await addDoc(collection(db, "gastos"), {
    ...gasto,
    empresaId,
    fecha: gasto.fecha ? new Date(gasto.fecha) : null,
    monto: Number(gasto.monto) || 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const obtenerGastos = async (empresaIdParam?: string): Promise<Gasto[]> => {
  try {
    const empresaId = asegurarEmpresaId(empresaIdParam);
    const q = query(collection(db, "gastos"), where("empresaId", "==", empresaId), limit(500));
    const snapshot = await getDocs(q);

    const registros = snapshot.docs.map((registro) => {
      const data = registro.data();
      return {
        id: registro.id,
        sucursalId: data.sucursalId ?? "",
        autobusId: data.autobusId ?? "",
        empresaId: data.empresaId ?? "",
        tipo: data.tipo ?? "",
        descripcion: data.descripcion ?? "",
        monto: Number(data.monto ?? 0),
        fecha: data.fecha?.toDate?.() ?? null,
        createdAt: data.createdAt?.toDate?.() ?? null,
      };
    });

    registros.sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );

    const sinEmpresa = snapshot.docs.filter((d) => !d.data().empresaId);
    if (sinEmpresa.length > 0) {
      await Promise.all(
        sinEmpresa.map((docSnap) => updateDoc(doc(db, "gastos", docSnap.id), { empresaId })),
      );
    }

    return registros;
  } catch (error) {
    console.warn("Error al obtener gastos", error);
    return [];
  }
};

export const eliminarGasto = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "gastos", id));
};
