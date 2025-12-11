import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { asegurarEmpresaId } from "@/lib/firestore/empresas";

export interface Ruta {
  id: string;
  sucursalOrigenId: string;
  sucursalDestinoId: string;
  distanciaKm: number;
  consumoGasolinaAprox: number;
  costoPeajes: number;
  empresaId: string;
  createdAt?: Date | null;
}

const parseNumero = (valor: unknown): number | null => {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const normalizado = valor.replace(",", ".").replace(/[^\d.-]/g, "");
    const parsed = Number(normalizado);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizarNumero = (valor: unknown): number => {
  return parseNumero(valor) ?? 0;
};

const mapRuta = (registro: QueryDocumentSnapshot<DocumentData>): Ruta => {
  const data = registro.data();
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Timestamp ? createdAtRaw.toDate() : createdAtRaw?.toDate?.() ?? null;

  return {
    id: registro.id,
    sucursalOrigenId: data.sucursalOrigenId ?? "",
    sucursalDestinoId: data.sucursalDestinoId ?? "",
    distanciaKm: normalizarNumero(data.distanciaKm),
    consumoGasolinaAprox: normalizarNumero(data.consumoGasolinaAprox),
    costoPeajes: normalizarNumero(data.costoPeajes),
    empresaId: data.empresaId ?? "",
    createdAt,
  };
};

export const obtenerRutas = async (empresaIdParam?: string): Promise<Ruta[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const q = query(
    collection(db, "rutas"),
    where("empresaId", "==", empresaId),
    orderBy("createdAt", "desc"),
    limit(200),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapRuta);
};

export const crearRuta = async (
  ruta: Omit<Ruta, "id" | "empresaId" | "createdAt">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const payload = {
    ...ruta,
    empresaId,
    distanciaKm: normalizarNumero(ruta.distanciaKm),
    consumoGasolinaAprox: normalizarNumero(ruta.consumoGasolinaAprox),
    costoPeajes: normalizarNumero(ruta.costoPeajes),
    createdAt: Timestamp.now(),
  };
  const ref = await addDoc(collection(db, "rutas"), payload);
  return ref.id;
};

export const actualizarRuta = async (
  id: string,
  data: Partial<Omit<Ruta, "id" | "empresaId" | "createdAt">>,
): Promise<void> => {
  const payload: Record<string, unknown> = { ...data };
  if (data.distanciaKm !== undefined) {
    payload.distanciaKm = normalizarNumero(data.distanciaKm);
  }
  if (data.consumoGasolinaAprox !== undefined) {
    payload.consumoGasolinaAprox = normalizarNumero(data.consumoGasolinaAprox);
  }
  if (data.costoPeajes !== undefined) {
    payload.costoPeajes = normalizarNumero(data.costoPeajes);
  }
  await updateDoc(doc(db, "rutas", id), payload);
};

export const eliminarRuta = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "rutas", id));
};
