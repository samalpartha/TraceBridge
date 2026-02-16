"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderSearch,
  MapPin,
  Shield,
  Plus,
  Menu,
  Radio,
  HelpCircle,
  Network,
  ChevronsLeft,
  ChevronsRight,
  X,
  Building2,
  DollarSign,
  AlertTriangle,
  Keyboard,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/sidebar-context";
import { useCrisisMode } from "@/components/crisis-mode";
import { useRouter } from "next/navigation";

/* ─── TraceBridge Logo ─── */
function TraceBridgeLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="TraceBridge"
      width={size}
      height={size}
      className={cn("dark:invert contrast-125", className)}
      unoptimized
    />
  );
}

const navItems = [
  { href: "/dashboard", label: "Command Center", icon: LayoutDashboard },
  { href: "/caseworker", label: "Verify", icon: Shield },
  { href: "/cases", label: "Cases", icon: FolderSearch },
  { href: "/graph", label: "Identity Graph", icon: Network },
  { href: "/live", label: "Live Feed", icon: Radio },
  { href: "/map", label: "Intel Map", icon: MapPin },
  { href: "/architecture", label: "Architecture", icon: Network },
  { href: "/partners", label: "Partners", icon: Building2 },
  { href: "/pricing", label: "Pricing", icon: DollarSign },
  { href: "/help", label: "Help", icon: HelpCircle },
];

export function Navbar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const { crisisMode, setCrisisMode } = useCrisisMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close mobile nav on route change by adjusting state during render.
  // This is more efficient than useEffect as it avoids an extra render/paint cycle.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* ─── Mobile top bar ─── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-12 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl px-4 md:hidden">
        <Link href="/" className="flex items-center">
          <TraceBridgeLogo />
        </Link>
        <button
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ─── Mobile slide-out overlay ─── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed top-12 left-0 bottom-0 z-50 w-64 border-r border-slate-200 bg-white/90 backdrop-blur-xl transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="flex flex-col h-full px-3 py-4">
          <div className="flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="border-t pt-3">
            <Link href="/cases/new">
              <Button size="sm" className="w-full gap-2 bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4" />
                Report Missing Person
              </Button>
            </Link>
          </div>
        </nav>
      </aside>

      {/* ─── Desktop sidebar ─── */}
      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 z-40 hidden md:flex flex-col border-r border-slate-700/50 bg-slate-900 text-slate-200 transition-all duration-220",
          collapsed ? "w-[60px]" : "w-56"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center justify-center border-b border-slate-700/50 shrink-0",
            collapsed ? "h-16 px-1" : "px-4 py-5 h-24"
          )}
        >
          <Link
            href="/"
            className={cn(
              "flex items-center",
              collapsed && "justify-center"
            )}
          >
            <TraceBridgeLogo size={collapsed ? 32 : 64} className={collapsed ? "h-8 w-8" : "h-16 w-16"} />
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname?.startsWith(item.href + "/");

            const linkContent = (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center rounded-lg transition-all duration-200",
                    collapsed
                      ? "justify-center h-9 w-9 mx-auto"
                      : "gap-3 px-3 py-2 text-sm",
                    isActive
                      ? "bg-red-500/20 text-red-400 font-medium"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  )}
                >
                  <Icon className={cn("shrink-0", collapsed ? "h-4.5 w-4.5" : "h-4 w-4")} />
                  {!collapsed && <span>{item.label}</span>}
                </div>
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
          {/* Navigation link blocks continue... */}
        </nav>

        {/* Report CTA */}
        <div className={cn("border-t border-slate-700/50 p-2", collapsed && "px-1.5")}>
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link href="/cases/new">
                  <Button
                    size="sm"
                    className="w-full h-9 p-0 bg-red-600 hover:bg-red-700"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Report Missing Person
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link href="/cases/new" className="w-full">
              <Button
                size="sm"
                className="w-full gap-2 bg-red-600 hover:bg-red-700 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Report Missing
              </Button>
            </Link>
          )}
        </div>

        {/* Crisis mode toggle + keyboard hint */}
        <div className={cn("border-t border-slate-700/50 p-2 space-y-1", collapsed && "px-1.5")}>
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCrisisMode(!crisisMode)}
                  className={cn(
                    "flex items-center justify-center h-8 w-8 mx-auto rounded-lg transition-colors",
                    crisisMode
                      ? "bg-red-600 text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <AlertTriangle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {crisisMode ? "Exit Crisis Mode" : "Crisis Mode"} (X)
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => setCrisisMode(!crisisMode)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs w-full transition-colors",
                crisisMode
                  ? "bg-red-600 text-white font-semibold"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{crisisMode ? "Exit Crisis Mode" : "Crisis Mode"}</span>
              <kbd className="ml-auto rounded border bg-muted/50 px-1 py-0.5 font-mono text-[9px]">X</kbd>
            </button>
          )}
          {!collapsed && (
            <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] text-slate-500">
              <Keyboard className="h-3 w-3" />
              <span>Press <kbd className="rounded border border-slate-600 bg-slate-800 px-1 py-0.5 font-mono">?</kbd> for shortcuts</span>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <div className="border-t border-slate-700/50 p-2">
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push("/login")}
                  className="flex items-center justify-center h-8 w-8 mx-auto rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Sign Out
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs w-full text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <div className="border-t border-slate-700/50 p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex items-center rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors w-full",
              collapsed ? "justify-center h-8 w-8 mx-auto" : "gap-2 px-3 py-2"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-3.5 w-3.5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
