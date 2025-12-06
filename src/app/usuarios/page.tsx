"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import ProtectedRoute from "@/components/system/ProtectedRoute";
import MountedGuard from "@/components/system/MountedGuard";
import { db } from "@/lib/firebase";
import { RolUsuario } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import { registrarEventoAuditoria } from "@/lib/auditoria/registrarEvento";

interface UsuarioRow {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario | "";
  activo: boolean;
}

export default function UsuariosPage() {
  const { usuario, rol: rolContexto } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarUsuarios = async () => {
    const snap = await getDocs(collection(db, "usuarios"));
    const rows: UsuarioRow[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        nombre: data.nombre || "Sin nombre",
        email: data.email || "",
        rol: (data.rol as RolUsuario) || "",
        activo: data.activo !== false,
      };
    });
    setUsuarios(rows);
    setCargando(false);
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const actualizarRol = async (id: string, nuevoRol: RolUsuario) => {
    await updateDoc(doc(db, "usuarios", id), { rol: nuevoRol });
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, rol: nuevoRol } : u)));
    await registrarEventoAuditoria({
      usuarioId: usuario?.uid,
      usuarioNombre: usuario?.displayName ?? "Usuario",
      usuarioEmail: usuario?.email ?? "",
      rol: rolContexto ?? null,
      modulo: "usuarios",
      accion: "editar",
      descripcion: `Actualizó el rol del usuario ${usuarios.find((u) => u.id === id)?.nombre || id} a ${nuevoRol}`,
    });
  };

  const actualizarActivo = async (id: string, activo: boolean) => {
    await updateDoc(doc(db, "usuarios", id), { activo });
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, activo } : u)));
    await registrarEventoAuditoria({
      usuarioId: usuario?.uid,
      usuarioNombre: usuario?.displayName ?? "Usuario",
      usuarioEmail: usuario?.email ?? "",
      rol: rolContexto ?? null,
      modulo: "usuarios",
      accion: "editar",
      descripcion: `${activo ? "Activó" : "Desactivó"} el usuario ${
        usuarios.find((u) => u.id === id)?.nombre || id
      }`,
    });
  };

  const columnas: GridColDef[] = [
    { field: "nombre", headerName: "Nombre", flex: 1 },
    { field: "email", headerName: "Email", flex: 1.2 },
    {
      field: "rol",
      headerName: "Rol",
      flex: 0.8,
      renderCell: (params) => {
        const value = params.row.rol as RolUsuario;
        return (
          <FormControl size="small" fullWidth>
            <InputLabel>Rol</InputLabel>
            <Select
              label="Rol"
              value={value}
              onChange={(e) => actualizarRol(params.row.id, e.target.value as RolUsuario)}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="finanzas">Finanzas</MenuItem>
              <MenuItem value="operaciones">Operaciones</MenuItem>
            </Select>
          </FormControl>
        );
      },
    },
    {
      field: "activo",
      headerName: "Activo",
      flex: 0.5,
      renderCell: (params) => (
        <Switch
          checked={!!params.row.activo}
          onChange={(e) => actualizarActivo(params.row.id, e.target.checked)}
          color="primary"
        />
      ),
    },
  ];

  return (
    <MountedGuard>
      <ProtectedLayout>
        <PanelLayout>
          <ProtectedRoute roles={["admin"]}>
            <Container maxWidth="lg" sx={{ px: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight={700}>
                  Gestión de Usuarios
                </Typography>
                <Button variant="outlined" disabled>
                  Nuevo usuario
                </Button>
              </Stack>

              <Paper elevation={3} sx={{ p: 2, borderRadius: 3 }}>
                <Box sx={{ height: 520, width: "100%" }}>
                  <DataGrid
                    rows={usuarios}
                    columns={columnas}
                    loading={cargando}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                    checkboxSelection
                    disableRowSelectionOnClick
                  />
                </Box>
              </Paper>
            </Container>
          </ProtectedRoute>
        </PanelLayout>
      </ProtectedLayout>
    </MountedGuard>
  );
}
