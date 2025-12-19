"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { Autobus } from "@/lib/firestore/autobuses";
import { Chofer } from "@/lib/firestore/choferes";
import { Ruta } from "@/lib/firestore/rutas";
import { Viaje } from "@/lib/firestore/viajes";

export interface ViajeFormData {
  fecha: string;
  rutaId: string;
  autobusId: string;
  choferId: string;
  estado: Viaje["estado"];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: ViajeFormData) => void;
  initialData?: Viaje | null;
  rutas: Ruta[];
  autobuses: Autobus[];
  choferes: Chofer[];
  fechaInicial?: Date | null;
  obtenerEtiquetaRuta?: (ruta: Ruta) => string;
}

const estados: { value: Viaje["estado"]; label: string }[] = [
  { value: "programado", label: "Programado" },
  { value: "en_curso", label: "En curso" },
  { value: "completado", label: "Completado" },
];

const formatearFechaIso = (fecha: Date | null | undefined) => {
  if (!fecha) return "";
  const ajuste = fecha.getTimezoneOffset() * 60 * 1000;
  return new Date(fecha.getTime() - ajuste).toISOString().split("T")[0];
};

export default function ViajeDialog({
  open,
  onClose,
  onSave,
  initialData,
  rutas,
  autobuses,
  choferes,
  fechaInicial,
  obtenerEtiquetaRuta,
}: Props) {
  const obtenerEstadoInicial = (): ViajeFormData => {
    if (initialData) {
      return {
        fecha: formatearFechaIso(initialData.fecha),
        rutaId: initialData.rutaId,
        autobusId: initialData.autobusId,
        choferId: initialData.choferId ?? "",
        estado: initialData.estado,
      };
    }
    const fechaBase = fechaInicial ?? new Date();
    return {
      fecha: formatearFechaIso(fechaBase),
      rutaId: rutas[0]?.id ?? "",
      autobusId: autobuses[0]?.id ?? "",
      choferId: choferes[0]?.id ?? "",
      estado: "programado",
    };
  };

  const [form, setForm] = useState<ViajeFormData>(obtenerEstadoInicial);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const validar = () => {
    const nuevos: Record<string, string> = {};
    if (!form.fecha) nuevos.fecha = "Selecciona una fecha";
    if (!form.rutaId) nuevos.rutaId = "Selecciona una ruta";
    if (!form.autobusId) nuevos.autobusId = "Selecciona un autobús";
    if (!form.choferId) nuevos.choferId = "Selecciona un chofer";
    if (!form.estado) nuevos.estado = "Selecciona un estado";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSave = () => {
    if (!validar()) return;
    onSave(form);
  };

  const puedeGuardar = rutas.length > 0 && autobuses.length > 0 && choferes.length > 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Editar Viaje" : "Nuevo Viaje"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Fecha"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={form.fecha}
            onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))}
            error={Boolean(errores.fecha)}
            helperText={errores.fecha}
            fullWidth
          />
          <TextField
            select
            label="Ruta"
            value={form.rutaId}
            onChange={(e) => setForm((prev) => ({ ...prev, rutaId: e.target.value }))}
            error={Boolean(errores.rutaId)}
            helperText={errores.rutaId}
            fullWidth
          >
            {rutas.map((ruta) => (
              <MenuItem key={ruta.id} value={ruta.id}>
                {obtenerEtiquetaRuta?.(ruta) ??
                  `${ruta.sucursalOrigenId} → ${ruta.sucursalDestinoId}`}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Autobús"
            value={form.autobusId}
            onChange={(e) => setForm((prev) => ({ ...prev, autobusId: e.target.value }))}
            error={Boolean(errores.autobusId)}
            helperText={errores.autobusId}
            fullWidth
          >
            {autobuses.map((autobus) => (
              <MenuItem key={autobus.id} value={autobus.id}>
                {autobus.placa || autobus.numeroUnidad || "Autobús"}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Chofer"
            value={form.choferId}
            onChange={(e) => setForm((prev) => ({ ...prev, choferId: e.target.value }))}
            error={Boolean(errores.choferId)}
            helperText={errores.choferId}
            fullWidth
          >
            {choferes.map((chofer) => (
              <MenuItem key={chofer.id} value={chofer.id}>
                {chofer.nombre || "Chofer"}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Estado"
            value={form.estado}
            onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value as Viaje["estado"] }))}
            error={Boolean(errores.estado)}
            helperText={errores.estado}
            fullWidth
          >
            {estados.map((estado) => (
              <MenuItem key={estado.value} value={estado.value}>
                {estado.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={!puedeGuardar}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
