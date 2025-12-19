"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import ProtectedRoute from "@/components/system/ProtectedRoute";
import MountedGuard from "@/components/system/MountedGuard";
import { useAuth, RolUsuario } from "@/context/AuthContext";
import { formatearFecha } from "@/lib/fechas";
import { obtenerChofer, Chofer } from "@/lib/firestore/choferes";
import {
  actualizarHorarioChofer,
  crearHorarioChofer,
  eliminarHorarioChofer,
  obtenerHorariosChofer,
  EstadoHorarioChofer,
  HorarioChofer,
} from "@/lib/firestore/horariosChofer";
import {
  coloresDisponibilidad,
  etiquetasDisponibilidad,
  obtenerEstadoChoferEnFecha,
} from "@/lib/choferes/horarios";

const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const ROLES_PERMITIDOS: RolUsuario[] = ["admin", "operaciones", "superadmin"];

const formatearFechaInput = (fecha: Date) => {
  const ajuste = fecha.getTimezoneOffset() * 60 * 1000;
  return new Date(fecha.getTime() - ajuste).toISOString().split("T")[0];
};

const parseFechaInicio = (valor: string) => {
  if (!valor) return null;
  return new Date(`${valor}T00:00:00`);
};

const parseFechaFin = (valor: string) => {
  const base = parseFechaInicio(valor);
  if (!base) return null;
  base.setHours(23, 59, 59, 999);
  return base;
};

interface FormState {
  startDate: string;
  endDate: string;
  status: EstadoHorarioChofer;
  reason: string;
  approvedBy: string;
}

const INITIAL_FORM: FormState = {
  startDate: "",
  endDate: "",
  status: "DISPONIBLE",
  reason: "",
  approvedBy: "",
};

export default function HorarioChoferPage() {
  const params = useParams();
  const router = useRouter();
  const choferId = String(params?.choferId || "");
  const { usuario, rol, empresaActualId } = useAuth();
  const puedeEditar = rol === "admin" || rol === "superadmin";

  const [chofer, setChofer] = useState<Chofer | null>(null);
  const [horarios, setHorarios] = useState<HorarioChofer[]>([]);
  const [mesReferencia, setMesReferencia] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetForm = () => {
    setForm({
      ...INITIAL_FORM,
      approvedBy: usuario?.uid ?? "",
    });
    setEditandoId(null);
  };

  useEffect(() => {
    if (usuario?.uid && !form.approvedBy) {
      setForm((prev) => ({ ...prev, approvedBy: usuario.uid }));
    }
  }, [usuario, form.approvedBy]);

  const cargarDatos = async () => {
    if (!choferId) return;
    setCargando(true);
    setError("");
    try {
      const [choferData, horariosData] = await Promise.all([
        obtenerChofer(choferId),
        obtenerHorariosChofer(
          choferId,
          new Date(mesReferencia.getFullYear(), mesReferencia.getMonth(), 1),
          new Date(mesReferencia.getFullYear(), mesReferencia.getMonth() + 1, 0, 23, 59, 59, 999),
        ),
      ]);
      setChofer(choferData);
      setHorarios(horariosData);
    } catch (err) {
      console.error("No se pudieron cargar los horarios", err);
      setError("No se pudieron cargar los horarios del chofer.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choferId, mesReferencia]);

  const diasCalendario = useMemo(() => {
    const year = mesReferencia.getFullYear();
    const month = mesReferencia.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDias = new Date(year, month + 1, 0).getDate();
    const celdas: Array<Date | null> = [];
    for (let i = 0; i < firstDay; i++) {
      celdas.push(null);
    }
    for (let dia = 1; dia <= totalDias; dia++) {
      celdas.push(new Date(year, month, dia));
    }
    return celdas;
  }, [mesReferencia]);

  const horariosOrdenados = useMemo(
    () =>
      [...horarios].sort((a, b) => b.startDate.getTime() - a.startDate.getTime()),
    [horarios],
  );

  const avanzarMes = () => {
    setMesReferencia((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const retrocederMes = () => {
    setMesReferencia((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const seleccionarDia = (fecha: Date) => {
    const valor = formatearFechaInput(fecha);
    setForm((prev) => ({ ...prev, startDate: valor, endDate: valor }));
  };

  const guardarHorario = async () => {
    if (!choferId) return;
    if (!empresaActualId) {
      setError("Selecciona una empresa para gestionar horarios.");
      return;
    }
    setError("");
    setSuccess("");
    const inicio = parseFechaInicio(form.startDate);
    const fin = parseFechaFin(form.endDate);
    if (!inicio || !fin) {
      setError("Selecciona un rango de fechas válido.");
      return;
    }
    if (fin.getTime() < inicio.getTime()) {
      setError("La fecha final debe ser igual o posterior a la fecha inicial.");
      return;
    }
    try {
      if (editandoId) {
        await actualizarHorarioChofer(choferId, editandoId, {
          startDate: inicio,
          endDate: fin,
          status: form.status,
          reason: form.reason.trim(),
          approvedBy: form.approvedBy.trim(),
        });
        setSuccess("Horario actualizado correctamente.");
      } else {
        await crearHorarioChofer(
          choferId,
          {
            startDate: inicio,
            endDate: fin,
            status: form.status,
            reason: form.reason.trim(),
            approvedBy: form.approvedBy.trim(),
          },
          empresaActualId,
        );
        setSuccess("Horario registrado correctamente.");
      }
      resetForm();
      await cargarDatos();
    } catch (err) {
      console.error("No se pudo guardar el horario", err);
      setError("No se pudo guardar el horario.");
    }
  };

  const editarHorario = (horario: HorarioChofer) => {
    setForm({
      startDate: formatearFechaInput(horario.startDate),
      endDate: formatearFechaInput(horario.endDate),
      status: horario.status,
      reason: horario.reason ?? "",
      approvedBy: horario.approvedBy ?? "",
    });
    setEditandoId(horario.id);
  };

  const eliminarHorario = async (horario: HorarioChofer) => {
    if (!choferId) return;
    const confirmar =
      typeof window !== "undefined" ? window.confirm("¿Eliminar este horario?") : false;
    if (!confirmar) return;
    try {
      await eliminarHorarioChofer(choferId, horario.id);
      await cargarDatos();
    } catch (err) {
      console.error("No se pudo eliminar el horario", err);
      setError("No se pudo eliminar el horario.");
    }
  };

  const pagina = (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Horario del chofer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {chofer ? `${chofer.nombre} · ${chofer.licencia}` : "Cargando chofer..."}
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => router.push("/choferes")}>
          Volver a Choferes
        </Button>
      </Stack>

      {!puedeEditar && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Solo administradores pueden crear o modificar horarios.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <Paper elevation={3} sx={{ p: 2, borderRadius: 3, flex: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2}>
              <Button onClick={retrocederMes} disabled={cargando}>
                Mes anterior
              </Button>
              <Button onClick={avanzarMes} disabled={cargando}>
                Siguiente mes
              </Button>
            </Stack>
            <Typography variant="h6" fontWeight={600}>
              {new Intl.DateTimeFormat("es-ES", {
                month: "long",
                year: "numeric",
              }).format(mesReferencia)}
            </Typography>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 1,
            }}
          >
            {diasSemana.map((dia) => (
              <Box key={dia} sx={{ textAlign: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  {dia}
                </Typography>
              </Box>
            ))}
            {diasCalendario.map((dia, index) => {
              if (!dia) {
                return (
                  <Box
                    key={`dia-${index}`}
                    sx={{ minHeight: 120, backgroundColor: "#f9fafb", borderRadius: 2 }}
                  />
                );
              }
              const estado = obtenerEstadoChoferEnFecha(horarios, dia);
              const colores = coloresDisponibilidad[estado];
              return (
                <Box
                  key={`dia-${index}`}
                  sx={{
                    minHeight: 120,
                    borderRadius: 2,
                    border: `1px solid ${colores.border}`,
                    backgroundColor: colores.bg,
                    p: 1,
                    cursor: puedeEditar ? "pointer" : "default",
                    "&:hover": {
                      borderColor: puedeEditar ? "#2563eb" : colores.border,
                    },
                  }}
                  onClick={() => {
                    if (puedeEditar) seleccionarDia(dia);
                  }}
                >
                  <Typography variant="body2" fontWeight={600} color={colores.text}>
                    {dia.getDate()}
                  </Typography>
                  <Typography variant="caption" color={colores.text}>
                    {etiquetasDisponibilidad[estado]}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>

        <Paper elevation={3} sx={{ p: 2, borderRadius: 3, minWidth: 320, maxWidth: 420 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {editandoId ? "Editar rango" : "Nuevo rango"}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Desde"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
              disabled={!puedeEditar}
              fullWidth
            />
            <TextField
              label="Hasta"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
              disabled={!puedeEditar}
              fullWidth
            />
            <TextField
              select
              label="Estado"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, status: e.target.value as EstadoHorarioChofer }))
              }
              disabled={!puedeEditar}
              fullWidth
            >
              <MenuItem value="DISPONIBLE">Disponible</MenuItem>
              <MenuItem value="DESCANSO">Descanso</MenuItem>
            </TextField>
            <TextField
              label="Motivo (opcional)"
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
              disabled={!puedeEditar}
              fullWidth
              placeholder={form.status === "DESCANSO" ? "Día libre" : ""}
            />
            <TextField
              label="Aprobado por (UID)"
              value={form.approvedBy}
              onChange={(e) => setForm((prev) => ({ ...prev, approvedBy: e.target.value }))}
              disabled={!puedeEditar}
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={guardarHorario}
                disabled={!puedeEditar || cargando}
              >
                {editandoId ? "Actualizar" : "Guardar"}
              </Button>
              {editandoId && (
                <Button variant="outlined" onClick={resetForm} disabled={!puedeEditar}>
                  Cancelar
                </Button>
              )}
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Rangos registrados
          </Typography>
          <Stack spacing={1}>
            {horariosOrdenados.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No hay rangos registrados en este mes.
              </Typography>
            )}
            {horariosOrdenados.map((horario) => {
              const etiquetaEstado = etiquetasDisponibilidad[
                horario.status === "DISPONIBLE" ? "DISPONIBLE" : "DESCANSO"
              ];
              const motivo =
                horario.reason || (horario.status === "DESCANSO" ? "Día libre" : "");
              return (
                <Paper key={horario.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" fontWeight={600}>
                      {etiquetaEstado}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatearFecha(horario.startDate)} → {formatearFecha(horario.endDate)}
                    </Typography>
                    {motivo && (
                      <Typography variant="caption" color="text.secondary">
                        {motivo}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Aprobado por: {horario.approvedBy || "Sin aprobar"}
                    </Typography>
                    {puedeEditar && (
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => editarHorario(horario)}>
                          Editar
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => eliminarHorario(horario)}
                        >
                          Eliminar
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );

  return (
    <MountedGuard>
      <ProtectedLayout>
        <PanelLayout>
          <ProtectedRoute roles={ROLES_PERMITIDOS}>{pagina}</ProtectedRoute>
        </PanelLayout>
      </ProtectedLayout>
    </MountedGuard>
  );
}
