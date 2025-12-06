import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";

interface Gasto {
  sucursalId: string;
  monto: number;
  tipo: string;
  fecha: Date | null;
}

export interface GastoPorSucursal {
  sucursalId: string;
  total: number;
}

export interface GastoPorTipo {
  tipo: string;
  total: number;
}

export interface TotalesSistema {
  totalAutobuses: number;
  totalSucursales: number;
  totalChoferes: number;
}

const toDate = (valor: unknown): Date | null => {
  if (valor instanceof Timestamp) return valor.toDate();
  if (typeof valor === "object" && valor && "toDate" in (valor as Record<string, unknown>)) {
    const maybeFn = (valor as { toDate?: () => Date }).toDate;
    return typeof maybeFn === "function" ? maybeFn() : null;
  }
  return null;
};

const obtenerGastos = async (empresaId?: string): Promise<Gasto[]> => {
  if (!empresaId) return [];
  const snap = await getDocs(query(collection(db, "gastos"), where("empresaId", "==", empresaId)));
  return snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      sucursalId: (data.sucursalId as string) ?? "",
      monto: Number(data.monto ?? 0),
      tipo: (data.tipo as string) ?? "",
      fecha: toDate(data.fecha),
    };
  });
};

export const obtenerGastoTotal = async (empresaId?: string): Promise<{
  totalHistorico: number;
  totalMes: number;
}> => {
  const gastos = await obtenerGastos(empresaId);
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  let totalHistorico = 0;
  let totalMes = 0;

  gastos.forEach((gasto) => {
    totalHistorico += gasto.monto;
    if (gasto.fecha && gasto.fecha >= inicioMes) {
      totalMes += gasto.monto;
    }
  });

  return { totalHistorico, totalMes };
};

export const obtenerGastoPorSucursal = async (empresaId?: string): Promise<GastoPorSucursal[]> => {
  const gastos = await obtenerGastos(empresaId);
  const acumulado = new Map<string, number>();

  gastos.forEach((gasto) => {
    const actual = acumulado.get(gasto.sucursalId) ?? 0;
    acumulado.set(gasto.sucursalId, actual + gasto.monto);
  });

  return Array.from(acumulado.entries()).map(([sucursalId, total]) => ({
    sucursalId,
    total,
  }));
};

export const obtenerGastoPorTipo = async (empresaId?: string): Promise<GastoPorTipo[]> => {
  const gastos = await obtenerGastos(empresaId);
  const acumulado = new Map<string, number>();

  gastos.forEach((gasto) => {
    const actual = acumulado.get(gasto.tipo) ?? 0;
    acumulado.set(gasto.tipo, actual + gasto.monto);
  });

  return Array.from(acumulado.entries()).map(([tipo, total]) => ({
    tipo,
    total,
  }));
};

export const obtenerTotalesSistema = async (empresaId?: string): Promise<TotalesSistema> => {
  if (!empresaId) {
    return { totalAutobuses: 0, totalSucursales: 0, totalChoferes: 0 };
  }
  const [autobusesSnap, sucursalesSnap, choferesSnap] = await Promise.all([
    getDocs(query(collection(db, "autobuses"), where("empresaId", "==", empresaId))),
    getDocs(query(collection(db, "sucursales"), where("empresaId", "==", empresaId))),
    getDocs(query(collection(db, "choferes"), where("empresaId", "==", empresaId))),
  ]);

  return {
    totalAutobuses: autobusesSnap.size,
    totalSucursales: sucursalesSnap.size,
    totalChoferes: choferesSnap.size,
  };
};
