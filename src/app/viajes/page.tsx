"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import MountedGuard from "@/components/system/MountedGuard";
import { useAuth } from "@/context/AuthContext";
import { registrarEventoAuditoria } from "@/lib/auditoria/registrarEvento";
import { obtenerRutas, Ruta } from "@/lib/firestore/rutas";
import { obtenerAutobuses, Autobus } from "@/lib/firestore/autobuses";
import { obtenerSucursales, Sucursal } from "@/lib/firestore/sucursales";
import {
  obtenerViajesPorMes,
  Viaje,
  crearViaje,
  actualizarViaje,
  eliminarViaje,
} from "@/lib/firestore/viajes";
import ViajeDialog, { ViajeFormData } from "@/components/viajes/ViajeDialog";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const estadoEtiqueta: Record<Viaje["estado"], { label: string; color: "primary" | "success" | "warning" }> = {
  programado: { label: "Programado", color: "primary" },
  en_curso: { label: "En curso", color: "warning" },
  completado: { label: "Completado", color: "success" },
};

export default function ViajesPage() {
  const router = useRouter();
  const { usuario, rol, empresaActualId } = useAuth();
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [mesReferencia, setMesReferencia] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [autobuses, setAutobuses] = useState<Autobus[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [viajeEditando, setViajeEditando] = useState<Viaje | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);

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

  const cargarDatos = useCallback(async () => {
    if (!empresaActualId) {
      setCargandoDatos(false);
      setErrorCarga("Selecciona una empresa para visualizar los viajes.");
      setRutas([]);
      setAutobuses([]);
      setSucursales([]);
      setViajes([]);
      return;
    }

    try {
      setCargandoDatos(true);
      setErrorCarga("");
      const empresaId = empresaActualId || undefined;
      const mes = mesReferencia.getMonth() + 1;
      const año = mesReferencia.getFullYear();
      const [listaRutas, listaAutobuses, listaSucursales] = await Promise.all([
        obtenerRutas(empresaId),
        obtenerAutobuses(empresaId),
        obtenerSucursales(empresaId),
      ]);
      setRutas(listaRutas);
      setAutobuses(listaAutobuses);
      setSucursales(listaSucursales);

      try {
        const listaViajes = await obtenerViajesPorMes(mes, año, empresaId);
        setViajes(listaViajes);
      } catch (viajeError) {
        console.error("Error al cargar viajes por mes", viajeError);
        setViajes([]);
        setErrorCarga(
          (prev) =>
            prev ||
            `No se pudieron cargar los viajes del mes seleccionado. Revisa que el índice exista (${viajeError instanceof Error ? viajeError.message : "error desconocido"}).`,
        );
      }
    } catch (error) {
      console.error("Error al cargar datos de viajes", error);
      setErrorCarga("No se pudieron cargar rutas/autobuses/sucursales. Intenta nuevamente.");
      setRutas([]);
      setAutobuses([]);
      setSucursales([]);
      setViajes([]);
    } finally {
      setCargandoDatos(false);
    }
  }, [empresaActualId, mesReferencia]);

  useEffect(() => {
    if (!cargandoAuth) {
      cargarDatos();
    }
  }, [cargandoAuth, cargarDatos]);

  const sucursalMap = useMemo(() => {
    const mapa: Record<string, string> = {};
    sucursales.forEach((s) => {
      mapa[s.id] = s.nombre;
    });
    return mapa;
  }, [sucursales]);

  const rutaMap = useMemo(() => {
    const mapa: Record<string, Ruta> = {};
    rutas.forEach((ruta) => {
      mapa[ruta.id] = ruta;
    });
    return mapa;
  }, [rutas]);

  const autobusesMap = useMemo(() => {
    const mapa: Record<string, Autobus> = {};
    autobuses.forEach((autobus) => {
      mapa[autobus.id] = autobus;
    });
    return mapa;
  }, [autobuses]);

  const obtenerEtiquetaRuta = useCallback(
    (ruta: Ruta) => {
      const origen = sucursalMap[ruta.sucursalOrigenId] ?? "Sucursal";
      const destino = sucursalMap[ruta.sucursalDestinoId] ?? "Sucursal";
      return `${origen} → ${destino}`;
    },
    [sucursalMap],
  );

  const viajesPorDia = useMemo(() => {
    const mapa: Record<string, Viaje[]> = {};
    viajes.forEach((viaje) => {
      const clave = viaje.fecha.toISOString().split("T")[0];
      if (!mapa[clave]) {
        mapa[clave] = [];
      }
      mapa[clave].push(viaje);
    });
    return mapa;
  }, [viajes]);

  const consumoTotal = useMemo(() => {
    return viajes.reduce((suma, viaje) => {
      const ruta = rutaMap[viaje.rutaId];
      return suma + (ruta?.consumoGasolinaAprox ?? 0);
    }, 0);
  }, [viajes, rutaMap]);

  const distanciaTotal = useMemo(() => {
    return viajes.reduce((suma, viaje) => {
      const ruta = rutaMap[viaje.rutaId];
      return suma + (ruta?.distanciaKm ?? 0);
    }, 0);
  }, [viajes, rutaMap]);

  const diasCalendario = useMemo(() => {
    const year = mesReferencia.getFullYear();
    const month = mesReferencia.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDias = new Date(year, month + 1, 0).getDate();
    const celdas: Array<Date | null> = [];
    for (let i = 0; i < firstDay; i++) {
      celdas.push(null);
    }
    for (let dia = 1; dia <= totalDias; dia++) {
      celdas.push(new Date(year, month, dia));
    }
    return celdas;
  }, [mesReferencia]);

  const avanzarMes = () => {
    setMesReferencia((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const retrocederMes = () => {
    setMesReferencia((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const abrirCrear = () => {
    if (!empresaActualId) return;
    setViajeEditando(null);
    setFechaSeleccionada(new Date());
    setDialogAbierto(true);
  };

  const abrirCrearPorDia = (fecha: Date) => {
    if (!empresaActualId) return;
    setFechaSeleccionada(fecha);
    setViajeEditando(null);
    setDialogAbierto(true);
  };

  const cerrarDialogo = () => {
    setDialogAbierto(false);
    setViajeEditando(null);
    setFechaSeleccionada(null);
  };

  const guardarViaje = async (data: ViajeFormData) => {
    if (!empresaActualId) {
      alert("Selecciona una empresa para registrar el viaje.");
      return;
    }
    const fecha = new Date(data.fecha);
    try {
    const rutaSeleccionada = rutaMap[data.rutaId];
    const rutaEtiqueta = rutaSeleccionada ? obtenerEtiquetaRuta(rutaSeleccionada) : "Ruta";
      const autob = autobusesMap[data.autobusId];
      const descripcionBase = `${rutaEtiqueta} / ${autob?.placa || autob?.numeroUnidad || "Autobús"}`;
      if (viajeEditando) {
        await actualizarViaje(viajeEditando.id, {
          fecha,
          rutaId: data.rutaId,
          autobusId: data.autobusId,
          estado: data.estado,
        });
        await registrarEventoAuditoria({
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.displayName ?? "Usuario",
          usuarioEmail: usuario?.email ?? "",
          rol: rol ?? null,
          modulo: "viajes",
          accion: "editar",
          descripcion: `Editó el viaje ${descripcionBase}`,
        });
      } else {
        await crearViaje(
          {
            fecha,
            rutaId: data.rutaId,
            autobusId: data.autobusId,
            estado: data.estado,
          },
          empresaActualId,
        );
        await registrarEventoAuditoria({
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.displayName ?? "Usuario",
          usuarioEmail: usuario?.email ?? "",
          rol: rol ?? null,
          modulo: "viajes",
          accion: "crear",
          descripcion: `Creó el viaje ${descripcionBase}`,
        });
      }
      await cargarDatos();
      cerrarDialogo();
    } catch (error) {
      console.error("No se pudo guardar el viaje", error);
      alert("No se pudo guardar el viaje.");
    }
  };

  const eliminarRegistro = async (viaje: Viaje) => {
    const confirmar =
      typeof window !== "undefined" ? window.confirm("¿Eliminar este viaje?") : false;
    if (!confirmar) return;
    try {
      await eliminarViaje(viaje.id);
    const rutaSeleccionada = rutaMap[viaje.rutaId];
    const descripcionRuta = rutaSeleccionada ? obtenerEtiquetaRuta(rutaSeleccionada) : "Ruta";
    await registrarEventoAuditoria({
        usuarioId: usuario?.uid,
        usuarioNombre: usuario?.displayName ?? "Usuario",
        usuarioEmail: usuario?.email ?? "",
        rol: rol ?? null,
        modulo: "viajes",
        accion: "eliminar",
        descripcion: `Eliminó el viaje ${descripcionRuta}`,
      });
      await cargarDatos();
    } catch (error) {
      console.error("No se pudo eliminar el viaje", error);
      alert("No se pudo eliminar el viaje.");
    }
  };

  const dialogKey = `${viajeEditando?.id ?? "crear"}-${fechaSeleccionada?.toISOString().split("T")[0] ?? "sinFecha"}-${dialogAbierto}`;

  const pagina = (
    <Box className="space-y-4">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Viajes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Calendario mensual con viajes programados y consumos estimados.
          </Typography>
        </Box>
        <Button variant="contained" onClick={abrirCrear} disabled={!empresaActualId}>
          Nuevo viaje
        </Button>
      </Stack>

      <Paper elevation={3} sx={{ borderRadius: 3, p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2}>
            <Button onClick={retrocederMes} disabled={cargandoDatos}>
              Mes anterior
            </Button>
            <Button onClick={avanzarMes} disabled={cargandoDatos}>
              Siguiente mes
            </Button>
          </Stack>
          <Typography variant="h6" fontWeight={600}>
            {new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(
              mesReferencia,
            )}
          </Typography>
          <Stack direction="row" spacing={2} textAlign="right">
            <Typography variant="subtitle2" color="text.secondary">
              {viajes.length} viajes
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              {distanciaTotal.toFixed(1)} km
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              {consumoTotal.toFixed(1)} L estimados
            </Typography>
          </Stack>
        </Stack>
        <Divider sx={{ my: 2 }} />
        {errorCarga && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorCarga}
          </Alert>
        )}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gap: 1,
          }}
        >
          {diasSemana.map((dia) => (
            <Box key={dia} sx={{ textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                {dia}
              </Typography>
            </Box>
          ))}
          {diasCalendario.map((dia, index) => {
            const esHoy =
              dia && dia.toDateString() === new Date().toDateString()
                ? true
                : false;
            const claveDia = dia?.toISOString().split("T")[0];
            const viajesDelDia = claveDia ? viajesPorDia[claveDia] ?? [] : [];
            return (
              <Box
                key={`dia-${index}`}
                sx={{
                  minHeight: 140,
                  borderRadius: 2,
                  border: "1px solid #e5e7eb",
                  backgroundColor: dia ? "#fff" : "#f9fafb",
                  cursor: dia ? "pointer" : "default",
                  position: "relative",
                  overflow: "hidden",
                  p: 1,
                  "&:hover": {
                    borderColor: dia ? "#2563eb" : undefined,
                  },
                }}
                onClick={() => {
                  if (dia) abrirCrearPorDia(dia);
                }}
              >
                {dia && (
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={esHoy ? "primary" : "text.primary"}
                  >
                    {dia.getDate()}
                  </Typography>
                )}
                <Box mt={1} className="space-y-1">
                  {viajesDelDia.map((viaje) => {
                    const ruta = rutaMap[viaje.rutaId];
                    const autob = autobusesMap[viaje.autobusId];
                    const etiquetaEstado = estadoEtiqueta[viaje.estado];
                    const rutaTexto = ruta ? obtenerEtiquetaRuta(ruta) : "Ruta no encontrada";
                    return (
                      <Paper
                        key={viaje.id}
                        elevation={0}
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          border: "1px solid #e5e7eb",
                          backgroundColor: "#f8fafc",
                        }}
                      >
                        <Stack spacing={0.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" fontWeight={600}>
                              {rutaTexto}
                            </Typography>
                            <Chip
                              label={etiquetaEstado.label}
                              size="small"
                              color={etiquetaEstado.color}
                            />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {autob?.placa || autob?.numeroUnidad || "Autobús"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Distancia {ruta?.distanciaKm.toFixed(1) ?? "0"} km ·
                            {ruta ? ` ${ruta.consumoGasolinaAprox.toFixed(1)} L aprox.` : ""}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="text"
                              onClick={(event) => {
                                event.stopPropagation();
                                setViajeEditando(viaje);
                                setFechaSeleccionada(viaje.fecha);
                                setDialogAbierto(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="text"
                              onClick={(event) => {
                                event.stopPropagation();
                                eliminarRegistro(viaje);
                              }}
                            >
                              Eliminar
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {dialogAbierto && (
        <ViajeDialog
          key={dialogKey}
          open={dialogAbierto}
          onClose={cerrarDialogo}
          onSave={guardarViaje}
          initialData={viajeEditando}
          rutas={rutas}
          autobuses={autobuses}
          fechaInicial={fechaSeleccionada}
          obtenerEtiquetaRuta={obtenerEtiquetaRuta}
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
        <PanelLayout>{pagina}</PanelLayout>
      </ProtectedLayout>
    </MountedGuard>
  );
}
