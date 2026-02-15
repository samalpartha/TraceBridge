"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { getHeatmapData } from "@/lib/api-client";
import type { HeatmapData } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2, Radio, AlertTriangle, Target, Play, Pause, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const typeColors: Record<string, string> = {
  shelter: "#3b82f6",
  hospital: "#ef4444",
  registry: "#22c55e",
  news: "#f59e0b",
  social_media: "#8b5cf6",
  fbi_missing: "#dc2626",
  fbi_kidnapping: "#ea580c",
  iom_migrants: "#0ea5e9",
};

const statusConfig: Record<string, { color: string; urgency: number; label: string }> = {
  open: { color: "#ef4444", urgency: 3, label: "Open - Needs Search" },
  searching: { color: "#f59e0b", urgency: 2, label: "AI Search Active" },
  matched: { color: "#a855f7", urgency: 2, label: "Match Found - Verify" },
  verified: { color: "#22c55e", urgency: 1, label: "Verified - Outreach" },
  reunited: { color: "#10b981", urgency: 0, label: "Reunited" },
};

/* ─── Dot marker SVG builder ─── */
function dotSvg(color: string, size: number, opacity = 0.7): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="${color}" fill-opacity="${opacity}" stroke="${color}" stroke-width="1" stroke-opacity="0.9"/>` +
    `</svg>`
  )}`;
}

function casePinSvg(color: string, urgency: number): string {
  const size = urgency >= 2 ? 28 : 24;
  const r = size / 2 - 2;
  const pulseRing = urgency >= 2
    ? `<circle cx="${size/2}" cy="${size/2}" r="${r + 1}" fill="none" stroke="${color}" stroke-width="1" stroke-opacity="0.4"><animate attributeName="r" from="${r}" to="${r + 6}" dur="1.5s" repeatCount="indefinite"/><animate attributeName="stroke-opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/></circle>`
    : "";
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    pulseRing +
    `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="${color}" stroke="white" stroke-width="3"/>` +
    `</svg>`
  )}`;
}

/* ─── Search radius prediction ring ─── */
function radiusRingSvg(color: string): string {
  const size = 120;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" fill-opacity="0.06" stroke="${color}" stroke-width="1.5" stroke-dasharray="6 4" stroke-opacity="0.4"/>` +
    `<circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-width="1" stroke-dasharray="4 3" stroke-opacity="0.3"/>` +
    `</svg>`
  )}`;
}

/* ─── Heatmap Layer (Google Maps visualization library) ─── */
function HeatmapLayer({ data }: { data: HeatmapData | null }) {
  const map = useMap();
  const [heatmap, setHeatmap] = useState<google.maps.visualization.HeatmapLayer | null>(null);

  useEffect(() => {
    if (!map || !data?.sightings?.length) return;
    // Check if visualization library is loaded
    if (!google.maps.visualization) return;

    const points = data.sightings.map((s) => ({
      location: new google.maps.LatLng(s.lat, s.lng),
      weight: s.weight,
    }));

    if (heatmap) {
      heatmap.setData(points);
    } else {
      const layer = new google.maps.visualization.HeatmapLayer({
        data: points,
        map,
        radius: 30,
        opacity: 0.6,
        gradient: [
          "rgba(0, 0, 255, 0)",
          "rgba(0, 100, 255, 0.4)",
          "rgba(0, 200, 200, 0.5)",
          "rgba(0, 255, 100, 0.6)",
          "rgba(200, 255, 0, 0.7)",
          "rgba(255, 200, 0, 0.8)",
          "rgba(255, 100, 0, 0.9)",
          "rgba(255, 0, 0, 1)",
        ],
      });
      setHeatmap(layer);
    }

    return () => {
      if (heatmap) heatmap.setMap(null);
    };
  }, [map, data]);

  return null;
}

/* ─── Historical cold case markers ─── */
const legacyPoints = [
  { id: "LC-001", name: "John Doe #47", lat: 29.71, lng: -95.35, year: 2017, region: "Gulf Coast, TX", status: "Unresolved" },
  { id: "LC-002", name: "Maria Doe #12", lat: 31.95, lng: -110.87, year: 2019, region: "SW Border, AZ", status: "Unresolved" },
  { id: "LC-003", name: "David Doe #89", lat: 39.76, lng: -121.62, year: 2018, region: "Paradise, CA", status: "Unresolved" },
  { id: "LC-004", name: "Fatima Doe #5", lat: 40.71, lng: -74.01, year: 2022, region: "New York, NY", status: "Unresolved" },
  { id: "LC-005", name: "Miguel Doe #33", lat: 27.51, lng: -99.51, year: 2021, region: "Laredo, TX", status: "Unresolved" },
  { id: "LC-006", name: "Elena Doe #18", lat: 30.45, lng: -91.19, year: 2020, region: "Rural Louisiana", status: "Unresolved" },
  { id: "LC-007", name: "Unknown Child #3", lat: 36.17, lng: -86.78, year: 2023, region: "Nashville, TN", status: "Unresolved" },
];

function legacyPinSvg(): string {
  const size = 20;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<rect x="2" y="2" width="${size-4}" height="${size-4}" rx="3" fill="#7c3aed" fill-opacity="0.7" stroke="#7c3aed" stroke-width="1.5"/>` +
    `<text x="${size/2}" y="${size/2 + 1}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="white" font-weight="bold">H</text>` +
    `</svg>`
  )}`;
}

/* ─── Shelter capacity markers ─── */
const shelterCapacity = [
  { lat: 29.753, lng: -95.358, name: "GRB Convention Center", capacity: 10000, occupancy: 7200, type: "mega" },
  { lat: 29.682, lng: -95.281, name: "NRG Center", capacity: 5000, occupancy: 3800, type: "large" },
  { lat: 30.267, lng: -97.743, name: "Austin Convention Center", capacity: 3000, occupancy: 1200, type: "large" },
  { lat: 35.960, lng: -83.921, name: "Knoxville Civic Auditorium", capacity: 2000, occupancy: 1600, type: "medium" },
  { lat: 34.052, lng: -118.244, name: "LA Convention Center", capacity: 8000, occupancy: 2100, type: "mega" },
];

function shelterSvg(occupancyPct: number): string {
  const size = 24;
  const color = occupancyPct > 0.8 ? "#ef4444" : occupancyPct > 0.5 ? "#f59e0b" : "#22c55e";
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">` +
    `<rect x="2" y="2" width="20" height="20" rx="4" fill="white" stroke="${color}" stroke-width="2"/>` +
    `<rect x="4" y="${4 + 16 * (1 - occupancyPct)}" width="16" height="${16 * occupancyPct}" rx="2" fill="${color}" opacity="0.3"/>` +
    `<text x="12" y="14" text-anchor="middle" font-size="8" font-weight="bold" fill="${color}">${Math.round(occupancyPct * 100)}%</text>` +
    `</svg>`
  )}`;
}

/* ─── Movement corridor prediction data ─── */
const corridors = [
  { from: { lat: 29.962, lng: -95.417 }, to: { lat: 29.753, lng: -95.358 }, label: "Houston evac corridor", confidence: 0.87 },
  { from: { lat: 35.714, lng: -83.514 }, to: { lat: 35.960, lng: -83.921 }, label: "Gatlinburg→Knoxville", confidence: 0.92 },
  { from: { lat: 39.760, lng: -121.622 }, to: { lat: 38.581, lng: -121.494 }, label: "Paradise→Sacramento", confidence: 0.78 },
];

function corridorSvg(): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="8">` +
    `<line x1="0" y1="4" x2="60" y2="4" stroke="#a855f7" stroke-width="3" stroke-dasharray="6,4" stroke-opacity="0.7"/>` +
    `<polygon points="55,1 60,4 55,7" fill="#a855f7" fill-opacity="0.7"/>` +
    `</svg>`
  )}`;
}

/* ─── Inner map content (needs useMap) ─── */
function MapMarkers({ data, showHeatmap, showLegacy, showCorridors, showShelters }: { data: HeatmapData | null; showHeatmap: boolean; showLegacy: boolean; showCorridors: boolean; showShelters: boolean }) {
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [selectedSighting, setSelectedSighting] = useState<number | null>(null);
  const [selectedLegacy, setSelectedLegacy] = useState<number | null>(null);
  const [selectedShelter, setSelectedShelter] = useState<number | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<number | null>(null);

  const displaySightings = (data?.sightings || [])
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 200);

  return (
    <>
      {/* Heatmap layer */}
      {showHeatmap && <HeatmapLayer data={data} />}

      {/* Sighting markers (hidden when heatmap is on) */}
      {!showHeatmap && displaySightings.map((s, i) => {
        const size = Math.max(s.weight * 5, 10);
        return (
          <AdvancedMarker
            key={`s-${i}`}
            position={{ lat: s.lat, lng: s.lng }}
            onClick={() => setSelectedSighting(i)}
          >
            <img src={dotSvg(typeColors[s.type] || "#6b7280", size, 0.5)} width={size} height={size} alt="" />
          </AdvancedMarker>
        );
      })}

      {/* Sighting InfoWindow */}
      {selectedSighting !== null && displaySightings[selectedSighting] && (
        <InfoWindow
          position={{
            lat: displaySightings[selectedSighting].lat,
            lng: displaySightings[selectedSighting].lng,
          }}
          onCloseClick={() => setSelectedSighting(null)}
        >
          <div style={{ minWidth: 140, fontFamily: "system-ui" }}>
            <div style={{ fontWeight: 600, fontSize: 13, textTransform: "capitalize", marginBottom: 4 }}>
              {displaySightings[selectedSighting].type.replace("_", " ")} Report
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Incidents: <strong>{displaySightings[selectedSighting].weight}</strong>
            </div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
              Density: {displaySightings[selectedSighting].weight >= 6 ? "High" : displaySightings[selectedSighting].weight >= 4 ? "Medium" : "Low"}
            </div>
          </div>
        </InfoWindow>
      )}

      {/* Search radius prediction rings for active cases */}
      {data?.cases
        ?.filter((c) => c.status === "open" || c.status === "searching")
        .map((c, i) => {
          const cfg = statusConfig[c.status] || statusConfig.open;
          return (
            <AdvancedMarker
              key={`ring-${i}`}
              position={{ lat: c.lat, lng: c.lng }}
              zIndex={1}
            >
              <img src={radiusRingSvg(cfg.color)} width={120} height={120} alt="" style={{ transform: "translate(-50%, -50%)", position: "absolute", top: "50%", left: "50%" }} />
            </AdvancedMarker>
          );
        })}

      {/* Case markers */}
      {data?.cases?.map((c, i) => {
        const cfg = statusConfig[c.status] || statusConfig.open;
        const pinSize = cfg.urgency >= 2 ? 28 : 24;
        return (
          <AdvancedMarker
            key={`c-${i}`}
            position={{ lat: c.lat, lng: c.lng }}
            onClick={() => setSelectedCase(i)}
            zIndex={100}
          >
            <img src={casePinSvg(cfg.color, cfg.urgency)} width={pinSize} height={pinSize} alt={c.name} />
          </AdvancedMarker>
        );
      })}

      {/* Case InfoWindow — enriched */}
      {selectedCase !== null && data?.cases?.[selectedCase] && (() => {
        const c = data.cases[selectedCase];
        const cfg = statusConfig[c.status] || statusConfig.open;
        return (
          <InfoWindow
            position={{ lat: c.lat, lng: c.lng }}
            onCloseClick={() => setSelectedCase(null)}
          >
            <div style={{ minWidth: 200, fontFamily: "system-ui", padding: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                {c.name}
              </div>
              <div
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#fff",
                  backgroundColor: cfg.color,
                }}
              >
                {cfg.label}
              </div>
              {cfg.urgency >= 2 && (
                <div style={{ fontSize: 11, color: "#dc2626", marginTop: 6, fontWeight: 600 }}>
                  ⚠ Action required — SLA active
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 11, color: "#666", borderTop: "1px solid #eee", paddingTop: 6 }}>
                <div>Lat: {c.lat.toFixed(4)}, Lng: {c.lng.toFixed(4)}</div>
                {cfg.urgency >= 2 && (
                  <div style={{ color: "#9333ea", marginTop: 2 }}>
                    Search radius: ~80km predicted zone
                  </div>
                )}
              </div>
            </div>
          </InfoWindow>
        );
      })()}

      {/* Historical / Legacy case markers */}
      {showLegacy && legacyPoints.map((lp, i) => (
        <AdvancedMarker
          key={`legacy-${lp.id}`}
          position={{ lat: lp.lat, lng: lp.lng }}
          onClick={() => setSelectedLegacy(i)}
          zIndex={50}
        >
          <img src={legacyPinSvg()} width={20} height={20} alt={lp.name} />
        </AdvancedMarker>
      ))}

      {/* Legacy InfoWindow */}
      {selectedLegacy !== null && legacyPoints[selectedLegacy] && (
        <InfoWindow
          position={{ lat: legacyPoints[selectedLegacy].lat, lng: legacyPoints[selectedLegacy].lng }}
          onCloseClick={() => setSelectedLegacy(null)}
        >
          <div style={{ minWidth: 180, fontFamily: "system-ui", padding: 2 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: "#7c3aed" }}>
              {legacyPoints[selectedLegacy].name}
            </div>
            <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 500, color: "#fff", backgroundColor: "#7c3aed" }}>
              Historical — {legacyPoints[selectedLegacy].year}
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: "#666" }}>
              <div>{legacyPoints[selectedLegacy].region}</div>
              <div style={{ color: "#7c3aed", fontWeight: 500, marginTop: 2 }}>
                {legacyPoints[selectedLegacy].status}
              </div>
            </div>
          </div>
        </InfoWindow>
      )}

      {/* Movement corridor prediction markers */}
      {showCorridors && corridors.map((c, i) => {
        const midLat = (c.from.lat + c.to.lat) / 2;
        const midLng = (c.from.lng + c.to.lng) / 2;
        return (
          <AdvancedMarker
            key={`corridor-${i}`}
            position={{ lat: midLat, lng: midLng }}
            onClick={() => setSelectedCorridor(i)}
            zIndex={40}
          >
            <img src={corridorSvg()} width={60} height={8} alt="" />
          </AdvancedMarker>
        );
      })}

      {/* Corridor InfoWindow */}
      {selectedCorridor !== null && corridors[selectedCorridor] && (() => {
        const c = corridors[selectedCorridor];
        return (
          <InfoWindow
            position={{ lat: (c.from.lat + c.to.lat) / 2, lng: (c.from.lng + c.to.lng) / 2 }}
            onCloseClick={() => setSelectedCorridor(null)}
          >
            <div style={{ minWidth: 180, fontFamily: "system-ui", padding: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: "#a855f7" }}>
                Predicted Movement Corridor
              </div>
              <div style={{ fontSize: 12 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                <div>AI Confidence: <strong style={{ color: c.confidence > 0.85 ? "#22c55e" : "#f59e0b" }}>{Math.round(c.confidence * 100)}%</strong></div>
                <div style={{ color: "#a855f7", marginTop: 2 }}>Based on shelter registrations + geo patterns</div>
              </div>
            </div>
          </InfoWindow>
        );
      })()}

      {/* Shelter capacity markers */}
      {showShelters && shelterCapacity.map((s, i) => (
        <AdvancedMarker
          key={`shelter-${i}`}
          position={{ lat: s.lat, lng: s.lng }}
          onClick={() => setSelectedShelter(i)}
          zIndex={30}
        >
          <img src={shelterSvg(s.occupancy / s.capacity)} width={24} height={24} alt={s.name} />
        </AdvancedMarker>
      ))}

      {/* Shelter InfoWindow */}
      {selectedShelter !== null && shelterCapacity[selectedShelter] && (
        <InfoWindow
          position={{ lat: shelterCapacity[selectedShelter].lat, lng: shelterCapacity[selectedShelter].lng }}
          onCloseClick={() => setSelectedShelter(null)}
        >
          <div style={{ minWidth: 180, fontFamily: "system-ui", padding: 2 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              {shelterCapacity[selectedShelter].name}
            </div>
            <div style={{ fontSize: 12 }}>
              <div>Capacity: <strong>{shelterCapacity[selectedShelter].capacity.toLocaleString()}</strong></div>
              <div>Occupancy: <strong>{shelterCapacity[selectedShelter].occupancy.toLocaleString()}</strong> ({Math.round(shelterCapacity[selectedShelter].occupancy / shelterCapacity[selectedShelter].capacity * 100)}%)</div>
              <div style={{
                marginTop: 4,
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                display: "inline-block",
                color: "#fff",
                backgroundColor: shelterCapacity[selectedShelter].occupancy / shelterCapacity[selectedShelter].capacity > 0.8 ? "#ef4444" : shelterCapacity[selectedShelter].occupancy / shelterCapacity[selectedShelter].capacity > 0.5 ? "#f59e0b" : "#22c55e",
              }}>
                {shelterCapacity[selectedShelter].occupancy / shelterCapacity[selectedShelter].capacity > 0.8 ? "Near Capacity" : shelterCapacity[selectedShelter].occupancy / shelterCapacity[selectedShelter].capacity > 0.5 ? "Moderate" : "Available"}
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

/* ─── Timeline labels ─── */
const timelineLabels = [
  "72h ago", "60h", "48h", "36h", "24h", "12h", "6h", "3h", "1h", "Now",
];

/* ─── Main component ─── */
export function CrisisMap({
  height = "500px",
  showHeader = true,
}: {
  height?: string;
  showHeader?: boolean;
}) {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineValue, setTimelineValue] = useState([100]); // 0-100 range
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [showCorridors, setShowCorridors] = useState(false);
  const [showShelters, setShowShelters] = useState(false);

  useEffect(() => {
    getHeatmapData()
      .then(setData)
      .catch(() => {
        setData({
          sightings: [
            { lat: 29.752, lng: -95.356, type: "shelter", weight: 6 },
            { lat: 29.711, lng: -95.402, type: "hospital", weight: 3 },
            { lat: 26.438, lng: -81.807, type: "registry", weight: 4 },
            { lat: 20.889, lng: -156.473, type: "news", weight: 2 },
            { lat: 35.714, lng: -83.514, type: "shelter", weight: 5 },
            { lat: 39.729, lng: -121.838, type: "social_media", weight: 3 },
            { lat: 35.961, lng: -83.921, type: "shelter", weight: 7 },
            { lat: 30.267, lng: -97.743, type: "hospital", weight: 2 },
            { lat: 34.052, lng: -118.244, type: "registry", weight: 5 },
          ],
          cases: [
            { lat: 29.962, lng: -95.417, name: "Marcus R.", status: "open" },
            { lat: 26.641, lng: -81.872, name: "Sarah J.", status: "searching" },
            { lat: 20.878, lng: -156.683, name: "Tyler W.", status: "matched" },
            { lat: 39.760, lng: -121.622, name: "Emma C.", status: "open" },
            { lat: 35.714, lng: -83.510, name: "James M.", status: "reunited" },
          ],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  // Timeline playback
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimelineValue((prev) => {
        const next = prev[0] + 2;
        if (next >= 100) {
          setIsPlaying(false);
          return [100];
        }
        return [next];
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Filter data based on timeline position (simulate temporal filtering)
  const filteredData = useMemo(() => {
    if (!data) return null;
    const pct = timelineValue[0] / 100;
    const sightingCount = Math.max(1, Math.round((data.sightings?.length || 0) * pct));
    const caseCount = Math.max(1, Math.round((data.cases?.length || 0) * pct));
    return {
      sightings: (data.sightings || []).slice(0, sightingCount),
      cases: (data.cases || []).slice(0, caseCount),
    };
  }, [data, timelineValue]);

  const totalSightings = filteredData?.sightings?.reduce((a, b) => a + b.weight, 0) || 0;
  const totalSightingPoints = filteredData?.sightings?.length || 0;
  const activeCases = filteredData?.cases?.filter((c) => c.status !== "reunited").length || 0;
  const timeLabel = timelineLabels[Math.min(Math.floor(timelineValue[0] / 11.2), 9)];

  const content = (
    <>
      {loading ? (
        <div
          className="flex items-center justify-center bg-muted rounded-lg"
          style={{ height }}
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !GOOGLE_MAPS_KEY ? (
        <div
          className="flex flex-col items-center justify-center bg-muted rounded-lg gap-2"
          style={{ height }}
        >
          <MapPin className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Google Maps API key not configured</p>
        </div>
      ) : (
        <div style={{ height }} className="rounded-lg overflow-hidden relative">
          <APIProvider apiKey={GOOGLE_MAPS_KEY} libraries={["visualization"]}>
            <Map
              defaultCenter={{ lat: 33, lng: -98 }}
              defaultZoom={4}
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapId="tracebridge-crisis-map"
              style={{ width: "100%", height: "100%" }}
            >
              <MapMarkers data={filteredData} showHeatmap={showHeatmap} showLegacy={showLegacy} showCorridors={showCorridors} showShelters={showShelters} />
            </Map>
          </APIProvider>

          {/* Timeline slider overlay */}
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <div className="rounded-lg bg-background/90 backdrop-blur-sm border px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    if (timelineValue[0] >= 100) setTimelineValue([0]);
                    setIsPlaying(!isPlaying);
                  }}
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </Button>
                <div className="flex-1">
                  <Slider
                    value={timelineValue}
                    onValueChange={setTimelineValue}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-[52px]">
                  <Clock className="h-3 w-3" />
                  {timeLabel}
                </div>
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground mt-1 px-10">
                <span>72h ago</span>
                <span>48h</span>
                <span>24h</span>
                <span>12h</span>
                <span>Now</span>
              </div>
            </div>
          </div>

          {/* Overlay stats + heatmap toggle */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
            <Button
              variant={showHeatmap ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5 bg-background/90 backdrop-blur-sm shadow-sm border"
              onClick={() => setShowHeatmap(!showHeatmap)}
            >
              <Target className="h-3 w-3" />
              {showHeatmap ? "Heatmap On" : "Heatmap Off"}
            </Button>
            <Button
              variant={showLegacy ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5 bg-background/90 backdrop-blur-sm shadow-sm border"
              onClick={() => setShowLegacy(!showLegacy)}
            >
              <History className="h-3 w-3" />
              {showLegacy ? "Historical On" : "Historical Off"}
            </Button>
            <Button
              variant={showCorridors ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5 bg-background/90 backdrop-blur-sm shadow-sm border"
              onClick={() => setShowCorridors(!showCorridors)}
            >
              <AlertTriangle className="h-3 w-3" />
              {showCorridors ? "Corridors On" : "Corridors Off"}
            </Button>
            <Button
              variant={showShelters ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5 bg-background/90 backdrop-blur-sm shadow-sm border"
              onClick={() => setShowShelters(!showShelters)}
            >
              <MapPin className="h-3 w-3" />
              {showShelters ? "Shelters On" : "Shelters Off"}
            </Button>
            <div className="rounded-lg bg-background/90 backdrop-blur-sm border px-3 py-1.5 text-xs shadow-sm">
              <span className="text-muted-foreground">Active Cases: </span>
              <span className="font-semibold text-amber-600">{activeCases}</span>
            </div>
            <div className="rounded-lg bg-background/90 backdrop-blur-sm border px-3 py-1.5 text-xs shadow-sm">
              <span className="text-muted-foreground">Data Points: </span>
              <span className="font-semibold text-blue-600">{totalSightingPoints.toLocaleString()}</span>
            </div>
            <div className="rounded-lg bg-background/90 backdrop-blur-sm border px-3 py-1.5 text-xs shadow-sm">
              <span className="text-muted-foreground">Incidents: </span>
              <span className="font-semibold text-red-600">{totalSightings.toLocaleString()}</span>
            </div>
            {showLegacy && (
              <div className="rounded-lg bg-background/90 backdrop-blur-sm border px-3 py-1.5 text-xs shadow-sm">
                <span className="text-muted-foreground">Legacy Cases: </span>
                <span className="font-semibold text-purple-600">{legacyPoints.length}</span>
              </div>
            )}
          </div>

          {/* Google badge */}
          <div className="absolute bottom-1 left-1 z-10">
            <div className="rounded bg-background/70 backdrop-blur-sm px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Powered by Google Maps
            </div>
          </div>
        </div>
      )}

      {/* Dual Legend */}
      <div className="flex flex-wrap justify-between gap-4 mt-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground font-medium text-xs">Sources:</span>
          {Object.entries(typeColors).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1 capitalize">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs">{type.replace("_", " ")}</span>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground font-medium text-xs">Cases:</span>
          {Object.entries(statusConfig).map(([status, cfg]) => (
            <span key={status} className="flex items-center gap-1 capitalize">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-xs">{status}</span>
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#7c3aed" }} />
            <span className="text-xs">Historical</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4" style={{ backgroundColor: "#a855f7" }} />
            <span className="text-xs">Corridor</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded border border-green-500" style={{ backgroundColor: "#dcfce7" }} />
            <span className="text-xs">Shelter</span>
          </span>
        </div>
      </div>
    </>
  );

  if (!showHeader) return content;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4 text-red-500" />
            Crisis Intelligence Map
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-xs text-muted-foreground">Live monitoring</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
