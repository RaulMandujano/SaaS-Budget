"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { auth, db } from "@/lib/firebase";

interface LoginCardProps {
  title?: string;
  subtitle?: string;
  elevation?: number;
  onSuccess?: () => void;
}

export default function LoginCard({
  title = "Panel Smart Budget",
  subtitle = "Sistema Corporativo de Control Operativo",
  elevation = 10,
  onSuccess,
}: LoginCardProps) {
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
      const cred = await signInWithEmailAndPassword(auth, correo, password);
      const ref = doc(db, "usuarios", cred.user.uid);
      const snap = await getDoc(ref);
      const data = snap.data();

      if (!data || data.activo === false) {
        await signOut(auth);
        setError("Tu cuenta no está activa o no existe en el sistema.");
        return;
      }

      onSuccess?.();
      router.push("/dashboard");
    } catch {
      setError("Credenciales incorrectas");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Paper
      elevation={elevation}
      sx={{
        p: { xs: 3, md: 5 },
        borderRadius: 4,
        width: "100%",
        background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))",
      }}
    >
      <Box textAlign="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
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
          {cargando ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Iniciar Sesión"}
        </Button>
      </Box>
    </Paper>
  );
}
