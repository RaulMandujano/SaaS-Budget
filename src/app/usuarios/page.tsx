"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import {
  Alert,
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
import UsuarioDialog, { UsuarioFormData } from "@/components/usuarios/UsuarioDialog";
import { db } from "@/lib/firebase";
import { RolUsuario } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import { registrarEventoAuditoria } from "@/lib/auditoria/registrarEvento";

// ✅ IMPORT CORRECTO PARA CLOUD FUNCTIONS
import { getFunctions, httpsCallable } from "firebase/functions";

interface UsuarioRow {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario | "";
  activo: boolean;
}

const ROLES_PERMITIDOS_USUARIOS: RolUsuario[] = [
  "admin",
  "finanzas",
  "operaciones",
  "superadmin",
];

export default function UsuariosPage() {
  const { usuario, rol: rolContexto, cargando: cargandoRol, empresaActualId } = useAuth();

  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [dialogVersion, setDialogVersion] = useState(0);

  const [crearCargando, setCrearCargando] = useState(false);
  const [crearError, setCrearError] = useState("");
  const [crearSuccess, setCrearSuccess] = useState("");

  const rolEsAdmin = rolContexto === "admin";
  const rolEstaCargando = cargandoRol;
  const puedeEditar = !rolEstaCargando && rolEsAdmin;

  const botonNuevoVisible = rolEsAdmin;
  const botonNuevoDeshabilitado = !rolEsAdmin || rolEstaCargando;

  const abrirDialogo = () => {
    setDialogVersion((prev) => prev + 1);
    setCrearError("");
    setCrearSuccess("");
    setDialogAbierto(true);
  };

  const cerrarDialogo = () => {
    setDialogAbierto(false);
    setCrearError("");
  };

  const cargarUsuarios = async () => {
    setCargando(true);
    try {
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
    } catch (error) {
      console.error("No se pudieron cargar los usuarios", error);
      setUsuarios([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const actualizarRol = async (id: string, nuevoRol: RolUsuario) => {
    await updateDoc(doc(db, "usuarios", id), { rol: nuevoRol });

    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, rol: nuevoRol } : u))
    );

    await registrarEventoAuditoria({
      usuarioId: usuario?.uid,
      usuarioNombre: usuario?.displayName ?? "Usuario",
      usuarioEmail: usuario?.email ?? "",
      rol: rolContexto ?? null,
      modulo: "usuarios",
      accion: "editar",
      descripcion: `Actualizó el rol del usuario ${
        usuarios.find((u) => u.id === id)?.nombre || id
      } a ${nuevoRol}`,
    });
  };

  const actualizarActivo = async (id: string, activo: boolean) => {
    await updateDoc(doc(db, "usuarios", id), { activo });

    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, activo } : u))
    );

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

  // ✅ FUNCIÓN PARA CREAR USUARIO VÍA CLOUD FUNCTION
  const handleCrearUsuario = async (data: UsuarioFormData) => {
    setCrearError("");
    setCrearSuccess("");
    if (!empresaActualId) {
      setCrearError("Selecciona una empresa antes de crear usuarios.");
      return;
    }
    setCrearCargando(true);

    try {
      const functions = getFunctions();
      const callable = httpsCallable(functions, "createUserAdmin");

      const result = await callable({
        nombre: data.nombre,
        email: data.email,
        password: data.password,
        rol: data.rol,
        empresaId: empresaActualId,
      });

      const payload = result.data as {
        success?: boolean;
        uid?: string;
        error?: string;
      };

      if (payload.success) {
        setCrearSuccess("Usuario creado correctamente");
        await cargarUsuarios();
        cerrarDialogo();
      } else {
        setCrearError(payload.error ?? "No se pudo crear el usuario");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el usuario";
      setCrearError(message);
    } finally {
      setCrearCargando(false);
    }
  };

  // =======================
  // 📌 COLUMNAS DE LA TABLA
  // =======================
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
              onChange={(e) =>
                actualizarRol(params.row.id, e.target.value as RolUsuario)
              }
              disabled={!puedeEditar}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="finanzas">Finanzas</MenuItem>
              <MenuItem value="operaciones">Operaciones</MenuItem>
              <MenuItem value="superadmin">Super Admin</MenuItem>
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
          disabled={!puedeEditar}
        />
      ),
    },
  ];

  return (
    <MountedGuard>
      <ProtectedLayout>
        <PanelLayout>
          <ProtectedRoute roles={ROLES_PERMITIDOS_USUARIOS}>
            <Container maxWidth="lg" sx={{ px: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight={700}>
                  Gestión de Usuarios
                </Typography>

                {botonNuevoVisible && (
                  <Button
                    variant="outlined"
                    disabled={botonNuevoDeshabilitado}
                    onClick={abrirDialogo}
                  >
                    Nuevo usuario
                  </Button>
                )}
              </Stack>

              {crearSuccess && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setCrearSuccess("")}>
                  {crearSuccess}
                </Alert>
              )}

              <Paper elevation={3} sx={{ p: 2, borderRadius: 3 }}>
                <Box sx={{ height: 520, width: "100%" }}>
                  <DataGrid
                    rows={usuarios}
                    columns={columnas}
                    loading={cargando}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{
                      pagination: { paginationModel: { pageSize: 10, page: 0 } },
                    }}
                    checkboxSelection
                    disableRowSelectionOnClick
                  />
                </Box>
              </Paper>

              <UsuarioDialog
                key={dialogVersion}
                open={dialogAbierto}
                onClose={cerrarDialogo}
                onSave={handleCrearUsuario}
                loading={crearCargando}
                error={crearError}
              />
            </Container>
          </ProtectedRoute>
        </PanelLayout>
      </ProtectedLayout>
    </MountedGuard>
  );
}
