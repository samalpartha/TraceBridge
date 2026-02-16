"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Settings2,
  Shield,
  AlertTriangle,
  Send,
  Building2,
  Globe,
  Radio,
  CheckCircle,
  Clock,
  Users,
  Wifi,
  Lock,
} from "lucide-react";

/* ─── Confidence Threshold Controls ─── */
export function ThresholdControls() {
  const [matchThreshold, setMatchThreshold] = useState([65]);
  const [urgencyThreshold, setUrgencyThreshold] = useState([75]);
  const [autoOutreach, setAutoOutreach] = useState([85]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          Operational Thresholds
          <Badge variant="outline" className="text-[9px] ml-auto">Supervisor</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Shield className="h-3 w-3 text-blue-600" />
              <span>Min match score</span>
            </div>
            <span className="text-xs font-mono font-bold">{matchThreshold[0]}%</span>
          </div>
          <Slider
            value={matchThreshold}
            onValueChange={setMatchThreshold}
            max={100}
            min={30}
            step={5}
            className="[&>span:first-child]:h-1 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Matches below {matchThreshold[0]}% auto-deprioritized
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs">
              <AlertTriangle className="h-3 w-3 text-amber-600" />
              <span>Urgency threshold</span>
            </div>
            <span className="text-xs font-mono font-bold">{urgencyThreshold[0]}</span>
          </div>
          <Slider
            value={urgencyThreshold}
            onValueChange={setUrgencyThreshold}
            max={100}
            min={40}
            step={5}
            className="[&>span:first-child]:h-1 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Cases scoring &ge; {urgencyThreshold[0]} trigger auto-escalation
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Send className="h-3 w-3 text-green-600" />
              <span>Auto-outreach eligibility</span>
            </div>
            <span className="text-xs font-mono font-bold">{autoOutreach[0]}%</span>
          </div>
          <Slider
            value={autoOutreach}
            onValueChange={setAutoOutreach}
            max={100}
            min={50}
            step={5}
            className="[&>span:first-child]:h-1 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            TinyFish auto-outreach only for matches &ge; {autoOutreach[0]}%
          </p>
        </div>

        <div className="pt-2 border-t flex items-center gap-2">
          <Lock className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">
            Auto-actions always disabled for minors. All outreach requires human review.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Multi-Tenant / Region Selector ─── */
export function WorkspaceSelector() {
  const [activeRegion, setActiveRegion] = useState("all");

  const regions = [
    { id: "all", label: "All Regions", cases: 47 },
    { id: "southeast", label: "Southeast US", cases: 18 },
    { id: "southwest", label: "Southwest US", cases: 12 },
    { id: "pacific", label: "Pacific NW", cases: 9 },
    { id: "northeast", label: "Northeast US", cases: 8 },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-600" />
          Region / Workspace
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {regions.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveRegion(r.id)}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${activeRegion === r.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted"
              }`}
          >
            <span>{r.label}</span>
            <Badge variant="outline" className="text-[9px]">{r.cases}</Badge>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

/* ─── Partner Collaboration Panel ─── */
export function PartnerPanel() {
  const partners = [
    { name: "Red Cross Houston", status: "connected", lastSync: "2m ago", icon: CheckCircle, color: "text-green-600" },
    { name: "FEMA Region IV", status: "connected", lastSync: "5m ago", icon: CheckCircle, color: "text-green-600" },
    { name: "NamUs (Public Tier)", status: "connected", lastSync: "12m ago", icon: Wifi, color: "text-green-600" },
    { name: "County Sheriff — Harris", status: "pending", lastSync: "Awaiting access", icon: Clock, color: "text-amber-600" },
    { name: "Shelter Network SE", status: "syncing", lastSync: "Sync active", icon: Radio, color: "text-blue-600" },
    { name: "IOM Missing Migrants", status: "connected", lastSync: "1h ago", icon: CheckCircle, color: "text-green-600" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-600" />
            Partner Agencies
          </CardTitle>
          <Badge variant="outline" className="text-[9px] text-green-600 border-green-200">
            {partners.filter((p) => p.status === "connected").length}/{partners.length} connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {partners.map((p) => {
          const PIcon = p.icon;
          return (
            <div key={p.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <PIcon className={`h-3 w-3 shrink-0 ${p.color}`} />
                <span className="truncate">{p.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{p.lastSync}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ─── Agent Workload Distribution ─── */
export function AgentWorkloadPanel() {
  const agents = [
    { name: "Vision Agent", active: 14, pending: 3, status: "active" as const },
    { name: "RAG Agent", active: 9, pending: 1, status: "active" as const },
    { name: "Geo Agent", active: 0, pending: 0, status: "idle" as const },
    { name: "TinyFish Agent", active: 3, pending: 7, status: "active" as const },
    { name: "Verification Agent", active: 8, pending: 12, status: "active" as const },
    { name: "NamUs Agent", active: 4, pending: 2, status: "active" as const },
    { name: "Legacy Intel Agent", active: 7, pending: 0, status: "active" as const },
  ];

  const totalActive = agents.reduce((s, a) => s + a.active, 0);
  const totalPending = agents.reduce((s, a) => s + a.pending, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            Agent Workload
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[9px] text-green-600 border-green-200">{totalActive} active</Badge>
            <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-200">{totalPending} queued</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {agents.map((a) => (
          <div key={a.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className={`h-1.5 w-1.5 rounded-full ${a.status === "active" ? "bg-green-500" : "bg-muted-foreground/40"}`} />
              <span className="truncate">{a.name}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] shrink-0 ml-2">
              <span className="font-mono">{a.active} active</span>
              {a.pending > 0 && (
                <span className="font-mono text-muted-foreground">{a.pending} pending</span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
