import { HorarioChofer, obtenerHorariosChofer } from "@/lib/firestore/horariosChofer";

export type EstadoDisponibilidadChofer = "DISPONIBLE" | "DESCANSO" | "SIN_DEFINIR";

export const etiquetasDisponibilidad: Record<EstadoDisponibilidadChofer, string> = {
  DISPONIBLE: "Disponible",
  DESCANSO: "Descanso",
  SIN_DEFINIR: "Sin horario",
};

export const coloresDisponibilidad: Record<
  EstadoDisponibilidadChofer,
  { bg: string; border: string; text: string; buttonColor: "success" | "error" | "inherit" }
> = {
  DISPONIBLE: { bg: "#dcfce7", border: "#16a34a", text: "#166534", buttonColor: "success" },
  DESCANSO: { bg: "#fee2e2", border: "#dc2626", text: "#991b1b", buttonColor: "error" },
  SIN_DEFINIR: { bg: "#f3f4f6", border: "#9ca3af", text: "#4b5563", buttonColor: "error" },
};

const inicioDia = (fecha: Date) =>
  new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0, 0);

const finDia = (fecha: Date) =>
  new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);

const horarioCubreFecha = (horario: HorarioChofer, fecha: Date) => {
  const inicio = inicioDia(fecha).getTime();
  const fin = finDia(fecha).getTime();
  return horario.startDate.getTime() <= fin && horario.endDate.getTime() >= inicio;
};

export const obtenerEstadoChoferEnFecha = (
  horarios: HorarioChofer[],
  fecha: Date,
): EstadoDisponibilidadChofer => {
  let disponible = false;
  for (const horario of horarios) {
    if (!horarioCubreFecha(horario, fecha)) continue;
    if (horario.status === "DESCANSO") {
      return "DESCANSO";
    }
    if (horario.status === "DISPONIBLE") {
      disponible = true;
    }
  }
  return disponible ? "DISPONIBLE" : "SIN_DEFINIR";
};

export const construirInicioDia = (fecha: Date) => inicioDia(fecha);
export const construirFinDia = (fecha: Date) => finDia(fecha);

export const isChoferDisponible = async (
  choferId: string,
  fecha: Date,
): Promise<boolean> => {
  const inicio = inicioDia(fecha);
  const fin = finDia(fecha);
  const horarios = await obtenerHorariosChofer(choferId, inicio, fin);
  return obtenerEstadoChoferEnFecha(horarios, fecha) === "DISPONIBLE";
};
