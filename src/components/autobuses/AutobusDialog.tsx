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
import { Autobus } from "@/lib/firestore/autobuses";
import { Sucursal } from "@/lib/firestore/sucursales";

export interface AutobusFormData {
  numeroUnidad: string;
  placa: string;
  modelo: string;
  anio: string;
  capacidad: string;
  sucursalId: string;
  estado: "activo" | "mantenimiento";
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: AutobusFormData) => void;
  initialData?: Autobus | null;
  sucursales: Sucursal[];
}

export default function AutobusDialog({ open, onClose, onSave, initialData, sucursales }: Props) {
  const [form, setForm] = useState<AutobusFormData>({
    numeroUnidad: "",
    placa: "",
    modelo: "",
    anio: "",
    capacidad: "",
    sucursalId: "",
    estado: "activo",
  });
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        numeroUnidad: initialData.numeroUnidad || "",
        placa: initialData.placa || "",
        modelo: initialData.modelo || "",
        anio: initialData.anio ? String(initialData.anio) : "",
        capacidad: (initialData as any).capacidad ? String((initialData as any).capacidad) : "",
        sucursalId: initialData.sucursalId || "",
        estado: initialData.estado || "activo",
      });
    } else {
      setForm({
        numeroUnidad: "",
        placa: "",
        modelo: "",
        anio: "",
        capacidad: "",
        sucursalId: sucursales[0]?.id || "",
        estado: "activo",
      });
    }
    setErrores({});
  }, [initialData, open, sucursales]);

  const validar = () => {
    const nuevos: Record<string, string> = {};
    if (!form.numeroUnidad.trim()) nuevos.numeroUnidad = "El número de unidad es obligatorio";
    if (!form.placa.trim()) nuevos.placa = "La placa es obligatoria";
    if (!form.modelo.trim()) nuevos.modelo = "El modelo es obligatorio";
    if (!form.anio.trim() || isNaN(Number(form.anio))) nuevos.anio = "Año inválido";
    if (!form.capacidad.trim() || isNaN(Number(form.capacidad))) nuevos.capacidad = "Capacidad inválida";
    if (!form.sucursalId) nuevos.sucursalId = "Selecciona una sucursal";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSave = () => {
    if (!validar()) return;
    onSave({
      placa: form.placa.trim(),
      modelo: form.modelo.trim(),
      anio: form.anio.trim(),
      capacidad: form.capacidad.trim(),
      sucursalId: form.sucursalId,
      estado: form.estado,
      numeroUnidad: form.numeroUnidad.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Editar Autobús" : "Nuevo Autobús"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Número de unidad"
            value={form.numeroUnidad}
            onChange={(e) => setForm((p) => ({ ...p, numeroUnidad: e.target.value }))}
            error={Boolean(errores.numeroUnidad)}
            helperText={errores.numeroUnidad}
            fullWidth
          />
          <TextField
            label="Placa"
            value={form.placa}
            onChange={(e) => setForm((p) => ({ ...p, placa: e.target.value }))}
            error={Boolean(errores.placa)}
            helperText={errores.placa}
            fullWidth
          />
          <TextField
            label="Modelo"
            value={form.modelo}
            onChange={(e) => setForm((p) => ({ ...p, modelo: e.target.value }))}
            error={Boolean(errores.modelo)}
            helperText={errores.modelo}
            fullWidth
          />
          <TextField
            label="Año"
            value={form.anio}
            onChange={(e) => setForm((p) => ({ ...p, anio: e.target.value }))}
            error={Boolean(errores.anio)}
            helperText={errores.anio}
            fullWidth
          />
          <TextField
            label="Capacidad"
            value={form.capacidad}
            onChange={(e) => setForm((p) => ({ ...p, capacidad: e.target.value }))}
            error={Boolean(errores.capacidad)}
            helperText={errores.capacidad}
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
            label="Estado"
            value={form.estado}
            onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value as "activo" | "mantenimiento" }))}
            fullWidth
          >
            <MenuItem value="activo">Activo</MenuItem>
            <MenuItem value="mantenimiento">Mantenimiento</MenuItem>
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
