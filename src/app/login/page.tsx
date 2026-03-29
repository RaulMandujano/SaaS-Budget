"use client";

import { Box, Container } from "@mui/material";
import LoginCard from "@/components/auth/LoginCard";

export default function LoginPage() {
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
        <LoginCard />
      </Container>
    </Box>
  );
}
