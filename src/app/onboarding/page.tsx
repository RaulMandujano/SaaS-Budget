"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ComputerIcon from "@mui/icons-material/Computer";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { useAuth } from "@/context/AuthContext";
import { getCompanyModules, saveCompanyModules, type CompanyModulesMap } from "@/lib/modules";

type OnboardingOption = "logistica" | "it" | "ambos";

const onboardingProfiles: Record<OnboardingOption, CompanyModulesMap> = {
  logistica: {
    dashboard: { enabled: true },
    gastos: { enabled: true },
    viajes: { enabled: true },
    it: { enabled: false },
  },
  it: {
    dashboard: { enabled: true },
    gastos: { enabled: false },
    viajes: { enabled: false },
    it: { enabled: true },
  },
  ambos: {
    dashboard: { enabled: true },
    gastos: { enabled: true },
    viajes: { enabled: true },
    it: { enabled: true },
  },
};

const options: Array<{
  id: OnboardingOption;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: "logistica",
    title: "Logística",
    description: "Activa viajes, gastos y dashboard para operación y control logístico.",
    icon: <LocalShippingIcon sx={{ fontSize: 42, color: "#2563eb" }} />,
  },
  {
    id: "it",
    title: "IT",
    description: "Activa inventario tecnológico para gestionar assets y operación interna de TI.",
    icon: <ComputerIcon sx={{ fontSize: 42, color: "#2563eb" }} />,
  },
  {
    id: "ambos",
    title: "Ambos",
    description: "Activa logística e IT para operar ambos módulos desde el mismo workspace.",
    icon: <DashboardIcon sx={{ fontSize: 42, color: "#2563eb" }} />,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { usuario, empresaActualId } = useAuth();
  const [selected, setSelected] = useState<OnboardingOption>("logistica");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!usuario) {
      router.replace("/login");
      return;
    }

    if (!empresaActualId) {
      setCargando(false);
      setError("No hay empresa seleccionada para completar el onboarding.");
      return;
    }

    let active = true;

    const cargarModulos = async () => {
      try {
        const modules = await getCompanyModules(empresaActualId);
        if (!active) return;

        if (Object.keys(modules).length > 0) {
          router.replace("/dashboard");
          return;
        }
      } catch (loadError) {
        console.error("No se pudo verificar el estado del onboarding", loadError);
        if (!active) return;
        setError("No se pudo verificar la configuración actual de módulos.");
      } finally {
        if (active) {
          setCargando(false);
        }
      }
    };

    void cargarModulos();

    return () => {
      active = false;
    };
  }, [usuario, empresaActualId, router]);

  const modulesPreview = useMemo(() => onboardingProfiles[selected], [selected]);

  const continuar = async () => {
    if (!empresaActualId) {
      setError("No hay empresa seleccionada para guardar el onboarding.");
      return;
    }

    try {
      setGuardando(true);
      setError("");
      await saveCompanyModules(empresaActualId, onboardingProfiles[selected]);
      router.replace("/dashboard");
    } catch (saveError) {
      console.error("No se pudieron guardar los módulos seleccionados", saveError);
      setError("No se pudo completar el onboarding. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const contenido = cargando ? (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
      }}
    >
      <CircularProgress size={30} />
      <Typography>Cargando onboarding...</Typography>
    </Box>
  ) : (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
        py: { xs: 6, md: 10 },
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={2} mb={5} textAlign="center" alignItems="center">
          <Typography variant="overline" sx={{ letterSpacing: "0.14em", color: "#2563eb" }}>
            Onboarding de módulos
          </Typography>
          <Typography variant="h3" fontWeight={800} color="#0f172a">
            Configura tu empresa
          </Typography>
          <Typography variant="body1" color="text.secondary" maxWidth={720}>
            Elige qué módulos quieres activar al inicio. Podrás expandir esta configuración más
            adelante sin afectar el resto del sistema.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {options.map((option) => {
            const active = selected === option.id;
            return (
              <Grid size={{ xs: 12, md: 4 }} key={option.id}>
                <Card
                  elevation={active ? 8 : 2}
                  sx={{
                    borderRadius: 4,
                    border: active ? "2px solid #2563eb" : "1px solid #dbe4f0",
                    backgroundColor: active ? "#eff6ff" : "white",
                    height: "100%",
                  }}
                >
                  <CardActionArea sx={{ height: "100%" }} onClick={() => setSelected(option.id)}>
                    <CardContent sx={{ p: 4 }}>
                      <Stack spacing={2}>
                        <Box>{option.icon}</Box>
                        <Typography variant="h5" fontWeight={800}>
                          {option.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Card elevation={3} sx={{ mt: 4, borderRadius: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={800}>
                Módulos que se activarán
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap">
                {Object.entries(modulesPreview).map(([moduleId, state]) => (
                  <Box
                    key={moduleId}
                    sx={{
                      px: 2,
                      py: 1.25,
                      borderRadius: 3,
                      backgroundColor: state.enabled ? "#dcfce7" : "#f1f5f9",
                      color: state.enabled ? "#166534" : "#475569",
                      fontWeight: 700,
                      minWidth: 140,
                      textTransform: "capitalize",
                    }}
                  >
                    {moduleId}: {state.enabled ? "Activo" : "Inactivo"}
                  </Box>
                ))}
              </Stack>
              <Box sx={{ pt: 1 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={continuar}
                  disabled={guardando || !empresaActualId}
                  sx={{ px: 4, py: 1.3, borderRadius: 3 }}
                >
                  {guardando ? "Guardando..." : "Continuar al dashboard"}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );

  return contenido;
}
