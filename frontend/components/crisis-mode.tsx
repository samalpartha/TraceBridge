"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Keyboard, X } from "lucide-react";

/* ─── Crisis Mode Context ─── */
type CrisisModeContextType = {
  crisisMode: boolean;
  setCrisisMode: (v: boolean) => void;
};

const CrisisModeContext = createContext<CrisisModeContextType>({
  crisisMode: false,
  setCrisisMode: () => {},
});

export function useCrisisMode() {
  return useContext(CrisisModeContext);
}

/* ─── Keyboard Shortcut Help ─── */
const shortcuts = [
  { key: "D", action: "Open Command Center" },
  { key: "N", action: "Report missing person" },
  { key: "C", action: "Open cases list" },
  { key: "V", action: "Open verification console" },
  { key: "G", action: "Open Identity Graph" },
  { key: "M", action: "Open Intel Map" },
  { key: "L", action: "Open Live Feed" },
  { key: "X", action: "Toggle Crisis Mode" },
  { key: "?", action: "Show keyboard shortcuts" },
];

function KeyboardShortcutPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="rounded-xl border border-white/20 dark:border-white/8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl p-6 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm">Keyboard Shortcuts</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{s.action}</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-[11px] font-medium">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-4 text-center">
          Press <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd> or <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">?</kbd> to close
        </p>
      </div>
    </div>
  );
}

/* ─── Provider ─── */
export function CrisisModeProvider({ children }: { children: React.ReactNode }) {
  const [crisisMode, setCrisisMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const router = useRouter();

  // Persist crisis mode
  useEffect(() => {
    const saved = localStorage.getItem("tb-crisis-mode");
    if (saved === "true") setCrisisMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("tb-crisis-mode", String(crisisMode));
    if (crisisMode) {
      document.documentElement.classList.add("crisis-mode");
    } else {
      document.documentElement.classList.remove("crisis-mode");
    }
  }, [crisisMode]);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if user is typing in input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "d":
          router.push("/dashboard");
          break;
        case "n":
          router.push("/cases/new");
          break;
        case "c":
          router.push("/cases");
          break;
        case "v":
          router.push("/caseworker");
          break;
        case "g":
          router.push("/graph");
          break;
        case "m":
          router.push("/map");
          break;
        case "l":
          router.push("/live");
          break;
        case "x":
          setCrisisMode((prev) => !prev);
          break;
        case "?":
          setShowShortcuts((prev) => !prev);
          break;
        case "escape":
          setShowShortcuts(false);
          break;
      }
    },
    [router]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <CrisisModeContext.Provider value={{ crisisMode, setCrisisMode }}>
      {/* Crisis mode indicator */}
      {crisisMode && (
        <div className="fixed top-0 left-0 right-0 z-[55] bg-red-600 text-white text-center py-0.5 text-[10px] font-medium tracking-wider uppercase flex items-center justify-center gap-2">
          <AlertTriangle className="h-3 w-3" />
          Crisis Mode Active — High Contrast &middot; Large Actions &middot; Press X to exit
        </div>
      )}
      <div className={crisisMode ? "pt-5 md:pt-5" : ""}>
        {children}
      </div>
      <KeyboardShortcutPanel open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </CrisisModeContext.Provider>
  );
}
