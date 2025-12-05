"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import { crearSucursal, actualizarSucursal, obtenerSucursales, Sucursal } from "@/lib/firestore/sucursales";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import SucursalDialog, { SucursalFormData } from "@/components/sucursales/SucursalDialog";
import MountedGuard from "@/components/system/MountedGuard";

export default function SucursalesPage() {
  const router = useRouter();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [sucursalEditando, setSucursalEditando] = useState<Sucursal | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) {
        router.push("/login");
      } else {
        setCargandoAuth(false);
        cargarSucursales();
      }
    });
    return () => unsub();
  }, [router]);

  const cargarSucursales = async () => {
    const lista = await obtenerSucursales();
    setSucursales(lista);
  };

  const columnas: GridColDef[] = [
    { field: "nombre", headerName: "Nombre", flex: 1, minWidth: 150 },
    { field: "ciudad", headerName: "Ciudad", flex: 1, minWidth: 140 },
    { field: "encargado", headerName: "Encargado", flex: 1, minWidth: 160 },
    { field: "telefono", headerName: "Teléfono", flex: 1, minWidth: 140 },
    { field: "fecha", headerName: "Fecha de creación", flex: 1, minWidth: 170 },
    {
      field: "acciones",
      headerName: "Acciones",
      sortable: false,
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const encontrada = sucursales.find((s) => s.id === params.row.id);
              setSucursalEditando(encontrada ?? null);
              setDialogAbierto(true);
            }}
          >
            Editar
          </Button>
          <Button variant="outlined" color="error" size="small">
            Eliminar
          </Button>
        </Stack>
      ),
    },
  ];

  const filas = useMemo(() => {
    const filtro = busqueda.toLowerCase();
    return sucursales
      .map((s) => ({
        id: s.id,
        nombre: s.nombre,
        ciudad: s.ciudad,
        encargado: (s as any).encargado || "No asignado",
        telefono: (s as any).telefono || "—",
        fecha: s.createdAt ? s.createdAt.toLocaleDateString("es-MX") : "Sin fecha",
      }))
      .filter((row) =>
        [row.nombre, row.ciudad, row.encargado, row.telefono, row.fecha]
          .join(" ")
          .toLowerCase()
          .includes(filtro),
      );
  }, [sucursales, busqueda]);

  const abrirCrear = () => {
    setSucursalEditando(null);
    setDialogAbierto(true);
  };

  const cerrarDialogo = () => {
    setDialogAbierto(false);
  };

  const guardarSucursal = async (data: SucursalFormData) => {
    if (sucursalEditando) {
      await actualizarSucursal(
        sucursalEditando.id,
        {
          nombre: data.nombre,
          ciudad: data.ciudad,
          activa: sucursalEditando.activa,
          // Campos adicionales
          encargado: data.encargado,
          telefono: data.telefono,
        } as any,
      );
    } else {
      await crearSucursal({
        nombre: data.nombre,
        ciudad: data.ciudad,
        activa: true,
        // Campos adicionales
        encargado: data.encargado,
        telefono: data.telefono,
      } as any);
    }
    await cargarSucursales();
    setDialogAbierto(false);
    setSucursalEditando(null);
  };

  const contenido = (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Sucursales
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vista general de las sucursales registradas.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Button variant="contained" color="primary" onClick={abrirCrear}>
            Nueva Sucursal
          </Button>
        </Stack>
      </Stack>

      <Paper elevation={3} sx={{ borderRadius: 3, p: 2 }}>
        <Box sx={{ height: 520, width: "100%" }}>
          <DataGrid
            rows={filas}
            columns={columnas}
            checkboxSelection
            disableRowSelectionOnClick
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
          />
        </Box>
      </Paper>

      <SucursalDialog
        open={dialogAbierto}
        onClose={cerrarDialogo}
        onSave={guardarSucursal}
        initialData={sucursalEditando}
      />
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
