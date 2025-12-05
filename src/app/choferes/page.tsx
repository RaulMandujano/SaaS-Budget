"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import { obtenerAutobuses, Autobus } from "@/lib/firestore/autobuses";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import ChoferDialog, { ChoferFormData } from "@/components/choferes/ChoferDialog";
import MountedGuard from "@/components/system/MountedGuard";

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
  const [cargandoAuth, setCargandoAuth] = useState(true);
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
        cargarDatos();
      }
    });
    return () => unsub();
  }, [router]);

  const cargarDatos = async () => {
    try {
      const [listaAutobuses, snapshotChoferes] = await Promise.all([
        obtenerAutobuses(),
        getDocs(collection(db, "choferes")),
      ]);

      const listaChoferes: ChoferRow[] = snapshotChoferes.docs.map((registro) => {
        const data = registro.data();
        return {
          id: registro.id,
          nombre: data.nombre ?? "",
          licencia: data.licencia ?? "",
          telefono: data.telefono ?? "",
          autobusId: data.autobusId ?? "",
          estado: data.estado ?? "Activo",
        };
      });

      setAutobuses(listaAutobuses);
      setChoferes(listaChoferes);
    } catch (error) {
      console.error("Error al cargar choferes o autobuses", error);
      alert("No se pudieron cargar los datos de choferes. Intenta nuevamente.");
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
      valueGetter: (params) => {
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
          <Button variant="outlined" color="error" size="small">
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
        await updateDoc(doc(db, "choferes", choferEditando.id), {
          nombre: data.nombre,
          licencia: data.licencia,
          telefono: data.telefono,
          autobusId: data.autobusId,
          estado: data.estado,
        });
      } else {
        await addDoc(collection(db, "choferes"), {
          nombre: data.nombre,
          licencia: data.licencia,
          telefono: data.telefono,
          autobusId: data.autobusId,
          estado: data.estado,
          createdAt: serverTimestamp(),
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
