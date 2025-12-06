"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import { obtenerAutobuses, Autobus } from "@/lib/firestore/autobuses";
import {
  actualizarChofer,
  crearChofer,
  eliminarChofer,
  obtenerChoferes,
  Chofer,
} from "@/lib/firestore/choferes";
import { Box, Button, Paper, Stack, TextField, Typography, Alert } from "@mui/material";
import { DataGrid, GridColDef, GridValueGetterParams } from "@mui/x-data-grid";
import ChoferDialog, { ChoferFormData } from "@/components/choferes/ChoferDialog";
import MountedGuard from "@/components/system/MountedGuard";
import { useAuth } from "@/context/AuthContext";
import { registrarEventoAuditoria } from "@/lib/auditoria/registrarEvento";

interface ChoferRow {
  id: string;
  nombre: string;
  licencia: string;
  telefono: string;
  autobusId: string;
  estado: string;
}

export default function ChoferesPage() {
  const router = useRouter();
  const { usuario, rol, empresaActualId } = useAuth();
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [choferes, setChoferes] = useState<ChoferRow[]>([]);
  const [autobuses, setAutobuses] = useState<Autobus[]>([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [choferEditando, setChoferEditando] = useState<ChoferRow | null>(null);

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
      const [listaAutobuses, listaChoferesRaw] = await Promise.all([
        obtenerAutobuses(empresaId),
        obtenerChoferes(empresaId),
      ]);

      const listaChoferes: ChoferRow[] = listaChoferesRaw.map((c: Chofer) => ({
        id: c.id,
        nombre: c.nombre,
        licencia: c.licencia,
        telefono: c.telefono,
        autobusId: c.autobusId,
        estado: c.estado,
      }));

      setAutobuses(listaAutobuses);
      setChoferes(listaChoferes);
    } catch (error) {
      console.error("Error al cargar choferes o autobuses", error);
      setErrorCarga("No se pudieron cargar los datos de choferes. Intenta nuevamente.");
      setChoferes([]);
    } finally {
      setCargandoDatos(false);
    }
  };

  const abrirCrear = () => {
    if (autobuses.length === 0) {
      alert("Primero registra un autobús para asignarlo al chofer.");
      return;
    }
    setChoferEditando(null);
    setDialogAbierto(true);
  };

  const cerrarDialogo = () => {
    setDialogAbierto(false);
  };

  const guardarChofer = async (data: ChoferFormData) => {
    try {
      if (choferEditando) {
        await actualizarChofer(choferEditando.id, {
          nombre: data.nombre,
          licencia: data.licencia,
          telefono: data.telefono,
          autobusId: data.autobusId,
          estado: data.estado,
        });
        await registrarEventoAuditoria({
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.displayName ?? "Usuario",
          usuarioEmail: usuario?.email ?? "",
          rol: rol ?? null,
          modulo: "choferes",
          accion: "editar",
          descripcion: `Editó el chofer ${data.nombre}`,
        });
      } else {
        await crearChofer(
          {
            nombre: data.nombre,
            licencia: data.licencia,
            telefono: data.telefono,
            autobusId: data.autobusId,
            estado: data.estado,
          },
          empresaActualId || undefined,
        );
        await registrarEventoAuditoria({
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.displayName ?? "Usuario",
          usuarioEmail: usuario?.email ?? "",
          rol: rol ?? null,
          modulo: "choferes",
          accion: "crear",
          descripcion: `Creó el chofer ${data.nombre}`,
        });
      }
      await cargarDatos();
      setDialogAbierto(false);
      setChoferEditando(null);
    } catch (error) {
      console.error("Error al guardar chofer", error);
      alert("Ocurrió un error al guardar el chofer. Intenta de nuevo.");
    }
  };

  const eliminarChoferHandler = async (row: ChoferRow) => {
    const confirmar = window.confirm("¿Seguro que deseas eliminar este chofer?");
    if (!confirmar) return;
    try {
      await eliminarChofer(row.id);
      await registrarEventoAuditoria({
        usuarioId: usuario?.uid,
        usuarioNombre: usuario?.displayName ?? "Usuario",
        usuarioEmail: usuario?.email ?? "",
        rol: rol ?? null,
        modulo: "choferes",
        accion: "eliminar",
        descripcion: `Eliminó el chofer ${row.nombre}`,
      });
      await cargarDatos();
    } catch (error) {
      console.error(error);
      alert("No se pudo eliminar el chofer");
    }
  };

  const columnas: GridColDef[] = [
    { field: "nombre", headerName: "Nombre", flex: 1, minWidth: 160 },
    { field: "licencia", headerName: "Licencia", flex: 1, minWidth: 140 },
    { field: "telefono", headerName: "Teléfono", flex: 1, minWidth: 140 },
    {
      field: "autobus",
      headerName: "Autobús asignado",
      flex: 1,
      minWidth: 170,
      valueGetter: (params: GridValueGetterParams) => {
        const autobusId = params?.row?.autobusId;

        if (!autobusId || !Array.isArray(autobuses)) {
          return "No asignado";
        }

        const found = autobuses.find((a) => a.id === autobusId);

        return found?.placa || found?.numeroUnidad || "No asignado";
      },
    },
    { field: "estado", headerName: "Estado", flex: 0.8, minWidth: 120 },
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
              const encontrada = choferes.find((c) => c.id === params.row.id) ?? null;
              setChoferEditando(encontrada);
              setDialogAbierto(true);
            }}
          >
            Editar
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => eliminarChoferHandler(params.row)}
          >
            Eliminar
          </Button>
        </Stack>
      ),
    },
  ];

  const filas = useMemo(() => {
    const filtro = busqueda.toLowerCase();
    return choferes
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        licencia: c.licencia,
        telefono: c.telefono,
        autobusId: c.autobusId,
        estado: c.estado,
      }))
      .filter((row) =>
        [row.nombre, row.licencia, row.telefono, row.estado]
          .join(" ")
          .toLowerCase()
          .includes(filtro),
      );
  }, [choferes, busqueda]);

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
            Choferes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión del personal de conducción.
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
            Nuevo Chofer
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

      <ChoferDialog
        open={dialogAbierto}
        onClose={cerrarDialogo}
        onSave={guardarChofer}
        initialData={choferEditando}
        autobuses={autobuses}
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
