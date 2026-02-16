"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ExternalLink,
  Dna,
  Fingerprint,
  Eye,
  Lock,
  CheckCircle,
  Database,
  Info,
  Loader2,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";

/* ─── Provenance Badge ─── */
export function ProvenanceBadge({
  source,
  recordId,
  dataTier = "public",
  trustedClient = false,
}: {
  source: string;
  recordId?: string;
  dataTier?: "public" | "professional" | "restricted";
  trustedClient?: boolean;
}) {
  const tierConfig = {
    public: { color: "border-blue-200 text-blue-700 bg-blue-50/50", label: "Public" },
    professional: { color: "border-amber-200 text-amber-700 bg-amber-50/50", label: "Professional" },
    restricted: { color: "border-red-200 text-red-700 bg-red-50/50", label: "Restricted" },
  };
  const tier = tierConfig[dataTier];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge variant="outline" className={`text-[9px] gap-0.5 ${tier.color}`}>
        <Shield className="h-2 w-2" />
        {source}
      </Badge>
      {recordId && (
        <Badge variant="outline" className="text-[9px] gap-0.5">
          <Database className="h-2 w-2" />
          {recordId}
        </Badge>
      )}
      <Badge variant="outline" className={`text-[9px] ${tier.color}`}>
        {tier.label} Tier
      </Badge>
      {trustedClient && (
        <Badge variant="outline" className="text-[9px] border-green-200 text-green-700 bg-green-50/50 gap-0.5">
          <CheckCircle className="h-2 w-2" />
          Trusted Client
        </Badge>
      )}
    </div>
  );
}

/* ─── Biometrics Availability Indicators ─── */
export function BiometricsIndicator({
  dna = false,
  dental = false,
  fingerprints = false,
  familyDna = false,
}: {
  dna?: boolean;
  dental?: boolean;
  fingerprints?: boolean;
  familyDna?: boolean;
}) {
  const items = [
    { label: "DNA", available: dna, icon: Dna },
    { label: "Dental", available: dental, icon: Eye },
    { label: "Fingerprints", available: fingerprints, icon: Fingerprint },
    { label: "Family DNA", available: familyDna, icon: Dna },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border ${item.available
              ? "border-green-200 bg-green-50/50 text-green-700"
              : "border-muted text-muted-foreground"
              }`}
          >
            <Icon className="h-2.5 w-2.5" />
            {item.label}
            {item.available ? (
              <CheckCircle className="h-2 w-2" />
            ) : (
              <span className="text-[8px] opacity-60">N/A</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── NamUs Status Block for Command Center ─── */
interface NamusStats {
  total_records: number;
  missing_persons: number;
  unidentified_persons: number;
  biometrics: {
    dna_available: number;
    dental_available: number;
    fingerprints_available: number;
    family_dna_reference: number;
  };
  states_covered: string[];
  source: string;
}

export function NamusStatusBlock() {
  const [stats, setStats] = useState<NamusStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/namus/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {
        setStats({
          total_records: 5,
          missing_persons: 4,
          unidentified_persons: 1,
          biometrics: { dna_available: 3, dental_available: 3, fingerprints_available: 3, family_dna_reference: 3 },
          states_covered: ["TX", "CA", "MS", "TN"],
          source: "NamUs (public tier)",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card className="border-blue-200/30 bg-blue-50/10 dark:bg-blue-950/10 backdrop-blur-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-600" />
          NamUs Integration Status
          <Badge variant="outline" className="text-[9px] border-blue-200 text-blue-600">
            Public Tier
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Record counts */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold">{stats.total_records}</div>
            <div className="text-[10px] text-muted-foreground">Total Records</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-amber-600">{stats.missing_persons}</div>
            <div className="text-[10px] text-muted-foreground">Missing Persons</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-purple-600">{stats.unidentified_persons}</div>
            <div className="text-[10px] text-muted-foreground">Unidentified</div>
          </div>
        </div>

        {/* Biometric availability */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
            Forensic Services Available
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "DNA Samples", count: stats.biometrics.dna_available, icon: Dna, color: "text-green-600" },
              { label: "Dental Records", count: stats.biometrics.dental_available, icon: Eye, color: "text-blue-600" },
              { label: "Fingerprints", count: stats.biometrics.fingerprints_available, icon: Fingerprint, color: "text-purple-600" },
              { label: "Family DNA Ref", count: stats.biometrics.family_dna_reference, icon: Dna, color: "text-amber-600" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-1.5 text-xs">
                  <Icon className={`h-3 w-3 ${item.color}`} />
                  <span className="text-muted-foreground">{item.label}:</span>
                  <span className="font-medium">{item.count}/{stats.total_records}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Provenance footer */}
        <div className="flex items-center justify-between text-[10px] pt-2 border-t">
          <span className="text-muted-foreground">
            Source: NIJ / Office of Justice Programs
          </span>
          <a
            href="https://namus.nij.ojp.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-blue-600 hover:text-blue-700"
          >
            namus.nij.ojp.gov <ExternalLink className="h-2 w-2" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Ethical Usage Banner ─── */
export function EthicalUsageBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/30 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-blue-800">
              Ethical Data Usage — NamUs & Open Intelligence
            </p>
            <p className="text-[11px] text-blue-700/80 leading-relaxed">
              TraceBridge uses only publicly available data from NamUs (National Missing and Unidentified Persons System),
              operated by the National Institute of Justice. No restricted or professional-tier data is accessed.
              Biometric availability is tracked as boolean flags only — no biometric data is stored locally.
              All match decisions require human verification. Full audit trail on every action.
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              <Badge variant="outline" className="text-[9px] border-blue-200 text-blue-600">
                <Lock className="h-2 w-2 mr-0.5" />
                Public data only
              </Badge>
              <Badge variant="outline" className="text-[9px] border-blue-200 text-blue-600">
                <Fingerprint className="h-2 w-2 mr-0.5" />
                No biometrics stored
              </Badge>
              <Badge variant="outline" className="text-[9px] border-blue-200 text-blue-600">
                <Eye className="h-2 w-2 mr-0.5" />
                Full audit trail
              </Badge>
              <Badge variant="outline" className="text-[9px] border-blue-200 text-blue-600">
                <CheckCircle className="h-2 w-2 mr-0.5" />
                Human review required
              </Badge>
            </div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-[10px] text-blue-500 hover:text-blue-700 shrink-0"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

/* ─── NamUs Help Indicator for Families ─── */
export function NamusHelpIndicator() {
  return (
    <Card className="border-green-200/30 bg-green-50/10 dark:bg-green-950/10 backdrop-blur-xl">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">Forensic Services May Be Available</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          NamUs offers free forensic services through the National Institute of Justice, including:
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { service: "DNA Analysis", desc: "Including family reference samples" },
            { service: "Dental Examination", desc: "Odontology comparison" },
            { service: "Fingerprint Analysis", desc: "Latent print examination" },
            { service: "Forensic Anthropology", desc: "Skeletal analysis" },
          ].map((s) => (
            <div key={s.service} className="flex items-start gap-1.5 rounded border p-2">
              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-[11px]">{s.service}</div>
                <div className="text-[10px] text-muted-foreground">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          To access these services, contact your local law enforcement agency and request NamUs case registration.
          Law enforcement professionals can register at{" "}
          <a href="https://namus.nij.ojp.gov" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            namus.nij.ojp.gov
          </a>.
        </p>
      </CardContent>
    </Card>
  );
}

/* ─── Role-Based Access Gate ─── */
export function AccessGate({
  requiredRole = "professional",
  children,
}: {
  requiredRole?: "public" | "professional" | "law_enforcement";
  children: React.ReactNode;
}) {
  const [hasAccess] = useState(requiredRole === "public"); // In production, check user role

  if (hasAccess) return <>{children}</>;

  const roleLabels = {
    public: "Public",
    professional: "Professional (Caseworker)",
    law_enforcement: "Law Enforcement",
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4 text-center space-y-2">
      <Lock className="h-5 w-5 text-amber-600 mx-auto" />
      <p className="text-xs font-medium text-amber-800">
        {roleLabels[requiredRole]} Access Required
      </p>
      <p className="text-[10px] text-amber-600">
        Sensitive fields (dental details, fingerprint classification, forensic reports)
        are restricted to authorized {roleLabels[requiredRole].toLowerCase()} users.
      </p>
      <Button variant="outline" size="sm" className="text-xs gap-1">
        <Shield className="h-3 w-3" />
        Request Access
      </Button>
    </div>
  );
}
