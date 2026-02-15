"use client";

import { useCases } from "@/hooks/use-case";
import { CaseCard } from "@/components/case-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  Plus,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Shield,
  Eye,
  Activity,
  Heart,
  Clock,
  Search,
  LayoutGrid,
  List,
} from "lucide-react";
import { useState, useMemo } from "react";
import type { Case } from "@/lib/types";

const statusFilters = [
  { label: "All", value: undefined, icon: Activity },
  { label: "Open", value: "open", icon: AlertTriangle },
  { label: "Searching", value: "searching", icon: Search },
  { label: "Matched", value: "matched", icon: Eye },
  { label: "Verified", value: "verified", icon: Shield },
  { label: "Reunited", value: "reunited", icon: Heart },
];

/* ─── Risk scoring for summary stats ─── */
function getCaseRiskLevel(c: Case) {
  const daysSince = c.created_at
    ? Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000)
    : 0;
  const hoursSince = c.created_at
    ? Math.floor((Date.now() - new Date(c.created_at).getTime()) / 3600000)
    : 0;
  const isChild = c.age !== undefined && c.age !== null && c.age < 12;
  const desc = (c.description || "").toLowerCase();
  const loc = (c.last_known_location || "").toLowerCase();

  let score = 50;
  if (isChild) score += 25;
  if (daysSince > 7) score += 15;
  if (daysSince > 14) score += 10;
  if (!c.media_assets || c.media_assets.length === 0) score -= 10;
  if (c.status === "open") score += 10;
  const disasterWords = ["fire", "wildfire", "hurricane", "flood", "evacuation", "tornado"];
  if (disasterWords.some((w) => desc.includes(w) || loc.includes(w))) score += 15;
  score = Math.min(100, Math.max(0, score));

  const slaTarget = isChild ? 4 : score >= 75 ? 8 : score >= 50 ? 24 : 48;
  const slaStatus = hoursSince > slaTarget ? "breach" : hoursSince > slaTarget * 0.75 ? "warning" : "ok";
  return { score, level: score >= 75 ? "Critical" : score >= 50 ? "High" : "Medium", slaStatus, isChild };
}

export default function CasesPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { cases, total, loading, error, refresh } = useCases(statusFilter);

  // Summary stats
  const stats = useMemo(() => {
    const active = cases.filter((c) => c.status !== "reunited" && c.status !== "closed");
    const risks = active.map(getCaseRiskLevel);
    return {
      total: cases.length,
      critical: risks.filter((r) => r.level === "Critical").length,
      slaBreaches: risks.filter((r) => r.slaStatus === "breach").length,
      minors: risks.filter((r) => r.isChild).length,
      pendingVerification: cases.filter((c) => c.status === "matched").length,
      active: active.length,
    };
  }, [cases]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Case Operations</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            {total} total cases
            {stats.slaBreaches > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                {stats.slaBreaches} SLA breach{stats.slaBreaches > 1 ? "es" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 ${viewMode === "grid" ? "bg-muted" : "hover:bg-muted/50"} transition-colors`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 ${viewMode === "list" ? "bg-muted" : "hover:bg-muted/50"} transition-colors`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Link href="/cases/new">
            <Button size="sm" className="gap-2 bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4" />
              Report Missing
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary stats strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "Active", value: stats.active, color: "text-blue-600" },
          { label: "Critical", value: stats.critical, color: "text-red-600" },
          { label: "SLA Breaches", value: stats.slaBreaches, color: stats.slaBreaches > 0 ? "text-red-600" : "text-muted-foreground" },
          { label: "Minors", value: stats.minors, color: stats.minors > 0 ? "text-red-600" : "text-muted-foreground" },
          { label: "Pending Verify", value: stats.pendingVerification, color: "text-purple-600" },
          { label: "Total Cases", value: stats.total, color: "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-2.5 text-center">
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => {
          const Icon = filter.icon;
          return (
            <Button
              key={filter.label}
              variant={statusFilter === filter.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
              className="gap-1.5 text-xs"
            >
              <Icon className="h-3 w-3" />
              {filter.label}
              {filter.value && (
                <Badge variant="outline" className="text-[9px] ml-1 px-1 py-0">
                  {cases.filter((c) => !filter.value || c.status === filter.value).length}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">
            Could not load cases. Make sure the backend is running.
          </p>
          <Button variant="outline" onClick={refresh}>
            Retry
          </Button>
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-20">
          <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground mb-4">No cases found.</p>
          <Link href="/cases/new">
            <Button>Report First Missing Person</Button>
          </Link>
        </div>
      ) : (
        <div className={
          viewMode === "grid"
            ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col gap-2"
        }>
          {cases
            .sort((a, b) => {
              // Sort by risk: critical first, then by creation date
              const rA = getCaseRiskLevel(a);
              const rB = getCaseRiskLevel(b);
              if (rA.score !== rB.score) return rB.score - rA.score;
              return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            })
            .map((c) => (
              <CaseCard key={c.id} caseData={c} />
            ))}
        </div>
      )}
    </div>
  );
}
