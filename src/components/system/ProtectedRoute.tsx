"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, RolUsuario } from "@/context/AuthContext";

interface ProtectedRouteProps {
  roles?: RolUsuario[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const router = useRouter();
  const { usuario, rol, cargando, activo } = useAuth();
  const [ready, setReady] = useState(false);

  const isAllowed = useMemo(() => {
    if (!roles || roles.length === 0) return true;
    if (!rol) return false;
    return roles.includes(rol);
  }, [roles, rol]);

  useEffect(() => {
    if (cargando) return;
    if (!usuario) {
      router.replace("/login");
      return;
    }
    if (!activo) {
      router.replace("/no-autorizado");
      return;
    }
    setReady(true);
  }, [usuario, router, cargando, activo]);

  useEffect(() => {
    if (!ready) return;
    if (roles && roles.length > 0 && !isAllowed) {
      router.replace("/no-autorizado");
    }
  }, [ready, roles, isAllowed, router]);

  if (cargando || !ready) {
    return <div style={{ padding: 24 }}>Cargando...</div>;
  }

  if (roles && roles.length > 0 && !isAllowed) return null;

  return <>{children}</>;
}
