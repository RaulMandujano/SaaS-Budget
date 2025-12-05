"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await signInWithEmailAndPassword(auth, correo, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError("Credenciales incorrectas");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        background: "linear-gradient(135deg, #1e3c72, #2a5298)",
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={10} sx={{ p: 5, borderRadius: 4 }}>
          <Box textAlign="center" mb={3}>
            <Typography variant="h5" fontWeight="bold">
              Panel Estrella Polar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sistema Corporativo de Control Operativo
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Correo"
              type="email"
              margin="normal"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />

            <TextField
              fullWidth
              label="Contraseña"
              type="password"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 3,
                py: 1.5,
                background: "linear-gradient(90deg, #1e3c72, #2a5298)",
              }}
              disabled={cargando}
            >
              {cargando ? (
                <CircularProgress size={24} sx={{ color: "white" }} />
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
