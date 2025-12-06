"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import { Box, Button, Card, CardContent, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import MountedGuard from "@/components/system/MountedGuard";
import { useAuth } from "@/context/AuthContext";
import { actualizarEmpresa, crearEmpresa, Empresa, obtenerEmpresas, PlanEmpresa } from "@/lib/firestore/empresas";

export default function EmpresasPage() {
  const { rol } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [plan, setPlan] = useState<PlanEmpresa>("enterprise");

  const cargar = async () => {
    setCargando(true);
    try {
      const lista = await obtenerEmpresas();
      setEmpresas(lista);
    } catch (error) {
      console.error("No se pudieron cargar las empresas", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const crear = async () => {
    if (!nombre.trim()) {
      alert("Escribe un nombre para la empresa");
      return;
    }
    await crearEmpresa({ nombre: nombre.trim(), plan, activo: true });
    setNombre("");
    await cargar();
  };

  const alternarActivo = async (empresa: Empresa) => {
    await actualizarEmpresa(empresa.id, { activo: !empresa.activo });
    await cargar();
  };

  const columnas: GridColDef[] = useMemo(
    () => [
      { field: "nombre", headerName: "Nombre", flex: 1.4, minWidth: 180 },
      { field: "plan", headerName: "Plan", flex: 0.8, minWidth: 120 },
      { field: "activo", headerName: "Estado", flex: 0.8, minWidth: 120 },
      { field: "fecha", headerName: "Creación", flex: 1, minWidth: 140 },
      {
        field: "acciones",
        headerName: "Acciones",
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => alternarActivo(params.row.original)}>
              {params.row.original.activo ? "Desactivar" : "Activar"}
            </Button>
          </Stack>
        ),
      },
    ],
    [],
  );

  const filas = useMemo(
    () =>
      empresas.map((emp) => ({
        id: emp.id,
        nombre: emp.nombre,
        plan: emp.plan,
        activo: emp.activo ? "Activa" : "Inactiva",
        fecha: emp.fechaCreacion ? emp.fechaCreacion.toLocaleDateString("es-MX") : "—",
        original: emp,
      })),
    [empresas],
  );

  const contenido = (
    <Box>
      <Stack spacing={3} mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Empresas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra las cuentas de clientes y asigna planes. Solo visible para superadministradores.
          </Typography>
        </Box>

        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  label="Nombre de la empresa"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  select
                  label="Plan"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as PlanEmpresa)}
                  fullWidth
                >
                  <MenuItem value="free">Free</MenuItem>
                  <MenuItem value="pro">Pro</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Button variant="contained" onClick={crear} fullWidth sx={{ height: "100%" }}>
                  Crear empresa
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ height: 520, width: "100%" }}>
              <DataGrid
                rows={filas}
                columns={columnas}
                loading={cargando}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              />
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );

  if (rol !== "superadmin") {
    return (
      <MountedGuard>
        <ProtectedLayout>
          <PanelLayout>
            <Box p={4}>No autorizado.</Box>
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
