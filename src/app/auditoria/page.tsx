"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import ProtectedRoute from "@/components/system/ProtectedRoute";
import MountedGuard from "@/components/system/MountedGuard";
import { formatearFechaHora } from "@/lib/fechas";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

interface EventoAuditoria {
  id: string;
  usuarioNombre: string;
  usuarioEmail: string;
  rol: string;
  modulo: string;
  accion: string;
  descripcion: string;
  fecha: Date | null;
}

export default function AuditoriaPage() {
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroModulo, setFiltroModulo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const cargarEventos = async () => {
    const snap = await getDocs(collection(db, "auditoria"));
    const lista: EventoAuditoria[] = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        usuarioNombre: data.usuarioNombre || "Usuario",
        usuarioEmail: data.usuarioEmail || "",
        rol: data.rol || "",
        modulo: data.modulo || "",
        accion: data.accion || "",
        descripcion: data.descripcion || "",
        fecha: data.fecha?.toDate?.() ?? null,
      };
    });
    lista.sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0));
    setEventos(lista);
    setCargando(false);
  };

  useEffect(() => {
    cargarEventos();
  }, []);

  const columnas: GridColDef[] = [
    { field: "fecha", headerName: "Fecha", flex: 1, minWidth: 160 },
    { field: "usuario", headerName: "Usuario", flex: 1.2, minWidth: 200 },
    { field: "rol", headerName: "Rol", flex: 0.8, minWidth: 110 },
    { field: "modulo", headerName: "Módulo", flex: 1, minWidth: 140 },
    { field: "accion", headerName: "Acción", flex: 0.8, minWidth: 110 },
    { field: "descripcion", headerName: "Descripción", flex: 2, minWidth: 240 },
  ];

  const filas = useMemo(() => {
    return eventos
      .filter((ev) => {
        if (filtroUsuario && !`${ev.usuarioNombre} ${ev.usuarioEmail}`.toLowerCase().includes(filtroUsuario.toLowerCase()))
          return false;
        if (filtroModulo && ev.modulo !== filtroModulo) return false;
        if (fechaInicio) {
          const inicio = new Date(`${fechaInicio}T00:00:00`);
          if (ev.fecha && ev.fecha < inicio) return false;
        }
        if (fechaFin) {
          const fin = new Date(`${fechaFin}T23:59:59`);
          if (ev.fecha && ev.fecha > fin) return false;
        }
        return true;
      })
      .map((ev) => ({
        id: ev.id,
        fecha: formatearFechaHora(ev.fecha, "Sin fecha"),
        usuario: `${ev.usuarioNombre} (${ev.usuarioEmail || "sin email"})`,
        rol: ev.rol,
        modulo: ev.modulo,
        accion: ev.accion,
        descripcion: ev.descripcion,
      }));
  }, [eventos, filtroUsuario, filtroModulo, fechaInicio, fechaFin]);

  const modulos = useMemo(() => {
    const set = new Set<string>();
    eventos.forEach((ev) => set.add(ev.modulo));
    return Array.from(set);
  }, [eventos]);

  return (
    <MountedGuard>
      <ProtectedLayout>
        <PanelLayout>
          <ProtectedRoute roles={["admin"]}>
            <Box>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    Auditoría
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Registro detallado de acciones del sistema.
                  </Typography>
                </Box>
              </Stack>

              <Paper elevation={3} sx={{ borderRadius: 3, p: 2, mb: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="Buscar por usuario"
                    value={filtroUsuario}
                    onChange={(e) => setFiltroUsuario(e.target.value)}
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel>Módulo</InputLabel>
                    <Select
                      label="Módulo"
                      value={filtroModulo}
                      onChange={(e) => setFiltroModulo(e.target.value)}
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {modulos.map((m) => (
                        <MenuItem key={m} value={m}>
                          {m}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Fecha inicio"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Fecha fin"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    fullWidth
                  />
                </Stack>
              </Paper>

              <Paper elevation={3} sx={{ borderRadius: 3, p: 2 }}>
                <Box sx={{ height: 520, width: "100%" }}>
                  <DataGrid
                    rows={filas}
                    columns={columnas}
                    loading={cargando}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                  />
                </Box>
              </Paper>
            </Box>
          </ProtectedRoute>
        </PanelLayout>
      </ProtectedLayout>
    </MountedGuard>
  );
}
