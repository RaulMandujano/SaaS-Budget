"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";

import {
  crearSucursal,
  actualizarSucursal,
  obtenerSucursales,
  eliminarSucursal,
  Sucursal,
} from "@/lib/firestore/sucursales";

import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";

import { DataGrid, GridColDef } from "@mui/x-data-grid";

import SucursalDialog, {
  SucursalFormData,
} from "@/components/sucursales/SucursalDialog";

import MountedGuard from "@/components/system/MountedGuard";
import { useAuth } from "@/context/AuthContext";
import { registrarEventoAuditoria } from "@/lib/auditoria/registrarEvento";

export default function SucursalesPage() {
  const router = useRouter();
  const { usuario, rol, empresaActualId } = useAuth();

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [sucursalEditando, setSucursalEditando] =
    useState<Sucursal | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usuarioActual) => {
      if (!usuarioActual) {
        router.push("/login");
      } else {
        setCargandoAuth(false);
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!cargandoAuth && empresaActualId) {
      cargarSucursales(empresaActualId);
    }
  }, [cargandoAuth, empresaActualId]);

  const cargarSucursales = async (empresaId: string) => {
    try {
      setCargandoDatos(true);
      setErrorCarga("");
      const lista = await obtenerSucursales(empresaId);
      setSucursales(lista);
    } catch (error) {
      console.error("Error al cargar sucursales", error);
      setErrorCarga("No se pudieron cargar las sucursales. Intenta nuevamente.");
      setSucursales([]);
    } finally {
      setCargandoDatos(false);
    }
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
      renderCell: (params: any) => (
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const encontrada = sucursales.find(
                (s) => s.id === params.row.id,
              );
              setSucursalEditando(encontrada ?? null);
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
              const confirmar = window.confirm(
                "¿Seguro que deseas eliminar esta sucursal?",
              );
              if (!confirmar) return;

              try {
                await eliminarSucursal(params.row.id);

                await registrarEventoAuditoria({
                  usuarioId: usuario?.uid,
                  usuarioNombre: usuario?.displayName ?? "Usuario",
                  usuarioEmail: usuario?.email ?? "",
                  rol: rol ?? null,
                  modulo: "sucursales",
                  accion: "eliminar",
                  descripcion: `Eliminó la sucursal ${params.row.nombre}`,
                });

                if (empresaActualId) {
                  await cargarSucursales(empresaActualId);
                }
              } catch (error) {
                console.error(error);
                alert("No se pudo eliminar la sucursal");
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

    return sucursales
      .map((s) => ({
        id: s.id,
        nombre: s.nombre,
        ciudad: s.ciudad,
        encargado: (s as any).encargado || "No asignado",
        telefono: (s as any).telefono || "—",
        fecha: s.createdAt
          ? s.createdAt.toLocaleDateString("es-MX")
          : "Sin fecha",
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
    try {
      if (sucursalEditando) {
        await actualizarSucursal(sucursalEditando.id, {
          nombre: data.nombre,
          ciudad: data.ciudad,
          activa: sucursalEditando.activa,
          encargado: data.encargado,
          telefono: data.telefono,
        } as any);

        await registrarEventoAuditoria({
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.displayName ?? "Usuario",
          usuarioEmail: usuario?.email ?? "",
          rol: rol ?? null,
          modulo: "sucursales",
          accion: "editar",
          descripcion: `Editó la sucursal ${data.nombre}`,
        });
      } else {
        await crearSucursal({
          nombre: data.nombre,
          ciudad: data.ciudad,
          activa: true,
          encargado: data.encargado,
          telefono: data.telefono,
        } as any);

        await registrarEventoAuditoria({
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.displayName ?? "Usuario",
          usuarioEmail: usuario?.email ?? "",
          rol: rol ?? null,
          modulo: "sucursales",
          accion: "crear",
          descripcion: `Creó la sucursal ${data.nombre}`,
        });
      }

      if (empresaActualId) {
        await cargarSucursales(empresaActualId);
      }

      setDialogAbierto(false);
      setSucursalEditando(null);
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar la sucursal");
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
