const formatterFecha = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC" });
const formatterFechaHora = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  dateStyle: "short",
  timeStyle: "short",
});

export const formatearFecha = (fecha?: Date | null, vacio = "Sin fecha"): string => {
  if (!fecha) return vacio;
  return formatterFecha.format(fecha);
};

export const formatearFechaHora = (fecha?: Date | null, vacio = "Sin registro"): string => {
  if (!fecha) return vacio;
  return formatterFechaHora.format(fecha);
};
