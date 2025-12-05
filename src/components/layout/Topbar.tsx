"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function Topbar() {
  const router = useRouter();

  const cerrarSesion = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <header className="flex items-center justify-between bg-white shadow px-6 py-4 sticky top-0 z-10">
      <h1 className="text-xl font-semibold text-gray-800">Panel Estrella Polar</h1>
      <button
        onClick={cerrarSesion}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
      >
        Cerrar Sesión
      </button>
    </header>
  );
}
