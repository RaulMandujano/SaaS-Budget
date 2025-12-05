"use client";

import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";

export default function RutasPage() {
  return (
    <ProtectedLayout>
      <PanelLayout>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Rutas</h1>
          <p className="text-gray-700">
            Consulta y gestiona las rutas operativas en esta sección.
          </p>
        </div>
      </PanelLayout>
    </ProtectedLayout>
  );
}
