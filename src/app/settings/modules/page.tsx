"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Alert, Box, Card, CardContent, Container, Stack, Switch, Typography } from "@mui/material";
import { auth } from "@/lib/firebase";
import MountedGuard from "@/components/system/MountedGuard";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import ProtectedRoute from "@/components/system/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import {
  saveCompanyModules,
  subscribeCompanyModules,
  type CompanyModulesMap,
} from "@/lib/modules";

const buildDefaultModules = (): CompanyModulesMap => ({
  dashboard: { enabled: true },
  gastos: { enabled: false },
  viajes: { enabled: false },
  it: { enabled: false },
});

export default function SettingsModulesPage() {
  const router = useRouter();
  const { empresaActualId } = useAuth();
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [modules, setModules] = useState<CompanyModulesMap>(buildDefaultModules);

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

  useEffect(() => {
    if (cargandoAuth) {
      return;
    }

    if (!empresaActualId) {
      setCargandoDatos(false);
      setError("No hay empresa seleccionada para administrar módulos.");
      setModules(buildDefaultModules());
      return;
    }

    setCargandoDatos(true);
    setError("");

    const unsubscribe = subscribeCompanyModules(empresaActualId, (incomingModules) => {
      setModules({
        ...buildDefaultModules(),
        ...incomingModules,
        dashboard: { enabled: true },
      });
      setCargandoDatos(false);
    });

    return () => unsubscribe();
  }, [cargandoAuth, empresaActualId]);

  const configuracionCRM = useMemo(
    () => ({
      logistica: modules.gastos?.enabled === true || modules.viajes?.enabled === true,
      it: modules.it?.enabled === true,
    }),
    [modules],
  );

  const actualizarConfiguracion = async (tipo: "logistica" | "it", enabled: boolean) => {
    if (!empresaActualId) {
      setError("No hay empresa seleccionada para guardar módulos.");
      return;
    }

    const siguienteConfiguracion = {
      ...configuracionCRM,
      [tipo]: enabled,
    };

    const siguienteEstado: CompanyModulesMap = {
      dashboard: { enabled: true },
      gastos: { enabled: siguienteConfiguracion.logistica },
      viajes: { enabled: siguienteConfiguracion.logistica },
      it: { enabled: siguienteConfiguracion.it },
    };

    try {
      setGuardando(true);
      setError("");
      setExito("");
      setModules(siguienteEstado);
      await saveCompanyModules(empresaActualId, siguienteEstado);
      setExito("Configuración actualizada.");
    } catch (saveError) {
      console.error("No se pudo actualizar la configuración de módulos", saveError);
      setError("No se pudo actualizar la configuración. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const cards = [
    {
      id: "logistica" as const,
      title: "Transportación",
      description: "Activa el conjunto completo de operación: sucursales, autobuses, viajes, choferes, gastos y reportes.",
      enabled: configuracionCRM.logistica,
    },
    {
      id: "it" as const,
      title: "IT",
      description: "Activa el módulo de activos tecnológicos y sus vistas operativas.",
      enabled: configuracionCRM.it,
    },
  ];

  const contenido = cargandoDatos ? (
    <Box p={4}>Cargando configuración...</Box>
  ) : (
    <Container maxWidth="md" sx={{ px: 0 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Tipo de CRM
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configura qué módulos principales usa la empresa. El dashboard siempre permanece activo.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {exito && <Alert severity="success">{exito}</Alert>}
        <Alert severity="info">Dashboard siempre activo.</Alert>

        <Stack spacing={2}>
          {cards.map((card) => (
            <Card
              key={card.id}
              elevation={3}
              sx={{
                borderRadius: 4,
                border: card.enabled ? "2px solid #2563eb" : "1px solid #e5e7eb",
                transition: "all 160ms ease",
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {card.description}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ mt: 1.5, color: card.enabled ? "#2563eb" : "#64748b" }}
                    >
                      {card.enabled ? "Activo" : "Inactivo"}
                    </Typography>
                  </Box>
                  <Switch
                    checked={card.enabled}
                    onChange={(_, checked) => void actualizarConfiguracion(card.id, checked)}
                    color="primary"
                    disabled={guardando}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
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
        <PanelLayout>
          <ProtectedRoute roles={["admin", "superadmin"]}>{contenido}</ProtectedRoute>
        </PanelLayout>
      </ProtectedLayout>
    </MountedGuard>
  );
}
