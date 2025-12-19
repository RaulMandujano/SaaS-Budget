import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { asegurarEmpresaId } from "@/lib/firestore/empresas";

export type EstadoHorarioChofer = "DISPONIBLE" | "DESCANSO";

export interface HorarioChofer {
  id: string;
  startDate: Date;
  endDate: Date;
  status: EstadoHorarioChofer;
  reason?: string;
  approvedBy?: string;
  createdAt?: Date | null;
  empresaId?: string;
}

const mapHorario = (docSnap: QueryDocumentSnapshot<DocumentData>): HorarioChofer => {
  const data = docSnap.data();
  const startRaw = data.startDate;
  const endRaw = data.endDate;
  const createdRaw = data.createdAt;
  const startDate =
    startRaw instanceof Timestamp ? startRaw.toDate() : startRaw?.toDate?.() ?? new Date();
  const endDate =
    endRaw instanceof Timestamp ? endRaw.toDate() : endRaw?.toDate?.() ?? new Date();
  const createdAt =
    createdRaw instanceof Timestamp ? createdRaw.toDate() : createdRaw?.toDate?.() ?? null;

  return {
    id: docSnap.id,
    startDate,
    endDate,
    status: (data.status as EstadoHorarioChofer) ?? "DESCANSO",
    reason: data.reason ?? "",
    approvedBy: data.approvedBy ?? "",
    createdAt,
    empresaId: data.empresaId ?? "",
  };
};

export const obtenerHorariosChofer = async (
  choferId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<HorarioChofer[]> => {
  const horariosRef = collection(db, "choferes", choferId, "horarios");
  const finalDate = endDate ? Timestamp.fromDate(endDate) : null;
  const baseQuery = finalDate
    ? query(horariosRef, where("startDate", "<=", finalDate), orderBy("startDate", "desc"))
    : query(horariosRef, orderBy("startDate", "desc"));

  const snapshot = await getDocs(baseQuery);
  const horarios = snapshot.docs.map(mapHorario);
  if (!startDate) return horarios;
  const inicioMs = startDate.getTime();
  return horarios.filter((horario) => horario.endDate.getTime() >= inicioMs);
};

export const crearHorarioChofer = async (
  choferId: string,
  horario: Omit<HorarioChofer, "id" | "createdAt">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = empresaIdParam ? asegurarEmpresaId(empresaIdParam) : "";
  const payload: Record<string, unknown> = {
    ...horario,
    startDate: Timestamp.fromDate(horario.startDate),
    endDate: Timestamp.fromDate(horario.endDate),
    createdAt: Timestamp.now(),
  };
  if (empresaId) {
    payload.empresaId = empresaId;
  }
  const ref = await addDoc(collection(db, "choferes", choferId, "horarios"), payload);
  return ref.id;
};

export const actualizarHorarioChofer = async (
  choferId: string,
  horarioId: string,
  data: Partial<Omit<HorarioChofer, "id" | "createdAt">>,
): Promise<void> => {
  const payload: Record<string, unknown> = { ...data };
  if (data.startDate) {
    payload.startDate = Timestamp.fromDate(data.startDate);
  }
  if (data.endDate) {
    payload.endDate = Timestamp.fromDate(data.endDate);
  }
  await updateDoc(doc(db, "choferes", choferId, "horarios", horarioId), payload);
};

export const eliminarHorarioChofer = async (
  choferId: string,
  horarioId: string,
): Promise<void> => {
  await deleteDoc(doc(db, "choferes", choferId, "horarios", horarioId));
};
