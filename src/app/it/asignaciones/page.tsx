"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Alert, Box, Card, CardContent, Container, Grid, Stack, Typography } from "@mui/material";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import PersonIcon from "@mui/icons-material/Person";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import { auth } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import MountedGuard from "@/components/system/MountedGuard";
import { useAuth } from "@/context/AuthContext";
import { getAssets, type AssetIT } from "@/lib/firestore/assets";

export default function ITAsignacionesPage() {
  const router = useRouter();
  const { empresaActualId } = useAuth();
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [assets, setAssets] = useState<AssetIT[]>([]);

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

  const cargarAsignaciones = useCallback(async () => {
    if (!empresaActualId) {
      setAssets([]);
      setCargandoDatos(false);
      return;
    }

    try {
      setCargandoDatos(true);
      setErrorCarga("");
      const lista = await getAssets(empresaActualId);
      setAssets(lista.filter((asset) => asset.status === "assigned"));
    } catch (error) {
      console.error("No se pudieron cargar las asignaciones IT", error);
      setErrorCarga("No se pudieron cargar las asignaciones IT. Intenta nuevamente.");
      setAssets([]);
    } finally {
      setCargandoDatos(false);
    }
  }, [empresaActualId]);

  useEffect(() => {
    if (!cargandoAuth && empresaActualId) {
      void cargarAsignaciones();
    }
  }, [cargandoAuth, empresaActualId, cargarAsignaciones]);

  const resumen = useMemo(() => {
    const asignados = assets.length;
    const conResponsable = assets.filter((asset) => asset.assignedTo.trim()).length;
    const sinResponsable = asignados - conResponsable;
    return { asignados, conResponsable, sinResponsable };
  }, [assets]);

  const contenido = (
    <Box sx={{ backgroundColor: "#f7f8fc", py: 3 }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Asignaciones IT
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vista operativa de activos asignados y responsables actuales.
            </Typography>
          </Box>

          {errorCarga && <Alert severity="error">{errorCarga}</Alert>}

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={3} sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Activos asignados
                      </Typography>
                      <Typography variant="h4" fontWeight={800}>
                        {resumen.asignados}
                      </Typography>
                    </Box>
                    <AssignmentIndIcon sx={{ fontSize: 34, color: "#2563eb" }} />
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
                        Con responsable
                      </Typography>
                      <Typography variant="h4" fontWeight={800}>
                        {resumen.conResponsable}
                      </Typography>
                    </Box>
                    <PersonIcon sx={{ fontSize: 34, color: "#16a34a" }} />
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
                        Sin responsable
                      </Typography>
                      <Typography variant="h4" fontWeight={800}>
                        {resumen.sinResponsable}
                      </Typography>
                    </Box>
                    <Inventory2Icon sx={{ fontSize: 34, color: "#ea580c" }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card elevation={3} sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Detalle de asignaciones
              </Typography>
              {cargandoDatos ? (
                <Box p={2}>Cargando asignaciones...</Box>
              ) : assets.length === 0 ? (
                <Typography color="text.secondary">No hay activos asignados actualmente.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {assets.map((asset) => (
                    <Box
                      key={asset.id}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        border: "1px solid #e5e7eb",
                        backgroundColor: "#fff",
                      }}
                    >
                      <Typography fontWeight={700}>{asset.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {asset.type || "Sin tipo"} | Serie: {asset.serialNumber || "Sin serie"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Responsable: {asset.assignedTo || "Sin asignar"} | Ubicación: {asset.location || "Sin ubicación"}
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
