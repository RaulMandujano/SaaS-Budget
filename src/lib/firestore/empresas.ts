"use client";

import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  DocumentData,
  QueryDocumentSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";

export type PlanEmpresa = "free" | "pro" | "enterprise";

export interface Empresa {
  id: string;
  nombre: string;
  logoUrl: string;
  activo: boolean;
  plan: PlanEmpresa;
  fechaCreacion?: Date | null;
}

export const EMPRESA_STORAGE_KEY = "empresaActualId";

export const obtenerEmpresaIdActual = (empresaId?: string): string => {
  if (empresaId) return empresaId;
  if (typeof window === "undefined") return "";
  return localStorage.getItem(EMPRESA_STORAGE_KEY) || "";
};

export const establecerEmpresaActual = (empresaId: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(EMPRESA_STORAGE_KEY, empresaId);
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
  return {
    id: docSnap.id,
    nombre: data.nombre ?? "",
    logoUrl: data.logoUrl ?? "",
    activo: data.activo !== false,
    plan: (data.plan as PlanEmpresa) ?? "free",
    fechaCreacion: data.fechaCreacion?.toDate?.() ?? null,
  };
};

export const crearEmpresa = async (empresa: {
  nombre: string;
  logoUrl?: string;
  plan?: PlanEmpresa;
  activo?: boolean;
}): Promise<string> => {
  const ref = await addDoc(collection(db, "empresas"), {
    nombre: empresa.nombre,
    logoUrl: empresa.logoUrl ?? "",
    plan: empresa.plan ?? "free",
    activo: empresa.activo ?? true,
    fechaCreacion: serverTimestamp(),
  });
  return ref.id;
};

export const obtenerEmpresas = async (): Promise<Empresa[]> => {
  const snapshot = await getDocs(
    query(collection(db, "empresas"), orderBy("fechaCreacion", "desc"), limit(200)),
  );
  return snapshot.docs.map(mapEmpresa);
};

export const actualizarEmpresa = async (
  id: string,
  data: Partial<Omit<Empresa, "id" | "fechaCreacion">>,
): Promise<void> => {
  await updateDoc(doc(db, "empresas", id), data);
};
