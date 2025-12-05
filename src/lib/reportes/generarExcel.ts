export interface GastoParaExportar {
  fecha: Date | string | null;
  tipo: string;
  descripcion: string;
  monto: number;
  autobus: string;
  sucursal: string;
}

const formatearFecha = (fecha: Date | string | null): string => {
  if (!fecha) return "";
  const instancia = fecha instanceof Date ? fecha : new Date(fecha);
  return instancia.toLocaleDateString("es-ES");
};

export const generarExcelGastos = async (gastos: GastoParaExportar[]): Promise<void> => {
  try {
    const XLSX = await import("xlsx");

    const datos = gastos.map((gasto) => ({
      Fecha: formatearFecha(gasto.fecha),
      Tipo: gasto.tipo,
      Descripción: gasto.descripcion,
      Monto: gasto.monto,
      Autobús: gasto.autobus,
      Sucursal: gasto.sucursal,
    }));

    const libro = XLSX.utils.book_new();
    const hoja = XLSX.utils.json_to_sheet(datos, {
      header: ["Fecha", "Tipo", "Descripción", "Monto", "Autobús", "Sucursal"],
    });

    hoja["!cols"] = [
      { wch: 12 },
      { wch: 16 },
      { wch: 40 },
      { wch: 12 },
      { wch: 16 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(libro, hoja, "Gastos");
    XLSX.writeFile(libro, "reporte-gastos.xlsx");
  } catch (error) {
    console.warn("No se pudo generar el Excel. Verifica que 'xlsx' esté instalado.", error);
  }
};
