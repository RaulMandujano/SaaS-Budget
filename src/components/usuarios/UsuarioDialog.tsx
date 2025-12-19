"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { RolUsuario } from "@/context/AuthContext";

const ROLES_USUARIO: RolUsuario[] = ["admin", "finanzas", "operaciones"];

export interface UsuarioFormData {
  nombre: string;
  email: string;
  rol: RolUsuario;
  password: string;
}

interface Props {
  open: boolean;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (data: UsuarioFormData) => void;
}

const INITIAL_FORM: UsuarioFormData = {
  nombre: "",
  email: "",
  rol: "admin",
  password: "",
};

export default function UsuarioDialog({ open, onClose, onSave, loading, error }: Props) {
  const [form, setForm] = useState<UsuarioFormData>(INITIAL_FORM);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM);
      setErrores({});
    }
  }, [open]);

  const handleChange = <K extends keyof UsuarioFormData>(field: K, value: UsuarioFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validar = () => {
    const nuevos: Record<string, string> = {};
    if (!form.nombre.trim()) nuevos.nombre = "El nombre es obligatorio";
    if (!form.email.trim()) {
      nuevos.email = "El correo es obligatorio";
    }
    if (!form.password.trim()) nuevos.password = "La contraseña es obligatoria";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSave = () => {
    if (!validar()) return;
    onSave({
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      rol: form.rol,
      password: form.password.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nuevo usuario</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nombre completo"
            value={form.nombre}
            onChange={(e) => handleChange("nombre", e.target.value)}
            error={Boolean(errores.nombre)}
            helperText={errores.nombre}
            fullWidth
          />
          <TextField
            label="Correo"
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            error={Boolean(errores.email)}
            helperText={errores.email}
            fullWidth
          />
          <TextField
            select
            label="Rol"
            value={form.rol}
            onChange={(e) => handleChange("rol", e.target.value as RolUsuario)}
            fullWidth
          >
            {ROLES_USUARIO.map((rol) => (
              <MenuItem key={rol} value={rol}>
                {rol.charAt(0).toUpperCase() + rol.slice(1)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            error={Boolean(errores.password)}
            helperText={errores.password}
            fullWidth
          />
          {error && (
            <Alert severity="error" sx={{ px: 0 }}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          Crear Usuario
        </Button>
      </DialogActions>
    </Dialog>
  );
}
