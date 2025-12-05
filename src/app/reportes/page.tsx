"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import { obtenerSucursales, Sucursal } from "@/lib/firestore/sucursales";
import { obtenerAutobuses, Autobus } from "@/lib/firestore/autobuses";
import { obtenerGastos, Gasto } from "@/lib/firestore/gastos";
import { generarExcelGastos } from "@/lib/reportes/generarExcel";
import { generarPdfGastos } from "@/lib/reportes/generarPdf";

const tiposDeGasto = [
  "Diesel",
  "Peaje",
  "Comida",
  "Hotel",
  "Refacción",
  "Multa",
  "Otro",
];

export default function ReportesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [autobuses, setAutobuses] = useState<Autobus[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);

  const [filtroSucursal, setFiltroSucursal] = useState("todas");
  const [filtroAutobus, setFiltroAutobus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    const cargar = async () => {
      const [listaSucursales, listaAutobuses, listaGastos] = await Promise.all([
        obtenerSucursales(),
        obtenerAutobuses(),
        obtenerGastos(),
      ]);
      setSucursales(listaSucursales);
      setAutobuses(listaAutobuses);
      setGastos(listaGastos);
    };

    cargar();
  }, []);

  const mapaSucursales = useMemo(() => {
    const mapa = new Map<string, string>();
    sucursales.forEach((sucursal) => mapa.set(sucursal.id, sucursal.nombre));
    return mapa;
  }, [sucursales]);

  const mapaAutobuses = useMemo(() => {
    const mapa = new Map<string, string>();
    autobuses.forEach((bus) => mapa.set(bus.id, bus.numeroUnidad));
    return mapa;
  }, [autobuses]);

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((gasto) => {
      if (filtroSucursal !== "todas" && gasto.sucursalId !== filtroSucursal) return false;
      if (filtroAutobus !== "todos" && gasto.autobusId !== filtroAutobus) return false;
      if (filtroTipo !== "todos" && gasto.tipo !== filtroTipo) return false;

      if (fechaDesde) {
        const inicio = new Date(`${fechaDesde}T00:00:00`);
        if (gasto.fecha && gasto.fecha < inicio) return false;
      }

      if (fechaHasta) {
        const fin = new Date(`${fechaHasta}T23:59:59`);
        if (gasto.fecha && gasto.fecha > fin) return false;
      }

      return true;
    });
  }, [gastos, filtroSucursal, filtroAutobus, filtroTipo, fechaDesde, fechaHasta]);

  const totalGeneral = useMemo(
    () => gastosFiltrados.reduce((acc, gasto) => acc + (Number(gasto.monto) || 0), 0),
    [gastosFiltrados],
  );

  const gastosParaExportar = gastosFiltrados.map((gasto) => ({
    fecha: gasto.fecha,
    tipo: gasto.tipo,
    descripcion: gasto.descripcion,
    monto: gasto.monto,
    autobus: mapaAutobuses.get(gasto.autobusId) ?? "Autobús no encontrado",
    sucursal: mapaSucursales.get(gasto.sucursalId) ?? "Sucursal no encontrada",
  }));

  const exportarExcel = () => {
    void generarExcelGastos(gastosParaExportar);
  };
  const exportarPdf = () => {
    void generarPdfGastos(gastosParaExportar);
  };

  return (
    <ProtectedLayout>
      <PanelLayout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Reportes Financieros</h1>
              <p className="text-gray-600">Filtros avanzados y exportación de gastos.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportarExcel}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Exportar a Excel
              </button>
              <button
                onClick={exportarPdf}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Exportar a PDF
              </button>
            </div>
          </div>

          <div className="bg-white shadow rounded p-4 space-y-4 border border-gray-200">
            <h2 className="text-lg font-semibold">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-medium">Sucursal</label>
                <select
                  value={filtroSucursal}
                  onChange={(e) => {
                    setFiltroSucursal(e.target.value);
                    setFiltroAutobus("todos");
                  }}
                  className="border rounded px-3 py-2"
                >
                  <option value="todas">Todas</option>
                  {sucursales.map((sucursal) => (
                    <option key={sucursal.id} value={sucursal.id}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-medium">Autobús</label>
                <select
                  value={filtroAutobus}
                  onChange={(e) => setFiltroAutobus(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="todos">Todos</option>
                  {autobuses
                    .filter((bus) => filtroSucursal === "todas" || bus.sucursalId === filtroSucursal)
                    .map((bus) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.numeroUnidad}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-medium">Tipo de Gasto</label>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="todos">Todos</option>
                  {tiposDeGasto.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-medium">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="border rounded px-3 py-2"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-medium">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded p-4 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Resultados</h2>
              <p className="text-lg font-semibold">
                Total General: ${totalGeneral.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 border-b">Fecha</th>
                    <th className="text-left px-4 py-2 border-b">Tipo</th>
                    <th className="text-left px-4 py-2 border-b">Descripción</th>
                    <th className="text-left px-4 py-2 border-b">Monto</th>
                    <th className="text-left px-4 py-2 border-b">Autobús</th>
                    <th className="text-left px-4 py-2 border-b">Sucursal</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosFiltrados.map((gasto) => (
                    <tr key={gasto.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2">
                        {gasto.fecha ? gasto.fecha.toLocaleDateString("es-ES") : "Sin fecha"}
                      </td>
                      <td className="px-4 py-2">{gasto.tipo}</td>
                      <td className="px-4 py-2">{gasto.descripcion}</td>
                      <td className="px-4 py-2">
                        ${Number(gasto.monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2">
                        {mapaAutobuses.get(gasto.autobusId) ?? "Autobús no encontrado"}
                      </td>
                      <td className="px-4 py-2">
                        {mapaSucursales.get(gasto.sucursalId) ?? "Sucursal no encontrada"}
                      </td>
                    </tr>
                  ))}
                  {gastosFiltrados.length === 0 && (
                    <tr>
                      <td className="px-4 py-3 text-center text-gray-600" colSpan={6}>
                        No hay resultados con los filtros actuales.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PanelLayout>
    </ProtectedLayout>
  );
}
