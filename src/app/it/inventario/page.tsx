"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { auth } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import MountedGuard from "@/components/system/MountedGuard";
import { useAuth } from "@/context/AuthContext";
import InventarioDialog, { type InventarioFormData } from "@/components/it/InventarioDialog";
import { createInventarioItem, getInventario, type InventarioItem } from "@/lib/firestore/inventario";
import { formatearFecha } from "@/lib/fechas";

export default function ITInventarioPage() {
  const router = useRouter();
  const { empresaActualId, user } = useAuth();
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [dialogAbierto, setDialogAbierto] = useState(false);

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

  const cargarInventario = useCallback(async () => {
    if (!empresaActualId) {
      setInventario([]);
      setCargandoDatos(false);
      return;
    }

    try {
      setCargandoDatos(true);
      setErrorCarga("");
      const lista = await getInventario(empresaActualId);
      setInventario(lista);
    } catch (error) {
      console.error("No se pudo cargar el inventario IT", error);
      setErrorCarga("No se pudo cargar el inventario IT. Intenta nuevamente.");
      setInventario([]);
    } finally {
      setCargandoDatos(false);
    }
  }, [empresaActualId]);

  useEffect(() => {
    if (!cargandoAuth && empresaActualId) {
      void cargarInventario();
    }
  }, [cargandoAuth, empresaActualId, cargarInventario]);

  const guardarItem = async (data: InventarioFormData) => {
    try {
      await createInventarioItem(empresaActualId || undefined, data, user?.uid);
      await cargarInventario();
      setDialogAbierto(false);
    } catch (error) {
      console.error("No se pudo guardar el producto", error);
      alert(error instanceof Error ? error.message : "No se pudo guardar el producto.");
    }
  };

  const columnas: GridColDef[] = [
    { field: "nombre", headerName: "Nombre", flex: 1, minWidth: 180 },
    { field: "sku", headerName: "SKU", flex: 1, minWidth: 140 },
    { field: "cantidad", headerName: "Cantidad", flex: 0.8, minWidth: 110 },
    { field: "ubicacion", headerName: "Ubicación", flex: 1, minWidth: 150 },
    { field: "tipo", headerName: "Tipo", flex: 1, minWidth: 140 },
    { field: "createdAt", headerName: "Creado", flex: 0.9, minWidth: 130 },
  ];

  const filas = useMemo(() => {
    const filtro = busqueda.toLowerCase();

    return inventario
      .map((item) => ({
        id: item.id,
        nombre: item.nombre,
        sku: item.sku,
        cantidad: item.cantidad,
        ubicacion: item.ubicacion || "Sin ubicación",
        tipo: item.tipo || "Sin tipo",
        createdAt: formatearFecha(item.createdAt, "Sin fecha"),
      }))
      .filter((row) =>
        [row.nombre, row.sku, row.ubicacion, row.tipo, String(row.cantidad), row.createdAt]
          .join(" ")
          .toLowerCase()
          .includes(filtro),
      );
  }, [inventario, busqueda]);

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
            Inventario IT
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Controla stock, SKU y ubicación de repuestos y productos.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Button variant="contained" color="primary" onClick={() => setDialogAbierto(true)}>
            Agregar producto
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
            <Box p={3}>Cargando inventario...</Box>
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
        <InventarioDialog
          open={dialogAbierto}
          onClose={() => setDialogAbierto(false)}
          onSave={guardarItem}
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
