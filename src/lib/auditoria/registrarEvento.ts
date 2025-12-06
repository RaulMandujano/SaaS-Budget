import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface DatosAuditoria {
  usuarioId?: string | null;
  usuarioNombre?: string | null;
  usuarioEmail?: string | null;
  rol?: string | null;
  modulo: string;
  accion: "crear" | "editar" | "eliminar";
  descripcion: string;
  ip?: string | null;
}

export async function registrarEventoAuditoria(datos: DatosAuditoria) {
  try {
    await addDoc(collection(db, "auditoria"), {
      usuarioId: datos.usuarioId ?? null,
      usuarioNombre: datos.usuarioNombre ?? null,
      usuarioEmail: datos.usuarioEmail ?? null,
      rol: datos.rol ?? null,
      modulo: datos.modulo,
      accion: datos.accion,
      descripcion: datos.descripcion,
      fecha: serverTimestamp(),
      ip: datos.ip ?? null,
    });
  } catch (error) {
    console.error("No se pudo registrar auditoría", error);
  }
}
