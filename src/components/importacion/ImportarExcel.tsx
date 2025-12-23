"use client";

import { ChangeEvent, useCallback, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { normalizarFechaExcel } from "@/lib/fechas";
import { canonizarEncabezadoExcel, parsearMontoExcel } from "@/lib/importacion/excel";

export interface RegistroExcel {
  fila: number;
  datos: Record<string, unknown>;
}

interface RegistroProcesado extends RegistroExcel {
  id: string;
  error?: string;
}

interface Props {
  titulo: string;
  columnasEsperadas: string[];
  columnasOpcionales?: string[];
  onImport: (registros: RegistroExcel[]) => void;
  onCancel?: () => void;
}

const etiquetasColumnas: Record<string, string> = {
  fecha: "Fecha",
  concepto: "Concepto",
  descripcion: "Descripción",
  categoria: "Categoría",
  monto: "Monto",
  sucursal: "Sucursal",
  autobus: "Autobús",
};

export default function ImportarExcel({
  columnasEsperadas,
  columnasOpcionales = [],
  titulo,
  onImport,
  onCancel,
}: Props) {
  const [archivoNombre, setArchivoNombre] = useState("");
  const [registros, setRegistros] = useState<RegistroProcesado[]>([]);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [leyenda, setLeyenda] = useState("");
  const [procesando, setProcesando] = useState(false);

  const totalErrores = useMemo(() => registros.filter((registro) => registro.error).length, [registros]);
  const totalValidos = useMemo(() => registros.filter((registro) => !registro.error).length, [registros]);

  const etiquetaColumna = useCallback(
    (columna: string, incluirOpcional: boolean) => {
      const etiqueta = etiquetasColumnas[columna] ?? columna;
      if (incluirOpcional && columnasOpcionales.includes(columna)) {
        return `${etiqueta} (opcional)`;
      }
      return etiqueta;
    },
    [columnasOpcionales],
  );

  const valorParaVista = (valor: unknown): string => {
    if (valor === undefined || valor === null) {
      return "";
    }
    if (valor instanceof Date) {
      return valor.toISOString().split("T")[0];
    }
    return String(valor);
  };

  const previewColumns: GridColDef[] = useMemo(() => {
    const columnas: GridColDef[] = [
      { field: "fila", headerName: "Fila", width: 90 },
      ...columnasEsperadas.map((columna) => ({
        field: columna,
        headerName: etiquetaColumna(columna, true),
        flex: 1,
        minWidth: 140,
      })),
      {
        field: "estado",
        headerName: "Estado",
        width: 180,
        renderCell: (params) => (
          <Typography
            variant="caption"
            sx={{ color: params.row.error ? "error.main" : "success.main", fontWeight: 600 }}
          >
            {params.row.error ? `Error: ${params.row.error}` : "Listo"}
          </Typography>
        ),
      },
    ];
    return columnas;
  }, [columnasEsperadas, etiquetaColumna]);

  const columnasTexto = useMemo(
    () => columnasEsperadas.map((columna) => etiquetaColumna(columna, true)).join(", "),
    [columnasEsperadas, etiquetaColumna],
  );

  const previewRows = useMemo(
    () =>
      registros.map((registro) => {
        const filaVista = columnasEsperadas.reduce<Record<string, string>>((acumulador, columna) => {
          acumulador[columna] = valorParaVista(registro.datos[columna]);
          return acumulador;
        }, {});
        return {
          id: registro.id,
          fila: registro.fila,
          estado: registro.error ? "error" : "listo",
          error: registro.error,
          ...filaVista,
        };
      }),
    [registros, columnasEsperadas],
  );

  const handleArchivoSeleccionado = async (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    event.target.value = "";
    setArchivoNombre(archivo.name);
    setErrorGeneral("");
    setLeyenda("");
    setProcesando(true);
    try {
      const buffer = await archivo.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "array" });
      if (!workbook.SheetNames.length) {
        throw new Error("El archivo debe contener al menos una hoja.");
      }
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const filasRaw = XLSX.utils.sheet_to_json<Array<unknown>>(hoja, { header: 1, defval: "" });
      if (!filasRaw.length) {
        throw new Error("La hoja seleccionada está vacía.");
      }
      const encabezadoRaw = filasRaw[0] as Array<unknown>;
      const encabezadosCanon = encabezadoRaw.map((celda) => canonizarEncabezadoExcel(celda));

      const columnasObligatorias = columnasEsperadas.filter(
        (columna) => !columnasOpcionales.includes(columna),
      );
      const faltantes = columnasObligatorias.filter((columna) => !encabezadosCanon.includes(columna));
      if (faltantes.length) {
        throw new Error(
          `Faltan columnas obligatorias: ${faltantes.join(", ")}.`,
        );
      }

      const mapaIndices = new Map<string, number>();
      encabezadosCanon.forEach((valor, indice) => {
        if (columnasEsperadas.includes(valor) && !mapaIndices.has(valor)) {
          mapaIndices.set(valor, indice);
        }
      });

      const registrosProcesados: RegistroProcesado[] = filasRaw.slice(1).map((filaRaw, indice) => {
        const filaNumero = indice + 2;
        const datosFila: Record<string, unknown> = {};
        columnasEsperadas.forEach((columna) => {
          const posicion = mapaIndices.get(columna.toLowerCase());
          const valorCelda = typeof posicion === "number" ? filaRaw[posicion] : undefined;
          datosFila[columna] = valorCelda ?? "";
        });
        const erroresFila: string[] = [];

        columnasEsperadas.forEach((columna) => {
          const valor = datosFila[columna];
          const esOpcional = columnasOpcionales.includes(columna);
          const estaVacio =
            valor === undefined ||
            valor === null ||
            (typeof valor === "string" && !valor.trim());
          if (estaVacio) {
            if (!esOpcional) {
              erroresFila.push(`${etiquetasColumnas[columna] ?? columna} vacío`);
            }
            return;
          }
          if (columna === "fecha") {
            const fechaNormalizada = normalizarFechaExcel(valor);
            if (!fechaNormalizada) {
              erroresFila.push("Fecha inválida");
            }
          }
          if (columna === "monto") {
            const monto = parsearMontoExcel(valor);
            if (monto === null) {
              erroresFila.push("Monto inválido");
            }
          }
        });

        return {
          id: `${filaNumero}`,
          fila: filaNumero,
          datos: datosFila,
          error: erroresFila.length ? erroresFila.join(", ") : undefined,
        };
      });

      setRegistros(registrosProcesados);
      setLeyenda(`${registrosProcesados.length} fila(s) procesada(s).`);
    } catch (error) {
      setRegistros([]);
      setLeyenda("");
      setErrorGeneral(
        error instanceof Error
          ? error.message
          : "No se pudo procesar el archivo. Revisa que sea .xlsx válido.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmar = () => {
    const validos = registros
      .filter((registro) => !registro.error)
      .map(({ fila, datos }) => ({ fila, datos }));
    if (!validos.length) {
      setErrorGeneral("No hay filas válidas para importar.");
      return;
    }
    onImport(validos);
  };

  const handleCancelar = () => {
    setArchivoNombre("");
    setRegistros([]);
    setErrorGeneral("");
    setLeyenda("");
    onCancel?.();
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6">{titulo}</Typography>
      <Typography variant="body2" color="text.secondary">
        El archivo debe incluir estas columnas en cualquier orden: {columnasTexto}.
        Las filas incompletas o con errores no se importarán.
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Button variant="outlined" component="label" disabled={procesando}>
          Seleccionar archivo .xlsx
          <input
            hidden
            type="file"
            accept=".xlsx"
            onChange={handleArchivoSeleccionado}
          />
        </Button>
        {archivoNombre && (
          <Typography variant="body2" sx={{ alignSelf: "center" }}>
            {archivoNombre}
          </Typography>
        )}
      </Stack>
      {errorGeneral && <Alert severity="error">{errorGeneral}</Alert>}
      {leyenda && <Alert severity="info">{leyenda}</Alert>}
      {registros.length > 0 && (
        <Paper elevation={1} sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ height: 360 }}>
            <DataGrid
              rows={previewRows}
              columns={previewColumns}
              pageSizeOptions={[5, 10]}
              disableRowSelectionOnClick
            />
          </Box>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Typography variant="body2">
                Total validas: {totalValidos} / Total con errores: {totalErrores}
              </Typography>
            </Stack>
          </Box>
        </Paper>
      )}
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={handleConfirmar} disabled={procesando || totalValidos === 0}>
          Confirmar Importación
        </Button>
        <Button variant="outlined" color="inherit" onClick={handleCancelar}>
          Cancelar
        </Button>
      </Stack>
    </Stack>
  );
}
