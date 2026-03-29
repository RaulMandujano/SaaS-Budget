"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, Container, Divider, Grid, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";
import ComputerIcon from "@mui/icons-material/Computer";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PercentIcon from "@mui/icons-material/Percent";
import { getAssets, type AssetIT } from "@/lib/firestore/assets";
import { formatearFecha } from "@/lib/fechas";

interface DashboardITProps {
  empresaId: string;
}

export default function DashboardIT({ empresaId }: DashboardITProps) {
  const [assets, setAssets] = useState<AssetIT[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarAssets = async () => {
      if (!empresaId) return;

      try {
        setCargando(true);
        setError("");
        const lista = await getAssets(empresaId);
        setAssets(lista);
      } catch (loadError) {
        console.error("No se pudieron cargar los assets para el dashboard IT", loadError);
        setError("No se pudieron cargar los indicadores de IT.");
        setAssets([]);
      } finally {
        setCargando(false);
      }
    };

    void cargarAssets();
  }, [empresaId]);

  const resumen = useMemo(() => {
    const total = assets.length;
    const asignados = assets.filter((asset) => asset.status === "assigned").length;
    const mantenimiento = assets.filter((asset) => asset.status === "maintenance").length;
    const sinAsignar = Math.max(total - asignados, 0);
    const porcentajeAsignados = total > 0 ? (asignados / total) * 100 : 0;
    const porcentajeMantenimiento = total > 0 ? (mantenimiento / total) * 100 : 0;

    return {
      total,
      asignados,
      mantenimiento,
      sinAsignar,
      porcentajeAsignados,
      porcentajeMantenimiento,
      recientes: assets.slice(0, 5),
    };
  }, [assets]);

  const alertas = useMemo(() => {
    const items: Array<{ severity: "warning" | "info"; message: string }> = [];

    if (resumen.total > 0 && resumen.porcentajeMantenimiento > 30) {
      items.push({
        severity: "warning",
        message: "El porcentaje de activos en mantenimiento supera el 30%. Conviene revisar capacidad operativa.",
      });
    }

    if (resumen.total > 0 && resumen.sinAsignar / resumen.total > 0.5) {
      items.push({
        severity: "info",
        message: "Más del 50% de los activos están sin asignar. Hay capacidad ociosa disponible.",
      });
    }

    return items;
  }, [resumen]);

  const insight = useMemo(() => {
    if (resumen.total === 0) {
      return "Todavía no hay activos registrados. Cuando empieces a cargar inventario, este panel mostrará señales operativas.";
    }
    if (resumen.porcentajeMantenimiento > 30 && resumen.sinAsignar / resumen.total > 0.5) {
      return "El inventario muestra una combinación de mantenimiento alto y activos sin uso. Conviene revisar renovación, reasignación y stock ocioso.";
    }
    if (resumen.porcentajeMantenimiento > 30) {
      return "El mantenimiento está alto para el volumen actual de activos. Esto puede afectar la disponibilidad del equipo.";
    }
    if (resumen.sinAsignar / resumen.total > 0.5) {
      return "Muchos activos están sin uso. Hay margen para reasignar equipos antes de comprar inventario nuevo.";
    }
    if (resumen.porcentajeAsignados >= 70) {
      return "La mayor parte del inventario está en uso. El nivel de adopción es alto y conviene monitorear capacidad restante.";
    }
    return "La distribución actual de activos se ve estable. Mantén seguimiento de asignaciones y mantenimiento para anticipar cuellos de botella.";
  }, [resumen]);

  const cards = [
    {
      titulo: "Total Assets",
      valor: resumen.total,
      subtexto: "Inventario tecnológico registrado",
      icono: <Inventory2Icon sx={{ color: "#2563eb", fontSize: 34 }} />,
    },
    {
      titulo: "Assets Asignados",
      valor: resumen.asignados,
      subtexto: "Equipos en uso actual",
      icono: <AssignmentIndIcon sx={{ color: "#16a34a", fontSize: 34 }} />,
    },
    {
      titulo: "En Mantenimiento",
      valor: resumen.mantenimiento,
      subtexto: "Activos fuera de servicio temporal",
      icono: <BuildCircleIcon sx={{ color: "#ea580c", fontSize: 34 }} />,
    },
    {
      titulo: "% Activos en Uso",
      valor: `${resumen.porcentajeAsignados.toFixed(0)}%`,
      subtexto: "Porcentaje del inventario asignado",
      icono: <PercentIcon sx={{ color: "#0891b2", fontSize: 34 }} />,
    },
    {
      titulo: "% en Mantenimiento",
      valor: `${resumen.porcentajeMantenimiento.toFixed(0)}%`,
      subtexto: "Participación del inventario en reparación",
      icono: <PercentIcon sx={{ color: "#d97706", fontSize: 34 }} />,
    },
    {
      titulo: "Activos Disponibles",
      valor: resumen.sinAsignar,
      subtexto: "Equipos sin asignación actual",
      icono: <Inventory2Icon sx={{ color: "#475569", fontSize: 34 }} />,
    },
  ];

  const getStatusMeta = (status: AssetIT["status"]) => {
    if (status === "assigned") {
      return { label: "Asignado", color: "success" as const };
    }
    if (status === "maintenance") {
      return { label: "Mantenimiento", color: "warning" as const };
    }
    if (status === "retired") {
      return { label: "Retirado", color: "default" as const };
    }
    return { label: "Disponible", color: "info" as const };
  };

  if (cargando) {
    return <Box p={4}>Cargando métricas de IT...</Box>;
  }

  return (
    <Box sx={{ backgroundColor: "#f7f8fc", py: 3 }}>
      <Container maxWidth="lg">
        <Card
          elevation={4}
          sx={{
            mb: 4,
            borderRadius: 5,
            background: "linear-gradient(120deg, #0f172a, #1d4ed8)",
            color: "white",
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ComputerIcon sx={{ fontSize: 34 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={800}>
                  Dashboard IT
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Visibilidad rápida del inventario tecnológico, asignaciones y mantenimiento.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={2} mb={3}>
          {error && <Alert severity="error">{error}</Alert>}
          {alertas.map((alerta) => (
            <Alert key={alerta.message} severity={alerta.severity}>
              {alerta.message}
            </Alert>
          ))}
        </Stack>

        <Grid container spacing={3} mb={4}>
          {cards.map((card) => (
            <Grid size={{ xs: 12, md: 4 }} key={card.titulo}>
              <Card elevation={3} sx={{ borderRadius: 4, height: "100%" }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: "0.08em" }}>
                        {card.titulo}
                      </Typography>
                      <Typography variant="h4" fontWeight={800} mt={1}>
                        {card.valor}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.subtexto}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 1.4,
                        borderRadius: 3,
                        backgroundColor: "#eff6ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {card.icono}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card elevation={3} sx={{ borderRadius: 4, height: "100%" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Insight operativo
                </Typography>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <Typography variant="body1" color="text.primary">
                    {insight}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card elevation={3} sx={{ borderRadius: 4, height: "100%" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Assets recientes
                </Typography>
                {resumen.recientes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No hay assets registrados todavía.
                  </Typography>
                ) : (
                  <List disablePadding>
                    {resumen.recientes.map((asset, index) => {
                      const statusMeta = getStatusMeta(asset.status);
                      return (
                        <Box key={asset.id}>
                          <ListItem disableGutters sx={{ py: 1.5, gap: 2, alignItems: "flex-start" }}>
                            <Box
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 3,
                                backgroundColor: "#eff6ff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <ComputerIcon sx={{ color: "#2563eb" }} />
                            </Box>
                            <ListItemText
                              primary={
                                <Stack
                                  direction={{ xs: "column", sm: "row" }}
                                  spacing={1}
                                  alignItems={{ xs: "flex-start", sm: "center" }}
                                >
                                  <Typography variant="subtitle1" fontWeight={700}>
                                    {asset.name}
                                  </Typography>
                                  <Chip label={statusMeta.label} color={statusMeta.color} size="small" />
                                </Stack>
                              }
                              secondary={
                                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {asset.type || "Sin tipo"} | Serie: {asset.serialNumber || "Sin serie"}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {asset.location || "Sin ubicación"} | Creado: {formatearFecha(asset.createdAt)}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Responsable: {asset.assignedTo || "Sin asignar"}
                                  </Typography>
                                </Stack>
                              }
                            />
                          </ListItem>
                          {index < resumen.recientes.length - 1 && <Divider />}
                        </Box>
                      );
                    })}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
