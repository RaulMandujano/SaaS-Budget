"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import {
  obtenerGastoPorSucursal,
  obtenerGastoPorTipo,
  obtenerGastoTotal,
  obtenerTotalesSistema,
} from "@/lib/reportes/metricas";
import { obtenerSucursales } from "@/lib/firestore/sucursales";
import { Box, Button, Card, CardContent, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import ApartmentIcon from "@mui/icons-material/Apartment";
import MountedGuard from "@/components/system/MountedGuard";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend, ArcElement);

export default function DashboardPage() {
  const [totales, setTotales] = useState({ totalHistorico: 0, totalMes: 0 });
  const [totalesSistema, setTotalesSistema] = useState({
    totalAutobuses: 0,
    totalSucursales: 0,
  });
  const [gastoPorMes, setGastoPorMes] = useState<number[]>([
    // TODO: conectar a Firestore real
    18000, 22000, 19500, 24000, 26000, 25500, 27500, 30000, 29000, 31000, 33000, 34000,
  ]);
  const [gastoPorCategoria, setGastoPorCategoria] = useState<{ label: string; value: number }[]>([
    // TODO: conectar a Firestore real
    { label: "Combustible", value: 42000 },
    { label: "Mantenimiento", value: 18000 },
    { label: "Peajes", value: 9500 },
    { label: "Sueldos", value: 38000 },
    { label: "Otros", value: 7200 },
  ]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [totalesGasto, totSistema] = await Promise.all([
          obtenerGastoTotal(),
          obtenerTotalesSistema(),
          obtenerGastoPorSucursal(),
          obtenerGastoPorTipo(),
          obtenerSucursales(),
        ]);
        setTotales(totalesGasto);
        setTotalesSistema(totSistema);
        // TODO: al tener métricas por mes y categoría, asignar setGastoPorMes y setGastoPorCategoria
      } catch (error) {
        console.warn("Error al cargar métricas, usando valores por defecto", error);
        setTotales({ totalHistorico: 0, totalMes: 0 });
        setTotalesSistema({ totalAutobuses: 0, totalSucursales: 0 });
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  const formatearMoneda = useMemo(
    () => (valor: number) => `$${valor.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
    [],
  );

  const cards = [
    {
      titulo: "Gasto Total Histórico",
      valor: formatearMoneda(totales.totalHistorico),
      icono: <MonetizationOnIcon sx={{ color: "#0ea5e9", fontSize: 36 }} />,
      subtexto: "+8.4% vs mes anterior",
    },
    {
      titulo: "Gasto del Mes",
      valor: formatearMoneda(totales.totalMes),
      icono: <TrendingUpIcon sx={{ color: "#22c55e", fontSize: 36 }} />,
      subtexto: "+3.2% vs mes anterior",
    },
    {
      titulo: "Total de Autobuses",
      valor: totalesSistema.totalAutobuses,
      icono: <DirectionsBusIcon sx={{ color: "#a855f7", fontSize: 36 }} />,
      subtexto: "+1.5% flota activa",
    },
    {
      titulo: "Total de Sucursales",
      valor: totalesSistema.totalSucursales,
      icono: <ApartmentIcon sx={{ color: "#f97316", fontSize: 36 }} />,
      subtexto: "Cobertura nacional estable",
    },
  ];

  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const dataBarras = useMemo(
    () => ({
      labels: meses,
      datasets: [
        {
          label: "Gasto por mes",
          data: gastoPorMes,
          backgroundColor: "rgba(37, 99, 235, 0.7)",
          borderRadius: 8,
        },
      ],
    }),
    [gastoPorMes],
  );

  const opcionesBarras = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: "index" as const, intersect: false },
      },
      scales: {
        y: {
          ticks: {
            callback: (value: number | string) =>
              typeof value === "number" ? `$${value.toLocaleString("es-MX")}` : value,
          },
        },
      },
    }),
    [],
  );

  const dataDonut = useMemo(
    () => ({
      labels: gastoPorCategoria.map((item) => item.label),
      datasets: [
        {
          label: "Distribución de gastos",
          data: gastoPorCategoria.map((item) => item.value),
          backgroundColor: ["#2563eb", "#22c55e", "#f59e0b", "#a855f7", "#ef4444"],
          borderWidth: 1,
        },
      ],
    }),
    [gastoPorCategoria],
  );

  const opcionesDonut = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: {
          position: "bottom" as const,
        },
      },
      cutout: "60%",
    }),
    [],
  );

  const contenido = (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f7f8fc", py: 3 }}>
      <Container maxWidth="lg">
        {/* Hero */}
        <Paper
          elevation={4}
          sx={{
            p: { xs: 3, md: 5 },
            mb: 5,
            borderRadius: 5,
            background: "linear-gradient(120deg, #2563eb, #22c55e)",
            color: "white",
            overflow: "hidden",
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack spacing={1.5}>
                <Typography variant="h5" fontWeight={700}>
                  Bienvenido de nuevo 👋
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  Panel Ejecutivo Estrella Polar
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Monitorea en tiempo real tus métricas operativas y financieras. Obtén visibilidad total de gastos, flota y sucursales.
                </Typography>
                <Button
                  variant="contained"
                  sx={{
                    width: "fit-content",
                    mt: 1,
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    color: "white",
                    backdropFilter: "blur(4px)",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.3)" },
                    boxShadow: "0px 8px 24px rgba(0,0,0,0.18)",
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  Ver reporte general
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box
                component="img"
                src="/hero-dashboard.png"
                alt="Dashboard ilustración"
                sx={{
                  width: "100%",
                  maxWidth: 360,
                  display: "block",
                  ml: { md: "auto" },
                  filter: "drop-shadow(0px 12px 32px rgba(0,0,0,0.25))",
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Métricas */}
        <Grid container spacing={3} mb={4}>
          {cards.map((card) => (
            <Grid item xs={12} sm={6} md={3} key={card.titulo}>
              <Card
                elevation={3}
                sx={{
                  borderRadius: 4,
                  height: "100%",
                  background: "white",
                }}
              >
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
                        backgroundColor: "#f1f5f9",
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

        {/* Gráficas */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card
              elevation={3}
              sx={{
                borderRadius: 4,
                background: "white",
                height: "100%",
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Gastos por mes
                </Typography>
                <Box sx={{ minHeight: 320 }}>
                  <Bar data={dataBarras} options={opcionesBarras} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card
              elevation={3}
              sx={{
                borderRadius: 4,
                background: "white",
                height: "100%",
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Distribución de gastos por categoría
                </Typography>
                <Box
                  sx={{
                    minHeight: 320,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Doughnut data={dataDonut} options={opcionesDonut} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );

  if (cargando) {
    return (
      <MountedGuard>
        <ProtectedLayout>
          <PanelLayout>
            <Box p={4}>Cargando...</Box>
          </PanelLayout>
        </ProtectedLayout>
      </MountedGuard>
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
