"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Zap,
  Building2,
  Globe,
  Shield,
  Server,
  Heart,
  ArrowRight,
  BarChart3,
} from "lucide-react";

const plans = [
  {
    name: "Community",
    price: "Free",
    period: "",
    description: "For small NGOs and community organizations running limited caseloads.",
    features: [
      "Up to 50 cases/month",
      "6 AI agent pipeline",
      "Google Maps crisis map",
      "Basic match scoring",
      "Email outreach templates",
      "Community support",
    ],
    cta: "Get Started",
    highlighted: false,
    icon: Heart,
    color: "text-green-600",
  },
  {
    name: "Agency",
    price: "$2,500",
    period: "/mo",
    description: "For emergency agencies and regional NGOs needing full operational intelligence.",
    features: [
      "Unlimited cases",
      "Full Command Center",
      "SLA monitoring + TinyFish escalation",
      "7 TinyFish automated workflows",
      "Agency coordination packs",
      "Google Gemini AI analysis",
      "Source trust scoring + anomaly detection",
      "Priority support + onboarding",
      "API access",
    ],
    cta: "Request Access",
    highlighted: true,
    icon: Building2,
    color: "text-blue-600",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For governments, UN agencies, and multi-regional deployments requiring dedicated infrastructure.",
    features: [
      "Everything in Agency",
      "Multi-tenant deployment",
      "Federated search across jurisdictions",
      "Custom data source connectors",
      "On-premise or private cloud option",
      "Dedicated AI model tuning",
      "Independent audit + compliance pack",
      "24/7 crisis support line",
      "White-label option",
    ],
    cta: "Contact Sales",
    highlighted: false,
    icon: Globe,
    color: "text-purple-600",
  },
];

const deploymentModels = [
  {
    model: "Per-Incident Deployment",
    description: "Activated on-demand during a specific crisis event. Pay per deployment period.",
    ideal: "Disaster response, hurricane season, earthquake aftermath",
    pricing: "$5,000-$25,000 per event depending on scale and duration",
    icon: Zap,
  },
  {
    model: "Government Licensing",
    description: "Annual license for state or national emergency management agencies.",
    ideal: "FEMA, state emergency management, national disaster authorities",
    pricing: "Annual contract based on population served and data sources",
    icon: Shield,
  },
  {
    model: "API & Data Integration",
    description: "Integrate TraceBridge matching and identity resolution into your existing systems.",
    ideal: "Case management vendors, hospital networks, border agencies",
    pricing: "Per-API-call pricing with volume discounts",
    icon: Server,
  },
];

const unitEconomics = [
  { metric: "Cost per case (manual)", value: "$4,080", detail: "48 hours avg search * $85/hr caseworker" },
  { metric: "Cost per case (TraceBridge)", value: "$340", detail: "4 hours avg search * $85/hr with AI assist" },
  { metric: "Cost savings per case", value: "$3,740", detail: "92% reduction in caseworker hours" },
  { metric: "Avg reunification time", value: "24h → 4.2h", detail: "6x faster with multi-agent pipeline" },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-3">
        <Badge variant="outline" className="text-xs">Revenue Model</Badge>
        <h1 className="text-3xl font-bold">Pricing That Aligns With Mission</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Free for community organizations. Enterprise licensing for agencies that need
          operational intelligence at scale. Every dollar spent saves families time.
        </p>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan, i) => {
          const Icon = plan.icon;
          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`h-full flex flex-col bg-white/50 dark:bg-slate-900/30 backdrop-blur-xl ${plan.highlighted ? "ring-2 ring-red-500/30 !border-red-200/40 shadow-[0_8px_32px_rgba(220,38,38,0.08)]" : "border-white/25 dark:border-white/8"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Icon className={`h-5 w-5 ${plan.color}`} />
                    {plan.highlighted && <Badge>Recommended</Badge>}
                  </div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-xs">
                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full mt-4 gap-2 ${plan.highlighted ? "" : "variant-outline"}`}
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Unit Economics */}
      <Card className="border-red-200/30 bg-red-50/10 dark:bg-red-950/5 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Unit Economics — Why This Pays for Itself
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {unitEconomics.map((ue, i) => (
              <div key={i} className="text-center p-3 rounded-lg bg-background border">
                <div className="text-xl font-bold">{ue.value}</div>
                <div className="text-xs font-medium mt-1">{ue.metric}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{ue.detail}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Based on average NGO caseworker cost of $85/hour and TraceBridge pilot data.
            A single Agency license at $2,500/month pays for itself after 1 case.
          </p>
        </CardContent>
      </Card>

      {/* Deployment Models */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-center">Deployment Models</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {deploymentModels.map((dm, i) => {
            const Icon = dm.icon;
            return (
              <Card key={i} className="h-full">
                <CardContent className="p-5 space-y-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-bold">{dm.model}</h3>
                  <p className="text-xs text-muted-foreground">{dm.description}</p>
                  <div className="border-t pt-2 space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase font-medium">Ideal for</div>
                    <div className="text-xs">{dm.ideal}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{dm.pricing}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Mission alignment */}
      <div className="text-center space-y-4 py-6 border-t">
        <Heart className="h-8 w-8 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">Revenue That Serves the Mission</h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Community tier is always free. Revenue from Agency and Enterprise licenses funds
          platform development, AI model improvements, and expanded data source integrations.
          Every paying customer makes the free tier better for everyone.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/partners">
            <Button className="gap-2">
              <Building2 className="h-4 w-4" />
              Partner Onboarding
            </Button>
          </Link>
          <Link href="/architecture">
            <Button variant="outline" className="gap-2">
              <Server className="h-4 w-4" />
              Technical Architecture
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
