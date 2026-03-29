"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Box } from "@mui/material";

export default function ITAssetsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/it/dispositivos");
  }, [router]);

  return <Box p={4}>Redirigiendo...</Box>;
}
