"use client";

import { IdentityGraphViz } from "@/components/identity-graph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Network,
  Layers,
  User,
  MapPin,
  Database,
  Tag,
  Eye,
  Fingerprint,
  Zap,
  Shield,
  Brain,
} from "lucide-react";

export default function GraphPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Unified Identity Graph
          </h1>
          <p className="text-muted-foreground text-sm">
            Every entity is a node. Every relationship is an edge. Matches are paths, not rows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </Badge>
        </div>
      </div>

      {/* What the graph shows */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {[
          { icon: User, label: "Person", color: "#ef4444", desc: "Reported missing persons" },
          { icon: Eye, label: "Sighting", color: "#f59e0b", desc: "Source records + tips" },
          { icon: MapPin, label: "Location", color: "#22c55e", desc: "Last known / shelter" },
          { icon: Database, label: "Source", color: "#3b82f6", desc: "FBI, NamUs, IOM, etc." },
          { icon: Tag, label: "Descriptor", color: "#a855f7", desc: "Physical traits, clothing" },
          { icon: Fingerprint, label: "Match Edge", color: "#ec4899", desc: "AI-scored connection" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-l-2" style={{ borderLeftColor: item.color }}>
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                  <span className="text-xs font-semibold">{item.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Graph visualization */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Interactive Graph Explorer
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Click nodes to inspect &middot; Hover to highlight connections &middot; Scroll to zoom &middot; Drag to pan
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-2">
          <IdentityGraphViz height={560} />
        </CardContent>
      </Card>

      {/* Why this matters */}
      <Card className="bg-white/40 dark:bg-slate-900/25 backdrop-blur-xl border-white/20 dark:border-white/8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm">Why a Graph?</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Traditional case management thinks in flat rows. A graph reveals hidden connections — two missing persons sharing a descriptor,
                a shelter sighting linking to a cold case, geo-proximity creating corridors. The graph IS the intelligence.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-sm">Network Effect</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every new data source, report, or sighting adds nodes and edges. More connections = better matches = higher resolution.
                This is a defensible data moat that grows with every agency that connects.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-sm">Identity Resolution</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Matches are not just vector similarity — they are graph paths with multi-hop reasoning. A person shares a descriptor with a
                sighting that was reported at the same location as another case. The graph surfaces this automatically.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
