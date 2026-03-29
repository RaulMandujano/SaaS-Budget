"use client";

import { useEffect, useState } from "react";
import MountedGuard from "@/components/system/MountedGuard";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import { Alert, Box, Stack, Typography } from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { getCompanyModules, type CompanyModulesMap } from "@/lib/modules";
import DashboardLogistica from "@/components/dashboard/DashboardLogistica";
import DashboardIT from "@/components/dashboard/DashboardIT";

export default function DashboardPage() {
  const { empresaActualId } = useAuth();
  const [modules, setModules] = useState<CompanyModulesMap>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarModulos = async () => {
      if (!empresaActualId) {
        setModules({});
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError("");
        const companyModules = await getCompanyModules(empresaActualId);
        setModules(companyModules);
      } catch (loadError) {
        console.warn("Error al cargar módulos del dashboard", loadError);
        setError("No se pudo construir el dashboard dinámico. Intenta nuevamente.");
        setModules({});
      } finally {
        setCargando(false);
      }
    };

    void cargarModulos();
  }, [empresaActualId]);

  const showLogistica = modules.gastos?.enabled === true || modules.viajes?.enabled === true;
  const showIT = modules.it?.enabled === true;

  const contenido = cargando ? (
    <Box p={4}>Cargando dashboard...</Box>
  ) : (
    <Stack spacing={4}>
      {error && <Alert severity="error">{error}</Alert>}
      {showLogistica && empresaActualId && <DashboardLogistica empresaId={empresaActualId} />}
      {showIT && empresaActualId && <DashboardIT empresaId={empresaActualId} />}
      {!showLogistica && !showIT && (
        <Box
          sx={{
            minHeight: "50vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f7f8fc",
          }}
        >
          <Box sx={{ textAlign: "center", maxWidth: 560 }}>
            <Typography variant="h5" fontWeight={800} gutterBottom>
              No hay módulos activos para el dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Activa al menos un módulo de logística o IT para mostrar métricas en esta pantalla.
            </Typography>
          </Box>
        </Box>
      )}
    </Stack>
  );

  return (
    <MountedGuard>
      <ProtectedLayout>
        <PanelLayout>{contenido}</PanelLayout>
      </ProtectedLayout>
    </MountedGuard>
  );
}
