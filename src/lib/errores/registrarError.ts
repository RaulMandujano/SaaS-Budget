"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";

let listenersInstalados = false;

export interface ErrorSistemaPayload {
  mensaje: string;
  stack?: string;
  ruta?: string;
  usuarioId?: string | null;
}

function getSafeRuta() {
  if (typeof window === "undefined") return null;
  return window.location.pathname;
}

export const registrarError = async (payload: ErrorSistemaPayload) => {
  try {
    const usuarioId = payload.usuarioId ?? auth.currentUser?.uid ?? null;
    await addDoc(collection(db, "erroresSistema"), {
      mensaje: payload.mensaje,
      stack: payload.stack || null,
      ruta: payload.ruta || getSafeRuta(),
      usuarioId,
      fecha: serverTimestamp(),
    });
  } catch (error) {
    console.error("No se pudo registrar el error en Firestore", error);
  }
};

const handleErrorEvent = (event: ErrorEvent) => {
  registrarError({
    mensaje: event.message || "Error no especificado",
    stack: event.error?.stack || null,
    ruta: getSafeRuta() || undefined,
  });
};

const handleRejectionEvent = (event: PromiseRejectionEvent) => {
  const reason = event.reason as any;
  registrarError({
    mensaje: reason?.message || "Rechazo de promesa sin mensaje",
    stack: reason?.stack || JSON.stringify(reason),
    ruta: getSafeRuta() || undefined,
  });
};

export const registrarErrorGlobal = () => {
  if (listenersInstalados) return;
  if (typeof window === "undefined") return;

  window.addEventListener("error", handleErrorEvent);
  window.addEventListener("unhandledrejection", handleRejectionEvent);
  listenersInstalados = true;
};
