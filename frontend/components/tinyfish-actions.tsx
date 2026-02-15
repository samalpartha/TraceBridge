"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send,
  Phone,
  Radio,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Copy,
  Mail,
  MessageSquare,
  PhoneCall,
  Building2,
  Users,
  ClipboardList,
  Zap,
  Heart,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import {
  tfOutreachPlan,
  tfAgencyPack,
  tfCallAssist,
  tfClosure,
  tfEscalate,
} from "@/lib/api-client";

interface TinyFishActionsProps {
  caseId: string;
  personName: string;
  caseStatus: string;
  slaHours?: number;
}

/* ─── Outreach Plan Tab ─── */
function OutreachTab({ caseId, personName }: { caseId: string; personName: string }) {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string>("email");

  const channelIcons: Record<string, React.ElementType> = {
    email: Mail,
    sms: MessageSquare,
    whatsapp: MessageSquare,
    call_script: PhoneCall,
  };

  const generate = async () => {
    setLoading(true);
    try {
      const res = await tfOutreachPlan(caseId);
      setPlan(res.fallback || res.tinyfish_result);
      toast.success("Outreach plan generated via TinyFish");
    } catch {
      toast.error("Failed to generate plan");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {!plan ? (
        <div className="text-center py-8">
          <Send className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Generate a multi-channel contact plan with drafted messages for shelters, hospitals, police, and NGOs.
          </p>
          <Button onClick={generate} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            Generate Outreach Plan
          </Button>
        </div>
      ) : (
        <>
          {/* Contact plan */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Contact Plan</h4>
            <div className="space-y-1.5">
              {plan.contact_plan?.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] capitalize">{c.type}</Badge>
                    <span>{c.target}</span>
                  </div>
                  <Badge variant={c.priority <= 2 ? "destructive" : "secondary"} className="text-[9px]">
                    P{c.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Channel messages */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Drafted Messages</h4>
            <div className="flex gap-1 mb-3">
              {Object.keys(plan.messages || {}).map((ch) => {
                const Icon = channelIcons[ch] || Mail;
                return (
                  <Button
                    key={ch}
                    variant={activeChannel === ch ? "default" : "outline"}
                    size="sm"
                    className="gap-1 text-xs capitalize h-7"
                    onClick={() => setActiveChannel(ch)}
                  >
                    <Icon className="h-3 w-3" />
                    {ch.replace("_", " ")}
                  </Button>
                );
              })}
            </div>
            {plan.messages?.[activeChannel] && (
              <div className="relative">
                <pre className="text-xs bg-muted/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed border max-h-40 overflow-y-auto">
                  {plan.messages[activeChannel]}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(plan.messages[activeChannel]);
                    toast.success("Copied to clipboard");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Next steps */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Next Steps</h4>
            <div className="space-y-1">
              {plan.next_steps?.map((s: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                  {s}
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={generate}>
            <Zap className="h-3 w-3" /> Regenerate
          </Button>
        </>
      )}
    </div>
  );
}

/* ─── Agency Pack Tab ─── */
function AgencyPackTab({ caseId }: { caseId: string }) {
  const [pack, setPack] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [agency, setAgency] = useState("Red Cross");

  const agencies = ["Red Cross", "ICRC", "UNHCR", "IOM", "Local Police", "Hospital Network"];

  const generate = async () => {
    setLoading(true);
    try {
      const res = await tfAgencyPack(caseId, agency);
      setPack(res.fallback || res.tinyfish_result);
      toast.success(`Agency pack generated for ${agency}`);
    } catch {
      toast.error("Failed to generate pack");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {!pack ? (
        <div className="text-center py-8">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            Generate a shareable coordination packet with case summary, identifiers, and action checklist.
          </p>
          <div className="flex flex-wrap gap-1.5 justify-center mb-4">
            {agencies.map((a) => (
              <Button
                key={a}
                variant={agency === a ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setAgency(a)}
              >
                {a}
              </Button>
            ))}
          </div>
          <Button onClick={generate} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            Generate Pack for {agency}
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-lg border p-3 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="text-xs">{agency}</Badge>
              <Badge variant="outline" className="text-[9px]">Consent: {pack.consent_status}</Badge>
            </div>
            <p className="text-sm leading-relaxed">{pack.summary}</p>
            <div className="text-xs text-muted-foreground">
              <strong>Last seen:</strong> {pack.last_seen}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pack.identifiers?.map((id: any, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  {id.type}: {id.value}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Agency Checklist</h4>
            {pack.checklist?.map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs py-1">
                <input type="checkbox" className="mt-0.5 rounded" />
                {item}
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground text-center">
            {pack.contact_back}
          </div>
          <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => { setPack(null); }}>
            Generate for different agency
          </Button>
        </>
      )}
    </div>
  );
}

/* ─── Call Assist Tab ─── */
function CallAssistTab({ caseId }: { caseId: string }) {
  const [assist, setAssist] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [callType, setCallType] = useState("inquiry");

  const callTypes = [
    { value: "inquiry", label: "New Inquiry", icon: Phone },
    { value: "follow_up", label: "Follow Up", icon: PhoneCall },
    { value: "verification", label: "Verification", icon: Shield },
    { value: "family_update", label: "Family Update", icon: Heart },
  ];

  const generate = async () => {
    setLoading(true);
    try {
      const res = await tfCallAssist(caseId, callType);
      setAssist(res);
      toast.success("Call script ready");
    } catch {
      toast.error("Failed to generate script");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {callTypes.map((ct) => {
          const Icon = ct.icon;
          return (
            <Button
              key={ct.value}
              variant={callType === ct.value ? "default" : "outline"}
              size="sm"
              className="gap-1 text-xs h-7"
              onClick={() => { setCallType(ct.value); setAssist(null); }}
            >
              <Icon className="h-3 w-3" />
              {ct.label}
            </Button>
          );
        })}
      </div>

      {!assist ? (
        <div className="text-center py-6">
          <Phone className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Get a guided call script, structured note template, and suggested next calls.
          </p>
          <Button onClick={generate} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            Generate Call Script
          </Button>
        </div>
      ) : (
        <>
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Call Script</h4>
            <pre className="text-xs bg-muted/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed border max-h-48 overflow-y-auto">
              {assist.script}
            </pre>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Note Template — Capture These</h4>
            <div className="space-y-1">
              {assist.note_template?.fields_to_capture?.map((f: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <ClipboardList className="h-3 w-3 text-muted-foreground shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {assist.suggested_next_calls?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Suggested Next Calls</h4>
              {assist.suggested_next_calls.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                  <div>
                    <span className="font-medium">{c.target}</span>
                    <span className="text-muted-foreground ml-2">— {c.reason}</span>
                  </div>
                  <Badge variant={c.priority === "high" ? "destructive" : "secondary"} className="text-[9px]">
                    {c.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Closure Tab ─── */
function ClosureTab({ caseId, personName }: { caseId: string; personName: string }) {
  const [closure, setClosure] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const generate = async () => {
    setLoading(true);
    try {
      const res = await tfClosure(caseId);
      setClosure(res);
      toast.success("Closure workflow loaded");
    } catch {
      toast.error("Failed to load closure steps");
    }
    setLoading(false);
  };

  const toggleStep = (step: number) => {
    const next = new Set(checkedSteps);
    next.has(step) ? next.delete(step) : next.add(step);
    setCheckedSteps(next);
  };

  return (
    <div className="space-y-4">
      {!closure ? (
        <div className="text-center py-8">
          <Heart className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Launch the post-reunification closure workflow: verify identity, notify agencies, archive evidence, and record impact metrics.
          </p>
          <Button onClick={generate} disabled={loading} className="gap-2 bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Start Closure Workflow
          </Button>
        </div>
      ) : (
        <>
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Closure Steps — {personName}
            </h4>
            <div className="space-y-2">
              {closure.closure_steps?.map((s: any) => (
                <div
                  key={s.step}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                    checkedSteps.has(s.step) ? "bg-green-50 border-green-200" : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleStep(s.step)}
                >
                  <input
                    type="checkbox"
                    checked={checkedSteps.has(s.step)}
                    onChange={() => toggleStep(s.step)}
                    className="mt-0.5 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">Step {s.step}: {s.action}</div>
                    <div className="text-xs text-muted-foreground">{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground text-center mt-2">
              {checkedSteps.size} of {closure.closure_steps?.length || 0} steps completed
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Closure Notifications</h4>
            {closure.notifications?.map((n: any, i: number) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs mb-1.5">
                <Badge variant="outline" className="text-[9px] shrink-0 capitalize">{n.channel}</Badge>
                <div>
                  <span className="font-medium">{n.recipient}:</span>{" "}
                  <span className="text-muted-foreground">{n.message}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ━━━ Main TinyFish Actions Panel ━━━ */
export function TinyFishActions({ caseId, personName, caseStatus, slaHours }: TinyFishActionsProps) {
  return (
    <Card className="border-blue-200/50 bg-gradient-to-br from-blue-50/30 to-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-600" />
          TinyFish Action Layer
          <Badge variant="outline" className="text-[9px] font-normal border-blue-200 text-blue-600">
            7 workflows
          </Badge>
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Automated outreach, agency coordination, call assist, and closure — powered by TinyFish Web Agent.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="outreach" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="outreach" className="text-[10px] gap-1">
              <Send className="h-3 w-3" /> Outreach
            </TabsTrigger>
            <TabsTrigger value="agency" className="text-[10px] gap-1">
              <Building2 className="h-3 w-3" /> Agency
            </TabsTrigger>
            <TabsTrigger value="call" className="text-[10px] gap-1">
              <Phone className="h-3 w-3" /> Call
            </TabsTrigger>
            <TabsTrigger value="closure" className="text-[10px] gap-1">
              <Heart className="h-3 w-3" /> Closure
            </TabsTrigger>
          </TabsList>

          <TabsContent value="outreach" className="mt-3">
            <OutreachTab caseId={caseId} personName={personName} />
          </TabsContent>

          <TabsContent value="agency" className="mt-3">
            <AgencyPackTab caseId={caseId} />
          </TabsContent>

          <TabsContent value="call" className="mt-3">
            <CallAssistTab caseId={caseId} />
          </TabsContent>

          <TabsContent value="closure" className="mt-3">
            <ClosureTab caseId={caseId} personName={personName} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
