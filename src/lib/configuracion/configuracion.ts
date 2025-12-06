"use client";

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

export interface ConfiguracionGeneral {
  nombreEmpresa: string;
  logoUrl: string;
  moneda: string;
  impuestosActivo: boolean;
  porcentajeImpuesto: number;
  modoMantenimiento: boolean;
  fechaActualizacion: Date | null;
}

export const configuracionDefault: ConfiguracionGeneral = {
  nombreEmpresa: "Estrella Polar",
  logoUrl: "",
  moneda: "MXN",
  impuestosActivo: false,
  porcentajeImpuesto: 0,
  modoMantenimiento: false,
  fechaActualizacion: null,
};

const docConfiguracion = doc(db, "configuracion", "general");

const mapearConfiguracion = (data?: Record<string, unknown>): ConfiguracionGeneral => {
  if (!data) return configuracionDefault;

  const fecha = (data.fechaActualizacion as Timestamp | undefined)?.toDate?.() ?? null;

  return {
    nombreEmpresa: (data.nombreEmpresa as string) || configuracionDefault.nombreEmpresa,
    logoUrl: (data.logoUrl as string) || "",
    moneda: (data.moneda as string) || configuracionDefault.moneda,
    impuestosActivo: Boolean(data.impuestosActivo),
    porcentajeImpuesto: Number(data.porcentajeImpuesto ?? 0),
    modoMantenimiento: Boolean(data.modoMantenimiento),
    fechaActualizacion: fecha,
  };
};

export const obtenerConfiguracion = async (): Promise<ConfiguracionGeneral> => {
  const snap = await getDoc(docConfiguracion);
  if (!snap.exists()) {
    await setDoc(docConfiguracion, {
      ...configuracionDefault,
      fechaActualizacion: serverTimestamp(),
    });
    return configuracionDefault;
  }
  return mapearConfiguracion(snap.data());
};

export const guardarConfiguracion = async (
  configuracion: Omit<ConfiguracionGeneral, "fechaActualizacion">,
): Promise<void> => {
  const payload = {
    ...configuracion,
    porcentajeImpuesto: Number(configuracion.porcentajeImpuesto) || 0,
    fechaActualizacion: serverTimestamp(),
  };
  await setDoc(docConfiguracion, payload, { merge: true });
};

export const suscribirseConfiguracion = (
  onChange: (config: ConfiguracionGeneral) => void,
  onError?: (error: unknown) => void,
): Unsubscribe => {
  return onSnapshot(
    docConfiguracion,
    (snapshot) => {
      const data = snapshot.data();
      onChange(mapearConfiguracion(data || undefined));
    },
    (error) => {
      console.error("No se pudo escuchar la configuración", error);
      if (onError) onError(error);
    },
  );
};

export const subirLogoConfiguracion = async (archivo: File): Promise<string> => {
  const extension = archivo.name.split(".").pop() || "png";
  const storage = getStorage();
  const referencia = ref(storage, `configuracion/logo-${Date.now()}.${extension}`);
  const resultado = await uploadBytes(referencia, archivo);
  return getDownloadURL(resultado.ref);
};

const monedaValida = (moneda: string) => {
  const codigo = moneda || configuracionDefault.moneda;
  const lista = ["MXN", "USD", "PEN", "EUR", "COP", "CLP"];
  return lista.includes(codigo.toUpperCase()) ? codigo.toUpperCase() : configuracionDefault.moneda;
};

export const aplicarImpuesto = (monto: number, config: ConfiguracionGeneral): number => {
  const base = Number(monto) || 0;
  if (!config.impuestosActivo) return base;
  const porcentaje = Number(config.porcentajeImpuesto) || 0;
  return base + (base * porcentaje) / 100;
};

export const formatearMoneda = (monto: number, config: ConfiguracionGeneral): string => {
  const codigo = monedaValida(config.moneda);
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: codigo,
      minimumFractionDigits: 2,
    }).format(Number(monto) || 0);
  } catch (error) {
    console.warn("No se pudo formatear la moneda con el código indicado, usando MXN.", error);
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: configuracionDefault.moneda,
      minimumFractionDigits: 2,
    }).format(Number(monto) || 0);
  }
};

interface ConfiguracionContextValue {
  configuracion: ConfiguracionGeneral;
  cargandoConfiguracion: boolean;
}

export const ConfiguracionContext = createContext<ConfiguracionContextValue>({
  configuracion: configuracionDefault,
  cargandoConfiguracion: true,
});

export const useConfiguracion = () => useContext(ConfiguracionContext);

export const ConfiguracionProvider = ({ children }: { children: ReactNode }) => {
  const [configuracion, setConfiguracion] = useState<ConfiguracionGeneral>(configuracionDefault);
  const [cargandoConfiguracion, setCargandoConfiguracion] = useState(true);

  useEffect(() => {
    const unsub = suscribirseConfiguracion(
      (config) => {
        setConfiguracion(config);
        setCargandoConfiguracion(false);
      },
      () => setCargandoConfiguracion(false),
    );
    return () => unsub();
  }, []);

  return createElement(
    ConfiguracionContext.Provider,
    { value: { configuracion, cargandoConfiguracion } },
    children,
  );
};
