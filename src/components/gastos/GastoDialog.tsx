"use client";

import { useEffect, useState } from "react";
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
import { Sucursal } from "@/lib/firestore/sucursales";
import { Autobus } from "@/lib/firestore/autobuses";
import { Gasto } from "@/lib/firestore/gastos";

export interface GastoFormData {
  fecha: string;
  concepto: string;
  categoria: string;
  monto: string;
  sucursalId: string;
  autobusId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: GastoFormData) => void;
  initialData?: Gasto | null;
  sucursales: Sucursal[];
  autobuses: Autobus[];
}

const categorias = ["Combustible", "Mantenimiento", "Peajes", "Sueldos", "Otros"];

export default function GastoDialog({ open, onClose, onSave, initialData, sucursales, autobuses }: Props) {
  const [form, setForm] = useState<GastoFormData>({
    fecha: "",
    concepto: "",
    categoria: categorias[0],
    monto: "",
    sucursalId: "",
    autobusId: "",
  });
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        fecha: initialData.fecha ? new Date(initialData.fecha).toISOString().slice(0, 10) : "",
        concepto: initialData.descripcion ?? "",
        categoria: initialData.tipo ?? categorias[0],
        monto: initialData.monto ? String(initialData.monto) : "",
        sucursalId: initialData.sucursalId ?? "",
        autobusId: initialData.autobusId ?? "",
      });
    } else {
      const primeraSucursal = sucursales[0]?.id ?? "";
      const primerAutobus = autobuses[0]?.id ?? "";
      setForm({
        fecha: "",
        concepto: "",
        categoria: categorias[0],
        monto: "",
        sucursalId: primeraSucursal,
        autobusId: primerAutobus,
      });
    }
    setErrores({});
  }, [initialData, open, sucursales, autobuses]);

  const validar = () => {
    const nuevos: Record<string, string> = {};
    if (!form.fecha) nuevos.fecha = "La fecha es obligatoria";
    if (!form.concepto.trim()) nuevos.concepto = "La descripción es obligatoria";
    if (!form.categoria.trim()) nuevos.categoria = "La categoría es obligatoria";
    if (!form.monto.trim() || isNaN(Number(form.monto))) nuevos.monto = "El monto debe ser numérico";
    if (!form.sucursalId) nuevos.sucursalId = "Selecciona una sucursal";
    if (!form.autobusId) nuevos.autobusId = "Selecciona un autobús";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSave = () => {
    if (!validar()) return;
    onSave({
      fecha: form.fecha,
      concepto: form.concepto.trim(),
      categoria: form.categoria,
      monto: form.monto.trim(),
      sucursalId: form.sucursalId,
      autobusId: form.autobusId,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            type="date"
            label="Fecha"
            InputLabelProps={{ shrink: true }}
            value={form.fecha}
            onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
            error={Boolean(errores.fecha)}
            helperText={errores.fecha}
            fullWidth
          />
          <TextField
            select
            label="Categoría"
            value={form.categoria}
            onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
            error={Boolean(errores.categoria)}
            helperText={errores.categoria}
            fullWidth
          >
            {categorias.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Descripción"
            value={form.concepto}
            onChange={(e) => setForm((p) => ({ ...p, concepto: e.target.value }))}
            error={Boolean(errores.concepto)}
            helperText={errores.concepto}
            fullWidth
          />
          <TextField
            label="Monto"
            value={form.monto}
            onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))}
            error={Boolean(errores.monto)}
            helperText={errores.monto}
            fullWidth
          />
          <TextField
            select
            label="Sucursal"
            value={form.sucursalId}
            onChange={(e) => setForm((p) => ({ ...p, sucursalId: e.target.value }))}
            error={Boolean(errores.sucursalId)}
            helperText={errores.sucursalId}
            fullWidth
          >
            {sucursales.map((sucursal) => (
              <MenuItem key={sucursal.id} value={sucursal.id}>
                {sucursal.nombre}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Autobús"
            value={form.autobusId}
            onChange={(e) => setForm((p) => ({ ...p, autobusId: e.target.value }))}
            error={Boolean(errores.autobusId)}
            helperText={errores.autobusId}
            fullWidth
          >
            {autobuses.map((bus) => (
              <MenuItem key={bus.id} value={bus.id}>
                {bus.placa || bus.numeroUnidad || "Autobús"}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
