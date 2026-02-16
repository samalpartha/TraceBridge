"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Clock } from "lucide-react";

/* ─── Generate realistic trend data ─── */
function generateReunionTrend() {
  const data = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 29);

  let cumReunions = 0;
  let cumHours = 0;

  for (let i = 0; i < 30; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);

    // Use index i to derive deterministic "random" values for mock data
    // This avoids React purity/hydration warnings
    const dailyReunions = (i % 7 === 0 || i % 13 === 0) ? 1 : 0;
    cumReunions += dailyReunions;

    // Time-to-reunion decreasing as AI improves
    const noise = ((i * 13) % 10) - 5;
    const baseTime = 72 - i * 1.5 + noise;
    const timeToReunion = Math.max(8, Math.round(baseTime));

    // AI accuracy improving
    const accNoise = ((i * 7) % 5) - 2.5;
    const baseAccuracy = 55 + i * 1.2 + accNoise;
    const accuracy = Math.min(95, Math.round(baseAccuracy));

    // Hours saved accumulating
    cumHours += dailyReunions > 0 ? 48 : ((i * 17) % 8);

    data.push({
      day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      reunions: cumReunions,
      timeToReunion,
      accuracy,
      hoursSaved: cumHours,
    });
  }
  return data;
}

export function ImpactTrends() {
  const data = useMemo(() => generateReunionTrend(), []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Time to Reunion Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            Time to First Lead
            <Badge variant="secondary" className="text-[9px] font-normal">30d trend</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="timeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} unit="h" />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(value) => [`${value}h`, "Time to lead"]}
                />
                <Area
                  type="monotone"
                  dataKey="timeToReunion"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#timeGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            Decreasing trend — AI reducing search time
          </p>
        </CardContent>
      </Card>

      {/* AI Match Accuracy Over Time */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-purple-500" />
            AI Match Accuracy
            <Badge variant="secondary" className="text-[9px] font-normal">improving</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} unit="%" domain={[40, 100]} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(value) => [`${value}%`, "Accuracy"]}
                />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#accGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            Increasing precision with calibrated scoring
          </p>
        </CardContent>
      </Card>

      {/* Cumulative Reunifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            Cumulative Impact
            <Badge variant="secondary" className="text-[9px] font-normal">30d</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Line
                  type="stepAfter"
                  dataKey="reunions"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="Reunifications"
                />
                <Line
                  type="monotone"
                  dataKey="hoursSaved"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  name="Hours saved"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-1">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-1.5 w-3 bg-green-500 rounded" /> Reunifications
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-1.5 w-3 bg-amber-500 rounded" /> Hours saved
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
