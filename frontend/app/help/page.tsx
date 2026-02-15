"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Users,
  Search,
  Shield,
  Send,
  MapPin,
  Radio,
  LayoutDashboard,
  FolderSearch,
  Camera,
  FileText,
  Eye,
  Zap,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Layers,
  Database,
  Globe,
  Sparkles,
  Bot,
  Phone,
  Building2,
  ClipboardList,
} from "lucide-react";

/* ─── User Flows ─────────────────────────────────────────── */

const userFlows = [
  {
    id: "report",
    title: "Report a Missing Person",
    icon: Users,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    description: "How to submit a new missing person case into the system",
    steps: [
      { action: "Click \"Report Missing\" button", detail: "Available in the sidebar (bottom) or on the landing page. The red button is always visible.", page: "/cases/new" },
      { action: "Upload a photo", detail: "Drag and drop or click to upload a photo of the missing person. JPG, PNG, or WebP up to 10MB. This enables our AI Vision agent.", page: null },
      { action: "Enter person details", detail: "Full name (required), age, gender, and any distinguishing features like clothing, scars, or tattoos.", page: null },
      { action: "Provide last known location", detail: "Enter the location description, latitude/longitude coordinates, and the date they were last seen.", page: null },
      { action: "Add contact info", detail: "Your phone or email so we can reach you when a match is found.", page: null },
      { action: "Submit the case", detail: "Once submitted, the case appears in the system with \"Open\" status. You'll be redirected to the case detail page.", page: null },
    ],
  },
  {
    id: "search",
    title: "Run AI Search Pipeline",
    icon: Search,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Trigger all 6 AI agents to search for a missing person across data sources",
    steps: [
      { action: "Go to a case detail page", detail: "From the Cases list, click on any case to view its details.", page: "/cases" },
      { action: "Click \"Run AI Search\"", detail: "The button appears in the Next Best Action banner and in the right panel. This deploys all 6 AI agents simultaneously.", page: null },
      { action: "Watch the Agent Pipeline", detail: "The Agent Pipeline panel shows real-time progress: Intake → Vision → Records → Geo → Fusion. Each agent reports its findings.", page: null },
      { action: "Review match results", detail: "When the pipeline completes, match candidates appear ranked by fused confidence score. Each match shows visual, records, and geo scores.", page: null },
    ],
  },
  {
    id: "verify",
    title: "Verify a Match",
    icon: Shield,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    description: "Review AI-generated matches with TinyFish evidence assist and make verification decisions",
    steps: [
      { action: "Go to the Verification Console", detail: "Click \"Verify\" in the sidebar to see all pending matches across all cases.", page: "/caseworker" },
      { action: "Use AI Evidence Assist", detail: "Click the 'AI Evidence Assist' button to have TinyFish generate evidence cards for all pending matches — each card shows confidence level, evidence breakdown with strength bars, red flags, and a confirm/reject/need_more recommendation.", page: null },
      { action: "Review the match evidence", detail: "Each match card shows: fused confidence %, individual scores (Visual, Records, Geo), source trust rating, and modality agreement.", page: null },
      { action: "Expand verification details", detail: "Click \"Show verification details\" to see the AI analysis explanation, source reliability breakdown with star ratings, and the audit trail.", page: null },
      { action: "Make a decision", detail: "Choose one of three actions: Verify Match (approve), Escalate (flag for senior review), or Reject (false positive).", page: null },
      { action: "Trigger outreach if verified", detail: "After verifying, a \"Trigger NGO Outreach\" button appears. This sends the match to partner organizations via TinyFish automation.", page: null },
    ],
  },
  {
    id: "dashboard",
    title: "Use the Command Center",
    icon: LayoutDashboard,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    description: "Monitor operations, risk scores, SLA timers, agent assignments, and escalate breaches",
    steps: [
      { action: "View KPI metrics + impact trends", detail: "8 real-time KPIs plus 3 Recharts trend charts: Time to First Lead (decreasing), AI Match Accuracy (improving), and Cumulative Impact (reunifications + hours saved).", page: "/dashboard" },
      { action: "Check Next Best Actions", detail: "The left panel shows the top 4 most urgent cases with risk scores and the recommended next action for each.", page: null },
      { action: "Review the Operations Queue", detail: "Cases ranked by risk (0-100) with columns: Risk, Case, Assigned Agent (AI or human), SLA timer with progress bar, Priority label, and Status.", page: null },
      { action: "Escalate SLA breaches", detail: "When cases breach SLA, a red badge appears in the header. Click 'Escalate All' to trigger TinyFish escalation for all breaching cases — generates action lists and notifies coordinators.", page: null },
      { action: "Monitor the Live Feed + Crisis Map", detail: "Real-time intelligence feed with anomaly detection and source trust. Crisis map with heatmap toggle and timeline slider for 72h replay.", page: null },
    ],
  },
  {
    id: "livefeed",
    title: "Ingest Live Data",
    icon: Radio,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    description: "Pull real-time data from FBI, IOM, and other sources — or trigger TinyFish source scans",
    steps: [
      { action: "Go to the Live Feed page", detail: "Click \"Live Feed\" in the sidebar. You'll see connected data sources and their status.", page: "/live" },
      { action: "Scan All Sources via TinyFish", detail: "Click 'Scan All Sources' to trigger TinyFish agents to scan FBI, IOM, NamUs, and Red Cross shelters simultaneously. Each source shows its scan status and run ID.", page: null },
      { action: "Scan individual sources", detail: "Each data source card has a 'Scan' button to trigger TinyFish for just that source. New records auto-trigger re-scoring for open cases.", page: null },
      { action: "Pull FBI data", detail: "Click \"Pull FBI Data\" to fetch missing persons and kidnapping cases from the FBI Wanted API. No authentication needed.", page: null },
      { action: "Pull IOM data", detail: "Click \"Pull IOM Data\" to load migration incident data. 21,000+ incidents with real coordinates.", page: null },
      { action: "Monitor the Intelligence Feed", detail: "The feed shows anomaly detection (geographic clustering, source concentration spikes) and source trust scores (FBI 95%, IOM 82%, etc.).", page: null },
    ],
  },
  {
    id: "map",
    title: "Crisis Intelligence Map",
    icon: MapPin,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    description: "Google Maps with heatmap layer, timeline replay, and radius prediction",
    steps: [
      { action: "Open the Intel Map", detail: "Click \"Intel Map\" in the sidebar for the full-screen map view, or view the map on the Command Center dashboard.", page: "/map" },
      { action: "Toggle heatmap mode", detail: "Click the 'Heatmap Off/On' button in the top-right to switch between individual data-point markers and a density heatmap (red-orange-yellow-blue gradient).", page: null },
      { action: "Use the timeline slider", detail: "The bottom overlay has a play/pause button and slider. Press play to watch data accumulate over the last 72 hours, or drag the slider to any point in time.", page: null },
      { action: "Understand the markers", detail: "Colored circles = source reports. Solid circles with white borders = active cases. Animated pulse rings = high-urgency cases. Dashed radius rings = search area prediction (~80km).", page: null },
      { action: "Click for details", detail: "Click any marker to see a popup with details: person name, status, SLA, lat/lng, and search radius.", page: null },
      { action: "Check overlay stats", detail: "Top-right corner shows: Active Cases count, Data Points, and Incidents count — all filtered by the timeline position.", page: null },
    ],
  },
  {
    id: "tinyfish",
    title: "TinyFish Action Layer (7 Workflows)",
    icon: Bot,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Automated outreach, agency coordination, call assist, escalation, and closure — powered by TinyFish",
    steps: [
      { action: "Open the TinyFish panel on any case", detail: "Go to any case detail page and scroll to the 'TinyFish Action Layer' card at the bottom. It has 4 tabs: Outreach, Agency, Call, Closure.", page: null },
      { action: "Generate an Outreach Plan (Tab 1)", detail: "Click 'Generate Outreach Plan' to get a 5-target contact plan (shelter, hospital, PD, NGO, hotline) with drafted messages for email, SMS, WhatsApp, and a call script. Copy any message to clipboard.", page: null },
      { action: "Create an Agency Pack (Tab 2)", detail: "Choose a partner agency (Red Cross, ICRC, UNHCR, IOM, Police, Hospital) and generate a shareable coordination packet with case summary, identifiers, consent status, and a 7-item checklist.", page: null },
      { action: "Get Call Center Assist (Tab 3)", detail: "Select a call type (New Inquiry, Follow Up, Verification, Family Update) and generate a guided script, structured note template, and suggested next calls ranked by priority.", page: null },
      { action: "Run the Closure Workflow (Tab 4)", detail: "After reunification, launch a 7-step checklist: confirm identity, verify guardian, record details, send closure notifications, archive evidence, write lessons learned, and update impact metrics.", page: null },
      { action: "Scan sources from Live Feed", detail: "On the Live Feed page, click 'Scan All Sources' or per-source 'Scan' buttons to trigger TinyFish agents that pull new records from FBI, IOM, NamUs, and shelters.", page: "/live" },
      { action: "Escalate SLA breaches from Command Center", detail: "When SLA breaches exist, click 'Escalate All' in the Command Center header. TinyFish generates an alert message, 5 prioritized actions, role notifications, and a follow-up interval for each breaching case.", page: "/dashboard" },
    ],
  },
  {
    id: "partners",
    title: "Partner Onboarding & Case Studies",
    icon: Building2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    description: "How agencies onboard, access tiers, pilot case studies with measurable outcomes",
    steps: [
      { action: "Visit the Partners page", detail: "Click 'Partners' in the sidebar. This page shows the 3-step onboarding process: Request Access → Configure Portal → Go Live.", page: "/partners" },
      { action: "Review access tiers", detail: "Three tiers are available: View Only (shelters, hospitals), Caseworker (Red Cross, UNHCR), and Full Operations (government agencies). Each tier has scoped data access.", page: null },
      { action: "Read pilot case studies", detail: "Two simulated deployments with real metrics: Hurricane Response (47 cases, 78% reunion rate, $38K savings) and Border Separation (23 minors, 84% AI accuracy).", page: null },
      { action: "Review trust and governance", detail: "The page details 6 governance pillars: consent tracking, minor protection, explainable AI, audit trail, data redaction, and advisory board.", page: null },
    ],
  },
  {
    id: "pricing",
    title: "Pricing & Revenue Model",
    icon: ClipboardList,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    description: "Enterprise licensing tiers, unit economics, and deployment models",
    steps: [
      { action: "Visit the Pricing page", detail: "Click 'Pricing' in the sidebar. Three plans: Community (free, 50 cases/mo), Agency ($2,500/mo, unlimited), Enterprise (custom).", page: "/pricing" },
      { action: "Review unit economics", detail: "Manual case search costs ~$4,080 (48h × $85/hr). TraceBridge reduces this to ~$340 (4h × $85/hr). 92% cost reduction per case.", page: null },
      { action: "Explore deployment models", detail: "Per-Incident Deployment for disaster response, Government Licensing for agencies, and API & Data Integration for vendors.", page: null },
    ],
  },
  {
    id: "consent",
    title: "Consent & Minor Protection",
    icon: Shield,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    description: "How TraceBridge tracks consent, protects minors, and ensures explainable AI decisions",
    steps: [
      { action: "View consent badge on any case", detail: "Every case detail page shows a consent banner: Family-Reported, Agency-Initiated, or Third-Party. This is enforced in data sharing.", page: null },
      { action: "Minor protection triggers", detail: "Cases with age < 18 show an amber 'Minor Protection Active' badge. Children under 12 trigger photo restriction, mandatory guardian verification, and elevated SLA.", page: null },
      { action: "Explainable match scoring", detail: "Expand any match card and see the full signal chain: which agent contributed the breakthrough signal, red flag badges, and multi-modal agreement indicators.", page: null },
      { action: "Audit trail", detail: "Every action is logged: match discovered, verified, rejected, outreach sent, escalation triggered. Visible in match card details.", page: null },
    ],
  },
  {
    id: "demo",
    title: "Guided Demo Mode",
    icon: Zap,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    description: "Walk through the full end-to-end pipeline in 8 guided steps",
    steps: [
      { action: "Launch Demo Mode", detail: "Click the 'Demo Mode' button in the bottom-right corner of any page. A guided overlay appears with step-by-step instructions.", page: null },
      { action: "Follow the 8-step narrative", detail: "The demo walks through: Command Center → Report Case → AI Search → AI Analysis → Review Matches → Verify → TinyFish Outreach → Reunion Confirmed.", page: null },
      { action: "Navigate automatically", detail: "Click 'Next' to advance steps. When a step requires a different page, click 'Go to page' to navigate there.", page: null },
      { action: "Minimize or close", detail: "Use the minimize button to keep the guide active but compact, or close it entirely to explore freely.", page: null },
    ],
  },
  {
    id: "legacy",
    title: "Legacy Intelligence & Descriptor Search",
    icon: Search,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    description: "Search historical cold cases using structured identity descriptors — no photo required",
    steps: [
      { action: "Open the Live Feed page", detail: "The Multimodal Description Search panel is located on the Live Feed page, below the data sources and above the intelligence feed.", page: "/live" },
      { action: "Enter a natural language description", detail: "Type descriptors like 'blue jacket, rose tattoo left arm, scar on forearm, male 30s, Gulf Coast'. The system matches against structured identity attributes: scars, tattoos, clothing, dental, jewelry, and case narratives.", page: null },
      { action: "Review ranked results", detail: "Each result shows: relevance score, matched descriptor badges, descriptor match percentage, narrative similarity percentage, and expandable full case narrative with all structured attributes.", page: null },
      { action: "View historical layer on the map", detail: "On the Intel Map, toggle 'Historical' to see purple markers for legacy cold cases. Click any marker for details including year, region, and status.", page: "/map" },
      { action: "Cross-reference during verification", detail: "When reviewing match cards, expand the details to see the 'Legacy Intelligence Cross-Reference' section showing descriptor match and narrative similarity against cold case records.", page: null },
      { action: "Use structured descriptors during case intake", detail: "When reporting a missing person, expand the 'Identity Descriptors' section to enter structured attributes: scars, tattoos, dental, clothing, jewelry, aliases, hair/eye color, height, weight, ethnicity, and medical conditions.", page: "/cases/new" },
    ],
  },
  {
    id: "namus",
    title: "NamUs Integration (Ethical Compliance)",
    icon: Shield,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "National Missing and Unidentified Persons System — public-tier data with provenance tracking and forensic service indicators",
    steps: [
      { action: "Review the ethical usage banner", detail: "The Command Center displays an 'Ethical Data Usage' banner explaining that only publicly available NamUs data is used, no biometrics are stored, and human review is required for all decisions.", page: "/dashboard" },
      { action: "Check NamUs integration status", detail: "The NamUs Status Block on the Command Center shows total records, missing persons vs unidentified, and forensic services availability (DNA, dental, fingerprints, family DNA reference).", page: "/dashboard" },
      { action: "View provenance badges on cases", detail: "Every case shows provenance: source, record ID, data tier (public/professional/restricted), and trusted client status. Biometric availability indicators show which forensic services are available.", page: null },
      { action: "See forensic help for families", detail: "Case detail pages include a 'Forensic Services May Be Available' card explaining free NamUs services: DNA analysis, dental examination, fingerprint analysis, and forensic anthropology. With instructions to request NamUs case registration via law enforcement.", page: null },
      { action: "Role-based access gates", detail: "Sensitive fields (dental details, fingerprint classification) are restricted to authorized roles. Non-authorized users see a 'Request Access' prompt instead of restricted data.", page: null },
      { action: "NamUs cross-reference in verification", detail: "Match evidence cards include NamUs-compatible structured descriptor matching (clothing, jewelry, scars, tattoos) and biometric availability flags that strengthen re-ranking.", page: "/caseworker" },
    ],
  },
  {
    id: "graph",
    title: "Unified Identity Graph",
    icon: Layers,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    description: "Interactive knowledge graph where every entity is a node and every relationship is a weighted edge — the core intelligence surface",
    steps: [
      { action: "Open the Identity Graph page", detail: "Navigate to Identity Graph in the sidebar or press G. The force-directed graph renders all persons, locations, sources, descriptors, and sightings as connected nodes.", page: "/graph" },
      { action: "Hover nodes to highlight connections", detail: "Hovering any node highlights all directly connected nodes and edges, dimming everything else. This instantly reveals which entities are related.", page: null },
      { action: "Click nodes to inspect details", detail: "Clicking a node opens a detail panel showing all properties and a list of connections with edge types and weights (e.g., match confidence %).", page: null },
      { action: "Filter by entity type", detail: "Use the type filter buttons (Person, Location, Source, Descriptor, Sighting) to focus the graph on specific entity categories.", page: null },
      { action: "Discover hidden connections", detail: "Two missing persons sharing a descriptor (e.g., 'scar' or 'child') are visually connected through the descriptor node — revealing cross-case intelligence that flat tables miss.", page: null },
      { action: "Navigate to cases from graph", detail: "Click any person node and use the 'Open Case File' button to jump directly to the case detail with full operational context.", page: null },
    ],
  },
  {
    id: "ops",
    title: "Operational Controls & Field Ops",
    icon: AlertTriangle,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    description: "System health monitoring, crisis mode for field use, keyboard shortcuts, and supervisor threshold controls",
    steps: [
      { action: "Monitor system health", detail: "The top strip on every page shows live metrics: ingest latency, match queue size, agent response time, active agents count, and system uptime. Color-coded status dots indicate health.", page: "/dashboard" },
      { action: "Activate Crisis Mode", detail: "Press X or click the Crisis Mode button in the sidebar. This switches to high-contrast dark theme, enlarges action buttons, and minimizes animations — designed for field use under stress.", page: null },
      { action: "Use keyboard shortcuts", detail: "Press ? to see all shortcuts: D (Command Center), N (Report), C (Cases), V (Verify), G (Identity Graph), M (Intel Map), L (Live Feed), X (Crisis Mode).", page: null },
      { action: "Adjust confidence thresholds", detail: "On the Command Center, use the 'Operational Thresholds' panel to adjust minimum match score, urgency threshold, and auto-outreach eligibility. Auto-actions are always disabled for minors.", page: "/dashboard" },
      { action: "Review agent workload", detail: "The Agent Workload panel shows active and pending tasks for each of the 7 AI agents. Use this to identify bottlenecks in the pipeline.", page: "/dashboard" },
      { action: "Check partner connections", detail: "The Partner Agencies panel shows connection status and last sync time for each connected organization (Red Cross, FEMA, NamUs, shelters).", page: "/dashboard" },
    ],
  },
];

/* ─── Tech Stack ─────────────────────────────────────────── */

const techStack = [
  { name: "Google Maps", desc: "Interactive crisis visualization with real coordinates", icon: MapPin, color: "text-green-600" },
  { name: "Google Gemini", desc: "AI analysis via LiteLLM for match explanation and fusion", icon: Sparkles, color: "text-blue-600" },
  { name: "FBI Wanted API", desc: "Real-time missing persons data (no auth required)", icon: Shield, color: "text-red-600" },
  { name: "IOM Data", desc: "21,000+ migration incidents with coordinates", icon: Globe, color: "text-sky-600" },
  { name: "TinyFish Agent", desc: "7 automated workflows: outreach, scanning, escalation, agency packs, call assist, verification, closure", icon: Zap, color: "text-purple-600" },
  { name: "FastAPI + pgvector", desc: "Vector search, hybrid matching, multi-agent backend", icon: Database, color: "text-amber-600" },
  { name: "Next.js + React", desc: "Server components, SSE streaming, responsive UI", icon: Layers, color: "text-gray-600" },
  { name: "7 AI Agents", desc: "Vision, RAG, Geo, Legacy, Fusion, Intake, Outreach", icon: Bot, color: "text-indigo-600" },
  { name: "Identity Graph", desc: "Force-directed SVG knowledge graph — persons, locations, sources, descriptors, sightings as nodes with weighted edges", icon: Layers, color: "text-pink-600" },
  { name: "Legacy Intelligence", desc: "Historical cold case registry with structured descriptor search", icon: Search, color: "text-violet-600" },
  { name: "NamUs Adapter", desc: "Public-tier integration with provenance, forensic indicators, and ethical compliance", icon: Shield, color: "text-blue-600" },
];

/* ─── Case Pipeline ──────────────────────────────────────── */

const pipeline = [
  { stage: "Intake", status: "open", icon: Users, color: "bg-blue-500", desc: "Case submitted with photo and details" },
  { stage: "AI Search", status: "searching", icon: Search, color: "bg-indigo-500", desc: "6 agents scan FBI, IOM, shelters, records" },
  { stage: "Matching", status: "matched", icon: Eye, color: "bg-purple-500", desc: "Fusion engine ranks multi-modal matches" },
  { stage: "Verification", status: "verified", icon: Shield, color: "bg-green-500", desc: "Caseworker reviews with source trust scores" },
  { stage: "Outreach", status: "outreach", icon: Send, color: "bg-teal-500", desc: "TinyFish agent contacts shelters and NGOs" },
  { stage: "Reunited", status: "reunited", icon: Heart, color: "bg-red-500", desc: "Family reunification confirmed" },
];

export default function HelpPage() {
  const [expandedFlow, setExpandedFlow] = useState<string | null>("report");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Help Center</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Complete guide to using TraceBridge -- from reporting a missing person to reunification.
          Every feature explained with step-by-step instructions.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Report Missing", href: "/cases/new", icon: Users, color: "bg-red-600 hover:bg-red-700" },
          { label: "View Cases", href: "/cases", icon: FolderSearch, color: "bg-blue-600 hover:bg-blue-700" },
          { label: "Verify Matches", href: "/caseworker", icon: Shield, color: "bg-green-600 hover:bg-green-700" },
          { label: "Live Data", href: "/live", icon: Radio, color: "bg-amber-600 hover:bg-amber-700" },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Button className={`w-full gap-2 ${action.color} text-white`}>
                <Icon className="h-4 w-4" />
                {action.label}
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Case Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Case Pipeline Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 overflow-x-auto pb-2">
            {pipeline.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.stage} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                    <div className={`rounded-full p-2 ${step.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-semibold">{step.stage}</div>
                      <div className="text-xs text-muted-foreground leading-tight max-w-[100px]">{step.desc}</div>
                    </div>
                  </div>
                  {i < pipeline.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* User Flows (Accordion) */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Step-by-Step User Flows
        </h2>
        {userFlows.map((flow) => {
          const Icon = flow.icon;
          const isExpanded = expandedFlow === flow.id;
          return (
            <Card
              key={flow.id}
              className={`cursor-pointer transition-all ${isExpanded ? flow.borderColor : ""}`}
            >
              <CardHeader
                className="pb-2"
                onClick={() => setExpandedFlow(isExpanded ? null : flow.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${flow.bgColor}`}>
                      <Icon className={`h-4 w-4 ${flow.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{flow.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{flow.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {flow.steps.length} steps
                    </Badge>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </div>
                </div>
              </CardHeader>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0 pb-4">
                      <div className="space-y-3 ml-1">
                        {flow.steps.map((step, i) => (
                          <div key={i} className="flex gap-3">
                            {/* Step number */}
                            <div className="flex flex-col items-center">
                              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                flow.bgColor.replace("50", "500").replace("bg-", "bg-")
                              } ${flow.color.replace("text-", "bg-").replace("600", "500")}`}>
                                {i + 1}
                              </div>
                              {i < flow.steps.length - 1 && (
                                <div className="w-0.5 flex-1 bg-muted mt-1" />
                              )}
                            </div>
                            {/* Content */}
                            <div className="pb-3">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{step.action}</p>
                                {step.page && (
                                  <Link href={step.page}>
                                    <Badge variant="outline" className="text-xs text-primary cursor-pointer hover:bg-primary/5">
                                      Go
                                      <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                                    </Badge>
                                  </Link>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {/* Tech Stack */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-primary" />
          Technology Stack
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {techStack.map((tech) => {
            const Icon = tech.icon;
            return (
              <Card key={tech.name} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 text-center">
                  <Icon className={`h-5 w-5 mx-auto mb-1.5 ${tech.color}`} />
                  <div className="text-sm font-semibold">{tech.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{tech.desc}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              q: "Is any reunification done automatically without human review?",
              a: "No. Every match requires explicit caseworker verification. The AI finds potential matches, but a human must approve before any outreach happens. Zero automated reunifications.",
            },
            {
              q: "Where does the live data come from?",
              a: "FBI Wanted API (free, no auth -- official US government data), IOM Missing Migrants Project (21,000+ incidents, CC BY 4.0 open data), and TinyFish web agent automation for scraping NGO portals.",
            },
            {
              q: "How does the risk scoring work?",
              a: "Cases are scored 0-100 based on: age (children under 12 get +25), days since reported (+15 after 7 days, +10 more after 14), case status (open cases +10), and whether a photo was provided.",
            },
            {
              q: "What are the 6 AI agents?",
              a: "Intake Agent (processes case data), Vision Agent (face detection/embedding), RAG Agent (hybrid text search across records), Geo Agent (location plausibility), Fusion Agent (combines all scores), and Outreach Agent (TinyFish-powered NGO contact).",
            },
            {
              q: "How does TinyFish integrate into the platform?",
              a: "TinyFish powers 7 automated workflows: (1) multi-channel outreach plans, (2) source scanning from FBI/IOM/NamUs/shelters, (3) AI evidence assist for caseworker verification, (4) SLA escalation with action lists, (5) agency coordination packs for Red Cross/ICRC/UNHCR, (6) call center scripts with note templates, and (7) post-reunification closure with notifications. Each workflow calls the TinyFish Web Agent API and has a deterministic fallback.",
            },
            {
              q: "Can I use this in a real crisis?",
              a: "This is a hackathon prototype demonstrating the architecture. For real deployment, it would need formal NGO partnerships, data privacy compliance (GDPR etc.), and verified identity protocols.",
            },
          ].map((faq, i) => (
            <div key={i} className="border-b last:border-0 pb-3 last:pb-0">
              <p className="text-sm font-medium">{faq.q}</p>
              <p className="text-sm text-muted-foreground mt-1">{faq.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="text-center py-6">
        <Heart className="h-8 w-8 text-red-500 fill-red-500 mx-auto mb-3" />
        <p className="text-muted-foreground mb-4">
          Ready to help reunite families?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/cases/new">
            <Button className="gap-2 bg-red-600 hover:bg-red-700">
              <Users className="h-4 w-4" />
              Report Missing Person
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Go to Command Center
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
