"use client";

import { useEffect, useRef } from "react";
import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from "@mui/material";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./Navbar.module.css";

interface NavbarProps {
  onLoginClick: () => void;
}

export default function Navbar({ onLoginClick }: NavbarProps) {
  const navbarRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        start: 48,
        end: 99999,
        onEnter: () => {
          gsap.to(navbarRef.current, {
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            boxShadow: "0 18px 50px rgba(15, 23, 42, 0.08)",
            duration: 0.25,
            ease: "power2.out",
          });
          gsap.to(toolbarRef.current, {
            minHeight: 66,
            duration: 0.25,
            ease: "power2.out",
          });
        },
        onLeaveBack: () => {
          gsap.to(navbarRef.current, {
            backgroundColor: "rgba(248, 251, 255, 0.76)",
            boxShadow: "0 0 0 rgba(15, 23, 42, 0)",
            duration: 0.25,
            ease: "power2.out",
          });
          gsap.to(toolbarRef.current, {
            minHeight: 78,
            duration: 0.25,
            ease: "power2.out",
          });
        },
      });
    });

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <AppBar ref={navbarRef} position="sticky" elevation={0} className={styles.navbar}>
      <Container maxWidth="lg">
        <Toolbar ref={toolbarRef} disableGutters className={styles.toolbar}>
          <Typography variant="h6" className={styles.brand}>
            Smart Budget
          </Typography>

          <Stack direction="row" spacing={3} className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#modulos">Módulos</a>
          </Stack>

          <Box className={styles.spacer} />

          <Button variant="contained" onClick={onLoginClick} className={styles.loginButton}>
            Login
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
