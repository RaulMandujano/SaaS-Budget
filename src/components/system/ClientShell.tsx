"use client";

import { useEffect } from "react";
import { Provider } from "@/components/ui/provider";
import { AuthProvider } from "@/context/AuthContext";
import { ConfiguracionProvider } from "@/lib/configuracion/configuracion";
import { registrarErrorGlobal } from "@/lib/errores/registrarError";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registrarErrorGlobal();
  }, []);

  return (
    <Provider>
      <AuthProvider>
        <ConfiguracionProvider>{children}</ConfiguracionProvider>
      </AuthProvider>
    </Provider>
  );
}
