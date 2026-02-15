"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { DemoGuide } from "@/components/demo-guide";
import { SystemHealthStrip } from "@/components/system-health-strip";
import { CrisisModeProvider } from "@/components/crisis-mode";
import { SidebarContext } from "@/components/sidebar-context";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isLandingPage = pathname === "/" || pathname === "/login";

  // Persist sidebar state
  useEffect(() => {
    const saved = localStorage.getItem("tb-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("tb-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  if (isLandingPage) {
    return (
      <CrisisModeProvider>
        <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
          {children}
        </SidebarContext.Provider>
      </CrisisModeProvider>
    );
  }

  return (
    <CrisisModeProvider>
      <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
        <Navbar />
        <main
          className={`transition-all duration-200 ${collapsed ? "md:pl-[60px]" : "md:pl-56"
            } pt-12 md:pt-0 min-h-screen`}
        >
          <SystemHealthStrip />
          {children}
        </main>
        <DemoGuide />
      </SidebarContext.Provider>
    </CrisisModeProvider>
  );
}
