"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Shield,
  Users,
  CheckCircle,
  ArrowRight,
  Lock,
  Eye,
  FileText,
  Globe,
  Zap,
  Heart,
  BarChart3,
  Clock,
  Send,
  Star,
  TrendingUp,
  Activity,
} from "lucide-react";

/* ─── Onboarding Steps ─── */
const onboardingSteps = [
  {
    step: 1,
    title: "Request Access",
    description: "Submit your organization details and use case. We verify credentials and assign a deployment tier.",
    details: [
      "Organization name, type (NGO, government, hospital network), and jurisdiction",
      "Estimated monthly caseload and data sources you operate",
      "Primary contact for technical integration",
      "Compliance certifications (GDPR, HIPAA, national equivalents)",
    ],
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-50",
    timeline: "1-2 business days",
  },
  {
    step: 2,
    title: "Configure Portal",
    description: "We provision a scoped partner portal with role-based access, data sharing rules, and consent workflows.",
    details: [
      "Choose access tier: View Only, Caseworker, or Full Operations",
      "Configure data sharing: which fields your org can see (redacted coordinates, full details, photos)",
      "Set up consent rules: family-reported cases only, or include agency-initiated searches",
      "Connect your existing case management system via API or CSV import",
    ],
    icon: Shield,
    color: "text-green-600",
    bg: "bg-green-50",
    timeline: "Same day",
  },
  {
    step: 3,
    title: "Go Live",
    description: "Onboard your team, run a pilot, and start receiving case alerts and coordination packs.",
    details: [
      "30-minute training session for caseworkers (or self-serve video guide)",
      "Pilot with 5-10 test cases to validate integration",
      "Enable automated agency pack delivery from TraceBridge cases",
      "Start receiving TinyFish-generated outreach and coordination requests",
    ],
    icon: Zap,
    color: "text-purple-600",
    bg: "bg-purple-50",
    timeline: "Within 1 week",
  },
];

/* ─── Partner Tiers ─── */
const partnerTiers = [
  {
    name: "View Only",
    description: "Receive case alerts and coordination packs. No case creation.",
    features: ["Receive agency coordination packs", "View redacted case summaries", "Respond to outreach requests", "Access shared checklist"],
    ideal: "Shelters, hospitals, local police",
    color: "border-blue-200",
  },
  {
    name: "Caseworker",
    description: "Full verification access with evidence review and match decisions.",
    features: ["Everything in View Only", "Access verification console", "Review and approve matches", "Trigger outreach workflows", "AI Evidence Assist"],
    ideal: "Red Cross, ICRC, UNHCR caseworkers",
    color: "border-green-200",
    highlighted: true,
  },
  {
    name: "Full Operations",
    description: "Complete platform access including Command Center and analytics.",
    features: ["Everything in Caseworker", "Command Center dashboard", "SLA monitoring and escalation", "Impact analytics and trends", "API access for integration", "Custom data source connectors"],
    ideal: "Emergency management agencies, government",
    color: "border-purple-200",
  },
];

/* ─── Case Studies ─── */
const caseStudies = [
  {
    title: "Hurricane Response — Gulf Coast",
    org: "American Red Cross (Simulated Pilot)",
    metrics: [
      { label: "Cases processed", value: "47" },
      { label: "Avg time to first lead", value: "4.2h" },
      { label: "Reunification rate", value: "78%" },
      { label: "Cost savings vs manual", value: "$38,400" },
    ],
    quote: "TraceBridge reduced our search coordination time from days to hours. The multi-channel outreach plans meant we could contact 5x more shelters per case.",
    outcome: "47 families separated during hurricane evacuation. TraceBridge matched 37 within 72 hours using cross-shelter registry matching and geo corridor prediction. 12 cases resolved through TinyFish automated outreach to partner shelters.",
  },
  {
    title: "Border Separation — Southwest Region",
    org: "International Rescue Committee (Simulated Pilot)",
    metrics: [
      { label: "Unaccompanied minors", value: "23" },
      { label: "Avg time to match", value: "6.8h" },
      { label: "AI accuracy", value: "84%" },
      { label: "Agencies coordinated", value: "8" },
    ],
    quote: "The consent tracking and minor protection workflows gave us confidence to deploy. Explainable AI scoring meant caseworkers trusted the results.",
    outcome: "23 unaccompanied minors processed through TraceBridge. Vision agent matched 19 with family reports from different facilities. Agency coordination packs sent to 8 partner organizations simultaneously via TinyFish.",
  },
];

export default function PartnersPage() {
  const [activeStudy, setActiveStudy] = useState(0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4">
        <Badge variant="outline" className="text-xs">Partner Program</Badge>
        <h1 className="text-3xl font-bold">Deploy TraceBridge in Your Organization</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Three steps from request to live operations. Secure, scoped access with consent tracking,
          role-based views, and automated coordination — built for agencies that need to move fast in crisis.
        </p>
      </div>

      {/* 3-Step Onboarding */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-center">Onboarding in 3 Steps</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {onboardingSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`rounded-lg p-2 ${step.bg}`}>
                        <Icon className={`h-5 w-5 ${step.color}`} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{step.timeline}</span>
                      </div>
                    </div>
                    <CardTitle className="text-base">
                      Step {step.step}: {step.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {step.details.map((d, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Access Tiers */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-center">Access Tiers</h2>
        <p className="text-sm text-muted-foreground text-center max-w-lg mx-auto">
          Every partner gets scoped access based on their role and jurisdiction. No partner sees more data than they need.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {partnerTiers.map((tier) => (
            <Card key={tier.name} className={`h-full ${tier.color} ${tier.highlighted ? "ring-2 ring-primary/20" : ""}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {tier.name}
                  {tier.highlighted && <Badge className="text-[9px]">Most Common</Badge>}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{tier.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1.5">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="pt-2 border-t">
                  <div className="text-[10px] text-muted-foreground">Ideal for:</div>
                  <div className="text-xs font-medium">{tier.ideal}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Case Studies */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold">Pilot Case Studies</h2>
          <p className="text-sm text-muted-foreground">
            Simulated deployments demonstrating measurable outcomes
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-4">
          {caseStudies.map((cs, i) => (
            <Button
              key={i}
              variant={activeStudy === i ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setActiveStudy(i)}
            >
              {cs.title.split("—")[0].trim()}
            </Button>
          ))}
        </div>

        <Card className="border-red-200/30 bg-white/40 dark:bg-slate-900/25 backdrop-blur-xl">
          <CardContent className="p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold">{caseStudies[activeStudy].title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{caseStudies[activeStudy].org}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {caseStudies[activeStudy].metrics.map((m, i) => (
                <div key={i} className="rounded-lg bg-muted/50 p-3 text-center">
                  <div className="text-xl font-bold">{m.value}</div>
                  <div className="text-[10px] text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
              <div className="flex gap-2 mb-2">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm italic">&ldquo;{caseStudies[activeStudy].quote}&rdquo;</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Outcome</h4>
              <p className="text-sm leading-relaxed">{caseStudies[activeStudy].outcome}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trust & Governance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Trust, Safety & Governance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Shield, title: "Consent Tracking", desc: "Every case shows consent status (family-reported, agency-initiated, or third-party). Visible in UI and enforced in data sharing." },
              { icon: Users, title: "Minor Protection", desc: "Cases involving children under 18 trigger enhanced protections: restricted photo sharing, mandatory guardian verification, and elevated SLA." },
              { icon: Eye, title: "Explainable AI", desc: "Every match shows a full evidence panel: which agent contributed, individual signal scores, red flags, and confidence reasoning." },
              { icon: FileText, title: "Audit Trail", desc: "Complete audit log: who accessed what, every verification decision, all outreach attempts, and every status change with timestamp." },
              { icon: Lock, title: "Data Redaction", desc: "Agency coordination packs auto-redact sensitive fields based on partner tier and jurisdiction. Coordinates can be approximate." },
              { icon: Globe, title: "Advisory Board", desc: "Independent ethics advisory board reviews AI accuracy, bias metrics, and reunification outcomes quarterly." },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex gap-3 p-3 rounded-lg border">
                  <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="text-center space-y-4 py-6">
        <h2 className="text-xl font-bold">Ready to Deploy?</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Request access to start your pilot. From request to live operations in under a week.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/cases/new">
            <Button className="gap-2">
              <Zap className="h-4 w-4" />
              Start Demo Flow
            </Button>
          </Link>
          <Link href="/architecture">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              View Architecture
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
