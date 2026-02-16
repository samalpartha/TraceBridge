"use client";

import { useState } from "react";
import { LiveDataFeed } from "@/components/live-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Globe, Zap, ExternalLink, Bot, Loader2, RefreshCw, History } from "lucide-react";
import { DescriptorSearch } from "@/components/descriptor-search";
import { tfScanSources } from "@/lib/api-client";
import { toast } from "sonner";

interface ScanResult {
  status: string;
  run_id?: string;
}

const dataSources = [
  {
    name: "FBI Wanted API",
    icon: Shield,
    status: "Connected",
    statusColor: "bg-green-500",
    description: "Missing persons and kidnapping cases",
    url: "https://api.fbi.gov/wanted/v1/list",
    auth: "No auth required",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    scanKey: "fbi" as string | undefined,
  },
  {
    name: "IOM Missing Migrants",
    icon: Globe,
    status: "Connected",
    statusColor: "bg-green-500",
    description: "21,000+ global migration incidents (2014-2026)",
    url: "https://missingmigrants.iom.int",
    auth: "Open data (CC BY 4.0)",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    scanKey: "iom" as string | undefined,
  },
  {
    name: "TinyFish Web Agent",
    icon: Zap,
    status: "Active",
    statusColor: "bg-green-500",
    description: "Browser automation for NGO portal scanning",
    url: "https://agent.tinyfish.ai",
    auth: "API key",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    scanKey: "shelters" as string | undefined,
  },
  {
    name: "Legacy Intelligence Registry",
    icon: History,
    status: "Connected",
    statusColor: "bg-green-500",
    description: "Historical cold cases with structured identity descriptors",
    url: "Open Intelligence (internal)",
    auth: "Curated dataset",
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    scanKey: undefined,
  },
  {
    name: "NamUs (Public Tier)",
    icon: Shield,
    status: "Connected",
    statusColor: "bg-green-500",
    description: "National Missing & Unidentified Persons System — public records only",
    url: "namus.nij.ojp.gov",
    auth: "Public tier (ethical compliance)",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    scanKey: undefined,
  },
];

export default function LiveFeedPage() {
  const [scanning, setScanning] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<Record<string, ScanResult>>({});

  const handleScan = async (source: string) => {
    setScanning(source);
    try {
      const res = await tfScanSources(source);
      setScanResults((prev) => ({ ...prev, ...res.results }));
      toast.success(`TinyFish scan triggered for ${source === "all" ? "all sources" : source}`);
    } catch {
      toast.error("Scan failed");
    }
    setScanning(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Data Ingestion</h1>
          <p className="text-muted-foreground text-sm">
            Real-time data from FBI Wanted API, IOM Missing Migrants Project, and TinyFish automation
          </p>
        </div>
        <Button
          onClick={() => handleScan("all")}
          disabled={scanning !== null}
          className="gap-2"
        >
          {scanning === "all" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
          Scan All Sources
        </Button>
      </div>

      {/* Connected Sources */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {dataSources.map((src) => {
          const Icon = src.icon;
          return (
            <Card key={src.name} className={`${src.borderColor}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`rounded-lg p-2 ${src.bgColor}`}>
                    <Icon className={`h-4 w-4 ${src.color}`} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${src.statusColor}`} />
                    <span className="text-xs text-muted-foreground">{src.status}</span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold">{src.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{src.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="text-xs">{src.auth}</Badge>
                  <div className="flex items-center gap-2">
                    {src.scanKey && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] gap-1 text-blue-600"
                        disabled={scanning !== null}
                        onClick={() => handleScan(src.scanKey!)}
                      >
                        {scanning === src.scanKey ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Scan
                      </Button>
                    )}
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-0.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      API
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* TinyFish Source Scanner Status */}
      {Object.keys(scanResults).length > 0 && (
        <Card className="border-blue-200/30 bg-blue-50/15 dark:bg-blue-950/10 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600" />
              TinyFish Scan Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(scanResults).map(([source, result]) => (
                <div key={source} className="rounded-lg border p-2.5 bg-background">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium uppercase">{source}</span>
                    <Badge
                      variant={result.status === "started" ? "default" : "destructive"}
                      className="text-[9px]"
                    >
                      {result.status}
                    </Badge>
                  </div>
                  {result.run_id && (
                    <div className="text-[10px] text-muted-foreground font-mono truncate">
                      Run: {result.run_id}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              TinyFish agents scanning sources — new records will auto-trigger re-scoring for open cases.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Multimodal Descriptor Search — Legacy Intelligence */}
      <DescriptorSearch />

      <LiveDataFeed />
    </div>
  );
}
