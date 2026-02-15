"use client";

import { motion } from "framer-motion";
import {
  FileSearch,
  Scan,
  Eye,
  FileText,
  MapPin,
  Merge,
  CheckCircle,
  Heart,
  Send,
} from "lucide-react";

const stages = [
  { key: "reported", label: "Case Reported", icon: FileSearch, color: "bg-blue-500" },
  { key: "scanning", label: "Scanning Sources", icon: Scan, color: "bg-indigo-500" },
  { key: "vision", label: "Visual Analysis", icon: Eye, color: "bg-violet-500" },
  { key: "records", label: "Records Search", icon: FileText, color: "bg-purple-500" },
  { key: "geo", label: "Geo Intelligence", icon: MapPin, color: "bg-green-500" },
  { key: "fusion", label: "Match Fusion", icon: Merge, color: "bg-yellow-500" },
  { key: "verified", label: "Match Verified", icon: CheckCircle, color: "bg-emerald-500" },
  { key: "outreach", label: "Outreach Sent", icon: Send, color: "bg-teal-500" },
  { key: "reunited", label: "Reunited", icon: Heart, color: "bg-red-500" },
];

interface TimelineProps {
  currentStage: string;
  animated?: boolean;
}

export function CaseTimeline({ currentStage, animated = true }: TimelineProps) {
  const currentIdx = stages.findIndex((s) => s.key === currentStage);
  const activeIdx = currentIdx >= 0 ? currentIdx : 0;

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {stages.map((stage, i) => {
        const Icon = stage.icon;
        const isComplete = i <= activeIdx;
        const isCurrent = i === activeIdx;

        const Wrapper = animated ? motion.div : "div";
        const props = animated
          ? {
              initial: { opacity: 0, scale: 0.8 },
              animate: { opacity: 1, scale: 1 },
              transition: { delay: i * 0.1, duration: 0.3 },
            }
          : {};

        return (
          <div key={stage.key} className="flex items-center">
            <Wrapper {...props}>
              <div className="flex flex-col items-center gap-1 min-w-[60px]">
                <div
                  className={`rounded-full p-1.5 ${
                    isComplete ? stage.color : "bg-muted"
                  } ${isCurrent ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                >
                  <Icon
                    className={`h-3 w-3 ${
                      isComplete ? "text-white" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] text-center leading-tight ${
                    isComplete
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            </Wrapper>
            {i < stages.length - 1 && (
              <div
                className={`h-0.5 w-4 mx-0.5 ${
                  i < activeIdx ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
