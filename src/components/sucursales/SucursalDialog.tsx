"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { Sucursal } from "@/lib/firestore/sucursales";

export interface SucursalFormData {
  nombre: string;
  ciudad: string;
  encargado: string;
  telefono: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: SucursalFormData) => void;
  initialData?: Sucursal | null;
}

export default function SucursalDialog({ open, onClose, onSave, initialData }: Props) {
  const [form, setForm] = useState<SucursalFormData>({
    nombre: "",
    ciudad: "",
    encargado: "",
    telefono: "",
  });
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        nombre: initialData.nombre || "",
        ciudad: initialData.ciudad || "",
        encargado: (initialData as any).encargado || "",
        telefono: (initialData as any).telefono || "",
      });
    } else {
      setForm({ nombre: "", ciudad: "", encargado: "", telefono: "" });
    }
    setErrores({});
  }, [initialData, open]);

  const validar = () => {
    const nuevos: Record<string, string> = {};
    if (!form.nombre.trim()) nuevos.nombre = "El nombre es obligatorio";
    if (!form.ciudad.trim()) nuevos.ciudad = "La ciudad es obligatoria";
    if (!form.encargado.trim()) nuevos.encargado = "El encargado es obligatorio";
    if (!form.telefono.trim()) {
      nuevos.telefono = "El teléfono es obligatorio";
    } else if (!/^\d+$/.test(form.telefono.trim())) {
      nuevos.telefono = "Solo números";
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSave = () => {
    if (!validar()) return;
    onSave({
      nombre: form.nombre.trim(),
      ciudad: form.ciudad.trim(),
      encargado: form.encargado.trim(),
      telefono: form.telefono.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Editar Sucursal" : "Nueva Sucursal"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
            error={Boolean(errores.nombre)}
            helperText={errores.nombre}
            fullWidth
          />
          <TextField
            label="Ciudad"
            value={form.ciudad}
            onChange={(e) => setForm((prev) => ({ ...prev, ciudad: e.target.value }))}
            error={Boolean(errores.ciudad)}
            helperText={errores.ciudad}
            fullWidth
          />
          <TextField
            label="Encargado"
            value={form.encargado}
            onChange={(e) => setForm((prev) => ({ ...prev, encargado: e.target.value }))}
            error={Boolean(errores.encargado)}
            helperText={errores.encargado}
            fullWidth
          />
          <TextField
            label="Teléfono"
            value={form.telefono}
            onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
            error={Boolean(errores.telefono)}
            helperText={errores.telefono}
            fullWidth
          />
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
