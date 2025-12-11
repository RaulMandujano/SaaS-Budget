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
import { Sucursal } from "@/lib/firestore/sucursales";
import { Ruta } from "@/lib/firestore/rutas";

export interface RutaFormData {
  sucursalOrigenId: string;
  sucursalDestinoId: string;
  distanciaKm: string;
  consumoGasolinaAprox: string;
  costoPeajes: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: RutaFormData) => void;
  initialData?: Ruta | null;
  sucursales: Sucursal[];
}

export default function RutaDialog({ open, onClose, onSave, initialData, sucursales }: Props) {
  const construirEstadoInicial = (): RutaFormData => {
    if (initialData) {
      return {
        sucursalOrigenId: initialData.sucursalOrigenId,
        sucursalDestinoId: initialData.sucursalDestinoId,
        distanciaKm: String(initialData.distanciaKm ?? ""),
        consumoGasolinaAprox: String(initialData.consumoGasolinaAprox ?? ""),
        costoPeajes: String(initialData.costoPeajes ?? ""),
      };
    }
    const origen = sucursales[0]?.id ?? "";
    const destino =
      sucursales.find((sucursal) => sucursal.id !== origen)?.id ?? sucursales[0]?.id ?? origen;
    return {
      sucursalOrigenId: origen,
      sucursalDestinoId: destino,
      distanciaKm: "",
      consumoGasolinaAprox: "",
      costoPeajes: "",
    };
  };

  const [form, setForm] = useState<RutaFormData>(construirEstadoInicial);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const validar = () => {
    const nuevos: Record<string, string> = {};
    if (!form.sucursalOrigenId) {
      nuevos.sucursalOrigenId = "Selecciona una sucursal de origen";
    }
    if (!form.sucursalDestinoId) {
      nuevos.sucursalDestinoId = "Selecciona una sucursal de destino";
    }
    if (
      form.sucursalOrigenId &&
      form.sucursalDestinoId &&
      form.sucursalOrigenId === form.sucursalDestinoId
    ) {
      nuevos.sucursalDestinoId = "El origen y destino deben ser diferentes";
    }
    if (!form.distanciaKm.trim() || Number.isNaN(Number(form.distanciaKm))) {
      nuevos.distanciaKm = "La distancia debe ser un número válido";
    }
    if (!form.consumoGasolinaAprox.trim() || Number.isNaN(Number(form.consumoGasolinaAprox))) {
      nuevos.consumoGasolinaAprox = "El consumo debe ser un número válido";
    }
    if (!form.costoPeajes.trim() || Number.isNaN(Number(form.costoPeajes))) {
      nuevos.costoPeajes = "El costo de peajes debe ser un número válido";
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSave = () => {
    if (!validar()) return;
    onSave({
      sucursalOrigenId: form.sucursalOrigenId,
      sucursalDestinoId: form.sucursalDestinoId,
      distanciaKm: form.distanciaKm,
      consumoGasolinaAprox: form.consumoGasolinaAprox,
      costoPeajes: form.costoPeajes,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Editar Ruta" : "Nueva Ruta"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Sucursal Origen"
            value={form.sucursalOrigenId}
            onChange={(e) => setForm((prev) => ({ ...prev, sucursalOrigenId: e.target.value }))}
            error={Boolean(errores.sucursalOrigenId)}
            helperText={errores.sucursalOrigenId}
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
            label="Sucursal Destino"
            value={form.sucursalDestinoId}
            onChange={(e) => setForm((prev) => ({ ...prev, sucursalDestinoId: e.target.value }))}
            error={Boolean(errores.sucursalDestinoId)}
            helperText={errores.sucursalDestinoId}
            fullWidth
          >
            {sucursales.map((sucursal) => (
              <MenuItem key={sucursal.id} value={sucursal.id}>
                {sucursal.nombre}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Distancia (km)"
            type="number"
            value={form.distanciaKm}
            onChange={(e) => setForm((prev) => ({ ...prev, distanciaKm: e.target.value }))}
            error={Boolean(errores.distanciaKm)}
            helperText={errores.distanciaKm}
            inputProps={{ min: 0, step: "any" }}
            fullWidth
          />
          <TextField
            label="Gasolina aproximada (litros)"
            type="number"
            value={form.consumoGasolinaAprox}
            onChange={(e) => setForm((prev) => ({ ...prev, consumoGasolinaAprox: e.target.value }))}
            error={Boolean(errores.consumoGasolinaAprox)}
            helperText={errores.consumoGasolinaAprox}
            inputProps={{ min: 0, step: "any" }}
            fullWidth
          />
          <TextField
            label="Peajes en ruta (moneda local)"
            type="number"
            value={form.costoPeajes}
            onChange={(e) => setForm((prev) => ({ ...prev, costoPeajes: e.target.value }))}
            error={Boolean(errores.costoPeajes)}
            helperText={errores.costoPeajes}
            inputProps={{ min: 0, step: "any" }}
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
