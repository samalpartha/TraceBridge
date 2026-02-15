"use client";

import { useState, useEffect } from "react";
import { Activity, Wifi, Clock, Layers, Cpu, Database, Zap, AlertTriangle } from "lucide-react";

function useSimulatedMetric(base: number, variance: number, interval = 3000) {
  const [value, setValue] = useState(base);
  useEffect(() => {
    const t = setInterval(() => {
      setValue(Math.max(0, base + (Math.random() - 0.5) * variance * 2));
    }, interval);
    return () => clearInterval(t);
  }, [base, variance, interval]);
  return value;
}

export function SystemHealthStrip() {
  const ingestLatency = useSimulatedMetric(42, 15, 4000);
  const matchQueue = useSimulatedMetric(7, 4, 5000);
  const agentResponseMs = useSimulatedMetric(180, 60, 3500);
  const activeAgents = useSimulatedMetric(5, 1.5, 6000);
  const uptime = 99.97;

  const metrics = [
    {
      icon: Wifi,
      label: "Ingest",
      value: `${Math.round(ingestLatency)}ms`,
      status: ingestLatency < 80 ? "green" : ingestLatency < 150 ? "amber" : "red",
    },
    {
      icon: Layers,
      label: "Queue",
      value: `${Math.round(matchQueue)}`,
      status: matchQueue < 15 ? "green" : matchQueue < 30 ? "amber" : "red",
    },
    {
      icon: Cpu,
      label: "Agent Resp",
      value: `${Math.round(agentResponseMs)}ms`,
      status: agentResponseMs < 300 ? "green" : agentResponseMs < 600 ? "amber" : "red",
    },
    {
      icon: Zap,
      label: "Agents",
      value: `${Math.round(activeAgents)}/7`,
      status: activeAgents >= 4 ? "green" : activeAgents >= 2 ? "amber" : "red",
    },
    {
      icon: Database,
      label: "Uptime",
      value: `${uptime}%`,
      status: "green",
    },
  ];

  const statusDot: Record<string, string> = {
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div className="hidden md:flex items-center gap-4 border-b bg-white/60 backdrop-blur-xl px-4 py-1 text-[10px] text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Activity className="h-3 w-3" />
        <span className="font-medium uppercase tracking-wider">System</span>
      </div>
      <div className="h-3 border-l" />
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div key={m.label} className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDot[m.status]}`} />
            <Icon className="h-2.5 w-2.5" />
            <span>{m.label}:</span>
            <span className="font-mono font-medium">{m.value}</span>
          </div>
        );
      })}
      <div className="ml-auto flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        <span>All systems operational</span>
      </div>
    </div>
  );
}
