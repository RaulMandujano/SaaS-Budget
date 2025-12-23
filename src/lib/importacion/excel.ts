export const normalizarTextoExcel = (valor: unknown): string => {
  return String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
};

const aliasEncabezados: Record<string, string> = {
  fecha: "fecha",
  concepto: "descripcion",
  descripcion: "descripcion",
  categoria: "categoria",
  tipo: "categoria",
  monto: "monto",
  sucursal: "sucursal",
  autobus: "autobus",
};

export const canonizarEncabezadoExcel = (valor: unknown): string => {
  const normalizado = normalizarTextoExcel(valor);
  return aliasEncabezados[normalizado] ?? normalizado;
};

export const parsearMontoExcel = (valor: unknown): number | null => {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : null;
  }
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  const limpio = texto.replace(/[^0-9,.-]/g, "");
  if (!limpio) return null;
  let normalizado = limpio;
  const lastComma = normalizado.lastIndexOf(",");
  const lastDot = normalizado.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalizado = normalizado.replace(/\./g, "").replace(/,/g, ".");
    } else {
      normalizado = normalizado.replace(/,/g, "");
    }
  } else if (lastComma !== -1 && lastDot === -1) {
    normalizado = normalizado.replace(/,/g, ".");
  }
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
};
