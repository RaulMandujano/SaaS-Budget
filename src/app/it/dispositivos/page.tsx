"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, GridColDef, GridRowParams } from "@mui/x-data-grid";
import { auth } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import MountedGuard from "@/components/system/MountedGuard";
import { useAuth } from "@/context/AuthContext";
import DispositivoDialog, { type DispositivoFormData } from "@/components/it/DispositivoDialog";
import {
  createDispositivo,
  getDispositivos,
  updateDispositivo,
  type DispositivoIT,
} from "@/lib/firestore/dispositivos";
import { formatearFecha } from "@/lib/fechas";

const statusLabels: Record<DispositivoIT["status"], string> = {
  available: "Disponible",
  assigned: "Asignado",
  maintenance: "Mantenimiento",
};

export default function ITDispositivosPage() {
  const router = useRouter();
  const { empresaActualId, user } = useAuth();
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [dispositivos, setDispositivos] = useState<DispositivoIT[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [dispositivoActivo, setDispositivoActivo] = useState<DispositivoIT | null>(null);

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

  const cargarDispositivos = useCallback(async () => {
    if (!empresaActualId) {
      setDispositivos([]);
      setCargandoDatos(false);
      return;
    }

    try {
      setCargandoDatos(true);
      setErrorCarga("");
      const lista = await getDispositivos(empresaActualId);
      setDispositivos(lista);
    } catch (error) {
      console.error("No se pudieron cargar los dispositivos", error);
      setErrorCarga("No se pudieron cargar los dispositivos. Intenta nuevamente.");
      setDispositivos([]);
    } finally {
      setCargandoDatos(false);
    }
  }, [empresaActualId]);

  useEffect(() => {
    if (!cargandoAuth && empresaActualId) {
      void cargarDispositivos();
    }
  }, [cargandoAuth, empresaActualId, cargarDispositivos]);

  const guardarDispositivo = async (data: DispositivoFormData) => {
    try {
      if (dispositivoActivo) {
        await updateDispositivo(empresaActualId || undefined, dispositivoActivo.id, data, user?.uid);
      } else {
        await createDispositivo(empresaActualId || undefined, data, user?.uid);
      }
      await cargarDispositivos();
      setDialogAbierto(false);
      setDispositivoActivo(null);
    } catch (error) {
      console.error("No se pudo guardar el dispositivo", error);
      alert(error instanceof Error ? error.message : "No se pudo guardar el dispositivo.");
    }
  };

  const columnas: GridColDef[] = [
    { field: "nombre", headerName: "Nombre", flex: 1, minWidth: 180 },
    { field: "modelo", headerName: "Modelo", flex: 1, minWidth: 140 },
    { field: "numeroSerie", headerName: "Serie", flex: 1, minWidth: 160 },
    { field: "status", headerName: "Estado", flex: 0.9, minWidth: 140 },
    { field: "assignedTo", headerName: "Asignado a", flex: 1, minWidth: 160 },
    { field: "ubicacion", headerName: "Ubicación", flex: 1, minWidth: 150 },
    { field: "createdAt", headerName: "Creado", flex: 0.9, minWidth: 130 },
  ];

  const filas = useMemo(() => {
    const filtro = busqueda.toLowerCase();

    return dispositivos
      .map((dispositivo) => ({
        id: dispositivo.id,
        nombre: dispositivo.nombre,
        modelo: dispositivo.modelo || "Sin modelo",
        numeroSerie: dispositivo.numeroSerie || "Sin serie",
        status: statusLabels[dispositivo.status] ?? "Disponible",
        assignedTo: dispositivo.assignedTo || "Sin asignar",
        ubicacion: dispositivo.ubicacion || "Sin ubicación",
        createdAt: formatearFecha(dispositivo.createdAt, "Sin fecha"),
      }))
      .filter((row) =>
        [
          row.nombre,
          row.modelo,
          row.numeroSerie,
          row.status,
          row.assignedTo,
          row.ubicacion,
          row.createdAt,
        ]
          .join(" ")
          .toLowerCase()
          .includes(filtro),
      );
  }, [dispositivos, busqueda]);

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
            Dispositivos IT
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra dispositivos operativos y actualiza su estado.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setDispositivoActivo(null);
              setDialogAbierto(true);
            }}
          >
            Crear dispositivo
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
            <Box p={3}>Cargando dispositivos...</Box>
          ) : (
            <DataGrid
              rows={filas}
              columns={columnas}
              disableRowSelectionOnClick
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
              onRowClick={(params: GridRowParams) => {
                const seleccionado = dispositivos.find((item) => item.id === String(params.id));
                if (seleccionado) {
                  setDispositivoActivo(seleccionado);
                  setDialogAbierto(true);
                }
              }}
            />
          )}
        </Box>
      </Paper>

      {dialogAbierto && (
        <DispositivoDialog
          open={dialogAbierto}
          onClose={() => {
            setDialogAbierto(false);
            setDispositivoActivo(null);
          }}
          onSave={guardarDispositivo}
          initialData={dispositivoActivo}
          title={dispositivoActivo ? "Editar dispositivo" : "Crear dispositivo"}
        />
      )}
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
