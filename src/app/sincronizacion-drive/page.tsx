"use client";

import ProtectedLayout from "@/components/layout/ProtectedLayout";

export default function SincronizacionDrivePage() {
  return (
    <ProtectedLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Sincronización con Drive</h1>
        <p className="text-gray-700">
          Administra la sincronización de archivos con Drive desde este módulo.
        </p>
      </div>
    </ProtectedLayout>
  );
}
