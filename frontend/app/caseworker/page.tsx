"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MatchEvidenceCard } from "@/components/match-evidence-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { verifyMatch, triggerOutreach, tfVerifyAssist } from "@/lib/api-client";
import {
  Shield,
  Loader2,
  RefreshCw,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
  ArrowUpDown,
  Inbox,
  Activity,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import type { MatchCandidate } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";

type FilterType = "all" | "pending" | "approved" | "rejected";

export default function CaseworkerPage() {
  const [matches, setMatches] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("pending");
  const [sortBy, setSortBy] = useState<"score" | "date">("score");
  const [evidenceCards, setEvidenceCards] = useState<any[]>([]);
  const [aiAssisting, setAiAssisting] = useState(false);

  const handleAiAssist = async () => {
    setAiAssisting(true);
    try {
      // Get unique case IDs from pending matches
      const pendingCaseIds = [...new Set(matches.filter((m) => m.status === "pending").map((m) => m.case_id))];
      const allCards: any[] = [];
      for (const caseId of pendingCaseIds.slice(0, 3)) {
        const res = await tfVerifyAssist(caseId);
        allCards.push(...(res.fallback || []));
      }
      setEvidenceCards(allCards);
      toast.success(`TinyFish generated ${allCards.length} evidence cards`);
    } catch {
      toast.error("AI evidence assist failed");
    }
    setAiAssisting(false);
  };

  const fetchAllMatches = async () => {
    try {
      setLoading(true);
      const casesRes = await fetch(`${API_URL}/api/cases/`);
      if (!casesRes.ok) throw new Error("Failed to fetch cases");
      const casesData = await casesRes.json();

      const allMatches: MatchCandidate[] = [];
      for (const c of casesData.cases || []) {
        const matchRes = await fetch(`${API_URL}/api/matches/case/${c.id}`);
        if (matchRes.ok) {
          const caseMatches = await matchRes.json();
          allMatches.push(...caseMatches);
        }
      }
      setMatches(allMatches);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMatches();
  }, []);

  const handleVerify = async (matchId: string, action: string) => {
    try {
      await verifyMatch(matchId, action);
      toast.success(`Match ${action}ed successfully`);
      fetchAllMatches();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleOutreach = async (matchId: string) => {
    try {
      await triggerOutreach(matchId);
      toast.success("Outreach triggered via TinyFish automation");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const filteredMatches = matches
    .filter((m) => filter === "all" || m.status === filter)
    .sort((a, b) => {
      if (sortBy === "score") return (b.fused_score || 0) - (a.fused_score || 0);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  const pendingCount = matches.filter((m) => m.status === "pending").length;
  const approvedCount = matches.filter((m) => m.status === "approved").length;
  const rejectedCount = matches.filter((m) => m.status === "rejected").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Verification Console
          </h1>
          <p className="text-muted-foreground text-sm">
            Review AI matches. Every reunification requires human verification.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAiAssist}
            disabled={aiAssisting}
            className="gap-2"
          >
            {aiAssisting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            AI Evidence Assist
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllMatches}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* TinyFish Evidence Cards */}
      {evidenceCards.length > 0 && (
        <Card className="border-blue-200/30 bg-blue-50/15 dark:bg-blue-950/10 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600" />
              TinyFish Evidence Analysis
              <Badge variant="outline" className="text-[9px]">{evidenceCards.length} cards</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {evidenceCards.map((card, i) => (
                <div key={i} className="rounded-lg border bg-background p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono">Match {card.match_id}</span>
                    <Badge
                      variant={card.confidence === "high" ? "default" : card.confidence === "medium" ? "secondary" : "outline"}
                      className="text-[9px]"
                    >
                      {card.confidence} confidence
                    </Badge>
                  </div>
                  {card.evidence?.map((e: any, j: number) => (
                    <div key={j} className="flex items-center justify-between text-xs">
                      <span>{e.type}: {e.detail}</span>
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${e.strength * 10}%` }} />
                        </div>
                        <span className="text-muted-foreground">{e.strength}/10</span>
                      </div>
                    </div>
                  ))}
                  {card.red_flags?.filter(Boolean).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {card.red_flags.filter(Boolean).map((f: string, k: number) => (
                        <Badge key={k} variant="outline" className="text-[9px] border-red-200 text-red-600">{f}</Badge>
                      ))}
                    </div>
                  )}
                  <Badge
                    variant={card.recommendation === "confirm" ? "default" : card.recommendation === "need_more" ? "secondary" : "destructive"}
                    className="text-[9px]"
                  >
                    Recommendation: {card.recommendation}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Queue",
            count: matches.length,
            icon: Inbox,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
          },
          {
            label: "Awaiting Review",
            count: pendingCount,
            icon: Clock,
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            pulse: pendingCount > 0,
          },
          {
            label: "Verified",
            count: approvedCount,
            icon: CheckCircle,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
          },
          {
            label: "Rejected",
            count: rejectedCount,
            icon: AlertTriangle,
            color: "text-red-500",
            bgColor: "bg-red-500/10",
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div>
                    <div className="text-xl font-bold flex items-center gap-1.5">
                      {stat.count}
                      {stat.pulse && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["pending", "approved", "rejected", "all"] as FilterType[]).map(
            (f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "ghost"}
                className="h-7 text-xs capitalize"
                onClick={() => setFilter(f)}
              >
                {f}
                {f === "pending" && pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 text-xs px-1.5">
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            )
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={() => setSortBy(sortBy === "score" ? "date" : "score")}
        >
          <ArrowUpDown className="h-3 w-3" />
          Sort: {sortBy === "score" ? "Confidence" : "Newest"}
        </Button>
      </div>

      {/* Match list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Could not load matches. Ensure the backend is running.
          </CardContent>
        </Card>
      ) : filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-1">
              {filter === "pending"
                ? "No pending matches to review"
                : `No ${filter} matches found`}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {filter === "pending"
                ? "All matches have been reviewed. Great work!"
                : "Try changing the filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredMatches.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                layout
              >
                <div className="space-y-2">
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
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
