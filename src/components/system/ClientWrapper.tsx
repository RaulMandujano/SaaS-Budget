"use client";

import ClientShell from "./ClientShell";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
