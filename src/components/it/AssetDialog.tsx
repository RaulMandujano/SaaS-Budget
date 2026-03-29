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

export interface AssetFormData {
  name: string;
  type: string;
  serialNumber: string;
  status: "available" | "assigned" | "maintenance" | "retired";
  assignedTo: string;
  location: string;
}

interface AssetDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AssetFormData) => void;
}

const defaultForm: AssetFormData = {
  name: "",
  type: "Laptop",
  serialNumber: "",
  status: "available",
  assignedTo: "",
  location: "",
};

const statusOptions: Array<{ value: AssetFormData["status"]; label: string }> = [
  { value: "available", label: "Disponible" },
  { value: "assigned", label: "Asignado" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "retired", label: "Retirado" },
];

export default function AssetDialog({
  open,
  onClose,
  onSave,
}: AssetDialogProps) {
  const [form, setForm] = useState<AssetFormData>(defaultForm);

  const guardar = () => {
    onSave({
      name: form.name.trim(),
      type: form.type.trim(),
      serialNumber: form.serialNumber.trim(),
      status: form.status,
      assignedTo: form.assignedTo.trim(),
      location: form.location.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nuevo Asset IT</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            fullWidth
            required
          />
          <TextField
            label="Tipo"
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Número de serie"
            value={form.serialNumber}
            onChange={(e) => setForm((prev) => ({ ...prev, serialNumber: e.target.value }))}
            fullWidth
          />
          <TextField
            select
            label="Estado"
            value={form.status}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, status: e.target.value as AssetFormData["status"] }))
            }
            fullWidth
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Asignado a"
            value={form.assignedTo}
            onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Ubicación"
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={!form.name.trim()}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
