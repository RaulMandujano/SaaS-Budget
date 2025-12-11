"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import { Box, Button, Paper, Stack, Typography, Alert } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import MountedGuard from "@/components/system/MountedGuard";
import { aplicarImpuesto, formatearMoneda, useConfiguracion } from "@/lib/configuracion/configuracion";
import { useAuth } from "@/context/AuthContext";
import { registrarEventoAuditoria } from "@/lib/auditoria/registrarEvento";
import {
  obtenerRutas,
  crearRuta,
  actualizarRuta,
  eliminarRuta,
  Ruta,
} from "@/lib/firestore/rutas";
import { obtenerSucursales, Sucursal } from "@/lib/firestore/sucursales";
import RutaDialog, { RutaFormData } from "@/components/rutas/RutaDialog";

export default function RutasPage() {
  const router = useRouter();
  const { usuario, rol, empresaActualId } = useAuth();
  const { configuracion } = useConfiguracion();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [rutaEditando, setRutaEditando] = useState<Ruta | null>(null);

  const cargarDatos = useCallback(async () => {
    if (!empresaActualId) {
      setCargandoDatos(false);
      setSucursales([]);
      setRutas([]);
      setErrorCarga("Selecciona una empresa para ver las rutas.");
      return;
    }

    try {
      setCargandoDatos(true);
      setErrorCarga("");
      const empresaId = empresaActualId || undefined;
      const [listaSucursales, listaRutas] = await Promise.all([
        obtenerSucursales(empresaId),
        obtenerRutas(empresaId),
      ]);
      setSucursales(listaSucursales);
      setRutas(listaRutas);
    } catch (error) {
      console.error("Error al cargar rutas o sucursales", error);
      setErrorCarga("No se pudieron cargar las rutas. Intenta nuevamente.");
      setSucursales([]);
      setRutas([]);
    } finally {
      setCargandoDatos(false);
    }
  }, [empresaActualId]);

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
    if (!cargandoAuth) {
      cargarDatos();
    }
  }, [cargandoAuth, cargarDatos]);

  const sucursalMap = useMemo(() => {
    const mapa: Record<string, string> = {};
    sucursales.forEach((sucursal) => {
      mapa[sucursal.id] = sucursal.nombre;
    });
    return mapa;
  }, [sucursales]);

  const filas = useMemo(() => {
    return rutas.map((ruta) => ({
      id: ruta.id,
      origen: sucursalMap[ruta.sucursalOrigenId] ?? "Sucursal no encontrada",
      destino: sucursalMap[ruta.sucursalDestinoId] ?? "Sucursal no encontrada",
      distancia: Number(ruta.distanciaKm) || 0,
      gasolina: Number(ruta.consumoGasolinaAprox) || 0,
      peajes: Number(ruta.costoPeajes) || 0,
    }));
  }, [rutas, sucursalMap]);

  const columnas: GridColDef[] = [
    { field: "origen", headerName: "Origen", flex: 1, minWidth: 160 },
    { field: "destino", headerName: "Destino", flex: 1, minWidth: 160 },
      {
        field: "distancia",
        headerName: "Distancia (km)",
        flex: 1,
        minWidth: 150,
        valueFormatter: (params: { value?: number | string | null }) => {
          const numero =
            typeof params.value === "number" ? params.value : Number(params.value) || 0;
          return `${numero === 0 ? numero.toFixed(2) : numero.toFixed(2)} km`;
        },
      },
    {
      field: "gasolina",
      headerName: "Gasolina aproximada (L)",
      flex: 1,
      minWidth: 200,
      valueFormatter: (params: { value?: number | string | null }) => {
        const numero =
          typeof params.value === "number" ? params.value : Number(params.value) || 0;
        return `${numero.toFixed(2)} L`;
      },
    },
    {
      field: "peajes",
      headerName: "Peajes (moneda local)",
      flex: 1,
      minWidth: 200,
      valueFormatter: (params: { value?: number | string | null }) => {
        const numero =
          typeof params.value === "number" ? params.value : Number(params.value) || 0;
        return formatearMoneda(numero, configuracion);
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      sortable: false,
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const encontrada = rutas.find((ruta) => ruta.id === params.row.id);
              setRutaEditando(encontrada ?? null);
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
              const confirmar =
                typeof window !== "undefined"
                  ? window.confirm("¿Deseas eliminar esta ruta?")
                  : false;
              if (!confirmar) return;
              try {
                await eliminarRuta(params.row.id);
                await registrarEventoAuditoria({
                  usuarioId: usuario?.uid,
                  usuarioNombre: usuario?.displayName ?? "Usuario",
                  usuarioEmail: usuario?.email ?? "",
                  rol: rol ?? null,
                  modulo: "rutas",
                  accion: "eliminar",
                  descripcion: `Eliminó la ruta ${params.row.origen} → ${params.row.destino}`,
                });
                await cargarDatos();
              } catch (error) {
                console.error(error);
                alert("No se pudo eliminar la ruta.");
              }
            }}
          >
            Eliminar
          </Button>
        </Stack>
      ),
    },
  ];

  const cerrarDialogo = () => {
    setDialogAbierto(false);
    setRutaEditando(null);
  };

  const guardarRuta = async (data: RutaFormData) => {
    const origenNombre = sucursalMap[data.sucursalOrigenId] ?? "Sucursal";
    const destinoNombre = sucursalMap[data.sucursalDestinoId] ?? "Sucursal";
    const descripcion = `${origenNombre} → ${destinoNombre}`;
    try {
      if (rutaEditando) {
        await actualizarRuta(rutaEditando.id, {
          sucursalOrigenId: data.sucursalOrigenId,
          sucursalDestinoId: data.sucursalDestinoId,
          distanciaKm: Number(data.distanciaKm),
          consumoGasolinaAprox: Number(data.consumoGasolinaAprox),
          costoPeajes: Number(data.costoPeajes),
        });
        await registrarEventoAuditoria({
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.displayName ?? "Usuario",
          usuarioEmail: usuario?.email ?? "",
          rol: rol ?? null,
          modulo: "rutas",
          accion: "editar",
          descripcion: `Editó la ruta ${descripcion}`,
        });
      } else {
        await crearRuta({
          sucursalOrigenId: data.sucursalOrigenId,
          sucursalDestinoId: data.sucursalDestinoId,
          distanciaKm: Number(data.distanciaKm),
          consumoGasolinaAprox: Number(data.consumoGasolinaAprox),
          costoPeajes: Number(data.costoPeajes),
        });
        await registrarEventoAuditoria({
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.displayName ?? "Usuario",
          usuarioEmail: usuario?.email ?? "",
          rol: rol ?? null,
          modulo: "rutas",
          accion: "crear",
          descripcion: `Creó la ruta ${descripcion}`,
        });
      }
      await cargarDatos();
      cerrarDialogo();
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar la ruta.");
    }
  };

  const abrirCrear = () => {
    setRutaEditando(null);
    setDialogAbierto(true);
  };

  const contenido = (
    <Box className="space-y-4">
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Rutas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Consulta y administra las rutas entre sucursales.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" onClick={abrirCrear}>
          Nueva Ruta
        </Button>
      </Stack>

      {errorCarga && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {errorCarga}
        </Alert>
      )}

      <Paper elevation={3} sx={{ borderRadius: 3, p: 2 }}>
        <Box sx={{ height: 520, width: "100%" }}>
          {cargandoDatos ? (
            <Box p={3}>Cargando rutas...</Box>
          ) : (
            <DataGrid
              rows={filas}
              columns={columnas}
              disableRowSelectionOnClick
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
            />
          )}
        </Box>
      </Paper>

      {dialogAbierto && (
        <RutaDialog
          key={`${rutaEditando?.id ?? "crear"}-${dialogAbierto ? "open" : "closed"}`}
          open={dialogAbierto}
          onClose={cerrarDialogo}
          onSave={guardarRuta}
          initialData={rutaEditando}
          sucursales={sucursales}
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
