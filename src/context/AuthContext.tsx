"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getUserMembership, type UserMembership } from "@/lib/memberships";

export type RolUsuario = "admin" | "finanzas" | "operaciones" | "superadmin";

interface AuthState {
  usuario: User | null;
  rol: RolUsuario | null;
  activo: boolean;
  cargando: boolean;
  // TODO: migrate to membership model
  empresaId: string | null;
  empresaActualId: string | null;
  membership: UserMembership | null;
}

interface AuthContextValue extends AuthState {
  user: User | null;
  cambiarEmpresaActual: (id: string) => void;
  setEmpresaActualId: (id: string) => void;
  hasPermission: (permission: string) => boolean;
}

const EMPRESA_STORAGE_KEY = "empresaActualId";

const AuthContextWithSetter = createContext<AuthContextValue>({
  usuario: null,
  user: null,
  rol: null,
  activo: false,
  cargando: true,
  empresaId: null,
  empresaActualId: null,
  membership: null,
  cambiarEmpresaActual: () => undefined,
  setEmpresaActualId: () => undefined,
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<AuthState>({
    usuario: null,
    rol: null,
    activo: false,
    cargando: true,
    empresaId: null,
    empresaActualId: null,
    membership: null,
  });

  const setEmpresaActualId = useCallback((empresaId: string) => {
    setEstado((prev) => ({ ...prev, empresaActualId: empresaId }));
  }, []);

  const cambiarEmpresaActual = setEmpresaActualId;

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
          membership: null,
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
          // TODO: migrate to membership model
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
        membership: null,
      });
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const usuario = estado.usuario;
    const empresaActualId = estado.empresaActualId;
    const empresaId = estado.empresaId;

    if (!usuario) {
      return;
    }

    const empresaObjetivo = empresaActualId || empresaId;
    if (!empresaObjetivo) {
      return;
    }

    let activa = true;

    const cargarMembership = async () => {
      let membership = await getUserMembership(empresaObjetivo, usuario.uid);
      let empresaResuelta = empresaObjetivo;

      if (!membership && empresaId && empresaId !== empresaObjetivo) {
        membership = await getUserMembership(empresaId, usuario.uid);
        if (membership) {
          empresaResuelta = empresaId;
        }
      }

      if (!membership && empresaId) {
        empresaResuelta = empresaId;
      }

      if (!activa) return;

      setEstado((prev) => {
        if (prev.usuario?.uid !== usuario.uid) return prev;
        if ((prev.empresaActualId || prev.empresaId) !== empresaObjetivo) return prev;

        return {
          ...prev,
          membership,
          empresaActualId: empresaResuelta,
        };
      });
    };

    void cargarMembership();

    return () => {
      activa = false;
    };
  }, [estado.usuario, estado.empresaActualId, estado.empresaId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (estado.empresaActualId) {
      localStorage.setItem(EMPRESA_STORAGE_KEY, estado.empresaActualId);
    } else {
      localStorage.removeItem(EMPRESA_STORAGE_KEY);
    }
  }, [estado.empresaActualId]);

  const hasPermission = useCallback(
    (permission: string) => {
      void permission;
      return estado.membership?.role === "admin";
    },
    [estado.membership],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...estado,
      user: estado.usuario,
      cambiarEmpresaActual,
      setEmpresaActualId,
      hasPermission,
    }),
    [estado, cambiarEmpresaActual, setEmpresaActualId, hasPermission],
  );

  return <AuthContextWithSetter.Provider value={value}>{children}</AuthContextWithSetter.Provider>;
}

export function useAuth() {
  return useContext(AuthContextWithSetter);
}
