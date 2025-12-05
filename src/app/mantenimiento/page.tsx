"use client";

import ProtectedLayout from "@/components/layout/ProtectedLayout";

export default function MantenimientoPage() {
  return (
    <ProtectedLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Mantenimiento</h1>
        <p className="text-gray-700">
          Administra las actividades y registros de mantenimiento desde esta sección.
        </p>
      </div>
    </ProtectedLayout>
  );
}
