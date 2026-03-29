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
import type { DispositivoIT, DispositivoStatus } from "@/lib/firestore/dispositivos";

export interface DispositivoFormData {
  nombre: string;
  modelo: string;
  numeroSerie: string;
  status: DispositivoStatus;
  assignedTo: string;
  ubicacion: string;
}

interface DispositivoDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: DispositivoFormData) => void;
  initialData?: Partial<DispositivoIT> | null;
  title: string;
}

const defaultForm: DispositivoFormData = {
  nombre: "",
  modelo: "",
  numeroSerie: "",
  status: "available",
  assignedTo: "",
  ubicacion: "",
};

export default function DispositivoDialog({
  open,
  onClose,
  onSave,
  initialData,
  title,
}: DispositivoDialogProps) {
  const [form, setForm] = useState<DispositivoFormData>({
    nombre: initialData?.nombre ?? defaultForm.nombre,
    modelo: initialData?.modelo ?? defaultForm.modelo,
    numeroSerie: initialData?.numeroSerie ?? defaultForm.numeroSerie,
    status: initialData?.status ?? defaultForm.status,
    assignedTo: initialData?.assignedTo ?? defaultForm.assignedTo,
    ubicacion: initialData?.ubicacion ?? defaultForm.ubicacion,
  });

  const guardar = () => {
    onSave({
      nombre: form.nombre.trim(),
      modelo: form.modelo.trim(),
      numeroSerie: form.numeroSerie.trim(),
      status: form.status,
      assignedTo: form.assignedTo.trim(),
      ubicacion: form.ubicacion.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
            fullWidth
            required
          />
          <TextField
            label="Modelo"
            value={form.modelo}
            onChange={(e) => setForm((prev) => ({ ...prev, modelo: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Número de serie"
            value={form.numeroSerie}
            onChange={(e) => setForm((prev) => ({ ...prev, numeroSerie: e.target.value }))}
            fullWidth
            required
          />
          <TextField
            select
            label="Estado"
            value={form.status}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, status: e.target.value as DispositivoStatus }))
            }
            fullWidth
          >
            <MenuItem value="available">Disponible</MenuItem>
            <MenuItem value="assigned">Asignado</MenuItem>
            <MenuItem value="maintenance">Mantenimiento</MenuItem>
          </TextField>
          <TextField
            label="Asignado a"
            value={form.assignedTo}
            onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Ubicación"
            value={form.ubicacion}
            onChange={(e) => setForm((prev) => ({ ...prev, ubicacion: e.target.value }))}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={guardar}
          disabled={!form.nombre.trim() || !form.numeroSerie.trim()}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
