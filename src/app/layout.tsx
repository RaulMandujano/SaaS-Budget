import type { Metadata } from "next";
import ClientWrapper from "@/components/system/ClientWrapper";

export const metadata: Metadata = {
  title: "Panel Estrella Polar",
  description: "Panel de administración Estrella Polar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
