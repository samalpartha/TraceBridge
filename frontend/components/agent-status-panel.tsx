"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SearchPipelineEvent } from "@/lib/types";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Scan,
} from "lucide-react";

const agentLabels: Record<string, string> = {
  PIPELINE_STARTED: "Starting Pipeline",
  INTAKE_COMPLETE: "Intake Agent",
  AGENTS_STARTED: "Launching Agents",
  VISION_COMPLETE: "Vision Agent",
  RAG_COMPLETE: "Records Agent",
  GEO_STARTED: "Geo Agent",
  GEO_COMPLETE: "Geo Agent",
  FUSION_STARTED: "Fusion Engine",
  PIPELINE_COMPLETE: "Pipeline Complete",
  PIPELINE_ERROR: "Pipeline Error",
};

export function AgentStatusPanel({
  events,
  isRunning,
}: {
  events: SearchPipelineEvent[];
  isRunning: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : events.length > 0 ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <Scan className="h-4 w-4 text-muted-foreground" />
          )}
          Agent Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 && !isRunning && (
          <p className="text-sm text-muted-foreground">
            No search running. Click &quot;Search&quot; to start the AI pipeline.
          </p>
        )}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {events.map((event, i) => (
              <motion.div
                key={`evt-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-3 text-sm"
              >
                <div className="mt-0.5">
                  {event.type === "PIPELINE_COMPLETE" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : event.type === "PIPELINE_ERROR" ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {agentLabels[event.type] || event.type}
                    </span>
                    {event.candidates_found !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        {event.candidates_found} found
                      </Badge>
                    )}
                    {event.matches_above_threshold !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        {event.matches_above_threshold} matches
                      </Badge>
                    )}
                  </div>
                  {event.message && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {event.message}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
            {isRunning && (
              <motion.div
                key="processing-indicator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
