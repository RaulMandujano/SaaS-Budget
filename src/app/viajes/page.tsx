"use client";

import ProtectedLayout from "@/components/layout/ProtectedLayout";

export default function ViajesPage() {
  return (
    <ProtectedLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Viajes</h1>
        <p className="text-gray-700">
          Controla los viajes programados y su información general aquí.
        </p>
      </div>
    </ProtectedLayout>
  );
}
