import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { asegurarEmpresaId } from "@/lib/firestore/empresas";

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

const obtenerGastos = async (empresaIdParam?: string): Promise<Gasto[]> => {
  try {
    const empresaId = asegurarEmpresaId(empresaIdParam);
    const snapshot = await getDocs(query(collection(db, "gastos"), where("empresaId", "==", empresaId)));
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        sucursalId: data.sucursalId ?? "",
        monto: Number(data.monto ?? 0),
        tipo: data.tipo ?? "",
        fecha: data.fecha?.toDate?.() ?? null,
      };
    });
  } catch (error) {
    console.warn("No se pudieron obtener los gastos. Usando valores vacíos.", error);
    return [];
  }
};

export const obtenerGastoTotal = async (empresaIdParam?: string): Promise<{
  totalHistorico: number;
  totalMes: number;
}> => {
  const gastos = await obtenerGastos(empresaIdParam);
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

export const obtenerGastoPorSucursal = async (empresaIdParam?: string): Promise<GastoPorSucursal[]> => {
  const gastos = await obtenerGastos(empresaIdParam);
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

export const obtenerGastoPorTipo = async (empresaIdParam?: string): Promise<GastoPorTipo[]> => {
  const gastos = await obtenerGastos(empresaIdParam);
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

export const obtenerTotalesSistema = async (empresaIdParam?: string): Promise<TotalesSistema> => {
  try {
    const empresaId = asegurarEmpresaId(empresaIdParam);
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
  } catch (error) {
    console.warn("No se pudieron obtener los totales del sistema. Usando 0.", error);
    return {
      totalAutobuses: 0,
      totalSucursales: 0,
      totalChoferes: 0,
    };
  }
};
