const formatterFecha = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC" });
const formatterFechaHora = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  dateStyle: "short",
  timeStyle: "short",
});

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

const construirFechaValida = (year: number, month: number, day: number): Date | null => {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const fecha = new Date(year, month - 1, day);
  return fecha.getFullYear() === year && fecha.getMonth() === month - 1 && fecha.getDate() === day
    ? fecha
    : null;
};

const convertirSerialExcelAFecha = (serial: number): Date | null => {
  if (!Number.isFinite(serial)) {
    return null;
  }
  const ajuste = serial >= 61 ? serial - 1 : serial;
  const fecha = new Date(EXCEL_EPOCH_UTC + ajuste * MS_POR_DIA);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

export const normalizarFechaExcel = (valor: unknown): Date | null => {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }
  if (typeof valor === "number") {
    return convertirSerialExcelAFecha(valor);
  }
  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();
  if (!texto) {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(texto)) {
    return convertirSerialExcelAFecha(Number(texto));
  }

  const isoMatch = texto.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?)?$/,
  );
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return construirFechaValida(year, month, day);
  }

  const slashMatch = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const primer = Number(slashMatch[1]);
    const segundo = Number(slashMatch[2]);
    const anioCandidato = Number(slashMatch[3]);
    const anio = anioCandidato >= 100 ? anioCandidato : 2000 + anioCandidato;
    const ddmm = construirFechaValida(anio, segundo, primer);
    if (ddmm) {
      return ddmm;
    }
    const mmdd = construirFechaValida(anio, primer, segundo);
    if (mmdd) {
      return mmdd;
    }
    return null;
  }

  return null;
};

export const formatearFecha = (fecha?: Date | null, vacio = "Sin fecha"): string => {
  if (!fecha) return vacio;
  return formatterFecha.format(fecha);
};

export const formatearFechaHora = (fecha?: Date | null, vacio = "Sin registro"): string => {
  if (!fecha) return vacio;
  return formatterFechaHora.format(fecha);
};
