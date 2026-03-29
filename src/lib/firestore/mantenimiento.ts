import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  orderBy,
  limit,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { asegurarEmpresaId } from "@/lib/firestore/empresas";

export interface RegistroMantenimiento {
  id: string;
  autobusId: string;
  descripcion: string;
  fecha: Date | null;
  empresaId: string;
  costo: number;
  createdAt?: Date | null;
}

export interface PiezaUsadaMantenimiento {
  inventarioId: string;
  cantidad: number;
}

export interface HistorialMantenimientoEntry {
  accion: string;
  userId: string;
  timestamp?: Date | null;
  detalles?: Record<string, unknown> | null;
}

export type TicketMantenimientoStatus = "open" | "in_progress" | "done";

export interface TicketMantenimientoIT {
  id: string;
  dispositivoId: string;
  descripcion: string;
  status: TicketMantenimientoStatus;
  piezasUsadas: PiezaUsadaMantenimiento[];
  historial: HistorialMantenimientoEntry[];
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

interface TicketMantenimientoPayload {
  dispositivoId: string;
  descripcion: string;
  status: TicketMantenimientoStatus;
  piezasUsadas: PiezaUsadaMantenimiento[];
}

const toDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "object" && value && "toDate" in (value as Record<string, unknown>)) {
    const maybeFn = (value as { toDate?: () => Date }).toDate;
    return typeof maybeFn === "function" ? maybeFn() : null;
  }
  return null;
};

const mapTicketMantenimiento = (
  docSnap: QueryDocumentSnapshot<DocumentData>,
): TicketMantenimientoIT => {
  const data = docSnap.data();
  const createdAt = toDate(data.createdAt);
  const updatedAt = toDate(data.updatedAt);

  return {
    id: docSnap.id,
    dispositivoId: data.dispositivoId ?? "",
    descripcion: data.descripcion ?? "",
    status: (data.status as TicketMantenimientoStatus) ?? "open",
    piezasUsadas: Array.isArray(data.piezasUsadas)
      ? data.piezasUsadas.map((pieza) => ({
          inventarioId: pieza.inventarioId ?? "",
          cantidad: Number(pieza.cantidad ?? 0),
        }))
      : [],
    historial: Array.isArray(data.historial)
      ? data.historial.map((entry) => ({
          accion: entry.accion ?? "",
          userId: entry.userId ?? "",
          timestamp: toDate(entry.timestamp),
          detalles: entry.detalles ?? null,
        }))
      : [],
    createdAt,
    updatedAt,
  };
};

const sanitizePiezas = (piezasUsadas: PiezaUsadaMantenimiento[]) =>
  piezasUsadas.map((pieza) => ({
    inventarioId: pieza.inventarioId,
    cantidad: Number(pieza.cantidad ?? 0),
  }));

const buildHistorialEntry = (
  accion: string,
  userId: string,
  detalles?: Record<string, unknown>,
) => ({
  accion,
  userId,
  timestamp: Timestamp.now(),
  detalles: detalles ?? null,
});

const computePiezaDeltas = (
  previousPiezas: PiezaUsadaMantenimiento[],
  nextPiezas: PiezaUsadaMantenimiento[],
) => {
  const previousMap = new Map(previousPiezas.map((pieza) => [pieza.inventarioId, pieza.cantidad]));
  const nextMap = new Map(nextPiezas.map((pieza) => [pieza.inventarioId, pieza.cantidad]));
  const ids = new Set([...previousMap.keys(), ...nextMap.keys()]);

  return Array.from(ids).map((inventarioId) => ({
    inventarioId,
    previous: previousMap.get(inventarioId) ?? 0,
    next: nextMap.get(inventarioId) ?? 0,
    delta: (nextMap.get(inventarioId) ?? 0) - (previousMap.get(inventarioId) ?? 0),
  }));
};

const createTransactionActivityLog = (
  empresaId: string,
  transaction: Parameters<typeof runTransaction>[1] extends (t: infer T) => Promise<unknown> ? T : never,
  data: {
    tipo: "mantenimiento" | "inventario" | "dispositivo";
    accion: string;
    descripcion: string;
    userId: string;
  },
) => {
  const logRef = doc(collection(db, "empresas", empresaId, "activityLogs"));
  transaction.set(logRef, {
    tipo: data.tipo,
    accion: data.accion,
    descripcion: data.descripcion,
    userId: data.userId,
    createdAt: Timestamp.now(),
  });
};

export const obtenerMantenimientos = async (empresaIdParam?: string): Promise<RegistroMantenimiento[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const q = query(
    collection(db, "mantenimientos"),
    where("empresaId", "==", empresaId),
    orderBy("fecha", "desc"),
    limit(300),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((registro) => {
    const data = registro.data();
    return {
      id: registro.id,
      autobusId: data.autobusId ?? "",
      descripcion: data.descripcion ?? "",
      fecha: data.fecha?.toDate?.() ?? null,
      empresaId: data.empresaId ?? "",
      costo: Number(data.costo ?? 0),
      createdAt: data.createdAt?.toDate?.() ?? null,
    };
  });
};

export const crearMantenimiento = async (
  mantenimiento: Omit<RegistroMantenimiento, "id" | "empresaId" | "createdAt">,
  empresaIdParam?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const ref = await addDoc(collection(db, "mantenimientos"), {
    ...mantenimiento,
    empresaId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const actualizarMantenimiento = async (
  id: string,
  data: Partial<Omit<RegistroMantenimiento, "id" | "empresaId" | "createdAt">>,
): Promise<void> => {
  await updateDoc(doc(db, "mantenimientos", id), data);
};

export const eliminarMantenimiento = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "mantenimientos", id));
};

export const getMantenimientos = async (empresaIdParam?: string): Promise<TicketMantenimientoIT[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const ticketsRef = collection(db, "empresas", empresaId, "mantenimientos");
  const ticketsQuery = query(ticketsRef, orderBy("createdAt", "desc"), limit(300));
  const snapshot = await getDocs(ticketsQuery);
  return snapshot.docs.map(mapTicketMantenimiento);
};

export const createMantenimiento = async (
  empresaIdParam: string | undefined,
  data: TicketMantenimientoPayload,
  userId: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);

  if (!data.dispositivoId) {
    throw new Error("Debes seleccionar un dispositivo.");
  }
  if (!data.descripcion.trim()) {
    throw new Error("La descripción es obligatoria.");
  }

  const piezasUsadas = sanitizePiezas(data.piezasUsadas);

  piezasUsadas.forEach((pieza) => {
    if (!pieza.inventarioId) {
      throw new Error("Cada pieza debe estar vinculada a un item de inventario.");
    }
    if (!Number.isFinite(pieza.cantidad) || pieza.cantidad <= 0) {
      throw new Error("La cantidad de piezas usadas debe ser mayor a 0.");
    }
  });

  const ticketRef = doc(collection(db, "empresas", empresaId, "mantenimientos"));
  const dispositivoRef = doc(db, "empresas", empresaId, "dispositivos", data.dispositivoId);

  await runTransaction(db, async (transaction) => {
    const dispositivoSnap = await transaction.get(dispositivoRef);
    if (!dispositivoSnap.exists()) {
      throw new Error("El dispositivo seleccionado no existe.");
    }

    for (const pieza of piezasUsadas) {
      const inventarioRef = doc(db, "empresas", empresaId, "inventario", pieza.inventarioId);
      const inventarioSnap = await transaction.get(inventarioRef);

      if (!inventarioSnap.exists()) {
        throw new Error("Una de las piezas seleccionadas ya no existe en inventario.");
      }

      const cantidadActual = Number(inventarioSnap.data().cantidad ?? 0);
      const cantidadNueva = cantidadActual - pieza.cantidad;

      if (cantidadNueva < 0) {
        throw new Error(`Stock insuficiente para ${inventarioSnap.data().nombre ?? "el item seleccionado"}.`);
      }

      transaction.update(inventarioRef, { cantidad: cantidadNueva });
      createTransactionActivityLog(empresaId, transaction, {
        tipo: "inventario",
        accion: "stock_used",
        descripcion: `Se descontaron ${pieza.cantidad} unidades del inventario ${pieza.inventarioId} por mantenimiento.`,
        userId,
      });
    }

    transaction.update(dispositivoRef, { status: "maintenance" });
    transaction.set(ticketRef, {
      dispositivoId: data.dispositivoId,
      descripcion: data.descripcion.trim(),
      status: data.status,
      piezasUsadas,
      historial: [
        buildHistorialEntry("created", userId, {
          status: data.status,
        }),
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    createTransactionActivityLog(empresaId, transaction, {
      tipo: "mantenimiento",
      accion: "created",
      descripcion: `Se creó un ticket de mantenimiento para el dispositivo ${data.dispositivoId}.`,
      userId,
    });
  });

  return ticketRef.id;
};

export const updateMantenimientoTicket = async (
  empresaIdParam: string | undefined,
  ticketId: string,
  data: TicketMantenimientoPayload,
  userId: string,
): Promise<void> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);

  if (!data.dispositivoId) {
    throw new Error("Debes seleccionar un dispositivo.");
  }
  if (!data.descripcion.trim()) {
    throw new Error("La descripción es obligatoria.");
  }

  const piezasUsadas = sanitizePiezas(data.piezasUsadas);
  piezasUsadas.forEach((pieza) => {
    if (!pieza.inventarioId) {
      throw new Error("Cada pieza debe estar vinculada a un item de inventario.");
    }
    if (!Number.isFinite(pieza.cantidad) || pieza.cantidad <= 0) {
      throw new Error("La cantidad de piezas usadas debe ser mayor a 0.");
    }
  });

  const ticketRef = doc(db, "empresas", empresaId, "mantenimientos", ticketId);
  const dispositivoRef = doc(db, "empresas", empresaId, "dispositivos", data.dispositivoId);

  await runTransaction(db, async (transaction) => {
    const ticketSnap = await transaction.get(ticketRef);
    if (!ticketSnap.exists()) {
      throw new Error("El ticket de mantenimiento no existe.");
    }

    const dispositivoSnap = await transaction.get(dispositivoRef);
    if (!dispositivoSnap.exists()) {
      throw new Error("El dispositivo seleccionado no existe.");
    }

    const previousData = ticketSnap.data();
    const previousPiezas = Array.isArray(previousData.piezasUsadas)
      ? previousData.piezasUsadas.map((pieza) => ({
          inventarioId: pieza.inventarioId ?? "",
          cantidad: Number(pieza.cantidad ?? 0),
        }))
      : [];
    const deltas = computePiezaDeltas(previousPiezas, piezasUsadas);

    for (const delta of deltas) {
      if (!delta.inventarioId || delta.delta === 0) continue;

      const inventarioRef = doc(db, "empresas", empresaId, "inventario", delta.inventarioId);
      const inventarioSnap = await transaction.get(inventarioRef);

      if (!inventarioSnap.exists()) {
        throw new Error("Una de las piezas seleccionadas ya no existe en inventario.");
      }

      const cantidadActual = Number(inventarioSnap.data().cantidad ?? 0);
      const cantidadNueva = cantidadActual - delta.delta;

      if (cantidadNueva < 0) {
        throw new Error(`Stock insuficiente para ${inventarioSnap.data().nombre ?? "el item seleccionado"}.`);
      }

      transaction.update(inventarioRef, { cantidad: cantidadNueva });

      createTransactionActivityLog(empresaId, transaction, {
        tipo: "inventario",
        accion: "stock_adjusted",
        descripcion: `Se ajustó el inventario ${delta.inventarioId} por edición del ticket ${ticketId}.`,
        userId,
      });
    }

    const historialActual = Array.isArray(previousData.historial) ? previousData.historial : [];

    transaction.update(ticketRef, {
      dispositivoId: data.dispositivoId,
      descripcion: data.descripcion.trim(),
      status: data.status,
      piezasUsadas,
      historial: [
        ...historialActual,
        buildHistorialEntry("updated", userId),
      ],
      updatedAt: Timestamp.now(),
    });

    if (data.status === "in_progress" || data.status === "done") {
      transaction.update(dispositivoRef, { status: data.status === "done" ? "available" : "maintenance" });
    } else {
      transaction.update(dispositivoRef, { status: "maintenance" });
    }

    createTransactionActivityLog(empresaId, transaction, {
      tipo: "mantenimiento",
      accion: "updated",
      descripcion: `Se editó el ticket de mantenimiento ${ticketId}.`,
      userId,
    });
  });
};

export const updateMantenimientoStatus = async (
  empresaIdParam: string | undefined,
  ticketId: string,
  nextStatus: TicketMantenimientoStatus,
  userId: string,
): Promise<void> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const ticketRef = doc(db, "empresas", empresaId, "mantenimientos", ticketId);

  await runTransaction(db, async (transaction) => {
    const ticketSnap = await transaction.get(ticketRef);
    if (!ticketSnap.exists()) {
      throw new Error("El ticket no existe.");
    }

    const ticketData = ticketSnap.data();
    const previousStatus = (ticketData.status as TicketMantenimientoStatus) ?? "open";
    const dispositivoId = ticketData.dispositivoId as string | undefined;

    if (!dispositivoId) {
      throw new Error("El ticket no tiene dispositivo asociado.");
    }

    const dispositivoRef = doc(db, "empresas", empresaId, "dispositivos", dispositivoId);
    const historialActual = Array.isArray(ticketData.historial) ? ticketData.historial : [];

    transaction.update(ticketRef, {
      status: nextStatus,
      historial: [
        ...historialActual,
        buildHistorialEntry("status_change", userId, {
          from: previousStatus,
          to: nextStatus,
        }),
      ],
      updatedAt: Timestamp.now(),
    });

    transaction.update(dispositivoRef, {
      status: nextStatus === "done" ? "available" : "maintenance",
    });

    createTransactionActivityLog(empresaId, transaction, {
      tipo: "mantenimiento",
      accion: "status_change",
      descripcion: `El ticket ${ticketId} cambió de ${previousStatus} a ${nextStatus}.`,
      userId,
    });
  });
};
