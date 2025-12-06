"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SaveIcon from "@mui/icons-material/Save";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import MountedGuard from "@/components/system/MountedGuard";
import {
  configuracionDefault,
  ConfiguracionGeneral,
  guardarConfiguracion,
  subirLogoConfiguracion,
  useConfiguracion,
} from "@/lib/configuracion/configuracion";

const opcionesMoneda = ["MXN", "USD", "PEN", "EUR"];

export default function ConfiguracionPage() {
  const { configuracion, cargandoConfiguracion } = useConfiguracion();
  const [form, setForm] = useState<ConfiguracionGeneral>(configuracionDefault);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const inputFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setForm(configuracion);
  }, [configuracion]);

  const fechaActualizacion = useMemo(() => {
    if (!form.fechaActualizacion) return "Sin registro";
    return form.fechaActualizacion.toLocaleString("es-MX");
  }, [form.fechaActualizacion]);

  const seleccionarLogo = () => {
    inputFileRef.current?.click();
  };

  const manejarArchivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    setSubiendoLogo(true);
    setMensaje("");
    setError("");
    try {
      const url = await subirLogoConfiguracion(archivo);
      setForm((prev) => ({ ...prev, logoUrl: url }));
      setMensaje("Logo actualizado correctamente.");
    } catch (err) {
      console.error(err);
      setError("No se pudo subir el logo. Intenta de nuevo.");
    } finally {
      setSubiendoLogo(false);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje("");
    setError("");
    try {
      await guardarConfiguracion({
        nombreEmpresa: form.nombreEmpresa.trim() || configuracionDefault.nombreEmpresa,
        logoUrl: form.logoUrl || "",
        moneda: form.moneda || configuracionDefault.moneda,
        impuestosActivo: form.impuestosActivo,
        porcentajeImpuesto: Number(form.porcentajeImpuesto) || 0,
        modoMantenimiento: form.modoMantenimiento,
      });
      setMensaje("Configuración guardada y sincronizada.");
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar la configuración. Revisa tu conexión e inténtalo nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const contenido = (
    <Box component="form" onSubmit={(e) => e.preventDefault()}>
      <Stack spacing={2.5} mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Configuración general
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define los parámetros globales del sistema: identidad, moneda, impuestos y modo mantenimiento.
          </Typography>
        </Box>
        {(mensaje || error) && (
          <Alert severity={mensaje ? "success" : "error"}>{mensaje || error}</Alert>
        )}
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>
                  Identidad
                </Typography>
                <TextField
                  label="Nombre de la empresa"
                  value={form.nombreEmpresa}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombreEmpresa: e.target.value }))}
                  fullWidth
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 140,
                      height: 140,
                      borderRadius: 3,
                      border: "1px dashed #cbd5e1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      bgcolor: "#f8fafc",
                    }}
                  >
                    {form.logoUrl ? (
                      <Box
                        component="img"
                        src={form.logoUrl}
                        alt="Logo"
                        sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <Typography color="text.secondary">Sin logo</Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Logo corporativo
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      Carga un archivo JPG o PNG. Se mostrará en el menú lateral.
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <input
                        ref={inputFileRef}
                        type="file"
                        accept="image/*"
                        onChange={manejarArchivo}
                        style={{ display: "none" }}
                      />
                      <Button
                        variant="outlined"
                        startIcon={<CloudUploadIcon />}
                        onClick={seleccionarLogo}
                        disabled={subiendoLogo}
                      >
                        Subir logo
                      </Button>
                      {subiendoLogo && <LinearProgress sx={{ width: 160 }} />}
                    </Stack>
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={3} sx={{ borderRadius: 3, mt: 3 }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>
                  Finanzas
                </Typography>
                <TextField
                  select
                  label="Moneda de referencia"
                  value={form.moneda}
                  onChange={(e) => setForm((prev) => ({ ...prev, moneda: e.target.value }))}
                  fullWidth
                >
                  {opcionesMoneda.map((moneda) => (
                    <MenuItem key={moneda} value={moneda}>
                      {moneda}
                    </MenuItem>
                  ))}
                </TextField>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.impuestosActivo}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, impuestosActivo: e.target.checked }))
                      }
                    />
                  }
                  label="Aplicar impuestos a los cálculos"
                />
                <TextField
                  type="number"
                  label="Porcentaje de impuesto"
                  value={form.porcentajeImpuesto}
                  disabled={!form.impuestosActivo}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      porcentajeImpuesto: Number(e.target.value),
                    }))
                  }
                  InputProps={{ inputProps: { min: 0, max: 100, step: 0.1 } }}
                  helperText="Se aplicará sobre los montos de gastos y reportes."
                  fullWidth
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>
                  Estado del sistema
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.modoMantenimiento}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, modoMantenimiento: e.target.checked }))
                      }
                    />
                  }
                  label="Modo mantenimiento"
                />
                <Typography variant="body2" color="text.secondary">
                  Cuando está activo, solo el administrador puede acceder. El resto verá un mensaje de
                  mantenimiento.
                </Typography>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Última actualización
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {fechaActualizacion}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={guardar}
                  disabled={guardando}
                  size="large"
                >
                  {guardando ? "Guardando..." : "Guardar configuración"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  if (cargandoConfiguracion) {
    return (
      <MountedGuard>
        <ProtectedLayout>
          <PanelLayout>
            <Box p={4}>Cargando configuración...</Box>
          </PanelLayout>
        </ProtectedLayout>
      </MountedGuard>
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
