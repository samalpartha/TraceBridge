"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { KPIDashboard } from "@/components/kpi-dashboard";
import { CrisisMap } from "@/components/crisis-map";
import { LiveDataFeed } from "@/components/live-feed";
import { ImpactTrends } from "@/components/impact-trends";
import { NamusStatusBlock, EthicalUsageBanner } from "@/components/namus-panel";
import { ThresholdControls, WorkspaceSelector, PartnerPanel, AgentWorkloadPanel } from "@/components/ops-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getCases, getDashboardStats, tfEscalate } from "@/lib/api-client";
import type { Case, DashboardStats } from "@/lib/types";
import {
  Plus,
  FolderSearch,
  Zap,
  AlertTriangle,
  Eye,
  Send,
  ArrowRight,
  Clock,
  Shield,
  Target,
  TrendingUp,
  Users,
  Heart,
  Timer,
  DollarSign,
  BarChart3,
  Brain,
  Radio,
  CheckCircle,
  Baby,
  UserCheck,
  Bot,
  Loader2,
} from "lucide-react";

/* ─── Risk scoring logic ─── */
function getCaseRisk(c: Case): {
  level: string;
  score: number;
  color: string;
  reason: string;
  slaHours: number;
  slaStatus: "ok" | "warning" | "breach";
} {
  const daysSince = c.created_at
    ? Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000)
    : 0;
  const hoursSince = c.created_at
    ? Math.floor((Date.now() - new Date(c.created_at).getTime()) / 3600000)
    : 0;
  const isChild = c.age !== undefined && c.age !== null && c.age < 12;
  const noPhoto = !c.media_assets || c.media_assets.length === 0;
  const desc = (c.description || "").toLowerCase();
  const loc = (c.last_known_location || "").toLowerCase();

  let score = 50;
  if (isChild) score += 25;
  if (daysSince > 7) score += 15;
  if (daysSince > 14) score += 10;
  if (noPhoto) score -= 10;
  if (c.status === "open") score += 10;
  // disaster proximity boost
  const disasterWords = ["fire", "wildfire", "hurricane", "flood", "evacuation", "tornado"];
  if (disasterWords.some((w) => desc.includes(w) || loc.includes(w))) score += 15;
  score = Math.min(100, Math.max(0, score));

  // SLA: child cases = 4h, critical = 8h, high = 24h, medium = 48h
  const slaTarget = isChild ? 4 : score >= 75 ? 8 : score >= 50 ? 24 : 48;
  const slaStatus = hoursSince > slaTarget ? "breach" : hoursSince > slaTarget * 0.75 ? "warning" : "ok";

  const level = score >= 75 ? "Critical" : score >= 50 ? "High" : "Medium";
  const color = score >= 75 ? "text-red-600" : score >= 50 ? "text-amber-600" : "text-blue-600";
  const reason = isChild
    ? "Unaccompanied minor"
    : score >= 75
      ? daysSince > 14 ? `${daysSince}d — SLA breach` : "Disaster proximity"
      : daysSince > 7 ? `${daysSince} days since reported` : "Active search needed";

  return { level, score, color, reason, slaHours: hoursSince, slaStatus };
}

function getNextAction(c: Case): { action: string; icon: React.ElementType; href: string; variant: "default" | "outline" } {
  const hasPhoto = c.media_assets && c.media_assets.length > 0;
  switch (c.status) {
    case "open":
      return {
        action: hasPhoto ? "Run Vision + Records Scan" : "Run Cross-Source Match",
        icon: Zap,
        href: `/cases/${c.id}`,
        variant: "default",
      };
    case "searching":
      return { action: "Review Agent Results", icon: Eye, href: `/cases/${c.id}`, variant: "outline" };
    case "matched":
      return { action: "Verify Match Evidence", icon: Shield, href: `/cases/${c.id}`, variant: "default" };
    case "verified":
      return { action: "Trigger Outreach via TinyFish", icon: Send, href: `/cases/${c.id}`, variant: "default" };
    default:
      return { action: "Open Case File", icon: Eye, href: `/cases/${c.id}`, variant: "outline" };
  }
}

/* ─── Agent Assignment (deterministic from case data) ─── */
const agentPool = [
  { name: "Agent Kim", type: "caseworker", icon: UserCheck },
  { name: "Agent Rivera", type: "caseworker", icon: UserCheck },
  { name: "AI Vision Bot", type: "ai", icon: Bot },
  { name: "Agent Patel", type: "volunteer", icon: Users },
  { name: "AI RAG Bot", type: "ai", icon: Bot },
  { name: "Agent Chen", type: "caseworker", icon: UserCheck },
];

function getAssignedAgent(caseId: string, status: string) {
  // AI agents for open/searching, humans for matched/verified
  if (status === "open" || status === "searching") {
    const idx = caseId.charCodeAt(0) % 2 === 0 ? 2 : 4; // AI agents
    return agentPool[idx];
  }
  const idx = caseId.charCodeAt(0) % 3; // human pool of 3
  return agentPool[idx === 2 ? 5 : idx];
}

/* ─── Queue Priority Label ─── */
function QueueLabel({ status, riskLevel, slaStatus }: { status: string; riskLevel: string; slaStatus: string }) {
  if (slaStatus === "breach") {
    return (
      <Badge variant="outline" className="text-[10px] border-red-300 text-red-700 bg-red-50 gap-0.5">
        <AlertTriangle className="h-2.5 w-2.5" />
        SLA Breach
      </Badge>
    );
  }
  if (riskLevel === "Critical") {
    return (
      <Badge variant="outline" className="text-[10px] border-red-200 text-red-600 bg-red-50 gap-0.5 animate-pulse">
        <Radio className="h-2.5 w-2.5" />
        Critical
      </Badge>
    );
  }
  if (status === "matched") {
    return (
      <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-600 bg-purple-50 gap-0.5">
        <Shield className="h-2.5 w-2.5" />
        Needs Verification
      </Badge>
    );
  }
  if (status === "open") {
    return (
      <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600 bg-amber-50 gap-0.5">
        <Zap className="h-2.5 w-2.5" />
        Action Needed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 bg-blue-50">
      {status}
    </Badge>
  );
}

import { toast } from "sonner";

async function escalateBreaches(breachCases: Array<{ id: string; risk: { slaHours: number } }>) {
  let count = 0;
  for (const c of breachCases) {
    try {
      await tfEscalate(c.id, c.risk.slaHours);
      count++;
    } catch {
      // continue
    }
  }
  return count;
}

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [escalating, setEscalating] = useState(false);

  useEffect(() => {
    getCases().then((d) => setCases(d.cases || [])).catch(() => { });
    getDashboardStats().then(setStats).catch(() => { });
  }, []);

  const activeCases = cases
    .filter((c) => c.status !== "reunited" && c.status !== "closed")
    .map((c) => ({ ...c, risk: getCaseRisk(c) }))
    .sort((a, b) => b.risk.score - a.risk.score);

  const urgentActions = activeCases.slice(0, 4).map((c) => ({
    case: c,
    risk: c.risk,
    action: getNextAction(c),
  }));

  // Impact calculations
  const avgResponseHours = 2.4;
  const estimatedHoursSaved = stats ? stats.total_matches * 48 : 0;
  const costPerHourManual = 85; // NGO avg cost per hour of manual search
  const costAvoided = estimatedHoursSaved * costPerHourManual;
  const aiAccuracy = stats ? Math.round((stats.approved_matches / Math.max(stats.total_matches, 1)) * 100) : 0;
  const slaBreaches = activeCases.filter((c) => c.risk.slaStatus === "breach").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Command Center</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            AI-powered crisis reunification operations
            <span className="inline-flex items-center gap-1 rounded-full border border-green-200/50 bg-green-50/60 backdrop-blur-sm px-2 py-0.5 text-xs text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
            {slaBreaches > 0 && (
              <>
                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700 animate-pulse">
                  <AlertTriangle className="h-3 w-3" />
                  {slaBreaches} SLA breach{slaBreaches > 1 ? "es" : ""}
                </span>
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                  disabled={escalating}
                  onClick={async () => {
                    setEscalating(true);
                    const breachCases = activeCases.filter((c) => c.risk.slaStatus === "breach");
                    const count = await escalateBreaches(breachCases);
                    toast.success(`TinyFish escalated ${count} breach${count > 1 ? "es" : ""}`);
                    setEscalating(false);
                  }}
                >
                  {escalating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Bot className="h-3 w-3" />
                  )}
                  Escalate All
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/cases">
            <Button variant="outline" size="sm" className="gap-2">
              <FolderSearch className="h-4 w-4" />
              All Cases
            </Button>
          </Link>
          <Link href="/cases/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Report Missing
            </Button>
          </Link>
        </div>
      </div>

      {/* Ethical Usage Banner */}
      <EthicalUsageBanner />

      {/* KPI Stats */}
      <KPIDashboard />

      {/* Impact Metrics Bar — expanded */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-white/50 dark:bg-slate-900/30 backdrop-blur-xl border-white/25 dark:border-white/8">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-primary">
                  <Clock className="h-4 w-4" />
                  <span className="text-xl font-bold">{avgResponseHours}h</span>
                </div>
                <p className="text-xs text-muted-foreground">Avg time to first lead</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xl font-bold">{estimatedHoursSaved.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">Hours saved</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xl font-bold">${(costAvoided / 1000).toFixed(0)}k</span>
                </div>
                <p className="text-xs text-muted-foreground">Cost avoided</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-purple-600">
                  <Target className="h-4 w-4" />
                  <span className="text-xl font-bold">{aiAccuracy}%</span>
                </div>
                <p className="text-xs text-muted-foreground">Match precision</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-red-500">
                  <Heart className="h-4 w-4 fill-red-500" />
                  <span className="text-xl font-bold">{stats?.reunited_count || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Families reunited</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-blue-600">
                  <Brain className="h-4 w-4" />
                  <span className="text-xl font-bold">{stats?.total_source_records?.toLocaleString() || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Records indexed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Next Best Actions + Operational Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Next Best Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <Card className="border-amber-200/30 bg-amber-50/20 dark:bg-amber-950/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Next Best Actions
                {urgentActions.length > 0 && (
                  <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600 bg-amber-50">
                    {urgentActions.filter((a) => a.risk.level === "Critical").length} critical
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgentActions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No urgent actions. All cases are on track.
                </p>
              ) : (
                urgentActions.map(({ case: c, risk, action }, i) => {
                  const ActionIcon = action.icon;
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                    >
                      <div className="rounded-lg border bg-background p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{c.person_name}</p>
                              {c.age != null && c.age < 12 && (
                                <Baby className="h-3.5 w-3.5 text-red-500" />
                              )}
                            </div>
                            <p className={`text-xs ${risk.color}`}>
                              {risk.level}: {risk.reason}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="outline"
                              className={`text-xs shrink-0 ${risk.level === "Critical"
                                  ? "border-red-300 text-red-700 bg-red-50"
                                  : risk.level === "High"
                                    ? "border-amber-300 text-amber-700 bg-amber-50"
                                    : "border-blue-300 text-blue-700 bg-blue-50"
                                }`}
                            >
                              {risk.score}
                            </Badge>
                            {risk.slaStatus === "breach" && (
                              <span className="text-[9px] text-red-600 font-medium flex items-center gap-0.5">
                                <Timer className="h-2.5 w-2.5" /> SLA {risk.slaHours}h
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href={action.href}>
                          <Button
                            size="sm"
                            variant={action.variant}
                            className="w-full gap-2 h-8 text-xs"
                          >
                            <ActionIcon className="h-3 w-3" />
                            {action.action}
                            <ArrowRight className="h-3 w-3 ml-auto" />
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Operational Case Queue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-500" />
                  Risk-Scored Operations Queue
                </CardTitle>
                <Link href="/cases">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    View all <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {activeCases.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  All cases resolved. No active queue items.
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Queue header */}
                  <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 pb-1">
                    <div className="col-span-1">Risk</div>
                    <div className="col-span-3">Case</div>
                    <div className="col-span-2">Assigned</div>
                    <div className="col-span-1">SLA</div>
                    <div className="col-span-2">Priority</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1"></div>
                  </div>

                  {activeCases.slice(0, 6).map((c, i) => {
                    const action = getNextAction(c);
                    const ActionIcon = action.icon;
                    const agent = getAssignedAgent(c.id, c.status);
                    const AgentIcon = agent.icon;
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                      >
                        <Link href={`/cases/${c.id}`}>
                          <div className={`grid grid-cols-12 gap-2 items-center rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer ${c.risk.slaStatus === "breach" ? "border-red-200 bg-red-50/30" : ""
                            }`}>
                            {/* Risk score */}
                            <div className="col-span-1">
                              <div className={`text-lg font-bold ${c.risk.color}`}>
                                {c.risk.score}
                              </div>
                            </div>

                            {/* Case info */}
                            <div className="col-span-3 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium truncate">{c.person_name}</span>
                                {c.age != null && c.age < 12 && (
                                  <Badge variant="outline" className="text-[9px] border-red-200 text-red-600 bg-red-50 px-1">
                                    Child
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {c.last_known_location || "Location unknown"}
                              </div>
                            </div>

                            {/* Agent assignment */}
                            <div className="col-span-2">
                              <div className="flex items-center gap-1.5">
                                <div className={`h-5 w-5 rounded-full flex items-center justify-center ${agent.type === "ai" ? "bg-blue-100" : agent.type === "volunteer" ? "bg-green-100" : "bg-purple-100"
                                  }`}>
                                  <AgentIcon className={`h-3 w-3 ${agent.type === "ai" ? "text-blue-600" : agent.type === "volunteer" ? "text-green-600" : "text-purple-600"
                                    }`} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[10px] font-medium truncate">{agent.name}</div>
                                  <div className="text-[9px] text-muted-foreground capitalize">{agent.type}</div>
                                </div>
                              </div>
                            </div>

                            {/* SLA timer */}
                            <div className="col-span-1">
                              <div className={`text-xs font-mono ${c.risk.slaStatus === "breach" ? "text-red-600 font-bold" :
                                  c.risk.slaStatus === "warning" ? "text-amber-600 font-semibold" :
                                    "text-muted-foreground"
                                }`}>
                                {c.risk.slaHours}h
                              </div>
                              <Progress
                                value={Math.min(100, (c.risk.slaHours / (c.age != null && c.age < 12 ? 4 : 24)) * 100)}
                                className={`h-1 mt-1 ${c.risk.slaStatus === "breach" ? "[&>div]:bg-red-500" :
                                    c.risk.slaStatus === "warning" ? "[&>div]:bg-amber-500" :
                                      "[&>div]:bg-green-500"
                                  }`}
                              />
                            </div>

                            {/* Queue priority label */}
                            <div className="col-span-2">
                              <QueueLabel
                                status={c.status}
                                riskLevel={c.risk.level}
                                slaStatus={c.risk.slaStatus}
                              />
                            </div>

                            {/* Status */}
                            <div className="col-span-2">
                              <Badge
                                variant="outline"
                                className={`text-xs capitalize ${c.status === "matched" ? "border-purple-200 text-purple-600" :
                                    c.status === "searching" ? "border-blue-200 text-blue-600" :
                                      "border-amber-200 text-amber-600"
                                  }`}
                              >
                                {c.status}
                              </Badge>
                            </div>

                            {/* Action arrow */}
                            <div className="col-span-1 text-right">
                              <ActionIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Impact Trend Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <ImpactTrends />
      </motion.div>

      {/* Operational Controls Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ThresholdControls />
          <AgentWorkloadPanel />
          <PartnerPanel />
          <WorkspaceSelector />
        </div>
      </motion.div>

      {/* NamUs Status + Live Data Feed + Crisis Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <NamusStatusBlock />
        <div className="max-h-[520px] overflow-hidden">
          <LiveDataFeed compact />
        </div>
        <CrisisMap height="520px" />
      </div>
    </div>
  );
}
