"use client";

import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) {
        router.push("/login");
      } else {
        setCargando(false);
      }
    });

    return () => unsub();
  }, [router]);

  if (cargando) {
    return <div style={{ padding: "24px" }}>Cargando...</div>;
  }

  return <>{children}</>;
}
