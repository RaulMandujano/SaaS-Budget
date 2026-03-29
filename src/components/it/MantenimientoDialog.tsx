"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { DispositivoIT } from "@/lib/firestore/dispositivos";
import type { InventarioItem } from "@/lib/firestore/inventario";
import type {
  PiezaUsadaMantenimiento,
  TicketMantenimientoIT,
  TicketMantenimientoStatus,
} from "@/lib/firestore/mantenimiento";

export interface MantenimientoFormData {
  dispositivoId: string;
  descripcion: string;
  status: TicketMantenimientoStatus;
  piezasUsadas: PiezaUsadaMantenimiento[];
}

interface MantenimientoDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: MantenimientoFormData) => void;
  dispositivos: DispositivoIT[];
  inventario: InventarioItem[];
  initialData?: TicketMantenimientoIT | null;
  title?: string;
  submitLabel?: string;
}

export default function MantenimientoDialog({
  open,
  onClose,
  onSave,
  dispositivos,
  inventario,
  initialData,
  title = "Nuevo mantenimiento",
  submitLabel = "Crear ticket",
}: MantenimientoDialogProps) {
  const [dispositivoId, setDispositivoId] = useState(initialData?.dispositivoId ?? "");
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? "");
  const [status, setStatus] = useState<TicketMantenimientoStatus>(initialData?.status ?? "open");
  const [selectedInventarioIds, setSelectedInventarioIds] = useState<string[]>(
    initialData?.piezasUsadas.map((pieza) => pieza.inventarioId) ?? [],
  );
  const [cantidades, setCantidades] = useState<Record<string, number>>(
    () =>
      initialData?.piezasUsadas.reduce<Record<string, number>>((acc, pieza) => {
        acc[pieza.inventarioId] = pieza.cantidad;
        return acc;
      }, {}) ?? {},
  );

  const selectedPiezas = useMemo(
    () => inventario.filter((item) => selectedInventarioIds.includes(item.id)),
    [inventario, selectedInventarioIds],
  );

  const handleSeleccionPiezas = (ids: string[]) => {
    setSelectedInventarioIds(ids);
    setCantidades((prev) => {
      const next: Record<string, number> = {};

      ids.forEach((id) => {
        next[id] = prev[id] ?? 1;
      });

      return next;
    });
  };

  const guardar = () => {
    const piezasUsadas = selectedInventarioIds.map((inventarioId) => ({
      inventarioId,
      cantidad: Number(cantidades[inventarioId] ?? 1),
    }));

    onSave({
      dispositivoId,
      descripcion: descripcion.trim(),
      status,
      piezasUsadas,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            select
            label="Dispositivo"
            value={dispositivoId}
            onChange={(e) => setDispositivoId(e.target.value)}
            fullWidth
            required
          >
            {dispositivos.map((dispositivo) => (
              <MenuItem key={dispositivo.id} value={dispositivo.id}>
                {dispositivo.nombre} | {dispositivo.numeroSerie || "Sin serie"}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            required
          />

          <TextField
            select
            label="Estado"
            value={status}
            onChange={(e) => setStatus(e.target.value as TicketMantenimientoStatus)}
            fullWidth
          >
            <MenuItem value="open">Abierto</MenuItem>
            <MenuItem value="in_progress">En progreso</MenuItem>
            <MenuItem value="done">Completado</MenuItem>
          </TextField>

          <FormControl fullWidth>
            <InputLabel id="piezas-label">Piezas usadas</InputLabel>
            <Select
              labelId="piezas-label"
              multiple
              value={selectedInventarioIds}
              onChange={(e) => handleSeleccionPiezas(e.target.value as string[])}
              input={<OutlinedInput label="Piezas usadas" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(selected as string[]).map((value) => {
                    const item = inventario.find((registro) => registro.id === value);
                    return <Chip key={value} label={item?.nombre ?? value} size="small" />;
                  })}
                </Box>
              )}
            >
              {inventario.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.nombre} | Stock: {item.cantidad}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedPiezas.length > 0 && (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" color="text.secondary">
                Cantidad por pieza
              </Typography>
              {selectedPiezas.map((pieza) => (
                <TextField
                  key={pieza.id}
                  label={`${pieza.nombre} (stock: ${pieza.cantidad})`}
                  type="number"
                  value={cantidades[pieza.id] ?? 1}
                  onChange={(e) =>
                    setCantidades((prev) => ({
                      ...prev,
                      [pieza.id]: Number(e.target.value),
                    }))
                  }
                  inputProps={{ min: 1, max: pieza.cantidad }}
                  fullWidth
                />
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={guardar}
          disabled={!dispositivoId || !descripcion.trim()}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
