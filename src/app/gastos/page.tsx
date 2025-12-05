"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import { obtenerSucursales, Sucursal } from "@/lib/firestore/sucursales";
import { obtenerAutobuses, Autobus } from "@/lib/firestore/autobuses";
import { obtenerGastos, Gasto } from "@/lib/firestore/gastos";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import MountedGuard from "@/components/system/MountedGuard";

export default function GastosPage() {
  const router = useRouter();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [autobuses, setAutobuses] = useState<Autobus[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoAuth, setCargandoAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) {
        router.push("/login");
      } else {
        setCargandoAuth(false);
        cargarDatos();
      }
    });
    return () => unsub();
  }, [router]);

  const cargarDatos = async () => {
    const [listaSucursales, listaAutobuses, listaGastos] = await Promise.all([
      obtenerSucursales(),
      obtenerAutobuses(),
      obtenerGastos(),
    ]);
    setSucursales(listaSucursales);
    setAutobuses(listaAutobuses);
    setGastos(listaGastos);
  };

  const mapaSucursales = useMemo(() => {
    const mapa = new Map<string, string>();
    sucursales.forEach((s) => mapa.set(s.id, s.nombre));
    return mapa;
  }, [sucursales]);

  const mapaAutobuses = useMemo(() => {
    const mapa = new Map<string, string>();
    autobuses.forEach((a) => mapa.set(a.id, a.numeroUnidad));
    return mapa;
  }, [autobuses]);

  const columnas: GridColDef[] = [
    { field: "fecha", headerName: "Fecha", flex: 1, minWidth: 130 },
    { field: "concepto", headerName: "Concepto", flex: 1.2, minWidth: 160 },
    { field: "categoria", headerName: "Categoría", flex: 1, minWidth: 140 },
    { field: "monto", headerName: "Monto", flex: 1, minWidth: 120 },
    { field: "sucursal", headerName: "Sucursal", flex: 1, minWidth: 160 },
    { field: "autobus", headerName: "Autobús", flex: 1, minWidth: 140 },
    {
      field: "acciones",
      headerName: "Acciones",
      sortable: false,
      flex: 1,
      minWidth: 180,
      renderCell: () => (
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small">
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
    return gastos
      .map((gasto) => ({
        id: gasto.id,
        fecha: gasto.fecha ? gasto.fecha.toLocaleDateString("es-MX") : "Sin fecha",
        concepto: gasto.descripcion,
        categoria: gasto.tipo,
        monto: `$${Number(gasto.monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
        sucursal: mapaSucursales.get(gasto.sucursalId) ?? "Sucursal no encontrada",
        autobus: mapaAutobuses.get(gasto.autobusId) ?? "Autobús no encontrado",
      }))
      .filter((row) =>
        [row.fecha, row.concepto, row.categoria, row.sucursal, row.autobus, row.monto]
          .join(" ")
          .toLowerCase()
          .includes(filtro),
      );
  }, [gastos, mapaAutobuses, mapaSucursales, busqueda]);

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
            Gastos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Control detallado de egresos operativos.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Button variant="contained" color="primary">
            Nuevo +
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
