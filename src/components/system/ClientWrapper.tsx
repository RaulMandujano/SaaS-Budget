"use client";

import dynamic from "next/dynamic";

const ClientShell = dynamic(() => import("./ClientShell"), { ssr: false });

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
