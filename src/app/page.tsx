"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import DevicesRoundedIcon from "@mui/icons-material/DevicesRounded";
import BuildCircleRoundedIcon from "@mui/icons-material/BuildCircleRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import LoginCard from "@/components/auth/LoginCard";
import Navbar from "@/components/landing/Navbar";
import styles from "./page.module.css";

const featureCards = [
  {
    icon: <Inventory2RoundedIcon fontSize="large" />,
    title: "Gestión de Inventario",
    description: "Controla stock, SKU, ubicaciones y consumo operativo con visibilidad en tiempo real.",
  },
  {
    icon: <DevicesRoundedIcon fontSize="large" />,
    title: "Control de Dispositivos",
    description: "Administra dispositivos, asignaciones y disponibilidad desde una sola vista.",
  },
  {
    icon: <BuildCircleRoundedIcon fontSize="large" />,
    title: "Mantenimiento Inteligente",
    description: "Crea tickets, registra piezas usadas y conserva historial completo por intervención.",
  },
  {
    icon: <TrendingUpRoundedIcon fontSize="large" />,
    title: "Control de Gastos y Operaciones",
    description: "Conecta logística, operación y costos para tomar decisiones con contexto real.",
  },
];

const steps = [
  {
    number: "01",
    title: "Registra tus activos",
    description: "Carga inventario, dispositivos y estructura operativa sin depender de hojas sueltas.",
  },
  {
    number: "02",
    title: "Asigna y opera",
    description: "Distribuye recursos, controla uso y ejecuta procesos desde módulos especializados.",
  },
  {
    number: "03",
    title: "Controla y optimiza",
    description: "Monitorea mantenimiento, actividad y métricas para escalar con disciplina operativa.",
  },
];

const moduleCards = [
  {
    title: "Transportación",
    icon: <LocalShippingRoundedIcon fontSize="large" />,
    description:
      "Opera sucursales, autobuses, viajes, choferes, gastos, rutas y reportes desde una sola plataforma.",
  },
  {
    title: "IT",
    icon: <HubRoundedIcon fontSize="large" />,
    description:
      "Controla inventario técnico, dispositivos, tickets de mantenimiento y actividad global con trazabilidad.",
  },
];

export default function HomePage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      heroTimeline
        .from(`.${styles.heroChip}`, {
          y: 24,
          opacity: 0,
          duration: 0.8,
        })
        .from(
          `.${styles.heroTitle}`,
          {
            y: 50,
            opacity: 0,
            duration: 1,
          },
          "-=0.45",
        )
        .from(
          `.${styles.heroSubtitle}`,
          {
            y: 30,
            opacity: 0,
            duration: 0.9,
          },
          "-=0.55",
        )
        .from(
          `.${styles.heroButton}`,
          {
            scale: 0.88,
            opacity: 0,
            duration: 0.7,
            stagger: 0.12,
          },
          "-=0.35",
        )
        .from(
          `.${styles.mockupCard}`,
          {
            y: 30,
            opacity: 0,
            scale: 0.96,
            duration: 0.9,
          },
          "-=0.75",
        );

      gsap.from(`.${styles.featureCard}`, {
        scrollTrigger: {
          trigger: "#features",
          start: "top 74%",
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.16,
        ease: "power3.out",
      });

      gsap.from(`.${styles.stepCard}`, {
        scrollTrigger: {
          trigger: "#como-funciona",
          start: "top 74%",
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.18,
        ease: "power3.out",
      });

      gsap.from(`.${styles.moduleCard}`, {
        scrollTrigger: {
          trigger: "#modulos",
          start: "top 74%",
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.18,
        ease: "power3.out",
      });

      gsap.to(`.${styles.heroImage}`, {
        y: 50,
        ease: "none",
        scrollTrigger: {
          trigger: `.${styles.heroSection}`,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, pageRef);

    return () => {
      ctx.revert();
    };
  }, []);

  useEffect(() => {
    if (!loginOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      gsap.fromTo(
        ".landing-login-modal",
        {
          y: -50,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
        },
      );
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [loginOpen]);

  return (
    <Box ref={pageRef} className={styles.pageShell}>
      <Navbar onLoginClick={() => setLoginOpen(true)} />

      <main>
        <section className={styles.heroSection}>
          <Container maxWidth="lg">
            <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={3}>
                  <Chip
                    label="Sistema modular para operación y control"
                    className={styles.heroChip}
                  />
                  <Typography variant="h1" className={styles.heroTitle}>
                    Controla tu operación. Escala tu negocio.
                  </Typography>
                  <Typography variant="h6" className={styles.heroSubtitle}>
                    Gestiona activos, logística y operaciones en un solo sistema inteligente.
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Button
                      variant="contained"
                      size="large"
                      className={`${styles.primaryButton} ${styles.heroButton}`}
                      onClick={() => setLoginOpen(true)}
                    >
                      Comenzar
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      href="#features"
                      className={`${styles.secondaryButton} ${styles.heroButton}`}
                    >
                      Ver funcionalidades
                    </Button>
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box className={styles.mockupWrap}>
                  <Box className={styles.mockupGlow} />
                  <Box className={`${styles.mockupCard} ${styles.heroImage}`}>
                    <Box className={styles.mockupTopBar}>
                      <span />
                      <span />
                      <span />
                    </Box>
                    <Box className={styles.mockupGrid}>
                      <Box className={styles.mockupMetricPrimary}>
                        <Typography variant="overline">Operación activa</Typography>
                        <Typography variant="h3" fontWeight={800}>
                          98%
                        </Typography>
                        <Typography variant="body2">Disponibilidad consolidada</Typography>
                      </Box>
                      <Box className={styles.mockupMetric}>
                        <DevicesRoundedIcon />
                        <Typography fontWeight={700}>Dispositivos</Typography>
                        <Typography variant="body2">Control por estado y uso</Typography>
                      </Box>
                      <Box className={styles.mockupMetric}>
                        <BuildCircleRoundedIcon />
                        <Typography fontWeight={700}>Tickets</Typography>
                        <Typography variant="body2">Historial y actividad</Typography>
                      </Box>
                      <Box className={styles.mockupMetricWide}>
                        <Box className={styles.mockupChart}>
                          <span />
                          <span />
                          <span />
                          <span />
                          <span />
                        </Box>
                        <Typography variant="body2">
                          Monitorea inventario, mantenimiento y operación desde un solo panel.
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </section>

        <section id="features" className={styles.section}>
          <Container maxWidth="lg">
            <Stack spacing={2} className={styles.sectionHeading}>
              <Typography variant="overline" className={styles.sectionEyebrow}>
                Features
              </Typography>
              <Typography variant="h3" className={styles.sectionTitle}>
                Diseñado para operación real, no para hojas sueltas
              </Typography>
            </Stack>
            <Grid container spacing={3}>
              {featureCards.map((feature) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={feature.title}>
                  <Box className={styles.featureCard}>
                    <Box className={styles.featureIcon}>{feature.icon}</Box>
                    <Typography variant="h6" fontWeight={800}>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary">{feature.description}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Container>
        </section>

        <section id="como-funciona" className={styles.sectionAlt}>
          <Container maxWidth="lg">
            <Stack spacing={2} className={styles.sectionHeading}>
              <Typography variant="overline" className={styles.sectionEyebrow}>
                Cómo funciona
              </Typography>
              <Typography variant="h3" className={styles.sectionTitle}>
                Un flujo simple para equipos que operan en serio
              </Typography>
            </Stack>
            <Grid container spacing={3}>
              {steps.map((step) => (
                <Grid size={{ xs: 12, md: 4 }} key={step.number}>
                  <Box className={styles.stepCard}>
                    <Typography className={styles.stepNumber}>{step.number}</Typography>
                    <Typography variant="h6" fontWeight={800}>
                      {step.title}
                    </Typography>
                    <Typography color="text.secondary">{step.description}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Container>
        </section>

        <section id="modulos" className={styles.section}>
          <Container maxWidth="lg">
            <Stack spacing={2} className={styles.sectionHeading}>
              <Typography variant="overline" className={styles.sectionEyebrow}>
                Módulos
              </Typography>
              <Typography variant="h3" className={styles.sectionTitle}>
                Un sistema modular que crece con tu operación
              </Typography>
              <Typography className={styles.sectionDescription}>
                Activa solo lo que necesitas hoy y expande el sistema conforme evolucionan tus
                procesos.
              </Typography>
            </Stack>
            <Grid container spacing={3}>
              {moduleCards.map((moduleCard) => (
                <Grid size={{ xs: 12, md: 6 }} key={moduleCard.title}>
                  <Box className={styles.moduleCard}>
                    <Box className={styles.moduleIcon}>{moduleCard.icon}</Box>
                    <Typography variant="h5" fontWeight={800}>
                      {moduleCard.title}
                    </Typography>
                    <Typography color="text.secondary">{moduleCard.description}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Container>
        </section>
      </main>

      <footer className={styles.footer}>
        <Container maxWidth="lg">
          <Box className={styles.footerContent}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Smart Budget
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Plataforma modular para logística, IT y control operativo.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} className={styles.footerLinks}>
              <a href="#features">Features</a>
              <a href="#como-funciona">Cómo funciona</a>
              <a href="#modulos">Módulos</a>
            </Stack>
          </Box>
          <Typography variant="body2" color="text.secondary" className={styles.footerCopy}>
            © 2026 Smart Budget. Todos los derechos reservados.
          </Typography>
        </Container>
      </footer>

      <Dialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: "rgba(15, 23, 42, 0.42)",
              backdropFilter: "blur(14px)",
            },
          },
          paper: {
            className: "landing-login-modal",
            sx: {
              width: "min(960px, calc(100vw - 24px))",
              maxWidth: "960px",
              borderRadius: 4,
              overflow: "hidden",
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(18px)",
              boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)",
            },
          },
        }}
      >
        <DialogContent sx={{ p: { xs: 1.5, md: 2 }, lineHeight: "normal" }}>
          <Box className={styles.loginModalInner}>
            <LoginCard
              elevation={0}
              onSuccess={() => setLoginOpen(false)}
              subtitle="Ingresa a tu cuenta para continuar con tu operación."
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
