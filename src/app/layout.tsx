import type { Metadata } from "next";
import { Provider } from "@/components/ui/provider";

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
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
