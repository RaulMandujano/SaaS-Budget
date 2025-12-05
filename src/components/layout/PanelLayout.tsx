"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
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

const drawerWidth = 260;

interface PanelLayoutProps {
  children: React.ReactNode;
}

export default function PanelLayout({ children }: PanelLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = useMemo(
    () => [
      { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
      { label: "Sucursales", path: "/sucursales", icon: <LocationCityIcon /> },
      { label: "Autobuses", path: "/autobuses", icon: <DirectionsBusIcon /> },
      { label: "Choferes", path: "/choferes", icon: <PeopleIcon /> },
      { label: "Gastos", path: "/gastos", icon: <ReceiptLongIcon /> },
      { label: "Rutas", path: "/rutas", icon: <AltRouteIcon /> },
      { label: "Reportes", path: "/reportes", icon: <AssessmentIcon /> },
    ],
    [],
  );

  const drawer = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#F5F7FB",
      }}
    >
      <Box sx={{ px: 3, py: 3 }}>
        <Typography variant="h6" fontWeight={800} color="#1f2937">
          Estrella Polar
        </Typography>
        <Typography variant="body2" color="#6b7280">
          Panel de administración
        </Typography>
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
            Panel Estrella Polar
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }} aria-label="menu lateral">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box", borderRight: "1px solid #e5e7eb" },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box", borderRight: "1px solid #e5e7eb" },
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
        {children}
      </Box>
    </Box>
  );
}
