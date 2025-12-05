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

export const generarPdfGastos = async (gastos: GastoParaExportar[]): Promise<void> => {
  try {
    const jsPdfModule = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");

    const doc = new jsPdfModule.default();

    doc.setFontSize(14);
    doc.text("Reporte de Gastos - Estrella Polar", 105, 14, { align: "center" });
    doc.setFontSize(10);
    doc.text(
      `Fecha de generación: ${new Date().toLocaleString("es-ES")}`,
      105,
      22,
      { align: "center" },
    );

    const filas = gastos.map((gasto) => [
      formatearFecha(gasto.fecha),
      gasto.tipo,
      gasto.descripcion,
      `$${(Number(gasto.monto) || 0).toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      gasto.autobus,
      gasto.sucursal,
    ]);

    autoTableModule.default(doc, {
      head: [["Fecha", "Tipo", "Descripción", "Monto", "Autobús", "Sucursal"]],
      body: filas,
      startY: 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [33, 150, 243] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY ?? 30;
    const total = gastos.reduce((acc, gasto) => acc + (Number(gasto.monto) || 0), 0);
    doc.setFontSize(11);
    doc.text(
      `Total general: $${total.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      14,
      finalY + 10,
    );

    doc.save("reporte-gastos.pdf");
  } catch (error) {
    console.warn(
      "No se pudo generar el PDF. Verifica que 'jspdf' y 'jspdf-autotable' estén instalados.",
      error,
    );
  }
};
