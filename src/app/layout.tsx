import MountedGuard from "@/components/system/MountedGuard";
import ClientWrapper from "@/components/system/ClientWrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>
        <ClientWrapper>
          <MountedGuard>
            {children}
          </MountedGuard>
        </ClientWrapper>
      </body>
    </html>
  );
}
