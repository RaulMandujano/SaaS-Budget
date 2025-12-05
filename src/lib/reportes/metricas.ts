import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

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
}

const obtenerGastos = async (): Promise<Gasto[]> => {
  try {
    const snapshot = await getDocs(collection(db, "gastos"));
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

export const obtenerGastoTotal = async (): Promise<{
  totalHistorico: number;
  totalMes: number;
}> => {
  const gastos = await obtenerGastos();
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

export const obtenerGastoPorSucursal = async (): Promise<GastoPorSucursal[]> => {
  const gastos = await obtenerGastos();
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

export const obtenerGastoPorTipo = async (): Promise<GastoPorTipo[]> => {
  const gastos = await obtenerGastos();
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

export const obtenerTotalesSistema = async (): Promise<TotalesSistema> => {
  try {
    const [autobusesSnap, sucursalesSnap] = await Promise.all([
      getDocs(collection(db, "autobuses")),
      getDocs(collection(db, "sucursales")),
    ]);

    return {
      totalAutobuses: autobusesSnap.size,
      totalSucursales: sucursalesSnap.size,
    };
  } catch (error) {
    console.warn("No se pudieron obtener los totales del sistema. Usando 0.", error);
    return {
      totalAutobuses: 0,
      totalSucursales: 0,
    };
  }
};
