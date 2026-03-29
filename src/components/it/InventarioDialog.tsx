"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";

export interface InventarioFormData {
  nombre: string;
  sku: string;
  cantidad: number;
  ubicacion: string;
  tipo: string;
}

interface InventarioDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: InventarioFormData) => void;
}

const defaultForm: InventarioFormData = {
  nombre: "",
  sku: "",
  cantidad: 0,
  ubicacion: "",
  tipo: "",
};

export default function InventarioDialog({ open, onClose, onSave }: InventarioDialogProps) {
  const [form, setForm] = useState<InventarioFormData>(defaultForm);

  const guardar = () => {
    onSave({
      nombre: form.nombre.trim(),
      sku: form.sku.trim(),
      cantidad: Number(form.cantidad ?? 0),
      ubicacion: form.ubicacion.trim(),
      tipo: form.tipo.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Agregar producto</DialogTitle>
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
            label="SKU"
            value={form.sku}
            onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
            fullWidth
            required
          />
          <TextField
            label="Cantidad"
            type="number"
            value={form.cantidad}
            onChange={(e) => setForm((prev) => ({ ...prev, cantidad: Number(e.target.value) }))}
            fullWidth
            inputProps={{ min: 0 }}
            required
          />
          <TextField
            label="Ubicación"
            value={form.ubicacion}
            onChange={(e) => setForm((prev) => ({ ...prev, ubicacion: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Tipo"
            value={form.tipo}
            onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={guardar}
          disabled={!form.nombre.trim() || !form.sku.trim() || form.cantidad < 0}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
