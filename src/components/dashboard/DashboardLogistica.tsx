"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Card, CardContent, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import ApartmentIcon from "@mui/icons-material/Apartment";
import PeopleIcon from "@mui/icons-material/People";
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
import { obtenerTotalesSistema } from "@/lib/reportes/metricas";
import { obtenerGastos } from "@/lib/firestore/gastos";
import { aplicarImpuesto, formatearMoneda, useConfiguracion } from "@/lib/configuracion/configuracion";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend, ArcElement);

const categoriasBase = ["Combustible", "Mantenimiento", "Peajes", "Sueldos", "Otros"];
const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

interface DashboardLogisticaProps {
  empresaId: string;
}

export default function DashboardLogistica({ empresaId }: DashboardLogisticaProps) {
  const { configuracion } = useConfiguracion();
  const router = useRouter();
  const [totales, setTotales] = useState({ totalHistorico: 0, totalMes: 0 });
  const [totalesSistema, setTotalesSistema] = useState({
    totalAutobuses: 0,
    totalSucursales: 0,
    totalChoferes: 0,
  });
  const [totalGastos, setTotalGastos] = useState(0);
  const [gastoPorMes, setGastoPorMes] = useState<number[]>(() => Array(12).fill(0));
  const [gastoPorCategoria, setGastoPorCategoria] = useState<{ label: string; value: number }[]>(
    () => categoriasBase.map((categoria) => ({ label: categoria, value: 0 })),
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarDatos = async () => {
      if (!empresaId) return;

      try {
        setCargando(true);
        setError("");

        const [totSistema, listaGastos] = await Promise.all([
          obtenerTotalesSistema(empresaId),
          obtenerGastos(empresaId),
        ]);

        const totalHistorico = listaGastos.reduce((acc, gasto) => acc + (Number(gasto.monto) || 0), 0);
        setTotalGastos(listaGastos.length);

        const ahora = new Date();
        const totalMes = listaGastos
          .filter(
            (gasto) =>
              gasto.fecha &&
              gasto.fecha.getMonth() === ahora.getMonth() &&
              gasto.fecha.getFullYear() === ahora.getFullYear(),
          )
          .reduce((acc, gasto) => acc + (Number(gasto.monto) || 0), 0);

        const mesesArr = Array(12).fill(0) as number[];
        listaGastos.forEach((gasto) => {
          if (gasto.fecha) {
            const idx = gasto.fecha.getMonth();
            mesesArr[idx] += Number(gasto.monto) || 0;
          }
        });

        const mapaCategorias = new Map<string, number>();
        categoriasBase.forEach((categoria) => mapaCategorias.set(categoria, 0));
        listaGastos.forEach((gasto) => {
          const tipo = categoriasBase.includes(gasto.tipo) ? gasto.tipo : "Otros";
          mapaCategorias.set(tipo, (mapaCategorias.get(tipo) || 0) + (Number(gasto.monto) || 0));
        });

        setTotales({ totalHistorico, totalMes });
        setTotalesSistema(totSistema);
        setGastoPorMes(mesesArr);
        setGastoPorCategoria(
          categoriasBase.map((categoria) => ({ label: categoria, value: mapaCategorias.get(categoria) || 0 })),
        );
      } catch (loadError) {
        console.warn("Error al cargar métricas de logística", loadError);
        setError("No se pudieron cargar las métricas de logística. Intenta nuevamente.");
        setTotales({ totalHistorico: 0, totalMes: 0 });
        setTotalGastos(0);
        setTotalesSistema({ totalAutobuses: 0, totalSucursales: 0, totalChoferes: 0 });
        setGastoPorMes(Array(12).fill(0));
        setGastoPorCategoria(categoriasBase.map((categoria) => ({ label: categoria, value: 0 })));
      } finally {
        setCargando(false);
      }
    };

    void cargarDatos();
  }, [empresaId]);

  const formatearMonedaConfig = useMemo(
    () => (valor: number) => formatearMoneda(aplicarImpuesto(valor, configuracion), configuracion),
    [configuracion],
  );

  const cards = [
    {
      titulo: "Gasto Total Histórico",
      valor: formatearMonedaConfig(totales.totalHistorico),
      icono: <MonetizationOnIcon sx={{ color: "#0ea5e9", fontSize: 36 }} />,
      subtexto: "Acumulado general",
    },
    {
      titulo: "Gasto del Mes",
      valor: formatearMonedaConfig(totales.totalMes),
      icono: <TrendingUpIcon sx={{ color: "#22c55e", fontSize: 36 }} />,
      subtexto: "Actualizado al mes corriente",
    },
    {
      titulo: "Total de Autobuses",
      valor: totalesSistema.totalAutobuses,
      icono: <DirectionsBusIcon sx={{ color: "#a855f7", fontSize: 36 }} />,
      subtexto: "Flota registrada",
    },
    {
      titulo: "Total de Gastos",
      valor: totalGastos,
      icono: <TrendingUpIcon sx={{ color: "#0ea5e9", fontSize: 36 }} />,
      subtexto: "Registros de egresos",
    },
    {
      titulo: "Total de Choferes",
      valor: totalesSistema.totalChoferes,
      icono: <PeopleIcon sx={{ color: "#10b981", fontSize: 36 }} />,
      subtexto: "Operadores activos",
    },
    {
      titulo: "Total de Sucursales",
      valor: totalesSistema.totalSucursales,
      icono: <ApartmentIcon sx={{ color: "#f97316", fontSize: 36 }} />,
      subtexto: "Cobertura nacional",
    },
  ];

  const dataBarras = useMemo(
    () => ({
      labels: meses,
      datasets: [
        {
          label: "Gasto por mes",
          data: gastoPorMes.map((monto) => aplicarImpuesto(monto, configuracion)),
          backgroundColor: "rgba(37, 99, 235, 0.7)",
          borderRadius: 8,
        },
      ],
    }),
    [gastoPorMes, configuracion],
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
              typeof value === "number" ? formatearMoneda(value, configuracion) : value,
          },
        },
      },
    }),
    [configuracion],
  );

  const dataDonut = useMemo(
    () => ({
      labels: gastoPorCategoria.map((item) => item.label),
      datasets: [
        {
          label: "Distribución de gastos",
          data: gastoPorCategoria.map((item) => aplicarImpuesto(item.value, configuracion)),
          backgroundColor: ["#2563eb", "#22c55e", "#f59e0b", "#a855f7", "#ef4444"],
          borderWidth: 1,
        },
      ],
    }),
    [gastoPorCategoria, configuracion],
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

  if (cargando) {
    return <Box p={4}>Cargando métricas de logística...</Box>;
  }

  return (
    <Box sx={{ backgroundColor: "#f7f8fc", py: 3 }}>
      <Container maxWidth="lg">
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
            <Grid size={{ xs: 12, md: 7 }}>
              <Stack spacing={1.5}>
                <Typography variant="h5" fontWeight={700}>
                  Bienvenido de nuevo
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  Panel Ejecutivo {configuracion.nombreEmpresa || "Smart Budget"}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Monitorea en tiempo real tus métricas operativas y financieras. Obtén visibilidad total
                  de gastos, flota y sucursales.
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
                  onClick={() => router.push("/reportes")}
                >
                  Ver reporte general
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} mb={4}>
          {cards.map((card) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.titulo}>
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

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
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
          <Grid size={{ xs: 12, md: 6 }}>
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
}
