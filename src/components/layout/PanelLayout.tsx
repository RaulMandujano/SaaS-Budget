"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import AssessmentIcon from "@mui/icons-material/Assessment";
import SettingsIcon from "@mui/icons-material/Settings";
import GroupIcon from "@mui/icons-material/Group";
import ProtectedRoute from "@/components/system/ProtectedRoute";
import { useAuth, RolUsuario } from "@/context/AuthContext";
import { useConfiguracion } from "@/lib/configuracion/configuracion";
import { Empresa, obtenerEmpresas } from "@/lib/firestore/empresas";

const drawerWidth = 260;

interface PanelLayoutProps {
  children: ReactNode;
}

export default function PanelLayout({ children }: PanelLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { rol, empresaActualId, cambiarEmpresaActual } = useAuth();
  const { configuracion, cargandoConfiguracion } = useConfiguracion();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  useEffect(() => {
    const cargarEmpresas = async () => {
      if (rol !== "superadmin") {
        setEmpresas([]);
        return;
      }
      try {
        const lista = await obtenerEmpresas();
        setEmpresas(lista);
        if (!empresaActualId && lista[0]) {
          cambiarEmpresaActual(lista[0].id);
        }
      } catch (error) {
        console.error("No se pudieron cargar las empresas", error);
      }
    };
    cargarEmpresas();
  }, [rol, empresaActualId, cambiarEmpresaActual]);

  const menuItems = useMemo(() => {
    if (!rol) {
      return [{ label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> }];
    }
    if (rol === "superadmin") {
      return [
        { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
        { label: "Empresas", path: "/empresas", icon: <GroupIcon /> },
        { label: "Sucursales", path: "/sucursales", icon: <LocationCityIcon /> },
        { label: "Autobuses", path: "/autobuses", icon: <DirectionsBusIcon /> },
        { label: "Choferes", path: "/choferes", icon: <PeopleIcon /> },
        { label: "Gastos", path: "/gastos", icon: <ReceiptLongIcon /> },
        { label: "Rutas", path: "/rutas", icon: <AltRouteIcon /> },
        { label: "Reportes", path: "/reportes", icon: <AssessmentIcon /> },
        { label: "Auditoría", path: "/auditoria", icon: <AssessmentIcon /> },
        { label: "Usuarios", path: "/usuarios", icon: <GroupIcon /> },
        { label: "Configuración", path: "/configuracion", icon: <SettingsIcon /> },
      ];
    }
    if (rol === "finanzas") {
      return [
        { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
        { label: "Gastos", path: "/gastos", icon: <ReceiptLongIcon /> },
        { label: "Reportes", path: "/reportes", icon: <AssessmentIcon /> },
      ];
    }
    if (rol === "operaciones") {
      return [
        { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
        { label: "Sucursales", path: "/sucursales", icon: <LocationCityIcon /> },
        { label: "Autobuses", path: "/autobuses", icon: <DirectionsBusIcon /> },
        { label: "Choferes", path: "/choferes", icon: <PeopleIcon /> },
      ];
    }
    return [
      { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
      { label: "Sucursales", path: "/sucursales", icon: <LocationCityIcon /> },
      { label: "Autobuses", path: "/autobuses", icon: <DirectionsBusIcon /> },
      { label: "Choferes", path: "/choferes", icon: <PeopleIcon /> },
      { label: "Gastos", path: "/gastos", icon: <ReceiptLongIcon /> },
      { label: "Rutas", path: "/rutas", icon: <AltRouteIcon /> },
      { label: "Reportes", path: "/reportes", icon: <AssessmentIcon /> },
      { label: "Auditoría", path: "/auditoria", icon: <AssessmentIcon /> },
      { label: "Usuarios", path: "/usuarios", icon: <GroupIcon /> },
      { label: "Configuración", path: "/configuracion", icon: <SettingsIcon /> },
    ];
  }, [rol]);

  const rolesPermitidosPorRuta = (path: string): RolUsuario[] => {
    if (!rol) {
      return path.startsWith("/dashboard")
        ? ([] as RolUsuario[])
        : ["admin", "finanzas", "operaciones", "superadmin"];
    }
    if (rol === "superadmin") return ["superadmin", "admin", "finanzas", "operaciones"];
    if (path.startsWith("/empresas")) return ["superadmin"];
    if (path.startsWith("/usuarios")) return ["admin", "superadmin"];
    if (path.startsWith("/reportes")) return ["admin", "finanzas", "superadmin"];
    if (path.startsWith("/gastos")) return ["admin", "finanzas", "superadmin"];
    if (path.startsWith("/auditoria")) return ["admin", "superadmin"];
    if (path.startsWith("/sucursales")) return ["admin", "operaciones", "superadmin"];
    if (path.startsWith("/autobuses")) return ["admin", "operaciones", "superadmin"];
    if (path.startsWith("/choferes")) return ["admin", "operaciones", "superadmin"];
    if (path.startsWith("/configuracion")) return ["admin", "superadmin"];
    return ["admin", "finanzas", "operaciones", "superadmin"];
  };

  const rolesPermitidos = rolesPermitidosPorRuta(pathname || "");
  const enMantenimiento = configuracion.modoMantenimiento && rol !== "admin" && rol !== "superadmin";

  const drawer = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#F5F7FB",
      }}
    >
      <Box sx={{ px: 3, py: 3, display: "flex", alignItems: "center", gap: 1.5 }}>
        {configuracion.logoUrl ? (
          <Avatar
            src={configuracion.logoUrl}
            alt={configuracion.nombreEmpresa}
            sx={{ width: 44, height: 44, border: "2px solid #e5e7eb" }}
          />
        ) : (
          <Avatar sx={{ width: 44, height: 44, bgcolor: "#2563eb", fontWeight: 700 }}>
            {configuracion.nombreEmpresa?.[0]?.toUpperCase() || "E"}
          </Avatar>
        )}
        <Box>
          <Typography variant="h6" fontWeight={800} color="#1f2937" noWrap>
            {configuracion.nombreEmpresa || "Estrella Polar"}
          </Typography>
          <Typography variant="body2" color="#6b7280">
            Panel de administración
          </Typography>
        </Box>
      </Box>
      <Divider />
      <List sx={{ px: 2, pt: 1 }}>
        {menuItems.map((item) => {
          const selected = pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <ListItemButton
              key={item.path}
              component={Link}
              href={item.path}
              selected={selected}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: selected ? "#2563eb" : "#111827",
                "&.Mui-selected": {
                  backgroundColor: "rgba(37, 99, 235, 0.08)",
                },
                "&.Mui-selected:hover": {
                  backgroundColor: "rgba(37, 99, 235, 0.12)",
                },
              }}
              onClick={() => setMobileOpen(false)}
            >
              <ListItemIcon
                sx={{
                  color: selected ? "#2563eb" : "#6b7280",
                  minWidth: 42,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  const contenidoPrincipal = (
    <ProtectedRoute roles={rolesPermitidos}>
      {cargandoConfiguracion ? (
        <Box
          sx={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <CircularProgress size={32} />
          <Typography>Cargando configuración...</Typography>
        </Box>
      ) : enMantenimiento ? (
        <Box
          sx={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              background: "white",
              p: { xs: 3, md: 4 },
              borderRadius: 3,
              boxShadow: "0px 10px 30px rgba(0,0,0,0.06)",
              maxWidth: 520,
              textAlign: "center",
            }}
          >
            <Typography variant="h5" fontWeight={800} gutterBottom color="text.primary">
              El sistema está en mantenimiento
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Intenta más tarde. Solo el administrador puede acceder mientras dure el mantenimiento.
            </Typography>
          </Box>
        </Box>
      ) : (
        children
      )}
    </ProtectedRoute>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#F3F4F6" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: "white",
          color: "#111827",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" fontWeight={700}>
            Panel {configuracion.nombreEmpresa || "Estrella Polar"}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {rol === "superadmin" && empresas.length > 0 && (
            <Select
              size="small"
              value={empresaActualId || empresas[0]?.id || ""}
              onChange={(e) => cambiarEmpresaActual(e.target.value)}
              sx={{ minWidth: 180, mr: 2 }}
            >
              {empresas.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.nombre}
                </MenuItem>
              ))}
            </Select>
          )}
          {configuracion.modoMantenimiento && (
            <Chip label="Mantenimiento activo" color="warning" size="small" />
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="menu lateral"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid #e5e7eb",
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid #e5e7eb",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2.5, md: 3.5 },
          mt: 8,
          width: { md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        {contenidoPrincipal}
      </Box>
    </Box>
  );
}
