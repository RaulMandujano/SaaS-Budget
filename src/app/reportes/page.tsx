"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import PanelLayout from "@/components/layout/PanelLayout";
import { obtenerGastos, Gasto } from "@/lib/firestore/gastos";
import { obtenerSucursales, Sucursal } from "@/lib/firestore/sucursales";
import { obtenerAutobuses, Autobus } from "@/lib/firestore/autobuses";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import MountedGuard from "@/components/system/MountedGuard";
import type { WorkBook } from "xlsx";
import { aplicarImpuesto, formatearMoneda, useConfiguracion } from "@/lib/configuracion/configuracion";

const categorias = ["Todas", "Combustible", "Mantenimiento", "Peajes", "Sueldos", "Otros"];

export default function ReportesPage() {
  const router = useRouter();
  const { configuracion } = useConfiguracion();
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [autobuses, setAutobuses] = useState<Autobus[]>([]);

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [sucursalFiltro, setSucursalFiltro] = useState("todas");
  const [autobusFiltro, setAutobusFiltro] = useState("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");

  const [aplicarFiltros, setAplicarFiltros] = useState(false);
  const [correoDestino, setCorreoDestino] = useState("");
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const nombreEmpresa = configuracion.nombreEmpresa || "Estrella Polar";

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
    const [listaGastos, listaSucursales, listaAutobuses] = await Promise.all([
      obtenerGastos(),
      obtenerSucursales(),
      obtenerAutobuses(),
    ]);
    setGastos(listaGastos);
    setSucursales(listaSucursales);
    setAutobuses(listaAutobuses);
  };

  const gastosFiltrados = useMemo(() => {
    if (!aplicarFiltros) return gastos;
    return gastos.filter((g) => {
      if (fechaInicio) {
        const inicio = new Date(`${fechaInicio}T00:00:00`);
        if (g.fecha && g.fecha < inicio) return false;
      }
      if (fechaFin) {
        const fin = new Date(`${fechaFin}T23:59:59`);
        if (g.fecha && g.fecha > fin) return false;
      }
      if (sucursalFiltro !== "todas" && g.sucursalId !== sucursalFiltro) return false;
      if (autobusFiltro !== "todos" && g.autobusId !== autobusFiltro) return false;
      if (categoriaFiltro !== "Todas" && g.tipo !== categoriaFiltro) return false;
      return true;
    });
  }, [gastos, fechaInicio, fechaFin, sucursalFiltro, autobusFiltro, categoriaFiltro, aplicarFiltros]);

  const columnas: GridColDef[] = [
    { field: "fecha", headerName: "Fecha", flex: 1, minWidth: 130 },
    { field: "concepto", headerName: "Concepto", flex: 1.2, minWidth: 160 },
    { field: "categoria", headerName: "Categoría", flex: 1, minWidth: 140 },
    { field: "monto", headerName: `Monto (${configuracion.moneda || "MXN"})`, flex: 1, minWidth: 140 },
    { field: "sucursal", headerName: "Sucursal", flex: 1, minWidth: 160 },
    { field: "autobus", headerName: "Autobús", flex: 1, minWidth: 140 },
  ];

  const filas = useMemo(() => {
    return gastosFiltrados.map((gasto) => ({
      id: gasto.id,
      fecha: gasto.fecha ? gasto.fecha.toLocaleDateString("es-MX") : "Sin fecha",
      concepto: gasto.descripcion,
      categoria: gasto.tipo,
      monto: formatearMoneda(aplicarImpuesto(gasto.monto, configuracion), configuracion),
      sucursal: sucursales.find((s) => s.id === gasto.sucursalId)?.nombre ?? "Sucursal no encontrada",
      autobus: autobuses.find((a) => a.id === gasto.autobusId)?.placa ?? "Autobús no encontrado",
    }));
  }, [gastosFiltrados, sucursales, autobuses, configuracion]);

  const aplicarFiltrosHandler = () => {
    setAplicarFiltros(true);
  };

  const exportarExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = filas.map((row) => ({
      Fecha: row.fecha,
      Concepto: row.concepto,
      Categoría: row.categoria,
      Monto: row.monto,
      Sucursal: row.sucursal,
      Autobús: row.autobus,
    }));
    const hoja = XLSX.utils.json_to_sheet(rows);
    const libro: WorkBook = { SheetNames: ["Reporte"], Sheets: { Reporte: hoja } };
    const buffer = XLSX.write(libro, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte-gastos.xlsx";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const crearDocumentoPdf = async () => {
    const jsPDF = (await import("jspdf")).default;
    await import("jspdf-autotable");
    const docPdf = new jsPDF({ unit: "pt", format: "a4" });
    const fechaGeneracion = new Date();
    const fechaTexto = fechaGeneracion.toLocaleDateString("es-MX");

    const totalGeneral = gastosFiltrados.reduce(
      (acc, gasto) => acc + aplicarImpuesto(Number(gasto.monto) || 0, configuracion),
      0,
    );
    const subtotales = gastosFiltrados.reduce<Record<string, number>>((acc, gasto) => {
      const clave = gasto.tipo || "Otros";
      const montoConImpuesto = aplicarImpuesto(Number(gasto.monto) || 0, configuracion);
      acc[clave] = (acc[clave] || 0) + montoConImpuesto;
      return acc;
    }, {});

    const addLogo = async () => {
      try {
        const origenLogo = configuracion.logoUrl || "/logo.png";
        const respuesta = await fetch(origenLogo);
        if (!respuesta.ok) return;
        const blob = await respuesta.blob();
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        (docPdf as any).addImage(base64, "PNG", 40, 30, 80, 60);
      } catch {
        // Si no hay logo o falla la carga, continuamos sin interrumpir
      }
    };

    await addLogo();

    (docPdf as any).setFontSize(16);
    (docPdf as any).text(
      `Reporte de Gastos - ${nombreEmpresa}`,
      docPdf.internal.pageSize.getWidth() / 2,
      50,
      {
        align: "center",
      },
    );
    (docPdf as any).setFontSize(11);
    (docPdf as any).text("Sistema Corporativo de Control Operativo", docPdf.internal.pageSize.getWidth() / 2, 70, {
      align: "center",
    });
    (docPdf as any).setFontSize(10);
    (docPdf as any).text(`Fecha de generación: ${fechaTexto}`, docPdf.internal.pageSize.getWidth() - 180, 30);

    const body = filas.map((row) => [
      row.fecha,
      row.concepto,
      row.categoria,
      row.monto,
      row.sucursal,
      row.autobus,
    ]);
    (docPdf as any).autoTable({
      head: [["Fecha", "Concepto", "Categoría", "Monto", "Sucursal", "Autobús"]],
      body,
      startY: 100,
      styles: { fontSize: 9, halign: "left" },
      headStyles: { fillColor: [0, 102, 204], textColor: 255, halign: "center" },
      columnStyles: { 3: { halign: "right" } },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.5,
    });

    let currentY = (docPdf as any).lastAutoTable.finalY + 20;
    (docPdf as any).setFontSize(12);
    (docPdf as any).text(
      `Total General: ${formatearMoneda(totalGeneral, configuracion)}`,
      40,
      currentY,
    );

    currentY += 18;
    (docPdf as any).setFontSize(11);
    (docPdf as any).text("Subtotales por categoría:", 40, currentY);

    currentY += 14;
    (docPdf as any).setFontSize(10);
    Object.keys(subtotales).forEach((cat) => {
      const valor = subtotales[cat];
      (docPdf as any).text(`${cat}: ${formatearMoneda(valor, configuracion)}`, 60, currentY);
      currentY += 12;
    });

    const yyyy = fechaGeneracion.getFullYear();
    const mm = String(fechaGeneracion.getMonth() + 1).padStart(2, "0");
    const dd = String(fechaGeneracion.getDate()).padStart(2, "0");
    const nombreArchivo = `reporte-gastos-${yyyy}-${mm}-${dd}.pdf`;

    return { docPdf, nombreArchivo };
  };

  const exportarPdf = async () => {
    const { docPdf, nombreArchivo } = await crearDocumentoPdf();
    docPdf.save(nombreArchivo);
  };

  const bufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  };

  const enviarReporteCorreo = async () => {
    if (!correoDestino) {
      alert("Ingresa un correo destino.");
      return;
    }
    setEnviandoCorreo(true);
    try {
      const { docPdf, nombreArchivo } = await crearDocumentoPdf();
      const arrayBuffer = docPdf.output("arraybuffer");
      const base64 = bufferToBase64(arrayBuffer);

      const urlFuncion =
        process.env.NEXT_PUBLIC_FUNCTIONS_URL ||
        "https://us-central1-saas-budget-b3c59.cloudfunctions.net/enviarReporte";

      const respuesta = await fetch(urlFuncion, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailDestino: correoDestino,
          base64,
          nombreArchivo,
          usuario: auth.currentUser?.email || null,
        }),
      });

      if (!respuesta.ok) {
        throw new Error("No se pudo enviar el reporte");
      }

      const json = await respuesta.json();
      if (!json?.success) {
        throw new Error("No se pudo enviar el reporte");
      }

      alert("Reporte enviado por correo correctamente");
    } catch (error) {
      console.error(error);
      alert("No se pudo enviar el reporte. Intenta nuevamente.");
    } finally {
      setEnviandoCorreo(false);
    }
  };

  const contenido = (
    <Box>
      <Stack spacing={2} mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Reportes de Gastos
        </Typography>
        <Paper sx={{ p: 2, borderRadius: 3 }} elevation={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Fecha inicio"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              fullWidth
            />
            <TextField
              label="Fecha fin"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Sucursal</InputLabel>
              <Select
                label="Sucursal"
                value={sucursalFiltro}
                onChange={(e) => setSucursalFiltro(e.target.value)}
              >
                <MenuItem value="todas">Todas</MenuItem>
                {sucursales.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Autobús</InputLabel>
              <Select
                label="Autobús"
                value={autobusFiltro}
                onChange={(e) => setAutobusFiltro(e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                {autobuses.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.placa || a.numeroUnidad || "Autobús"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Categoría</InputLabel>
              <Select
                label="Categoría"
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
              >
                {categorias.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={aplicarFiltrosHandler}>
              Aplicar filtros
            </Button>
          </Stack>
        </Paper>

        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
            <Typography variant="h6">Resultados</Typography>
            <TextField
              label="Correo destino"
              placeholder="gerencia@empresa.com"
              value={correoDestino}
              onChange={(e) => setCorreoDestino(e.target.value)}
              size="small"
            />
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={exportarExcel}>
              Exportar a Excel
            </Button>
            <Button variant="outlined" onClick={exportarPdf}>
              Exportar a PDF
            </Button>
            <Button variant="contained" onClick={enviarReporteCorreo} disabled={enviandoCorreo}>
              {enviandoCorreo ? "Enviando..." : "Enviar reporte por correo"}
            </Button>
          </Stack>
        </Stack>

        <Paper elevation={3} sx={{ borderRadius: 3, p: 2 }}>
          <Box sx={{ height: 520, width: "100%" }}>
            <DataGrid
              rows={filas}
              columns={columnas}
              pageSizeOptions={[5, 10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            />
          </Box>
        </Paper>
      </Stack>
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
