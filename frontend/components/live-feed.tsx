"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getLiveFeed, getLiveStats, triggerIngestion } from "@/lib/api-client";
import {
  Radio,
  Database,
  Globe,
  Shield,
  ExternalLink,
  MapPin,
  Clock,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Download,
  TrendingUp,
  Camera,
  Zap,
  ChevronDown,
  Star,
  Activity,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

interface FeedItem {
  id: string;
  source_type: string;
  source_url: string;
  person_name: string;
  description: string;
  photo_url: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  age: string | null;
  gender: string | null;
  raw_data: Record<string, unknown> | null;
  scanned_at: string | null;
  created_at: string | null;
}

interface LiveStats {
  total_records: number;
  source_breakdown: Record<string, number>;
  geo_records: number;
  photo_records: number;
  geo_events_total: number;
  last_ingestion: string | null;
  sources: Array<{
    name: string;
    type: string;
    status: string;
    description: string;
    count: number;
    url: string;
    auth: string;
  }>;
}

/* ─── Source Trust Scoring ─── */
const sourceTrust: Record<string, { label: string; trust: number; color: string; bgColor: string; icon: typeof Shield; description: string }> = {
  fbi_missing: {
    label: "FBI Missing",
    trust: 95,
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: Shield,
    description: "Federal law enforcement — verified records",
  },
  fbi_kidnapping: {
    label: "FBI Kidnapping",
    trust: 95,
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: AlertTriangle,
    description: "Federal law enforcement — active investigations",
  },
  iom_migrants: {
    label: "IOM Migrants",
    trust: 82,
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: Globe,
    description: "UN agency — incident-level reporting",
  },
  shelter: {
    label: "Shelter",
    trust: 70,
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: MapPin,
    description: "NGO partner — intake verification varies",
  },
  hospital: {
    label: "Hospital",
    trust: 88,
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    icon: Database,
    description: "Medical facility — ID verification required",
  },
};

/* ─── Anomaly detection helpers ─── */
function detectAnomalies(items: FeedItem[], stats: LiveStats | null): Array<{ type: string; message: string; severity: "high" | "medium" }> {
  const anomalies: Array<{ type: string; message: string; severity: "high" | "medium" }> = [];

  if (!stats) return anomalies;

  // Check for source concentration spikes
  const breakdown = stats.source_breakdown;
  const total = stats.total_records || 1;
  Object.entries(breakdown).forEach(([src, count]) => {
    const pct = (count / total) * 100;
    if (pct > 60) {
      const cfg = sourceTrust[src];
      anomalies.push({
        type: "concentration",
        message: `${cfg?.label || src} accounts for ${Math.round(pct)}% of all records — potential data imbalance`,
        severity: "medium",
      });
    }
  });

  // Check for geographic clustering in recent items
  if (items.length > 3) {
    const geoItems = items.filter((i) => i.location_lat && i.location_lng);
    if (geoItems.length >= 3) {
      // Simple clustering: check if multiple items are within ~1 degree
      const latGroups: Record<string, number> = {};
      geoItems.forEach((item) => {
        const key = `${Math.round(item.location_lat! * 2) / 2},${Math.round(item.location_lng! * 2) / 2}`;
        latGroups[key] = (latGroups[key] || 0) + 1;
      });
      const maxCluster = Math.max(...Object.values(latGroups));
      if (maxCluster >= 3) {
        anomalies.push({
          type: "cluster",
          message: `Geographic cluster detected: ${maxCluster} incidents in same region — possible crisis zone`,
          severity: "high",
        });
      }
    }
  }

  // Check for photo coverage gap
  if (stats.photo_records < total * 0.1 && total > 50) {
    anomalies.push({
      type: "gap",
      message: `Only ${Math.round((stats.photo_records / total) * 100)}% of records have photos — visual matching limited`,
      severity: "medium",
    });
  }

  return anomalies;
}

/* ─── Trust Stars ─── */
function TrustStars({ trust }: { trust: number }) {
  const stars = Math.round(trust / 20);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-2.5 w-2.5 ${
            s <= stars ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"
          }`}
        />
      ))}
    </div>
  );
}

export function LiveDataFeed({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const pageSize = compact ? 5 : 10;

  const fetchData = useCallback(async () => {
    try {
      const [feedData, statsData] = await Promise.all([
        getLiveFeed(page, pageSize, filter),
        getLiveStats(),
      ]);
      setItems(feedData.items || []);
      setTotal(feedData.total || 0);
      setStats(statsData);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filter]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const anomalies = useMemo(() => detectAnomalies(items, stats), [items, stats]);

  const handleIngest = async (sources: "all" | "fbi" | "iom") => {
    setIngesting(true);
    try {
      await triggerIngestion(sources);
      toast.success("Ingestion complete. Refreshing feed.");
      fetchData();
    } catch (err) {
      toast.error("Ingestion failed: " + (err as Error).message);
    } finally {
      setIngesting(false);
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4 text-red-500" />
            Intelligence Feed
            {total > 0 && (
              <Badge variant="secondary" className="text-xs">
                {total.toLocaleString()} records
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            {compact && (
              <Link href="/live" className="text-xs text-primary hover:underline">
                View all
              </Link>
            )}
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs text-muted-foreground">Live</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Anomaly alerts */}
        {anomalies.length > 0 && !compact && (
          <div className="space-y-2">
            {anomalies.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-start gap-2 rounded-lg p-2.5 border text-xs ${
                  a.severity === "high"
                    ? "bg-red-50 border-red-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <Activity className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${
                  a.severity === "high" ? "text-red-600" : "text-amber-600"
                }`} />
                <div>
                  <span className={`font-medium ${a.severity === "high" ? "text-red-700" : "text-amber-700"}`}>
                    Anomaly detected:
                  </span>{" "}
                  <span className="text-muted-foreground">{a.message}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Source Trust Panel + Stats */}
        {stats && !compact && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg border p-2.5 text-center">
                <Database className="h-3.5 w-3.5 text-blue-500 mx-auto mb-1" />
                <div className="text-lg font-bold">{stats.total_records.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Records</div>
              </div>
              <div className="rounded-lg border p-2.5 text-center">
                <MapPin className="h-3.5 w-3.5 text-green-500 mx-auto mb-1" />
                <div className="text-lg font-bold">{stats.geo_records.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Geo-tagged</div>
              </div>
              <div className="rounded-lg border p-2.5 text-center">
                <Camera className="h-3.5 w-3.5 text-purple-500 mx-auto mb-1" />
                <div className="text-lg font-bold">{stats.photo_records}</div>
                <div className="text-xs text-muted-foreground">With Photos</div>
              </div>
              <div className="rounded-lg border p-2.5 text-center">
                <TrendingUp className="h-3.5 w-3.5 text-amber-500 mx-auto mb-1" />
                <div className="text-lg font-bold">{stats.geo_events_total}</div>
                <div className="text-xs text-muted-foreground">Geo Events</div>
              </div>
            </div>

            {/* Source trust breakdown */}
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Source Trust Scoring
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(sourceTrust).map(([key, cfg]) => {
                  const count = stats.source_breakdown[key] || 0;
                  if (count === 0) return null;
                  return (
                    <div key={key} className="flex items-center justify-between rounded border p-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`rounded p-1 ${cfg.bgColor}`}>
                          <cfg.icon className={`h-3 w-3 ${cfg.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium">{cfg.label}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{cfg.description}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 ml-2">
                        <TrustStars trust={cfg.trust} />
                        <span className="text-[10px] text-muted-foreground">{cfg.trust}% · {count.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Ingest buttons */}
        {!compact && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleIngest("fbi")} disabled={ingesting}>
              {ingesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Pull FBI Data
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleIngest("iom")} disabled={ingesting}>
              {ingesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
              Pull IOM Data
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => handleIngest("all")} disabled={ingesting}>
              {ingesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              Pull All Sources
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs ml-auto" onClick={fetchData}>
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>
        )}

        {/* Source filter pills */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={!filter ? "secondary" : "ghost"}
            className="h-6 text-xs px-2"
            onClick={() => { setFilter(undefined); setPage(1); }}
          >
            All
          </Button>
          {Object.entries(sourceTrust).map(([key, cfg]) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? "secondary" : "ghost"}
              className="h-6 text-xs px-2"
              onClick={() => { setFilter(key); setPage(1); }}
            >
              {cfg.label}
              {stats?.source_breakdown[key] ? (
                <span className="ml-1 text-muted-foreground">
                  ({stats.source_breakdown[key].toLocaleString()})
                </span>
              ) : null}
            </Button>
          ))}
        </div>

        {/* Feed items */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">No external data ingested yet.</p>
            <Button size="sm" onClick={() => handleIngest("all")} disabled={ingesting} className="gap-2">
              {ingesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Ingest Live Data Now
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {items.map((item, i) => {
                const cfg = sourceTrust[item.source_type] || sourceTrust.shelter;
                const Icon = cfg.icon;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.02 }}
                    layout
                  >
                    <div className="flex gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      {/* Photo or icon */}
                      <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                        {item.photo_url ? (
                          <img
                            src={item.photo_url}
                            alt={item.person_name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className={`p-2 rounded-lg ${cfg.bgColor}`}>
                            <Icon className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.person_name}</p>
                            {item.location_name && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                {item.location_name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                              {cfg.label}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <TrustStars trust={cfg.trust} />
                              <span className="text-[9px] text-muted-foreground">{cfg.trust}%</span>
                            </div>
                          </div>
                        </div>
                        {item.description && !compact && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(item.scanned_at)}
                          </span>
                          {item.source_url && !item.source_url.startsWith("iom:") && (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-0.5"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Source
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {total > page * pageSize && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2 text-xs"
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronDown className="h-3 w-3" />
                Load more ({total - page * pageSize} remaining)
              </Button>
            )}
          </div>
        )}

        {!compact && stats && stats.total_records > 0 && (
          <div className="border-t pt-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Data sources: FBI Wanted API (api.fbi.gov) | IOM Missing Migrants Project (missingmigrants.iom.int)
              {stats.last_ingestion && (
                <span className="ml-2">Last updated: {new Date(stats.last_ingestion).toLocaleString()}</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
