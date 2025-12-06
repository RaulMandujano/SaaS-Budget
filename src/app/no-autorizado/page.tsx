"use client";

import Link from "next/link";
import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import PanelLayout from "@/components/layout/PanelLayout";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import MountedGuard from "@/components/system/MountedGuard";

export default function NoAutorizadoPage() {
  return (
    <MountedGuard>
      <ProtectedLayout>
        <PanelLayout>
          <Container maxWidth="md">
            <Paper elevation={4} sx={{ p: 5, borderRadius: 4, textAlign: "center", background: "white" }}>
              <Stack spacing={2} alignItems="center">
                <Typography variant="h4" fontWeight={800} color="error.main">
                  Acceso denegado
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  No tienes permisos para acceder a esta sección.
                </Typography>
                <Button variant="contained" component={Link} href="/dashboard">
                  Volver al Dashboard
                </Button>
              </Stack>
            </Paper>
          </Container>
        </PanelLayout>
      </ProtectedLayout>
    </MountedGuard>
  );
}
