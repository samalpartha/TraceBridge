"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Camera,
  Database,
  Eye,
  Globe,
  Layers,
  MapPin,
  Users,
  FileText,
  GitBranch,
  History,
  Lock,
  Mic,
  Network,
  Radio,
  Search,
  Send,
  Shield,
  Shirt,
  Zap,
  Cpu,
  Fingerprint,
  BarChart3,
} from "lucide-react";

/* ─── Pipeline stage definitions ─── */
const pipelineStages = [
  {
    id: "ingest",
    title: "Data Ingestion",
    icon: Database,
    color: "bg-blue-500",
    description: "Multi-source real-time data collection",
    details: [
      "FBI Wanted API — missing persons & kidnappings",
      "IOM Missing Migrants Project — global incidents",
      "NamUs adapter — public-tier records with provenance",
      "Legacy intelligence — historical cold case descriptors",
      "Shelter & hospital intake registries",
      "TinyFish web agent — automated source scanning",
      "User-submitted reports with structured descriptors",
    ],
    tech: ["FastAPI", "httpx", "Celery", "Redis"],
  },
  {
    id: "process",
    title: "Processing Pipeline",
    icon: Cpu,
    color: "bg-purple-500",
    description: "Multi-modal feature extraction",
    details: [
      "Face detection & embedding (OpenCV + FaceNet)",
      "CLIP image-text embeddings for visual search",
      "OCR extraction from documents & wristbands",
      "NLP entity extraction from descriptions",
      "Text embeddings via sentence-transformers",
    ],
    tech: ["OpenCV", "CLIP", "Tesseract", "sentence-transformers"],
  },
  {
    id: "index",
    title: "Vector Index",
    icon: Search,
    color: "bg-green-500",
    description: "Hybrid similarity search engine",
    details: [
      "pgvector ANN search for face embeddings",
      "pgvector ANN search for text embeddings",
      "Full-text search with PostgreSQL tsvector",
      "Reciprocal Rank Fusion (RRF) for hybrid results",
      "Reranking with cross-encoder verification",
    ],
    tech: ["PostgreSQL", "pgvector", "RRF", "Rerankers"],
  },
  {
    id: "match",
    title: "Match Engine",
    icon: GitBranch,
    color: "bg-amber-500",
    description: "7-agent identity resolution",
    details: [
      "Vision agent — face & clothing similarity",
      "RAG agent — record cross-reference search",
      "Geo agent — proximity & movement prediction",
      "NLP agent — name & description fuzzy match",
      "Legacy agent — cold case descriptor matching",
      "Fusion engine — calibrated score aggregation",
    ],
    tech: ["LangGraph", "LiteLLM", "Google Gemini", "TinyFish"],
  },
  {
    id: "verify",
    title: "Verification Layer",
    icon: Shield,
    color: "bg-red-500",
    description: "Human-in-the-loop evidence review",
    details: [
      "Multi-modal evidence panel per match",
      "Source trust scoring & reliability weighting",
      "Caseworker verification with audit trail",
      "Escalation routing for low-confidence matches",
      "Deepfake & synthetic image detection",
    ],
    tech: ["React", "FastAPI", "Audit Log", "RBAC"],
  },
  {
    id: "action",
    title: "Action & Outreach",
    icon: Send,
    color: "bg-indigo-500",
    description: "Automated coordination & reunification",
    details: [
      "TinyFish web agent — automated shelter outreach",
      "Google Gemini — multilingual case briefings",
      "NGO coordination with verified match evidence",
      "Real-time notification & status pipeline",
      "Reunion metrics & impact tracking",
    ],
    tech: ["TinyFish API", "Google Gemini", "Webhooks", "SSE"],
  },
];

/* ─── Identity Graph concept ─── */
const graphNodes = [
  { type: "Face Track", icon: Camera, color: "text-blue-500", desc: "Face embeddings from photos & video frames" },
  { type: "Text Record", icon: FileText, color: "text-purple-500", desc: "NLP embeddings from descriptions & intake forms" },
  { type: "Body Descriptors", icon: Fingerprint, color: "text-rose-500", desc: "Scars, tattoos, dental, medical from structured intake" },
  { type: "Clothing/Items", icon: Shirt, color: "text-orange-500", desc: "Clothing, jewelry, accessories from reports & narratives" },
  { type: "Voice Print", icon: Mic, color: "text-green-500", desc: "Speaker embeddings from hotline calls" },
  { type: "Location", icon: MapPin, color: "text-amber-500", desc: "Geo-temporal events with movement patterns" },
  { type: "Document", icon: Eye, color: "text-red-500", desc: "OCR extractions from IDs, wristbands, posters" },
  { type: "Legacy Case", icon: History, color: "text-violet-500", desc: "Historical cold case records with narrative evidence" },
  { type: "Contact", icon: Users, color: "text-indigo-500", desc: "Reporter, family, and witness connections" },
];

const edgeTypes = [
  { label: "Face match", score: "0.87", confidence: "high" },
  { label: "Name fuzzy", score: "0.72", confidence: "medium" },
  { label: "Geo proximity", score: "0.65", confidence: "medium" },
  { label: "Age consistent", score: "0.91", confidence: "high" },
  { label: "Clothing match", score: "0.58", confidence: "low" },
  { label: "Scar/Tattoo match", score: "0.79", confidence: "high" },
  { label: "Narrative similar", score: "0.63", confidence: "medium" },
  { label: "Dental match", score: "0.95", confidence: "high" },
];

export default function ArchitecturePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <Badge variant="outline" className="text-xs">Technical Architecture</Badge>
        <h1 className="text-3xl font-bold">
          AI-Powered Crisis Identity Resolution Infrastructure
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          From raw data ingestion to verified family reunification — a six-stage pipeline
          with 7 AI agents processing 2,100+ active records plus historical cold case intelligence
          across FBI, IOM, shelters, hospitals, and curated legacy registries.
        </p>
      </div>

      {/* Full Pipeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            End-to-End Processing Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Pipeline flow — horizontal on desktop, vertical on mobile */}
          <div className="relative">
            {/* Connection lines */}
            <div className="hidden md:block absolute top-8 left-[8.33%] right-[8.33%] h-0.5 bg-gradient-to-r from-blue-300 via-purple-300 via-green-300 via-amber-300 via-red-300 to-indigo-300 z-0" />

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {pipelineStages.map((stage, i) => {
                const Icon = stage.icon;
                return (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative z-10"
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className={`h-16 w-16 rounded-2xl ${stage.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">{stage.title}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Stage details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {pipelineStages.map((stage, i) => {
              const Icon = stage.icon;
              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                >
                  <Card className="h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`h-8 w-8 rounded-lg ${stage.color} flex items-center justify-center`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{stage.title}</p>
                          <p className="text-[10px] text-muted-foreground">{stage.description}</p>
                        </div>
                      </div>
                      <ul className="space-y-1.5">
                        {stage.details.map((d, j) => (
                          <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span>
                            {d}
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t">
                        {stage.tech.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Identity Graph Concept */}
      <Card className="border-red-200/30 bg-red-50/10 dark:bg-red-950/5 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Unified Identity Graph
            <Badge variant="outline" className="text-xs font-normal">Core Innovation</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Every artifact becomes a node in a shared identity graph. Edges store similarity scores
            with justification. Caseworkers verify edges, not people — enabling evidence stacking
            across multiple modalities without single-model dependence.
          </p>

          {/* Node types */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
              Node Types
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {graphNodes.map((node, i) => {
                const NIcon = node.icon;
                return (
                  <motion.div
                    key={node.type}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-2 rounded-lg border p-3"
                  >
                    <NIcon className={`h-4 w-4 ${node.color} mt-0.5 flex-shrink-0`} />
                    <div>
                      <p className="text-xs font-medium">{node.type}</p>
                      <p className="text-[10px] text-muted-foreground">{node.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Edge types */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
              Edge Scoring
            </p>
            <div className="space-y-2">
              {edgeTypes.map((edge, i) => (
                <motion.div
                  key={edge.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-3 text-xs"
                >
                  <span className="w-28 font-medium">{edge.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${parseFloat(edge.score) * 100}%` }}
                      transition={{ delay: 0.5 + i * 0.05, duration: 0.8 }}
                      className={`h-full rounded-full ${edge.confidence === "high" ? "bg-green-500" :
                        edge.confidence === "medium" ? "bg-amber-500" : "bg-red-400"
                        }`}
                    />
                  </div>
                  <span className="font-mono w-10 text-right">{edge.score}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 w-16 text-center justify-center ${edge.confidence === "high" ? "text-green-600 border-green-200" :
                      edge.confidence === "medium" ? "text-amber-600 border-amber-200" :
                        "text-red-600 border-red-200"
                      }`}
                  >
                    {edge.confidence}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technology Stack */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Technology Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                category: "AI & ML",
                icon: Brain,
                items: [
                  { name: "Google Gemini 2.0 Flash", desc: "Risk assessment & case analysis via LiteLLM" },
                  { name: "OpenCV + FaceNet", desc: "Face detection, embedding, and matching" },
                  { name: "CLIP", desc: "Image-text embeddings for visual search" },
                  { name: "sentence-transformers", desc: "Text embeddings for semantic search" },
                  { name: "LangGraph", desc: "Multi-agent orchestration framework" },
                  { name: "TinyFish API", desc: "Automated web agent for outreach" },
                ],
              },
              {
                category: "Backend & Data",
                icon: Database,
                items: [
                  { name: "FastAPI", desc: "Async Python API with OpenAPI docs" },
                  { name: "PostgreSQL + pgvector", desc: "Vector similarity + relational data" },
                  { name: "Redis + Celery", desc: "Task queue for background processing" },
                  { name: "SQLAlchemy + Alembic", desc: "ORM with database migrations" },
                  { name: "Google Geocoding API", desc: "Address-to-coordinate resolution" },
                  { name: "Hybrid Search (RRF)", desc: "Reciprocal Rank Fusion scoring" },
                ],
              },
              {
                category: "Frontend & UX",
                icon: Globe,
                items: [
                  { name: "Next.js 16 (App Router)", desc: "React framework with SSR" },
                  { name: "TypeScript", desc: "Full type safety across the stack" },
                  { name: "Tailwind CSS + shadcn/ui", desc: "Utility CSS with headless components" },
                  { name: "Framer Motion", desc: "Fluid animations & transitions" },
                  { name: "Google Maps API", desc: "Crisis map with real-time markers" },
                  { name: "Server-Sent Events", desc: "Real-time search progress streaming" },
                ],
              },
            ].map((cat) => {
              const CIcon = cat.icon;
              return (
                <div key={cat.category}>
                  <div className="flex items-center gap-2 mb-3">
                    <CIcon className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">{cat.category}</h3>
                  </div>
                  <div className="space-y-2">
                    {cat.items.map((item) => (
                      <div key={item.name} className="rounded border p-2">
                        <p className="text-xs font-medium">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500" />
            Live Data Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                name: "FBI Wanted API",
                url: "api.fbi.gov",
                records: "120+",
                type: "REST API",
                trust: 95,
                desc: "Missing persons, kidnappings, and fugitives with photos and descriptions",
              },
              {
                name: "IOM Missing Migrants",
                url: "missingmigrants.iom.int",
                records: "2,000+",
                type: "CSV Dataset",
                trust: 82,
                desc: "Global migration incident data with geo-coordinates and casualty counts",
              },
              {
                name: "TinyFish Web Agent",
                url: "agent.tinyfish.ai",
                records: "Dynamic",
                type: "SSE API",
                trust: 75,
                desc: "AI-powered web scraping for shelter registries and news reports",
              },
              {
                name: "Legacy Intelligence Registry",
                url: "Internal curated",
                records: "7+ (growing)",
                type: "Structured DB",
                trust: 88,
                desc: "Historical cold cases with structured descriptors: scars, tattoos, dental, clothing, narratives",
              },
              {
                name: "NamUs (Public Tier)",
                url: "namus.nij.ojp.gov",
                records: "5+ (adapter)",
                type: "Adapter API",
                trust: 97,
                desc: "National Missing & Unidentified Persons System. Public data only — DNA/dental/fingerprint availability flags, no biometrics stored",
              },
            ].map((src, i) => (
              <motion.div
                key={src.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{src.name}</p>
                      <Badge variant="outline" className="text-[10px]">{src.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{src.desc}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{src.url}</span>
                      <span className="font-medium">{src.records} records</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Trust:</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${src.trust >= 90 ? "bg-green-500" : src.trust >= 75 ? "bg-blue-500" : "bg-amber-500"}`}
                          style={{ width: `${src.trust}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium">{src.trust}%</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security, Privacy & Audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Data Minimization", desc: "Store embeddings and hashed identifiers. Raw biometrics encrypted at rest." },
              { title: "Role-Based Access Control", desc: "Family, caseworker, NGO admin, and system admin permission levels." },
              { title: "Full Audit Trail", desc: "Every view, export, verification, and status change logged with timestamps." },
              { title: "Synthetic Image Flagging", desc: "Age progression hypotheses labeled as AI-generated. Never presented as truth." },
              { title: "Content Safety", desc: "YOLOv8 moderation filters sensitive uploads. Auto-route to human review." },
              { title: "Consent Framework", desc: "Data source consent verification. Retention policies per data source enforced." },
              { title: "NamUs Compliance", desc: "Public-tier data only. No restricted fields accessed. Biometrics tracked as boolean flags, never stored. NIJ provenance on every record." },
              { title: "Provenance Tracking", desc: "Every data point carries source, record ID, ingest time, verification timestamp, and data tier classification." },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded border p-3">
                <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="text-center space-y-4 py-6">
        <h2 className="text-xl font-bold">Ready to see it in action?</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Report a missing person, watch AI agents deploy across 2,100+ records,
          verify a match, and trigger automated outreach — all in under 2 minutes.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/cases/new">
            <Button className="gap-2">
              <Zap className="h-4 w-4" />
              Start Demo Flow
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Command Center
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
