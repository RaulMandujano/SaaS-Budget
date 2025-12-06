"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { crearEmpresa, establecerEmpresaActual, PlanEmpresa } from "@/lib/firestore/empresas";

export type RolUsuario = "admin" | "finanzas" | "operaciones" | "superadmin";

interface AuthState {
  usuario: User | null;
  rol: RolUsuario | null;
  activo: boolean;
  cargando: boolean;
  empresaId: string | null;
  empresaActualId: string | null;
}

interface AuthContextValue extends AuthState {
  cambiarEmpresaActual: (id: string) => void;
}

const AuthContextWithSetter = createContext<AuthContextValue>({
  usuario: null,
  rol: null,
  activo: false,
  cargando: true,
  empresaId: null,
  empresaActualId: null,
  cambiarEmpresaActual: () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<AuthState>({
    usuario: null,
    rol: null,
    activo: false,
    cargando: true,
    empresaId: null,
    empresaActualId: null,
  });

  const cambiarEmpresaActual = useCallback((empresaId: string) => {
    establecerEmpresaActual(empresaId);
    setEstado((prev) => ({ ...prev, empresaActualId: empresaId }));
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        establecerEmpresaActual("");
        setEstado({
          usuario: null,
          rol: null,
          activo: false,
          cargando: false,
          empresaId: null,
          empresaActualId: null,
        });
        return;
      }

      try {
        const ref = doc(db, "usuarios", user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          const nuevaEmpresaId = await crearEmpresa({
            nombre: user.displayName ?? "Empresa",
            plan: "enterprise",
            activo: true,
          });
          await setDoc(ref, {
            nombre: user.displayName ?? "Usuario",
            email: user.email,
            rol: "admin",
            activo: true,
            empresaId: nuevaEmpresaId,
            plan: "enterprise" as PlanEmpresa,
            fechaCreacion: serverTimestamp(),
          });
          establecerEmpresaActual(nuevaEmpresaId);
          setEstado({
            usuario: user,
            rol: "admin",
            activo: true,
            cargando: false,
            empresaId: nuevaEmpresaId,
            empresaActualId: nuevaEmpresaId,
          });
          return;
        }

        const data = snap.data();
        const rol = (data?.rol as RolUsuario | undefined) || null;
        const activo = data?.activo !== false;
        let empresaId = (data?.empresaId as string | undefined) || null;
        const plan = (data?.plan as PlanEmpresa | undefined) || "enterprise";

        if (!empresaId && rol === "admin") {
          empresaId = await crearEmpresa({
            nombre: data?.nombre ?? "Empresa",
            plan: plan ?? "enterprise",
            activo: true,
          });
          await updateDoc(ref, { empresaId });
        }

        const empresaGuardada =
          typeof window !== "undefined" ? localStorage.getItem("empresaActualId") : null;
        const empresaActualId =
          rol === "superadmin"
            ? empresaGuardada || empresaId
            : empresaId || empresaGuardada || null;
        if (empresaActualId) {
          establecerEmpresaActual(empresaActualId);
        }

        if (data && data.activo === false) {
          setEstado({
            usuario: user,
            rol,
            activo: false,
            cargando: false,
            empresaId,
            empresaActualId,
          });
          return;
        }

        setEstado({
          usuario: user,
          rol,
          activo: true,
          cargando: false,
          empresaId,
          empresaActualId,
        });
      } catch (error) {
        console.error("Error obteniendo rol de usuario", error);
        setEstado({
          usuario: user,
          rol: null,
          activo: false,
          cargando: false,
          empresaId: null,
          empresaActualId: null,
        });
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthContextWithSetter.Provider value={{ ...estado, cambiarEmpresaActual }}>
      {children}
    </AuthContextWithSetter.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContextWithSetter);
}
