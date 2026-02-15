"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Case } from "@/lib/types";
import {
  MapPin,
  Clock,
  User,
  Eye,
  FileText,
  Shield,
  Zap,
  AlertTriangle,
  Baby,
  Timer,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Send,
  Bot,
  UserCheck,
  Radio,
  Globe,
  Fingerprint,
  Activity,
  Brain,
} from "lucide-react";

/* ─── Status config ─── */
const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800 border-yellow-200",
  searching: "bg-blue-100 text-blue-800 border-blue-200",
  matched: "bg-purple-100 text-purple-800 border-purple-200",
  verified: "bg-green-100 text-green-800 border-green-200",
  reunited: "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
};

/* ─── Risk scoring (mirrored from dashboard) ─── */
function getCaseRisk(c: Case) {
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
  const disasterWords = ["fire", "wildfire", "hurricane", "flood", "evacuation", "tornado"];
  if (disasterWords.some((w) => desc.includes(w) || loc.includes(w))) score += 15;
  score = Math.min(100, Math.max(0, score));

  const slaTarget = isChild ? 4 : score >= 75 ? 8 : score >= 50 ? 24 : 48;
  const slaStatus = hoursSince > slaTarget ? "breach" : hoursSince > slaTarget * 0.75 ? "warning" : "ok";
  const level = score >= 75 ? "Critical" : score >= 50 ? "High" : "Medium";
  const color = score >= 75 ? "text-red-600" : score >= 50 ? "text-amber-600" : "text-blue-600";
  const bgColor = score >= 75 ? "bg-red-50 border-red-200" : score >= 50 ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200";

  return { level, score, color, bgColor, slaHours: hoursSince, slaStatus, slaTarget, isChild, daysSince };
}

/* ─── Simulated lead/match data from case ID ─── */
function getCaseIntel(c: Case) {
  const hash = c.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const leadCount = (hash % 5) + 1;
  const verifiedLeads = Math.min(leadCount, hash % 3);
  const pendingLeads = leadCount - verifiedLeads;
  const confidenceScore = 40 + (hash % 50);
  const visionScore = (hash % 60 + 20) / 100;
  const textScore = ((hash * 7) % 50 + 30) / 100;
  const geoScore = ((hash * 3) % 40 + 20) / 100;

  // Simulated source provenance
  const sources: Array<{ name: string; color: string }> = [];
  if (hash % 3 === 0) sources.push({ name: "FBI", color: "border-red-200 text-red-700 bg-red-50" });
  if (hash % 2 === 0) sources.push({ name: "NamUs", color: "border-blue-200 text-blue-700 bg-blue-50" });
  sources.push({ name: "IOM", color: "border-green-200 text-green-700 bg-green-50" });
  if (hash % 4 !== 0) sources.push({ name: "Shelter", color: "border-amber-200 text-amber-700 bg-amber-50" });

  // Simulated assigned agent
  const agents = [
    { name: "Agent Kim", type: "caseworker" },
    { name: "AI Vision Bot", type: "ai" },
    { name: "Agent Rivera", type: "caseworker" },
    { name: "AI RAG Bot", type: "ai" },
    { name: "Agent Patel", type: "volunteer" },
  ];
  const agent = c.status === "open" || c.status === "searching"
    ? agents[1 + (hash % 2) * 2]
    : agents[hash % 3 === 2 ? 2 : hash % 3];

  // Last AI action
  const lastActions = [
    { text: "Vision scan completed", time: "2h ago" },
    { text: "NamUs cross-match ran", time: "4h ago" },
    { text: "TinyFish outreach sent", time: "1h ago" },
    { text: "Geo plausibility check", time: "3h ago" },
    { text: "Records search updated", time: "6h ago" },
  ];
  const lastAction = lastActions[hash % lastActions.length];

  // Next action
  const hasPhoto = c.media_assets && c.media_assets.length > 0;
  let nextAction = { text: "Open Case File", icon: Eye };
  switch (c.status) {
    case "open":
      nextAction = hasPhoto
        ? { text: "Run Vision + Records Scan", icon: Zap }
        : { text: "Run Cross-Source Match", icon: Zap };
      break;
    case "searching":
      nextAction = { text: "Review Agent Results", icon: Eye };
      break;
    case "matched":
      nextAction = { text: "Verify Match Evidence", icon: Shield };
      break;
    case "verified":
      nextAction = { text: "Trigger Outreach via TinyFish", icon: Send };
      break;
  }

  // TinyFish automation status
  const tfStatus = c.status === "verified"
    ? { text: "Outreach sent — 2 channels", color: "text-green-600" }
    : c.status === "matched"
    ? { text: "Pending verification — outreach blocked", color: "text-amber-600" }
    : c.status === "searching"
    ? { text: "3 scans active", color: "text-blue-600" }
    : { text: "Awaiting search trigger", color: "text-muted-foreground" };

  return {
    leadCount,
    verifiedLeads,
    pendingLeads,
    confidenceScore,
    visionScore,
    textScore,
    geoScore,
    sources,
    agent,
    lastAction,
    nextAction,
    tfStatus,
  };
}

export function CaseCard({ caseData }: { caseData: Case }) {
  const photoUrl = caseData.media_assets?.[0]?.file_path;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";
  const [imgError, setImgError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const risk = getCaseRisk(caseData);
  const intel = getCaseIntel(caseData);
  const NextIcon = intel.nextAction.icon;

  return (
    <Card className={`overflow-hidden bg-white/55 dark:bg-slate-900/35 backdrop-blur-xl border-white/25 dark:border-white/8 transition-all duration-220 hover:bg-white/75 dark:hover:bg-slate-900/50 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] ${
      risk.slaStatus === "breach" ? "!border-red-300/50 shadow-[0_0_16px_rgba(220,38,38,0.08)]" :
      risk.level === "Critical" ? "!border-red-200/40" : ""
    }`}>
      <CardContent className="p-0">
        {/* Main row */}
        <Link href={`/cases/${caseData.id}`}>
          <div className="flex gap-3 p-3">
            {/* Photo + risk score overlay */}
            <div className="relative h-20 w-20 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
              {photoUrl && !imgError ? (
                <img
                  src={`${API_URL}${photoUrl}`}
                  alt={caseData.person_name}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                  <User className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
              {/* Risk score badge */}
              <div className={`absolute top-0.5 left-0.5 rounded px-1 py-0.5 text-[9px] font-bold ${
                risk.level === "Critical" ? "bg-red-600 text-white" :
                risk.level === "High" ? "bg-amber-500 text-white" :
                "bg-blue-500 text-white"
              }`}>
                {risk.score}
              </div>
              {/* Minor badge */}
              {risk.isChild && (
                <div className="absolute bottom-0.5 left-0.5 rounded bg-red-600 text-white px-1 py-0.5 text-[8px] font-bold flex items-center gap-0.5">
                  <Baby className="h-2 w-2" /> Minor
                </div>
              )}
            </div>

            {/* Core info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">{caseData.person_name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${statusColors[caseData.status] || ""}`}>
                      {caseData.status}
                    </Badge>
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${risk.bgColor}`}>
                      {risk.level}
                    </Badge>
                    {risk.slaStatus === "breach" && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-red-300 text-red-700 bg-red-50 gap-0.5 animate-pulse">
                        <AlertTriangle className="h-2 w-2" /> SLA
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Confidence meter */}
                <div className={`text-right shrink-0 rounded-lg border p-1.5 ${
                  intel.confidenceScore >= 70 ? "border-green-200 bg-green-50" :
                  intel.confidenceScore >= 45 ? "border-amber-200 bg-amber-50" :
                  "border-red-200 bg-red-50"
                }`}>
                  <div className={`text-sm font-bold ${
                    intel.confidenceScore >= 70 ? "text-green-700" :
                    intel.confidenceScore >= 45 ? "text-amber-700" :
                    "text-red-700"
                  }`}>{intel.confidenceScore}%</div>
                  <div className="text-[8px] text-muted-foreground">confidence</div>
                </div>
              </div>

              {/* Location + age row */}
              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                {caseData.age && <span>Age {caseData.age}</span>}
                {caseData.last_known_location && (
                  <span className="flex items-center gap-0.5 truncate">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    {caseData.last_known_location}
                  </span>
                )}
              </div>

              {/* Leads + Sources row */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {/* Lead count */}
                <span className="inline-flex items-center gap-1 text-[10px]">
                  <Eye className="h-2.5 w-2.5 text-blue-500" />
                  <span className="font-medium">{intel.leadCount} leads</span>
                  <span className="text-muted-foreground">
                    ({intel.verifiedLeads} verified)
                  </span>
                </span>
                {/* Source provenance badges */}
                {intel.sources.map((s) => (
                  <span key={s.name} className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[8px] font-medium ${s.color}`}>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Link>

        {/* SLA + Last action + Assigned agent strip */}
        <div className="flex items-center justify-between border-t px-3 py-1.5 bg-muted/20">
          <div className="flex items-center gap-3 text-[10px]">
            {/* SLA timer */}
            <span className={`flex items-center gap-1 ${
              risk.slaStatus === "breach" ? "text-red-600 font-bold" :
              risk.slaStatus === "warning" ? "text-amber-600 font-semibold" :
              "text-muted-foreground"
            }`}>
              <Timer className="h-2.5 w-2.5" />
              {risk.slaHours}h / {risk.slaTarget}h SLA
            </span>
            {/* Last AI action */}
            <span className="flex items-center gap-1 text-muted-foreground">
              <Brain className="h-2.5 w-2.5" />
              {intel.lastAction.text} · {intel.lastAction.time}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            {/* Assigned agent */}
            <span className="flex items-center gap-1">
              {intel.agent.type === "ai" ? (
                <Bot className="h-2.5 w-2.5 text-blue-600" />
              ) : (
                <UserCheck className="h-2.5 w-2.5 text-purple-600" />
              )}
              <span className="text-muted-foreground">{intel.agent.name}</span>
            </span>
            {/* Expand toggle */}
            <button
              onClick={(e) => { e.preventDefault(); setExpanded(!expanded); }}
              className="p-0.5 rounded hover:bg-muted transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Expandable detail panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t px-3 py-2.5 bg-muted/10 space-y-2.5">
                {/* Score breakdown */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    AI Signal Breakdown
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="flex items-center gap-1 text-blue-600">
                          <Eye className="h-2.5 w-2.5" /> Vision
                        </span>
                        <span className="font-mono font-bold">{Math.round(intel.visionScore * 100)}%</span>
                      </div>
                      <Progress value={intel.visionScore * 100} className="h-1 [&>div]:bg-blue-500" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="flex items-center gap-1 text-purple-600">
                          <FileText className="h-2.5 w-2.5" /> Text
                        </span>
                        <span className="font-mono font-bold">{Math.round(intel.textScore * 100)}%</span>
                      </div>
                      <Progress value={intel.textScore * 100} className="h-1 [&>div]:bg-purple-500" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="flex items-center gap-1 text-green-600">
                          <MapPin className="h-2.5 w-2.5" /> Geo
                        </span>
                        <span className="font-mono font-bold">{Math.round(intel.geoScore * 100)}%</span>
                      </div>
                      <Progress value={intel.geoScore * 100} className="h-1 [&>div]:bg-green-500" />
                    </div>
                  </div>
                </div>

                {/* TinyFish automation status */}
                <div className="flex items-center gap-2 text-[10px]">
                  <Bot className="h-3 w-3 text-blue-600" />
                  <span className="font-medium">TinyFish:</span>
                  <span className={intel.tfStatus.color}>{intel.tfStatus.text}</span>
                </div>

                {/* Next action button */}
                <Link href={`/cases/${caseData.id}`}>
                  <Button size="sm" className="w-full gap-2 h-7 text-xs">
                    <NextIcon className="h-3 w-3" />
                    {intel.nextAction.text}
                    <ArrowRight className="h-3 w-3 ml-auto" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
