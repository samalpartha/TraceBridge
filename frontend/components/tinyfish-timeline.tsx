"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  Radio,
} from "lucide-react";

interface TinyFishTimelineProps {
  caseId: string;
  personName: string;
}

/* Simulated automation actions for a case */
function getTimelineEvents(caseId: string) {
  const hash = caseId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const baseTime = Date.now() - 3600000 * (hash % 24 + 1);

  const events = [
    {
      id: 1,
      time: new Date(baseTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      agent: "TinyFish Ingestion",
      action: "Scanned Red Cross Houston shelter registry",
      channel: "web-scrape",
      icon: Bot,
      status: "completed" as const,
      detail: "Extracted 23 new records, 3 potential matches identified",
    },
    {
      id: 2,
      time: new Date(baseTime + 900000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      agent: "TinyFish Outreach",
      action: "Email sent to GRB Convention Center",
      channel: "email",
      icon: Mail,
      status: "completed" as const,
      detail: "Shelter coordinator confirmed receipt. Response pending.",
    },
    {
      id: 3,
      time: new Date(baseTime + 1800000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      agent: "TinyFish Outreach",
      action: "SMS sent to NRG Center intake desk",
      channel: "sms",
      icon: MessageSquare,
      status: "completed" as const,
      detail: "Message delivered. Auto-follow-up in 2h if no reply.",
    },
    {
      id: 4,
      time: new Date(baseTime + 2700000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      agent: "TinyFish Call Assist",
      action: "Call script prepared for Harris County PD",
      channel: "call",
      icon: Phone,
      status: "pending" as const,
      detail: "Script generated. Awaiting caseworker initiation.",
    },
    {
      id: 5,
      time: new Date(baseTime + 3600000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      agent: "TinyFish SLA Guard",
      action: "Escalation check scheduled",
      channel: "system",
      icon: Shield,
      status: "scheduled" as const,
      detail: "Will escalate to supervisor if no verification in 2h.",
    },
  ];

  return events;
}

const channelColors: Record<string, string> = {
  email: "border-blue-200 text-blue-700 bg-blue-50",
  sms: "border-green-200 text-green-700 bg-green-50",
  call: "border-purple-200 text-purple-700 bg-purple-50",
  "web-scrape": "border-amber-200 text-amber-700 bg-amber-50",
  system: "border-gray-200 text-gray-700 bg-gray-50",
};

const statusIcons: Record<string, { icon: typeof CheckCircle; color: string }> = {
  completed: { icon: CheckCircle, color: "text-green-500" },
  pending: { icon: Clock, color: "text-amber-500" },
  scheduled: { icon: Radio, color: "text-blue-500" },
  failed: { icon: XCircle, color: "text-red-500" },
};

export function TinyFishTimeline({ caseId, personName }: TinyFishTimelineProps) {
  const events = getTimelineEvents(caseId);
  const completed = events.filter((e) => e.status === "completed").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-600" />
            TinyFish Automation Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">
              {completed}/{events.length} completed
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Automated actions triggered for {personName}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {events.map((event, i) => {
            const EventIcon = event.icon;
            const StatusInfo = statusIcons[event.status];
            const StatusIcon = StatusInfo.icon;
            return (
              <div key={event.id} className="flex gap-3">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center ${event.status === "completed"
                      ? "border-green-300 bg-green-50"
                      : event.status === "pending"
                        ? "border-amber-300 bg-amber-50"
                        : "border-blue-300 bg-blue-50"
                    }`}>
                    <EventIcon className={`h-3.5 w-3.5 ${event.status === "completed"
                        ? "text-green-600"
                        : event.status === "pending"
                          ? "text-amber-600"
                          : "text-blue-600"
                      }`} />
                  </div>
                  {i < events.length - 1 && (
                    <div className="w-0.5 h-full min-h-[24px] bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-4 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium">{event.action}</span>
                    <Badge variant="outline" className={`text-[9px] ${channelColors[event.channel]}`}>
                      {event.channel}
                    </Badge>
                    <StatusIcon className={`h-3 w-3 ${StatusInfo.color}`} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground font-mono">{event.time}</span>
                    <span className="text-[10px] text-muted-foreground">&middot;</span>
                    <span className="text-[10px] text-muted-foreground">{event.agent}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{event.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
