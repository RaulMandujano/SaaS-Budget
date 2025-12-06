"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import {
  obtenerAutobuses,
  Autobus,
  crearAutobus,
  actualizarAutobus,
  eliminarAutobus,
} from "@/lib/firestore/autobuses";
import { obtenerSucursales, Sucursal } from "@/lib/firestore/sucursales";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import AutobusDialog, { AutobusFormData } from "@/components/autobuses/AutobusDialog";
import MountedGuard from "@/components/system/MountedGuard";
import { useAuth } from "@/context/AuthContext";
import { registrarEventoAuditoria } from "@/lib/auditoria/registrarEvento";
import { Alert } from "@mui/material";

export default function AutobusesPage() {
  const router = useRouter();
  const { usuario, rol, empresaActualId } = useAuth();
  const [autobuses, setAutobuses] = useState<Autobus[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [autobusEditando, setAutobusEditando] = useState<Autobus | null>(null);

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
    if (!cargandoAuth && empresaActualId) {
      cargarDatos();
    }
  }, [cargandoAuth, empresaActualId]);

  const cargarDatos = async () => {
    if (!empresaActualId) {
      setCargandoDatos(false);
      return;
    }
    try {
      setCargandoDatos(true);
      setErrorCarga("");
      const empresaId = empresaActualId || undefined;
      const [listaSucursales, listaAutobuses] = await Promise.all([
        obtenerSucursales(empresaId),
        obtenerAutobuses(empresaId),
      ]);
      setSucursales(listaSucursales);
      setAutobuses(listaAutobuses);
    } catch (error) {
      console.error("Error al cargar autobuses o sucursales", error);
      setErrorCarga("No se pudieron cargar los autobuses. Intenta nuevamente.");
      setAutobuses([]);
    } finally {
      setCargandoDatos(false);
    }
  };

  const columnas: GridColDef[] = [
    { field: "placa", headerName: "Placa", flex: 1, minWidth: 140 },
    { field: "modelo", headerName: "Modelo", flex: 1, minWidth: 140 },
    { field: "anio", headerName: "Año", flex: 0.6, minWidth: 110 },
    { field: "capacidad", headerName: "Capacidad", flex: 0.8, minWidth: 130 },
    { field: "sucursal", headerName: "Sucursal", flex: 1, minWidth: 160 },
    { field: "estado", headerName: "Estado", flex: 1, minWidth: 150 },
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
              const encontrada = autobuses.find((a) => a.id === params.row.id);
              setAutobusEditando(encontrada ?? null);
              setDialogAbierto(true);
            }}
          >
            Editar
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={async () => {
              const confirmar = window.confirm("¿Seguro que deseas eliminar este autobús?");
              if (!confirmar) return;
              try {
                await eliminarAutobus(params.row.id);
                await registrarEventoAuditoria({
                  usuarioId: usuario?.uid,
                  usuarioNombre: usuario?.displayName ?? "Usuario",
                  usuarioEmail: usuario?.email ?? "",
                  rol: rol ?? null,
                  modulo: "autobuses",
                  accion: "eliminar",
                  descripcion: `Eliminó el autobús ${params.row.placa || params.row.id}`,
                });
                await cargarDatos();
              } catch (error) {
                console.error(error);
                alert("No se pudo eliminar el autobús");
              }
            }}
          >
            Eliminar
          </Button>
        </Stack>
      ),
    },
  ];

  const filas = useMemo(() => {
    const filtro = busqueda.toLowerCase();
    return autobuses
      .map((bus) => ({
        id: bus.id,
        placa: bus.placa,
        modelo: bus.modelo || bus.marca,
        anio: bus.anio || 0,
        capacidad: (bus as any).capacidad || "—",
        sucursal: sucursales.find((s) => s.id === bus.sucursalId)?.nombre ?? "Sucursal no encontrada",
        estado:
          bus.estado === "mantenimiento"
            ? "Mantenimiento"
            : bus.estado === "fuera_servicio"
            ? "Fuera de servicio"
            : "Activo",
      }))
      .filter((row) =>
        [row.placa, row.modelo, row.anio, row.capacidad, row.sucursal, row.estado].join(" ").toLowerCase().includes(filtro),
      );
  }, [autobuses, sucursales, busqueda]);

  const abrirCrear = () => {
    setAutobusEditando(null);
    setDialogAbierto(true);
  };

  const cerrarDialogo = () => {
    setDialogAbierto(false);
  };

  const guardarAutobus = async (data: AutobusFormData) => {
    try {
      if (autobusEditando) {
        await actualizarAutobus(autobusEditando.id, {
          numeroUnidad: data.numeroUnidad,
          placa: data.placa,
          modelo: data.modelo,
          anio: Number(data.anio) || 0,
          capacidad: Number(data.capacidad) || 0,
          sucursalId: data.sucursalId,
          estado: data.estado,
        });
        await registrarEventoAuditoria({
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.displayName ?? "Usuario",
          usuarioEmail: usuario?.email ?? "",
          rol: rol ?? null,
          modulo: "autobuses",
          accion: "editar",
          descripcion: `Editó el autobús ${data.placa || data.numeroUnidad}`,
        });
      } else {
        await crearAutobus({
          numeroUnidad: data.numeroUnidad,
          placa: data.placa,
          modelo: data.modelo,
          anio: Number(data.anio) || 0,
          capacidad: Number(data.capacidad) || 0,
          sucursalId: data.sucursalId,
          estado: data.estado,
          marca: data.modelo,
        } as any);
        await registrarEventoAuditoria({
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.displayName ?? "Usuario",
          usuarioEmail: usuario?.email ?? "",
          rol: rol ?? null,
          modulo: "autobuses",
          accion: "crear",
          descripcion: `Creó el autobús ${data.placa || data.numeroUnidad}`,
        });
      }
      await cargarDatos();
      setDialogAbierto(false);
      setAutobusEditando(null);
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar el autobús");
    }
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
            Autobuses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vista general de las unidades y su estado operativo.
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
            Nuevo Autobús
          </Button>
        </Stack>
      </Stack>

      {errorCarga && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorCarga}
        </Alert>
      )}

      <Paper elevation={3} sx={{ borderRadius: 3, p: 2 }}>
        <Box sx={{ height: 520, width: "100%" }}>
          {cargandoDatos ? (
            <Box p={3}>Cargando datos...</Box>
          ) : (
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
          )}
        </Box>
      </Paper>

      <AutobusDialog
        open={dialogAbierto}
        onClose={cerrarDialogo}
        onSave={guardarAutobus}
        initialData={autobusEditando}
        sucursales={sucursales}
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
