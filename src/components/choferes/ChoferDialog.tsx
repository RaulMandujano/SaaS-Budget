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
import { Chofer, EstadoChofer } from "@/lib/firestore/choferes";

export interface ChoferFormData {
  nombre: string;
  licencia: string;
  telefono: string;
  autobusId: string;
  estado: EstadoChofer;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: ChoferFormData) => void;
  initialData?: Chofer | null;
  autobuses: Autobus[];
}

export default function ChoferDialog({ open, onClose, onSave, initialData, autobuses }: Props) {
  const esEstadoChofer = (valor: string): valor is EstadoChofer =>
    valor === "Activo" || valor === "Suspendido";

  const [form, setForm] = useState<ChoferFormData>({
    nombre: "",
    licencia: "",
    telefono: "",
    autobusId: "",
    estado: "Activo",
  });
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        nombre: initialData.nombre ?? "",
        licencia: initialData.licencia ?? "",
        telefono: initialData.telefono ?? "",
        autobusId: initialData.autobusId ?? "",
        estado: esEstadoChofer(initialData.estado) ? initialData.estado : "Activo",
      });
    } else {
      setForm({
        nombre: "",
        licencia: "",
        telefono: "",
        autobusId: autobuses[0]?.id || "",
        estado: "Activo",
      });
    }
    setErrores({});
  }, [initialData, open, autobuses]);

  useEffect(() => {
    if (!initialData && autobuses.length > 0 && !form.autobusId) {
      setForm((prev) => ({ ...prev, autobusId: autobuses[0].id }));
    }
  }, [autobuses, initialData, form.autobusId]);

  const validar = () => {
    const nuevos: Record<string, string> = {};
    if (!form.nombre.trim()) nuevos.nombre = "El nombre es obligatorio";
    if (!form.licencia.trim()) nuevos.licencia = "La licencia es obligatoria";
    if (!form.telefono.trim()) {
      nuevos.telefono = "El teléfono es obligatorio";
    } else if (!/^\d+$/.test(form.telefono.trim())) {
      nuevos.telefono = "Solo números";
    }
    if (!form.autobusId) nuevos.autobusId = "Selecciona un autobús";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSave = () => {
    if (!validar()) return;
    onSave({
      nombre: form.nombre.trim(),
      licencia: form.licencia.trim(),
      telefono: form.telefono.trim(),
      autobusId: form.autobusId,
      estado: form.estado,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Editar Chofer" : "Nuevo Chofer"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nombre completo"
            value={form.nombre}
            onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
            error={Boolean(errores.nombre)}
            helperText={errores.nombre}
            fullWidth
          />
          <TextField
            label="Licencia"
            value={form.licencia}
            onChange={(e) => setForm((p) => ({ ...p, licencia: e.target.value }))}
            error={Boolean(errores.licencia)}
            helperText={errores.licencia}
            fullWidth
          />
          <TextField
            label="Teléfono"
            value={form.telefono}
            onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
            error={Boolean(errores.telefono)}
            helperText={errores.telefono}
            fullWidth
          />
          <TextField
            select
            label="Autobús asignado"
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
          <TextField
            select
            label="Estado"
            value={form.estado}
            onChange={(e) => {
              const valor = e.target.value;
              if (esEstadoChofer(valor)) {
                setForm((p) => ({ ...p, estado: valor }));
              }
            }}
            fullWidth
          >
            <MenuItem value="Activo">Activo</MenuItem>
            <MenuItem value="Suspendido">Suspendido</MenuItem>
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
