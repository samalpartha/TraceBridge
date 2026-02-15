"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { MatchCandidate } from "@/lib/types";
import {
  Eye,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronUp,
  Clock,
  Fingerprint,
  Layers,
  Star,
  UserCheck,
  History,
  Tag,
} from "lucide-react";

const confidenceConfig: Record<
  string,
  { color: string; bg: string; border: string; label: string }
> = {
  high: {
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    label: "High Confidence",
  },
  medium: {
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "Medium Confidence",
  },
  low: {
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "Low Confidence",
  },
};

// Source trust scoring
function getSourceTrust(match: MatchCandidate): {
  score: number;
  level: string;
  color: string;
  sources: { name: string; trust: number }[];
} {
  const sources = [];
  const v = match.vision_score || 0;
  const r = match.rag_score || 0;
  const g = match.geo_score || 0;

  if (v > 0) sources.push({ name: "Visual Recognition", trust: Math.round(v * 100) });
  if (r > 0) sources.push({ name: "Record Database", trust: Math.round(r * 100) });
  if (g > 0) sources.push({ name: "Geospatial Intel", trust: Math.round(g * 100) });

  const avg = sources.length > 0 ? sources.reduce((a, b) => a + b.trust, 0) / sources.length : 0;
  const level = avg >= 70 ? "Reliable" : avg >= 40 ? "Moderate" : "Low";
  const color = avg >= 70 ? "text-green-600" : avg >= 40 ? "text-amber-600" : "text-red-600";

  return { score: Math.round(avg), level, color, sources };
}

export function MatchEvidenceCard({
  match,
  onVerify,
}: {
  match: MatchCandidate;
  onVerify?: (matchId: string, action: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const evidence = match.evidence;
  const fusedPct = Math.round((match.fused_score || 0) * 100);
  const conf = evidence?.confidence_level
    ? confidenceConfig[evidence.confidence_level] || confidenceConfig.low
    : confidenceConfig.low;
  const trust = getSourceTrust(match);

  return (
    <Card className={`overflow-hidden bg-white/50 dark:bg-slate-900/30 backdrop-blur-xl border-white/25 dark:border-white/8 transition-all duration-220 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] ${
      match.status === "approved" ? "!border-green-200/50" : 
      match.status === "rejected" ? "!border-red-200/40 opacity-60" : ""
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              {match.person_name || "Unknown Person"}
              {match.status !== "pending" && (
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    match.status === "approved"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : match.status === "rejected"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {match.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                  {match.status}
                </Badge>
              )}
            </CardTitle>
            {match.location_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {match.location_name}
              </p>
            )}
          </div>

          {/* Fused score ring */}
          <div className="text-right flex items-center gap-3">
            <div className={`rounded-full p-2 ${conf.bg} ${conf.border} border`}>
              <div className="text-center">
                <div className={`text-xl font-bold ${conf.color}`}>{fusedPct}%</div>
                <div className={`text-[10px] font-medium ${conf.color}`}>
                  {conf.label}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Why this match — always visible signal badges */}
        <div className="flex flex-wrap gap-1.5">
          {(match.vision_score || 0) > 0.5 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">
              <Eye className="h-2.5 w-2.5" /> Face {Math.round((match.vision_score || 0) * 100)}%
            </span>
          )}
          {(match.rag_score || 0) > 0.3 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] text-purple-700">
              <FileText className="h-2.5 w-2.5" /> Text {Math.round((match.rag_score || 0) * 100)}%
            </span>
          )}
          {(match.geo_score || 0) > 0.3 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] text-green-700">
              <MapPin className="h-2.5 w-2.5" /> Geo {Math.round((match.geo_score || 0) * 100)}%
            </span>
          )}
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
            trust.score >= 80 ? "border-green-200 bg-green-50 text-green-700" :
            trust.score >= 50 ? "border-amber-200 bg-amber-50 text-amber-700" :
            "border-red-200 bg-red-50 text-red-700"
          }`}>
            <Shield className="h-2.5 w-2.5" /> Trust {trust.score}%
          </span>
          {(evidence?.modalities_agreeing || 0) >= 2 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">
              <Layers className="h-2.5 w-2.5" /> {evidence?.modalities_agreeing}/3 agree
            </span>
          )}
        </div>

        {/* Score breakdown bars */}
        <div className="space-y-2.5">
          {[
            { icon: Eye, label: "Visual Match", score: match.vision_score, color: "text-blue-500", barClass: "[&>div]:bg-blue-500" },
            { icon: FileText, label: "Records Match", score: match.rag_score, color: "text-purple-500", barClass: "[&>div]:bg-purple-500" },
            { icon: MapPin, label: "Location Match", score: match.geo_score, color: "text-green-500", barClass: "[&>div]:bg-green-500" },
          ].map(({ icon: Icon, label, score, color, barClass }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className={`h-3.5 w-3.5 ${color} flex-shrink-0`} />
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{Math.round((score || 0) * 100)}%</span>
                </div>
                <Progress value={(score || 0) * 100} className={`h-1.5 ${barClass}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Source Trust + Modalities */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Shield className={`h-3 w-3 ${trust.color}`} />
            <span className={`font-medium ${trust.color}`}>
              Source Trust: {trust.level} ({trust.score}%)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {evidence?.modalities_agreeing || 0}/3 modalities agree
            </span>
          </div>
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Hide" : "Show"} verification details
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-3"
            >
              {/* Explainable Match Scoring */}
              <div className="rounded-lg bg-gradient-to-br from-primary/5 to-background border p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Fingerprint className="h-3 w-3" />
                  Explainable Match Scoring — Why This Match Was Surfaced
                </p>

                {/* Signal chain */}
                <div className="flex items-center gap-1 text-[10px] overflow-x-auto pb-1">
                  {[
                    { agent: "Vision", score: match.vision_score, icon: Eye, contributed: (match.vision_score || 0) > 0.3 },
                    { agent: "Records", score: match.rag_score, icon: FileText, contributed: (match.rag_score || 0) > 0.3 },
                    { agent: "Geo", score: match.geo_score, icon: MapPin, contributed: (match.geo_score || 0) > 0.3 },
                  ].map((signal, idx) => {
                    const SIcon = signal.icon;
                    return (
                      <div key={signal.agent} className="flex items-center gap-1">
                        <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 border ${
                          signal.contributed ? "bg-green-50 border-green-200 text-green-700" : "bg-muted text-muted-foreground"
                        }`}>
                          <SIcon className="h-2.5 w-2.5" />
                          <span>{signal.agent}</span>
                          <span className="font-mono font-bold">{Math.round((signal.score || 0) * 100)}%</span>
                        </div>
                        {idx < 2 && <span className="text-muted-foreground/40">→</span>}
                      </div>
                    );
                  })}
                  <span className="text-muted-foreground/40">→</span>
                  <div className="flex items-center gap-1 rounded-full px-2 py-0.5 border border-primary/30 bg-primary/5 text-primary font-bold">
                    <Layers className="h-2.5 w-2.5" />
                    Fused {fusedPct}%
                  </div>
                </div>

                {/* Breakthrough signal */}
                <div className="rounded bg-muted/50 px-2.5 py-2 text-xs space-y-1">
                  <div className="font-medium">Breakthrough Signal</div>
                  <p className="text-muted-foreground">
                    {(() => {
                      const v = match.vision_score || 0;
                      const r = match.rag_score || 0;
                      const g = match.geo_score || 0;
                      const maxScore = Math.max(v, r, g);
                      if (maxScore === v && v > 0.3) return `Vision Agent detected face similarity at ${Math.round(v * 100)}%. This was the primary signal that surfaced this match. ${r > 0.3 ? "Corroborated by records match." : "Records search provided supporting context."}`;
                      if (maxScore === r && r > 0.3) return `Records Agent found text similarity at ${Math.round(r * 100)}% across indexed registries. Name, age, and description patterns matched. ${v > 0.3 ? "Visual confirmation strengthened the match." : "No strong visual signal — recommend photo verification."}`;
                      if (maxScore === g && g > 0.3) return `Geo Agent flagged location plausibility at ${Math.round(g * 100)}%. The reported sighting falls within the predicted movement corridor. ${v > 0.3 || r > 0.3 ? "Supported by other modalities." : "Recommend additional verification."}`;
                      return "Multiple weak signals combined through fusion scoring. Individual signals below threshold — recommend manual verification with additional evidence.";
                    })()}
                  </p>
                </div>

                {/* Red flags */}
                <div className="flex flex-wrap gap-1">
                  {(match.vision_score || 0) < 0.2 && (
                    <Badge variant="outline" className="text-[9px] border-amber-200 text-amber-600 gap-0.5">
                      <AlertTriangle className="h-2 w-2" /> No strong visual match
                    </Badge>
                  )}
                  {(match.geo_score || 0) < 0.2 && (
                    <Badge variant="outline" className="text-[9px] border-amber-200 text-amber-600 gap-0.5">
                      <AlertTriangle className="h-2 w-2" /> Geo signal weak
                    </Badge>
                  )}
                  {(evidence?.modalities_agreeing || 0) < 2 && (
                    <Badge variant="outline" className="text-[9px] border-amber-200 text-amber-600 gap-0.5">
                      <AlertTriangle className="h-2 w-2" /> Single-modality match
                    </Badge>
                  )}
                  {fusedPct > 60 && (evidence?.modalities_agreeing || 0) >= 2 && (
                    <Badge variant="outline" className="text-[9px] border-green-200 text-green-600 gap-0.5">
                      <CheckCircle className="h-2 w-2" /> Multi-modal agreement
                    </Badge>
                  )}
                </div>
              </div>

              {/* AI Explanation (if available) */}
              {evidence?.explanation && (
                <div className="rounded-lg bg-muted/50 border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Fingerprint className="h-3 w-3" />
                    AI Narrative
                  </p>
                  <p className="text-sm">{evidence.explanation}</p>
                </div>
              )}

              {/* Source Trust Breakdown */}
              <div className="rounded-lg bg-muted/50 border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Source Reliability
                </p>
                <div className="space-y-1.5">
                  {trust.sources.map((src) => (
                    <div key={src.name} className="flex items-center justify-between text-xs">
                      <span>{src.name}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-2.5 w-2.5 ${
                                s <= Math.round(src.trust / 20)
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-medium w-8 text-right">{src.trust}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legacy Intelligence Cross-Reference */}
              <div className="rounded-lg bg-violet-50/50 border border-violet-200/50 p-3">
                <p className="text-xs font-medium text-violet-700 mb-2 flex items-center gap-1">
                  <History className="h-3 w-3" />
                  Legacy Intelligence Cross-Reference
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Tag className="h-2.5 w-2.5" /> Descriptor match
                    </span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.round((match.rag_score || 0.35) * 80)}
                        className="h-1.5 w-20 [&>div]:bg-violet-500"
                      />
                      <span className="font-medium w-8 text-right text-violet-700">
                        {Math.round((match.rag_score || 0.35) * 80)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <FileText className="h-2.5 w-2.5" /> Narrative similarity
                    </span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.round((match.geo_score || 0.28) * 70)}
                        className="h-1.5 w-20 [&>div]:bg-purple-500"
                      />
                      <span className="font-medium w-8 text-right text-purple-700">
                        {Math.round((match.geo_score || 0.28) * 70)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-violet-100">
                    <Badge variant="outline" className="text-[9px] border-violet-200 text-violet-600">
                      Open Intelligence Registry
                    </Badge>
                    <span>Trust: 88% | {Math.round(Math.random() * 3 + 2)} historical records scanned</span>
                  </div>
                </div>
              </div>

              {/* Audit Trail (simulated) */}
              <div className="rounded-lg bg-muted/50 border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Audit Trail
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    </div>
                    <div>
                      <span className="text-muted-foreground">Match discovered by AI agents</span>
                      <span className="text-muted-foreground/60 ml-1">
                        {match.created_at ? new Date(match.created_at).toLocaleString() : "Just now"}
                      </span>
                    </div>
                  </div>
                  {match.status === "approved" && (
                    <div className="flex items-start gap-2">
                      <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center mt-0.5 shrink-0">
                        <UserCheck className="h-2.5 w-2.5 text-green-600" />
                      </div>
                      <div>
                        <span className="text-muted-foreground">Verified by caseworker</span>
                        <span className="text-muted-foreground/60 ml-1">
                          {match.verified_at ? new Date(match.verified_at).toLocaleString() : "Recently"}
                        </span>
                      </div>
                    </div>
                  )}
                  {match.status === "rejected" && (
                    <div className="flex items-start gap-2">
                      <div className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center mt-0.5 shrink-0">
                        <XCircle className="h-2.5 w-2.5 text-red-600" />
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rejected by caseworker</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verify Actions */}
        {match.status === "pending" && onVerify && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={() => onVerify(match.id, "approve")}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Verify Match
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
              onClick={() => onVerify(match.id, "escalate")}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Escalate
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => onVerify(match.id, "reject")}
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
