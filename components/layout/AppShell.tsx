"use client";

import * as React from "react";
import { Sidebar, SidebarContext } from "./Sidebar";
import { RoleAccessGuard } from "@/components/auth/RoleAccessGuard";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <SidebarContext.Provider
      value={{ collapsed, mobileOpen, setCollapsed, setMobileOpen }}
    >
      <div className="min-h-screen bg-[var(--color-erp-bg)] flex flex-row w-full min-w-0">
        {/* Sidebar (sticky top-0 h-screen shrink-0 on desktop) */}
        <Sidebar />

        {/* Main content column — flex-1 min-w-0 w-0 takes exactly 100% of remaining viewport width */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen w-0">
          <RoleAccessGuard>
            {children}
          </RoleAccessGuard>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
