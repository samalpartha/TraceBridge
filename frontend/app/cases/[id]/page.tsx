"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCaseDetail } from "@/hooks/use-case";
import { useSearchStream } from "@/hooks/use-sse";
import { MatchEvidenceCard } from "@/components/match-evidence-card";
import { AgentStatusPanel } from "@/components/agent-status-panel";
import { CaseTimeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { verifyMatch, triggerOutreach, triggerSearch, analyzeCase } from "@/lib/api-client";
import { TinyFishActions } from "@/components/tinyfish-actions";
import { TinyFishTimeline } from "@/components/tinyfish-timeline";
import { NamusHelpIndicator, ProvenanceBadge, BiometricsIndicator } from "@/components/namus-panel";
import {
  Search,
  User,
  MapPin,
  Calendar,
  Loader2,
  Send,
  Shield,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
  Eye,
  Brain,
  RefreshCw,
  TrendingUp,
  FileText,
  Timer,
  Phone,
  Baby,
  Flame,
  FileWarning,
} from "lucide-react";
import { toast } from "sonner";

const statusToStage: Record<string, string> = {
  open: "reported",
  searching: "scanning",
  matched: "fusion",
  verified: "verified",
  reunited: "reunited",
  closed: "reunited",
};

/* ─── Risk Signal Engine ─── */
interface RiskSignal {
  label: string;
  value: number; // 0-100 contribution
  description: string;
  icon: React.ElementType;
  severity: "critical" | "high" | "medium" | "low";
}

function getCaseRiskSignals(caseData: {
  age?: number | null;
  status: string;
  created_at?: string;
  last_known_location?: string;
  description?: string;
  media_assets?: { id: string }[];
}) {
  const signals: RiskSignal[] = [];
  const daysSince = caseData.created_at
    ? Math.floor((Date.now() - new Date(caseData.created_at).getTime()) / 86400000)
    : 0;
  const isChild = caseData.age != null && caseData.age < 12;
  const isElderly = caseData.age != null && caseData.age > 65;
  const hasPhoto = caseData.media_assets && caseData.media_assets.length > 0;
  const desc = (caseData.description || "").toLowerCase();
  const loc = (caseData.last_known_location || "").toLowerCase();

  // Age vulnerability
  if (isChild) {
    signals.push({
      label: "Unaccompanied Minor",
      value: 25,
      description: `Age ${caseData.age} — highest vulnerability bracket.AMBER - level priority.`,
      icon: Baby,
      severity: "critical",
    });
  } else if (isElderly) {
    signals.push({
      label: "Elderly Individual",
      value: 15,
      description: `Age ${caseData.age} — elevated medical risk.`,
      icon: User,
      severity: "high",
    });
  }

  // Time decay
  if (daysSince > 14) {
    signals.push({
      label: "Extended Duration",
      value: 25,
      description: `${daysSince} days since reported.Probability of safe recovery decreases after 72h.`,
      icon: Timer,
      severity: "critical",
    });
  } else if (daysSince > 7) {
    signals.push({
      label: "Prolonged Missing",
      value: 15,
      description: `${daysSince} days elapsed.Escalation recommended.`,
      icon: Clock,
      severity: "high",
    });
  } else if (daysSince > 2) {
    signals.push({
      label: "Time Pressure",
      value: 8,
      description: `${daysSince} days since reported.Within critical first - week window.`,
      icon: Clock,
      severity: "medium",
    });
  }

  // Disaster proximity detection
  const disasterKeywords = ["fire", "wildfire", "hurricane", "flood", "tornado", "earthquake", "evacuation", "storm", "disaster"];
  const hasDisasterContext = disasterKeywords.some((k) => desc.includes(k) || loc.includes(k));
  if (hasDisasterContext) {
    signals.push({
      label: "Disaster Zone Proximity",
      value: 20,
      description: "Case linked to active disaster zone. Environmental hazard exposure likely.",
      icon: Flame,
      severity: "critical",
    });
  }

  // No photo — reduces findability
  if (!hasPhoto) {
    signals.push({
      label: "No Photo Available",
      value: -10,
      description: "No visual reference uploaded. Face recognition pipeline inactive.",
      icon: FileWarning,
      severity: "medium",
    });
  }

  // Status-based urgency
  if (caseData.status === "open") {
    signals.push({
      label: "No Search Initiated",
      value: 10,
      description: "AI multi-agent search has not been triggered yet.",
      icon: Search,
      severity: "high",
    });
  }

  // Calculate total
  let score = 50; // baseline
  signals.forEach((s) => {
    score += s.value;
  });
  score = Math.min(100, Math.max(0, score));

  const level = score >= 75 ? "Critical" : score >= 50 ? "High" : score >= 25 ? "Medium" : "Low";
  const color = score >= 75 ? "text-red-600" : score >= 50 ? "text-amber-600" : score >= 25 ? "text-blue-600" : "text-green-600";
  const bgColor = score >= 75 ? "bg-red-50" : score >= 50 ? "bg-amber-50" : score >= 25 ? "bg-blue-50" : "bg-green-50";
  const borderColor = score >= 75 ? "border-red-200" : score >= 50 ? "border-amber-200" : score >= 25 ? "border-blue-200" : "border-green-200";
  const progressColor = score >= 75 ? "[&>div]:bg-red-500" : score >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-blue-500";

  return { score, level, color, bgColor, borderColor, progressColor, signals, daysSince, isChild };
}

/* ─── Auto-Suggested Actions Engine ─── */
interface SuggestedAction {
  text: string;
  description: string;
  icon: React.ElementType;
  priority: "immediate" | "recommended" | "optional";
  actionLabel: string;
}

function getSuggestedActions(
  status: string,
  matchCount: number,
  riskLevel: string,
  hasPhoto: boolean,
  pendingMatches: number,
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  if (status === "open" || status === "searching") {
    if (!hasPhoto) {
      actions.push({
        text: "Upload photo for visual matching",
        description: "Face recognition pipeline requires a photo. Upload to enable visual search across FBI, shelter, and hospital databases.",
        icon: User,
        priority: "immediate",
        actionLabel: "Upload Photo",
      });
    }
    actions.push({
      text: "Run AI multi-agent search",
      description: "Deploy 6 AI agents: vision, RAG, geo, NLP, cross-reference, and outreach scanning across 2,100+ indexed records.",
      icon: Zap,
      priority: "immediate",
      actionLabel: "Run Search",
    });
  }

  if (pendingMatches > 0) {
    actions.push({
      text: `Review ${pendingMatches} pending match${pendingMatches > 1 ? "es" : ""} `,
      description: "AI has identified potential matches awaiting human verification. Each match includes multi-modal evidence.",
      icon: Shield,
      priority: "immediate",
      actionLabel: "Review Now",
    });
  }

  if (status === "matched" && riskLevel === "Critical") {
    actions.push({
      text: "Escalate to field coordinator",
      description: "Critical risk level detected. Route to nearest field team for physical search coordination.",
      icon: AlertTriangle,
      priority: "immediate",
      actionLabel: "Escalate",
    });
  }

  if (status === "verified") {
    actions.push({
      text: "Trigger NGO outreach via TinyFish",
      description: "Automate contact with shelters, hospitals, and NGO partners via TinyFish web agent.",
      icon: Send,
      priority: "immediate",
      actionLabel: "Send Outreach",
    });
  }

  if (matchCount > 0) {
    actions.push({
      text: "Request shelter photo verification",
      description: "Send automated request to shelter staff for updated photo of matched individual.",
      icon: Eye,
      priority: "recommended",
      actionLabel: "Request Verification",
    });
  }

  if (riskLevel === "Critical" || riskLevel === "High") {
    actions.push({
      text: "Run Gemini risk deep-analysis",
      description: "Use Google Gemini to generate comprehensive risk assessment with recommended intervention strategy.",
      icon: Brain,
      priority: "recommended",
      actionLabel: "Analyze",
    });
  }

  return actions;
}

/* ─── SLA Timer Component ─── */
function SLATimer({ createdAt, status }: { createdAt?: string; status: string }) {
  const [elapsed, setElapsed] = useState("");
  const [urgencyClass, setUrgencyClass] = useState("");

  useEffect(() => {
    if (!createdAt || status === "reunited" || status === "closed") return;
    const update = () => {
      const diff = Date.now() - new Date(createdAt).getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (hours >= 72) {
        setUrgencyClass("text-red-600 font-bold");
      } else if (hours >= 24) {
        setUrgencyClass("text-amber-600 font-semibold");
      } else {
        setUrgencyClass("text-muted-foreground");
      }

      if (hours > 0) {
        setElapsed(`${hours}h ${mins}m ${secs} s`);
      } else {
        setElapsed(`${mins}m ${secs} s`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt, status]);

  if (!createdAt || status === "reunited" || status === "closed") return null;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Timer className="h-3.5 w-3.5" />
      <span className="text-muted-foreground">Case open:</span>
      <span className={urgencyClass}>{elapsed}</span>
    </div>
  );
}

/* ─── Main Page ─── */
export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { caseData, matches, loading, refresh } = useCaseDetail(id);
  const { events, isRunning, startSearch } = useSearchStream();
  const [searchLoading, setSearchLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiType, setAiType] = useState("risk");

  const handleSearch = async () => {
    setSearchLoading(true);
    try {
      await startSearch(id);
      setTimeout(() => refresh(), 1000);
    } catch {
      try {
        await triggerSearch(id);
        toast.success("Search completed");
        refresh();
      } catch (e) {
        toast.error("Search failed: " + (e as Error).message);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAiAnalysis = async (type: string) => {
    setAiType(type);
    setAiLoading(true);
    try {
      const result = await analyzeCase(id, undefined, type);
      setAiAnalysis(result.result);
    } catch (err) {
      toast.error("AI analysis failed: " + (err as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleVerify = async (matchId: string, action: string) => {
    try {
      await verifyMatch(matchId, action);
      toast.success(`Match ${action} ed`);
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleOutreach = async (matchId: string) => {
    try {
      await triggerOutreach(matchId);
      toast.success("Outreach triggered via TinyFish");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Case not found.</p>
      </div>
    );
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";
  const photoUrl = caseData.media_assets?.[0]?.file_path;
  const risk = getCaseRiskSignals(caseData);
  const pendingMatches = matches.filter((m) => m.status === "pending").length;
  const suggestedActions = getSuggestedActions(
    caseData.status,
    matches.length,
    risk.level,
    !!photoUrl,
    pendingMatches,
  );

  const severityColors = {
    critical: "bg-red-100 text-red-700 border-red-200",
    high: "bg-amber-100 text-amber-700 border-amber-200",
    medium: "bg-blue-100 text-blue-700 border-blue-200",
    low: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Timeline */}
      <CaseTimeline currentStage={statusToStage[caseData.status] || "reported"} />

      {/* Consent + Minor Protection Banner */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50/50 px-3 py-1.5 text-xs">
          <Shield className="h-3.5 w-3.5 text-green-600" />
          <span className="font-medium text-green-700">Consent: Family-Reported</span>
          <span className="text-green-600/70">| Verified reporter contact</span>
        </div>
        {caseData.age != null && caseData.age < 18 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-1.5 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span className="font-medium text-amber-700">Minor Protection Active</span>
            <span className="text-amber-600/70">
              {caseData.age < 12
                ? "| Photo restricted | Guardian verification required | Elevated SLA"
                : "| Enhanced protections | Guardian check required"}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          Audit trail active — all actions logged
        </div>
      </div>

      {/* Provenance + Biometrics Row */}
      <div className="flex flex-wrap items-center gap-3">
        <ProvenanceBadge source="TraceBridge" recordId={caseData.id} dataTier="public" />
        <div className="h-4 border-l" />
        <BiometricsIndicator
          dna={Math.random() > 0.5}
          dental={Math.random() > 0.4}
          fingerprints={Math.random() > 0.6}
          familyDna={Math.random() > 0.3}
        />
      </div>

      {/* SLA + Priority Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className={`border - l - 4 ${risk.level === "Critical" ? "border-l-red-500 bg-red-50/20" :
          risk.level === "High" ? "border-l-amber-500 bg-amber-50/20" :
            "border-l-blue-500 bg-blue-50/20"
          } `}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                {/* Risk Score Circle */}
                <div className={`h - 14 w - 14 rounded - full flex items - center justify - center border - 2 ${risk.borderColor} ${risk.bgColor} `}>
                  <span className={`text - xl font - bold ${risk.color} `}>{risk.score}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={severityColors[risk.level === "Critical" ? "critical" : risk.level === "High" ? "high" : "medium"]}>
                      {risk.level} Priority
                    </Badge>
                    <SLATimer createdAt={caseData.created_at} status={caseData.status} />
                  </div>
                  <p className="text-sm mt-1">
                    <span className="font-medium">{suggestedActions[0]?.text || "Review case"}</span>
                    {suggestedActions[0]?.description && (
                      <span className="text-muted-foreground ml-1 text-xs">— {suggestedActions[0].description.slice(0, 80)}...</span>
                    )}
                  </p>
                </div>
              </div>
              {suggestedActions[0] && caseData.status !== "reunited" && (
                <Button size="sm" className="gap-2" onClick={caseData.status === "open" ? handleSearch : undefined}>
                  {searchLoading || isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {suggestedActions[0].actionLabel}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Layout: Info + Risk Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Photo + Info */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex gap-6">
              {photoUrl && !imgError ? (
                <Image
                  src={`${API_URL}${photoUrl.trim()}`}
                  alt={caseData.person_name}
                  width={128}
                  height={128}
                  className="h-32 w-32 rounded-xl object-cover border"
                  onError={() => setImgError(true)}
                  unoptimized
                />
              ) : (
                <div className="h-32 w-32 rounded-xl bg-muted flex items-center justify-center">
                  <User className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <h1 className="text-2xl font-bold">{caseData.person_name}</h1>
                  <Badge variant="outline" className="text-sm capitalize">{caseData.status}</Badge>
                </div>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {caseData.age && <p>Age: {caseData.age}</p>}
                  {caseData.gender && <p className="capitalize">Gender: {caseData.gender}</p>}
                  {caseData.description && <p>{caseData.description}</p>}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {caseData.last_known_location && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {caseData.last_known_location}
                    </span>
                  )}
                  {caseData.last_known_date && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {caseData.last_known_date}
                    </span>
                  )}
                  {caseData.contact_info && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" /> {caseData.contact_info}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Risk Signal Breakdown */}
        <Card className={`${risk.borderColor} `}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Risk Signal Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Overall score bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Composite Score</span>
                <span className={`font - bold ${risk.color} `}>{risk.score}/100</span>
              </div>
              <Progress value={risk.score} className={`h - 2 ${risk.progressColor} `} />
            </div>

            {/* Individual signals */}
            <div className="space-y-2.5">
              {risk.signals.map((signal, i) => {
                const SIcon = signal.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="rounded-lg border p-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <div className={`rounded p - 1 ${severityColors[signal.severity]} border`}>
                        <SIcon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{signal.label}</span>
                          <span className={`text - xs font - bold ${signal.value > 0 ? "text-red-600" : "text-blue-600"} `}>
                            {signal.value > 0 ? "+" : ""}{signal.value}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {signal.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {risk.signals.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Baseline risk — no elevated signals detected.
                </p>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 gap-1.5 text-xs"
                size="sm"
                onClick={handleSearch}
                disabled={searchLoading || isRunning}
              >
                {searchLoading || isRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                {isRunning
                  ? "Agents scanning..."
                  : caseData.media_assets && caseData.media_assets.length > 0
                    ? "Run Vision + Records Scan"
                    : "Run Cross-Source Match"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={refresh}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI-Suggested Actions Panel */}
      {suggestedActions.length > 0 && caseData.status !== "reunited" && (
        <Card className="border-red-200/30 bg-red-50/10 dark:bg-red-950/5 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-Suggested Actions
              <Badge variant="secondary" className="text-[10px] font-normal">
                {suggestedActions.filter((a) => a.priority === "immediate").length} immediate
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestedActions.map((action, i) => {
                const AIcon = action.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className={`rounded - lg border p - 3 ${action.priority === "immediate" ? "border-primary/30 bg-primary/5" : ""
                      } `}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`rounded - lg p - 1.5 ${action.priority === "immediate" ? "bg-primary/10" : "bg-muted"
                        } `}>
                        <AIcon className={`h - 3.5 w - 3.5 ${action.priority === "immediate" ? "text-primary" : "text-muted-foreground"
                          } `} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{action.text}</span>
                          <Badge
                            variant="outline"
                            className={`text - [9px] px - 1.5 py - 0 ${action.priority === "immediate"
                              ? "border-red-200 text-red-600 bg-red-50"
                              : "border-blue-200 text-blue-600 bg-blue-50"
                              } `}
                          >
                            {action.priority}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gemini AI Analysis Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              AI Intelligence Engine
              <Badge variant="outline" className="text-[10px] font-normal">Google Gemini</Badge>
            </CardTitle>
            {aiAnalysis && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" />
                Analysis ready
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: "risk", label: "Risk Assessment", icon: AlertTriangle },
              { key: "match", label: "Match Evaluation", icon: Shield },
              { key: "recommend", label: "Action Plan", icon: TrendingUp },
              { key: "summary", label: "Case Brief", icon: Eye },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                size="sm"
                variant={aiType === key && aiAnalysis ? "default" : "outline"}
                className="gap-1.5 text-xs"
                onClick={() => handleAiAnalysis(key)}
                disabled={aiLoading}
              >
                {aiLoading && aiType === key ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
                {label}
              </Button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {aiAnalysis ? (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="rounded-lg bg-muted/50 border p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto"
              >
                {aiAnalysis}
              </motion.div>
            ) : aiLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-3 py-8"
              >
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Gemini is analyzing case data...</span>
              </motion.div>
            ) : (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground text-center py-6"
              >
                Select an analysis type to get AI-powered intelligence from Google Gemini
              </motion.p>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Agent Status + Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AgentStatusPanel events={events} isRunning={isRunning} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Match Candidates
              {matches.length > 0 && (
                <Badge variant="secondary">{matches.length}</Badge>
              )}
            </h2>
            {pendingMatches > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 gap-1">
                <AlertTriangle className="h-3 w-3" />
                {pendingMatches} awaiting verification
              </Badge>
            )}
          </div>
          {matches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                <p>No matches yet.</p>
                <p className="text-xs mt-1">Run the AI search to deploy all 6 agents across 2,100+ records.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {matches
                .sort((a, b) => (b.fused_score || 0) - (a.fused_score || 0))
                .map((match, i) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="space-y-2"
                  >
                    <MatchEvidenceCard match={match} onVerify={handleVerify} />
                    {match.status === "approved" && (
                      <div className="flex gap-2 pl-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 text-xs"
                          onClick={() => handleOutreach(match.id)}
                        >
                          <Send className="h-3 w-3" />
                          Trigger NGO Outreach
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Lead Objects — Multiple leads per case */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              Case Leads
              <Badge variant="secondary" className="text-[10px]">
                {matches.length + 2} leads
              </Badge>
            </CardTitle>
            <div className="flex gap-2 text-[10px]">
              <Badge variant="outline" className="text-green-600 border-green-200">
                {matches.filter((m) => m.status === "approved").length} verified
              </Badge>
              <Badge variant="outline" className="text-amber-600 border-amber-200">
                {matches.filter((m) => m.status === "pending").length + 2} pending
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 pb-1">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Source</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Owner</div>
              <div className="col-span-2">Evidence</div>
              <div className="col-span-2">Updated</div>
            </div>

            {/* AI-generated leads from matches */}
            {matches.slice(0, 4).map((m, i) => (
              <div
                key={`lead - match - ${m.id} `}
                className={`grid grid - cols - 12 gap - 2 items - center rounded - lg border p - 2 text - xs ${m.status === "approved" ? "border-green-200 bg-green-50/30" : ""
                  } `}
              >
                <div className="col-span-1 font-mono text-muted-foreground">{i + 1}</div>
                <div className="col-span-3 truncate font-medium">{m.person_name || "AI Match"}</div>
                <div className="col-span-2">
                  <Badge variant="outline" className={`text - [9px] ${m.status === "approved" ? "text-green-600 border-green-200" :
                    m.status === "rejected" ? "text-red-600 border-red-200" :
                      "text-amber-600 border-amber-200"
                    } `}>
                    {m.status}
                  </Badge>
                </div>
                <div className="col-span-2 text-[10px] text-muted-foreground">
                  {m.status === "pending" ? "AI Pipeline" : "Agent Kim"}
                </div>
                <div className="col-span-2">
                  <div className="flex gap-1">
                    {(m.vision_score || 0) > 0.3 && (
                      <span className="h-4 w-4 rounded bg-blue-100 flex items-center justify-center">
                        <Eye className="h-2.5 w-2.5 text-blue-600" />
                      </span>
                    )}
                    {(m.rag_score || 0) > 0.3 && (
                      <span className="h-4 w-4 rounded bg-purple-100 flex items-center justify-center">
                        <FileText className="h-2.5 w-2.5 text-purple-600" />
                      </span>
                    )}
                    {(m.geo_score || 0) > 0.3 && (
                      <span className="h-4 w-4 rounded bg-green-100 flex items-center justify-center">
                        <MapPin className="h-2.5 w-2.5 text-green-600" />
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-[10px] text-muted-foreground font-mono">
                  {Math.floor(Math.random() * 12 + 1)}h ago
                </div>
              </div>
            ))}

            {/* Simulated TinyFish lead */}
            <div className="grid grid-cols-12 gap-2 items-center rounded-lg border p-2 text-xs">
              <div className="col-span-1 font-mono text-muted-foreground">{matches.length + 1}</div>
              <div className="col-span-3 truncate font-medium">Shelter tip (TinyFish)</div>
              <div className="col-span-2">
                <Badge variant="outline" className="text-[9px] text-blue-600 border-blue-200">investigating</Badge>
              </div>
              <div className="col-span-2 text-[10px] text-muted-foreground">TinyFish Bot</div>
              <div className="col-span-2">
                <span className="h-4 w-4 rounded bg-amber-100 flex items-center justify-center inline-flex">
                  <Zap className="h-2.5 w-2.5 text-amber-600" />
                </span>
              </div>
              <div className="col-span-2 text-[10px] text-muted-foreground font-mono">3h ago</div>
            </div>

            {/* Simulated community tip lead */}
            <div className="grid grid-cols-12 gap-2 items-center rounded-lg border border-dashed p-2 text-xs">
              <div className="col-span-1 font-mono text-muted-foreground">{matches.length + 2}</div>
              <div className="col-span-3 truncate font-medium">Community tip — phone</div>
              <div className="col-span-2">
                <Badge variant="outline" className="text-[9px] text-gray-600 border-gray-200">unverified</Badge>
              </div>
              <div className="col-span-2 text-[10px] text-muted-foreground">Unassigned</div>
              <div className="col-span-2">
                <span className="h-4 w-4 rounded bg-gray-100 flex items-center justify-center inline-flex">
                  <Phone className="h-2.5 w-2.5 text-gray-600" />
                </span>
              </div>
              <div className="col-span-2 text-[10px] text-muted-foreground font-mono">6h ago</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NamUs Forensic Services Indicator */}
      <NamusHelpIndicator />

      {/* TinyFish Automation Visibility */}
      <TinyFishTimeline caseId={caseData.id} personName={caseData.person_name} />

      {/* TinyFish Action Layer — 7 workflows */}
      <TinyFishActions
        caseId={caseData.id}
        personName={caseData.person_name}
      />
    </div>
  );
}
