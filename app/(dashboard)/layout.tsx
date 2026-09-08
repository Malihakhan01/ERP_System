import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <main className="flex-1 w-full min-w-0 flex flex-col">
        {children}
      </main>
    </AppShell>
  );
}
