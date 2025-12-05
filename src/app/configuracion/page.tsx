"use client";

import ProtectedLayout from "@/components/layout/ProtectedLayout";

export default function ConfiguracionPage() {
  return (
    <ProtectedLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-gray-700">
          Ajusta la configuración general del sistema desde este módulo.
        </p>
      </div>
    </ProtectedLayout>
  );
}
