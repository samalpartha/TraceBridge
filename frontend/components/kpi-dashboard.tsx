"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/api-client";
import type { DashboardStats } from "@/lib/types";
import {
  Users,
  Search,
  CheckCircle,
  Heart,
  Database,
  Send,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Activity,
} from "lucide-react";

const statConfig = [
  {
    key: "total_cases",
    label: "Total Cases",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    trend: "+3 this week",
    trendUp: true,
  },
  {
    key: "active_cases",
    label: "Active Searches",
    icon: Search,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    trend: "2 urgent",
    trendUp: null,
    pulse: true,
  },
  {
    key: "total_matches",
    label: "Matches Found",
    icon: CheckCircle,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    trend: "+2 today",
    trendUp: true,
  },
  {
    key: "reunited_count",
    label: "Families Reunited",
    icon: Heart,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    trend: "1 this week",
    trendUp: true,
    highlight: true,
  },
  {
    key: "total_source_records",
    label: "Records Indexed",
    icon: Database,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    trend: "FBI + IOM + shelters",
    trendUp: true,
    highlight: false,
  },
  {
    key: "approved_matches",
    label: "Verified Matches",
    icon: TrendingUp,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    trend: "Human-verified only",
    trendUp: null,
  },
  {
    key: "total_outreach_events",
    label: "Outreach Sent",
    icon: Send,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    trend: "Via TinyFish agent",
    trendUp: null,
  },
  {
    key: "reunification_rate",
    label: "Reunion Rate",
    icon: Activity,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    suffix: "%",
    trend: "Target: 40%",
    trendUp: true,
  },
];

function AnimatedNumber({ value, suffix }: { value: number; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayed(value);
        clearInterval(interval);
      } else {
        setDisplayed(Math.round(current * 10) / 10);
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value]);

  const formatted = Number.isInteger(displayed)
    ? displayed.toLocaleString()
    : displayed.toFixed(1);

  return (
    <span>
      {formatted}
      {suffix}
    </span>
  );
}

export function KPIDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = () => {
    getDashboardStats()
      .then((data) => {
        setStats(data);
        setLastUpdated(new Date());
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30s for live feeling
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Dashboard data unavailable. Start the backend to see live stats.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Live indicator */}
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span>
          Live {lastUpdated ? `\u00b7 ${lastUpdated.toLocaleTimeString()}` : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statConfig.map((stat, i) => {
          const Icon = stat.icon;
          const value =
            stats && stat.key in stats
              ? (stats as unknown as Record<string, number>)[stat.key]
              : 0;

          return (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <Card
                className={`relative overflow-hidden bg-white/50 dark:bg-slate-900/30 backdrop-blur-xl border-white/25 dark:border-white/8 transition-all duration-220 hover:bg-white/70 dark:hover:bg-slate-900/50 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] ${stat.highlight
                    ? "!border-red-200/40 shadow-[0_0_12px_rgba(220,38,38,0.06)]"
                    : ""
                  }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`rounded-lg p-1.5 ${stat.bgColor}`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                    </div>
                    {stat.pulse && stats && value > 0 && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold tracking-tight">
                    {stats ? (
                      <AnimatedNumber value={value} suffix={stat.suffix} />
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {stat.label}
                  </div>
                  {stat.trend && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {stat.trendUp === true && (
                        <ArrowUp className="h-3 w-3 text-green-500" />
                      )}
                      {stat.trendUp === false && (
                        <ArrowDown className="h-3 w-3 text-red-500" />
                      )}
                      <span
                        className={`text-xs ${stat.trendUp === true
                            ? "text-green-600"
                            : stat.trendUp === false
                              ? "text-red-600"
                              : "text-muted-foreground"
                          }`}
                      >
                        {stat.trend}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
