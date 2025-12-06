"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import { obtenerSucursales, Sucursal } from "@/lib/firestore/sucursales";
import { obtenerAutobuses, Autobus } from "@/lib/firestore/autobuses";
import { crearGasto, eliminarGasto, obtenerGastos, Gasto } from "@/lib/firestore/gastos";
import { Box, Button, Paper, Stack, TextField, Typography, Alert } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import MountedGuard from "@/components/system/MountedGuard";
import GastoDialog, { GastoFormData } from "@/components/gastos/GastoDialog";
import { useAuth } from "@/context/AuthContext";
import { registrarEventoAuditoria } from "@/lib/auditoria/registrarEvento";
import { aplicarImpuesto, formatearMoneda, useConfiguracion } from "@/lib/configuracion/configuracion";
import { formatearFecha } from "@/lib/fechas";

export default function GastosPage() {
  const router = useRouter();
  const { usuario, rol, empresaActualId } = useAuth();
  const { configuracion } = useConfiguracion();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [autobuses, setAutobuses] = useState<Autobus[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [gastoEditando, setGastoEditando] = useState<Gasto | null>(null);

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
      cargarDatos(empresaActualId);
    }
  }, [cargandoAuth, empresaActualId]);

  const cargarDatos = async (empresaIdArg?: string) => {
    const empresaIdUso = empresaIdArg || empresaActualId;
    if (!empresaIdUso) {
      setCargandoDatos(false);
      return;
    }
    try {
      setCargandoDatos(true);
      setErrorCarga("");
      const empresaId = empresaIdUso || undefined;
      const [listaSucursales, listaAutobuses, listaGastos] = await Promise.all([
        obtenerSucursales(empresaId),
        obtenerAutobuses(empresaId),
        obtenerGastos(empresaId),
      ]);
      setSucursales(listaSucursales);
      setAutobuses(listaAutobuses);
      setGastos(listaGastos);
    } catch (error) {
      console.error("Error al cargar gastos", error);
      setErrorCarga("No se pudieron cargar los gastos. Verifica los permisos o índices.");
      setGastos([]);
    } finally {
      setCargandoDatos(false);
    }
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
    { field: "monto", headerName: `Monto (${configuracion.moneda || "MXN"})`, flex: 1, minWidth: 140 },
    { field: "sucursal", headerName: "Sucursal", flex: 1, minWidth: 160 },
    { field: "autobus", headerName: "Autobús", flex: 1, minWidth: 140 },
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
              const encontrado = gastos.find((g) => g.id === params.row.id) ?? null;
              setGastoEditando(encontrado);
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
              const confirmar = typeof window !== "undefined"
                ? window.confirm("¿Seguro que deseas eliminar este gasto?")
                : false;
              if (!confirmar) return;
              await eliminarGasto(params.row.id);
              await registrarEventoAuditoria({
                usuarioId: usuario?.uid,
                usuarioNombre: usuario?.displayName ?? "Usuario",
                usuarioEmail: usuario?.email ?? "",
                rol: rol ?? null,
                modulo: "gastos",
                accion: "eliminar",
                descripcion: `Eliminó el gasto ${params.row.concepto}`,
              });
              setGastos(await obtenerGastos(empresaActualId || undefined));
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
    return gastos
      .map((gasto) => ({
        id: gasto.id,
        fecha: formatearFecha(gasto.fecha),
        concepto: gasto.descripcion,
        categoria: gasto.tipo,
        monto: formatearMoneda(aplicarImpuesto(gasto.monto, configuracion), configuracion),
        sucursal: mapaSucursales.get(gasto.sucursalId) ?? "Sucursal no encontrada",
        autobus: mapaAutobuses.get(gasto.autobusId) ?? "Autobús no encontrado",
      }))
      .filter((row) =>
        [row.fecha, row.concepto, row.categoria, row.sucursal, row.autobus, row.monto]
          .join(" ")
          .toLowerCase()
          .includes(filtro),
      );
  }, [gastos, mapaAutobuses, mapaSucursales, busqueda, configuracion]);

  const abrirCrear = () => {
    setGastoEditando(null);
    setDialogAbierto(true);
  };

  const cerrarDialogo = () => {
    setDialogAbierto(false);
  };

  const guardarGasto = async (data: GastoFormData) => {
    const montoNumero = Number(data.monto) || 0;
    const fechaObjeto = data.fecha ? new Date(`${data.fecha}T00:00:00`) : null;

    if (gastoEditando) {
      await updateDoc(doc(db, "gastos", gastoEditando.id), {
        fecha: fechaObjeto,
        descripcion: data.concepto,
        tipo: data.categoria,
        monto: montoNumero,
        sucursalId: data.sucursalId,
        autobusId: data.autobusId,
      });
      await registrarEventoAuditoria({
        usuarioId: usuario?.uid,
        usuarioNombre: usuario?.displayName ?? "Usuario",
        usuarioEmail: usuario?.email ?? "",
        rol: rol ?? null,
        modulo: "gastos",
        accion: "editar",
        descripcion: `Editó el gasto ${data.concepto}`,
      });
    } else {
      await crearGasto({
        fecha: fechaObjeto,
        descripcion: data.concepto,
        tipo: data.categoria,
        monto: montoNumero,
        sucursalId: data.sucursalId,
        autobusId: data.autobusId,
      });
      await registrarEventoAuditoria({
        usuarioId: usuario?.uid,
        usuarioNombre: usuario?.displayName ?? "Usuario",
        usuarioEmail: usuario?.email ?? "",
        rol: rol ?? null,
        modulo: "gastos",
        accion: "crear",
        descripcion: `Creó el gasto ${data.concepto}`,
      });
    }

    setGastos(await obtenerGastos(empresaActualId || undefined));
    setDialogAbierto(false);
    setGastoEditando(null);
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
          <Button variant="contained" color="primary" onClick={abrirCrear}>
            Nuevo Gasto
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

      <GastoDialog
        open={dialogAbierto}
        onClose={cerrarDialogo}
        onSave={guardarGasto}
        initialData={gastoEditando}
        sucursales={sucursales}
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
