"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

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

const EMPRESA_STORAGE_KEY = "empresaActualId";

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
    setEstado((prev) => ({ ...prev, empresaActualId: empresaId }));
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setEstado({
          usuario: null,
          rol: null,
          activo: false,
          cargando: false,
          empresaId: null,
          empresaActualId: null,
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem(EMPRESA_STORAGE_KEY);
        }
        return;
      }

      let rol: RolUsuario | null = null;
      let activo = true;
      let empresaId: string | null = null;

      try {
        const ref = doc(db, "usuarios", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const valorRol = (data.rol as string | undefined) ?? null;
          if (valorRol) {
            const normalizado = valorRol.toLowerCase();
            const rolesValidos: RolUsuario[] = ["admin", "finanzas", "operaciones", "superadmin"];
            if (rolesValidos.includes(normalizado as RolUsuario)) {
              rol = normalizado as RolUsuario;
            }
          }
          activo = data.activo !== false;
          empresaId = (data.empresaId as string | undefined) || null;
        }
      } catch (error) {
        console.error("No se pudo obtener el perfil del usuario", error);
      }

      const almacenada =
        typeof window !== "undefined" ? localStorage.getItem(EMPRESA_STORAGE_KEY) : null;
      const empresaActualId = almacenada || empresaId;
      if (empresaActualId && typeof window !== "undefined") {
        localStorage.setItem(EMPRESA_STORAGE_KEY, empresaActualId);
      }

      setEstado({
        usuario: user,
        rol,
        activo,
        cargando: false,
        empresaId,
        empresaActualId,
      });
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (estado.empresaActualId) {
      localStorage.setItem(EMPRESA_STORAGE_KEY, estado.empresaActualId);
    } else {
      localStorage.removeItem(EMPRESA_STORAGE_KEY);
    }
  }, [estado.empresaActualId]);

  return (
    <AuthContextWithSetter.Provider value={{ ...estado, cambiarEmpresaActual }}>
      {children}
    </AuthContextWithSetter.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContextWithSetter);
}
