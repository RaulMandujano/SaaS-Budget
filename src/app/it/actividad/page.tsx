"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Alert, Box, Card, CardContent, Container, Stack, Typography } from "@mui/material";
import { auth } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import MountedGuard from "@/components/system/MountedGuard";
import { useAuth } from "@/context/AuthContext";
import { getActivityLogs, type ActivityLogEntry } from "@/lib/firestore/activityLogs";
import { formatearFechaHora } from "@/lib/fechas";

export default function ITActividadPage() {
  const router = useRouter();
  const { empresaActualId } = useAuth();
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);

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

  const cargarActividad = useCallback(async () => {
    if (!empresaActualId) {
      setLogs([]);
      setCargandoDatos(false);
      return;
    }

    try {
      setCargandoDatos(true);
      setErrorCarga("");
      const lista = await getActivityLogs(empresaActualId);
      setLogs(lista);
    } catch (error) {
      console.error("No se pudo cargar la actividad IT", error);
      setErrorCarga("No se pudo cargar la actividad. Intenta nuevamente.");
      setLogs([]);
    } finally {
      setCargandoDatos(false);
    }
  }, [empresaActualId]);

  useEffect(() => {
    if (!cargandoAuth && empresaActualId) {
      void cargarActividad();
    }
  }, [cargandoAuth, empresaActualId, cargarActividad]);

  const contenido = (
    <Box sx={{ backgroundColor: "#f7f8fc", py: 3 }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Actividad IT
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Timeline global de cambios de inventario, dispositivos y tickets.
            </Typography>
          </Box>

          {errorCarga && <Alert severity="error">{errorCarga}</Alert>}

          <Card elevation={3} sx={{ borderRadius: 4 }}>
            <CardContent>
              {cargandoDatos ? (
                <Box p={2}>Cargando actividad...</Box>
              ) : logs.length === 0 ? (
                <Typography color="text.secondary">No hay actividad registrada todavía.</Typography>
              ) : (
                <Stack spacing={2}>
                  {logs.map((log) => (
                    <Box
                      key={log.id}
                      sx={{
                        pl: 2,
                        borderLeft: "3px solid #2563eb",
                      }}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        {log.descripcion}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {log.tipo} | {log.accion} | usuario: {log.userId} | {formatearFechaHora(log.createdAt)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Container>
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
