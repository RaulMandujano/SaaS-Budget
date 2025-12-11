"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const enlaces = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sucursales", label: "Sucursales" },
  { href: "/autobuses", label: "Autobuses" },
  { href: "/gastos", label: "Gastos" },
  { href: "/reportes", label: "Reportes" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const cerrarSesion = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const linkClase = (href: string) => {
    const activo = pathname.startsWith(href);
    return [
      "block px-4 py-2 rounded transition-colors",
      activo ? "bg-gray-700 text-white font-semibold" : "text-gray-200 hover:bg-gray-700",
    ].join(" ");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white px-4 py-6 flex flex-col">
      <div className="px-2">
        <p className="text-lg font-bold">Menú</p>
      </div>
      <nav className="space-y-2 flex-1">
        {enlaces.map((enlace) => (
          <Link key={enlace.href} href={enlace.href} className={linkClase(enlace.href)}>
            {enlace.label}
          </Link>
        ))}
      </nav>
      <button
        onClick={cerrarSesion}
        className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
      >
        Cerrar Sesión
      </button>
    </aside>
  );
}
