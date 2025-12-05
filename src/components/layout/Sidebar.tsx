"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const enlaces = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sucursales", label: "Sucursales" },
  { href: "/autobuses", label: "Autobuses" },
  { href: "/gastos", label: "Gastos" },
  { href: "/reportes", label: "Reportes" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const linkClase = (href: string) => {
    const activo = pathname.startsWith(href);
    return [
      "block px-4 py-2 rounded transition-colors",
      activo ? "bg-gray-700 text-white font-semibold" : "text-gray-200 hover:bg-gray-700",
    ].join(" ");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white px-4 py-6 space-y-6">
      <div className="px-2">
        <p className="text-lg font-bold">Menú</p>
      </div>
      <nav className="space-y-2">
        {enlaces.map((enlace) => (
          <Link key={enlace.href} href={enlace.href} className={linkClase(enlace.href)}>
            {enlace.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
