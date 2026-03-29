"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { auth } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import MountedGuard from "@/components/system/MountedGuard";
import { useAuth } from "@/context/AuthContext";
import { getDispositivos, type DispositivoIT } from "@/lib/firestore/dispositivos";
import { getInventario, type InventarioItem } from "@/lib/firestore/inventario";
import {
  createMantenimiento,
  getMantenimientos,
  updateMantenimientoStatus,
  updateMantenimientoTicket,
  type HistorialMantenimientoEntry,
  type TicketMantenimientoIT,
} from "@/lib/firestore/mantenimiento";
import MantenimientoDialog, { type MantenimientoFormData } from "@/components/it/MantenimientoDialog";
import { formatearFechaHora } from "@/lib/fechas";

const statusLabels: Record<TicketMantenimientoIT["status"], string> = {
  open: "Abierto",
  in_progress: "En progreso",
  done: "Completado",
};

const statusColors: Record<TicketMantenimientoIT["status"], "warning" | "info" | "success"> = {
  open: "warning",
  in_progress: "info",
  done: "success",
};

export default function ITMantenimientoPage() {
  const router = useRouter();
  const { empresaActualId, user } = useAuth();
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [tickets, setTickets] = useState<TicketMantenimientoIT[]>([]);
  const [dispositivos, setDispositivos] = useState<DispositivoIT[]>([]);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [ticketActivo, setTicketActivo] = useState<TicketMantenimientoIT | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) {
        router.push("/login");
      } else {
        setCargandoAuth(false);
      }
    });

    return () => unsub();
  }, [router]);

  const cargarDatos = useCallback(async () => {
    if (!empresaActualId) {
      setTickets([]);
      setDispositivos([]);
      setInventario([]);
      setCargandoDatos(false);
      return;
    }

    try {
      setCargandoDatos(true);
      setErrorCarga("");
      const [listaTickets, listaDispositivos, listaInventario] = await Promise.all([
        getMantenimientos(empresaActualId),
        getDispositivos(empresaActualId),
        getInventario(empresaActualId),
      ]);
      setTickets(listaTickets);
      setDispositivos(listaDispositivos);
      setInventario(listaInventario);
    } catch (error) {
      console.error("No se pudieron cargar los tickets de mantenimiento", error);
      setErrorCarga("No se pudieron cargar los tickets de mantenimiento. Intenta nuevamente.");
      setTickets([]);
      setDispositivos([]);
      setInventario([]);
    } finally {
      setCargandoDatos(false);
    }
  }, [empresaActualId]);

  useEffect(() => {
    if (!cargandoAuth && empresaActualId) {
      void cargarDatos();
    }
  }, [cargandoAuth, empresaActualId, cargarDatos]);

  const guardarMantenimiento = async (data: MantenimientoFormData) => {
    try {
      if (ticketActivo) {
        await updateMantenimientoTicket(
          empresaActualId || undefined,
          ticketActivo.id,
          data,
          user?.uid || "system",
        );
      } else {
        await createMantenimiento(empresaActualId || undefined, data, user?.uid || "system");
      }
      await cargarDatos();
      setDialogAbierto(false);
      setTicketActivo(null);
    } catch (error) {
      console.error("No se pudo guardar el mantenimiento", error);
      alert(error instanceof Error ? error.message : "No se pudo guardar el mantenimiento.");
    }
  };

  const cambiarEstado = async (
    ticketId: string,
    nextStatus: TicketMantenimientoIT["status"],
  ) => {
    try {
      await updateMantenimientoStatus(
        empresaActualId || undefined,
        ticketId,
        nextStatus,
        user?.uid || "system",
      );
      await cargarDatos();
    } catch (error) {
      console.error("No se pudo actualizar el estado del ticket", error);
      alert(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
    }
  };

  const resumen = useMemo(() => {
    const abiertos = tickets.filter((ticket) => ticket.status === "open").length;
    const progreso = tickets.filter((ticket) => ticket.status === "in_progress").length;
    const completados = tickets.filter((ticket) => ticket.status === "done").length;
    return { abiertos, progreso, completados };
  }, [tickets]);

  const dispositivoPorId = useMemo(
    () =>
      dispositivos.reduce<Record<string, string>>((acc, dispositivo) => {
        acc[dispositivo.id] = dispositivo.nombre;
        return acc;
      }, {}),
    [dispositivos],
  );

  const inventarioPorId = useMemo(
    () =>
      inventario.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.nombre;
        return acc;
      }, {}),
    [inventario],
  );

  const historialOrdenado = (historial: HistorialMantenimientoEntry[]) =>
    [...historial].sort((a, b) => (a.timestamp?.getTime() ?? 0) - (b.timestamp?.getTime() ?? 0));

  const contenido = (
    <Box sx={{ backgroundColor: "#f7f8fc", py: 3 }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="h4" fontWeight={800}>
                Mantenimiento IT
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Crea tickets conectados a dispositivos, descuenta piezas del inventario y registra trazabilidad completa.
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => {
                setTicketActivo(null);
                setDialogAbierto(true);
              }}
            >
              Nuevo mantenimiento
            </Button>
          </Stack>

          {errorCarga && <Alert severity="error">{errorCarga}</Alert>}

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={3} sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Tickets abiertos
                      </Typography>
                      <Typography variant="h4" fontWeight={800}>
                        {resumen.abiertos}
                      </Typography>
                    </Box>
                    <PendingActionsIcon sx={{ fontSize: 34, color: "#2563eb" }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={3} sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        En progreso
                      </Typography>
                      <Typography variant="h4" fontWeight={800}>
                        {resumen.progreso}
                      </Typography>
                    </Box>
                    <BuildCircleIcon sx={{ fontSize: 34, color: "#d97706" }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={3} sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Completados
                      </Typography>
                      <Typography variant="h4" fontWeight={800}>
                        {resumen.completados}
                      </Typography>
                    </Box>
                    <CheckCircleIcon sx={{ fontSize: 34, color: "#16a34a" }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card elevation={3} sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Tickets recientes
              </Typography>
              {cargandoDatos ? (
                <Box p={2}>Cargando mantenimientos...</Box>
              ) : tickets.length === 0 ? (
                <Typography color="text.secondary">No hay tickets de mantenimiento todavía.</Typography>
              ) : (
                <Stack spacing={2}>
                  {tickets.map((ticket) => (
                    <Box
                      key={ticket.id}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        border: "1px solid #e5e7eb",
                        backgroundColor: "#fff",
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                        spacing={2}
                        mb={1}
                      >
                        <Box>
                          <Typography fontWeight={700}>
                            {dispositivoPorId[ticket.dispositivoId] || "Dispositivo desconocido"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Creado: {formatearFechaHora(ticket.createdAt)} | Actualizado:{" "}
                            {formatearFechaHora(ticket.updatedAt, "Sin cambios")}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip
                            label={statusLabels[ticket.status]}
                            color={statusColors[ticket.status]}
                            size="small"
                          />
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => {
                              setTicketActivo(ticket);
                              setDialogAbierto(true);
                            }}
                          >
                            Editar
                          </Button>
                          {ticket.status === "open" && (
                            <Button
                              size="small"
                              startIcon={<PlayArrowIcon />}
                              onClick={() => void cambiarEstado(ticket.id, "in_progress")}
                            >
                              Comenzar
                            </Button>
                          )}
                          {ticket.status === "in_progress" && (
                            <Button
                              size="small"
                              startIcon={<DoneAllIcon />}
                              onClick={() => void cambiarEstado(ticket.id, "done")}
                            >
                              Completar
                            </Button>
                          )}
                        </Stack>
                      </Stack>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {ticket.descripcion}
                      </Typography>

                      {ticket.piezasUsadas.length > 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                          Piezas:{" "}
                          {ticket.piezasUsadas
                            .map(
                              (pieza) =>
                                `${inventarioPorId[pieza.inventarioId] || "Pieza"} x${pieza.cantidad}`,
                            )
                            .join(", ")}
                        </Typography>
                      )}

                      <Divider sx={{ my: 1.5 }} />

                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Historial
                      </Typography>
                      <Stack spacing={1}>
                        {historialOrdenado(ticket.historial).map((entry, index) => (
                          <Box key={`${ticket.id}-${entry.accion}-${index}`} sx={{ pl: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {entry.accion}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Usuario: {entry.userId} | {formatearFechaHora(entry.timestamp)}
                            </Typography>
                            {entry.detalles && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {JSON.stringify(entry.detalles)}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Container>

      {dialogAbierto && (
        <MantenimientoDialog
          key={ticketActivo?.id ?? "new-ticket"}
          open={dialogAbierto}
          onClose={() => {
            setDialogAbierto(false);
            setTicketActivo(null);
          }}
          onSave={guardarMantenimiento}
          dispositivos={dispositivos}
          inventario={inventario}
          initialData={ticketActivo}
          title={ticketActivo ? "Editar mantenimiento" : "Nuevo mantenimiento"}
          submitLabel={ticketActivo ? "Guardar cambios" : "Crear ticket"}
        />
      )}
    </Box>
  );

  if (cargandoAuth) {
    return (
      <ProtectedLayout>
        <PanelLayout>
          <Box p={4}>Cargando...</Box>
        </PanelLayout>
      </ProtectedLayout>
    );
  }

  return (
    <MountedGuard>
      <ProtectedLayout>
        <PanelLayout>{contenido}</PanelLayout>
      </ProtectedLayout>
    </MountedGuard>
  );
}
