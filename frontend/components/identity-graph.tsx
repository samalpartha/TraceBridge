"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  MapPin,
  Database,
  Tag,
  Eye,
  Shield,
  Zap,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Fingerprint,
  Radio,
  Layers,
  Search,
  Activity,
} from "lucide-react";

/* ─── Types ─── */
interface GraphNode {
  id: string;
  label: string;
  type: "person" | "location" | "source" | "descriptor" | "sighting" | "match";
  color: string;
  // Simulation position
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Extra data
  [key: string]: any;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
  color: string;
  label: string;
  [key: string]: any;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    total_nodes: number;
    total_edges: number;
    node_types: Record<string, number>;
    edge_types: Record<string, number>;
  };
}

/* ─── Node icon mapping ─── */
const nodeIcons: Record<string, typeof User> = {
  person: User,
  location: MapPin,
  source: Database,
  descriptor: Tag,
  sighting: Eye,
  match: Fingerprint,
};

const nodeRadius: Record<string, number> = {
  person: 18,
  location: 14,
  source: 20,
  descriptor: 10,
  sighting: 12,
  match: 12,
};

/* ─── Fallback simulated graph ─── */
function generateFallbackGraph(): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Person nodes
  const people = [
    { id: "person-1", label: "Marcus Rivera", status: "open", age: 8 },
    { id: "person-2", label: "Emma Chen", status: "matched", age: 5 },
    { id: "person-3", label: "Sarah Johnson", status: "searching" },
    { id: "person-4", label: "James Williams", status: "verified" },
    { id: "person-5", label: "Tyler Washington", status: "reunited" },
  ];
  people.forEach((p) => {
    nodes.push({ ...p, type: "person", color: "#ef4444", x: 0, y: 0, vx: 0, vy: 0 });
  });

  // Location nodes
  const locs = [
    { id: "loc-houston", label: "Houston, TX", lat: 29.76, lng: -95.37 },
    { id: "loc-paradise", label: "Paradise, CA", lat: 39.76, lng: -121.62 },
    { id: "loc-gatlinburg", label: "Gatlinburg, TN", lat: 35.71, lng: -83.51 },
    { id: "loc-knoxville", label: "Knoxville, TN", lat: 35.96, lng: -83.92 },
    { id: "loc-maui", label: "Lahaina, HI", lat: 20.88, lng: -156.68 },
  ];
  locs.forEach((l) => {
    nodes.push({ ...l, type: "location", color: "#22c55e", x: 0, y: 0, vx: 0, vy: 0 });
  });

  // Source nodes
  const sources = [
    { id: "src-fbi", label: "FBI Wanted", record_count: 847 },
    { id: "src-iom", label: "IOM Migrants", record_count: 1200 },
    { id: "src-shelter", label: "Shelter Registry", record_count: 156 },
    { id: "src-namus", label: "NamUs (Public)", record_count: 12 },
    { id: "src-legacy", label: "Legacy Intel", record_count: 7 },
  ];
  sources.forEach((s) => {
    nodes.push({ ...s, type: "source", color: "#3b82f6", x: 0, y: 0, vx: 0, vy: 0 });
  });

  // Descriptor nodes
  const descs = [
    { id: "desc-child", label: "Child", category: "age_group" },
    { id: "desc-male", label: "Male", category: "gender" },
    { id: "desc-female", label: "Female", category: "gender" },
    { id: "desc-scar", label: "Scar", category: "physical" },
    { id: "desc-tattoo", label: "Tattoo", category: "physical" },
    { id: "desc-glasses", label: "Glasses", category: "clothing" },
    { id: "desc-red-jacket", label: "Red Jacket", category: "clothing" },
  ];
  descs.forEach((d) => {
    nodes.push({ ...d, type: "descriptor", color: "#a855f7", x: 0, y: 0, vx: 0, vy: 0 });
  });

  // Sighting nodes
  const sightings = [
    { id: "sight-1", label: "GRB Shelter Match", source_type: "shelter" },
    { id: "sight-2", label: "FBI Record #4721", source_type: "fbi" },
    { id: "sight-3", label: "IOM Report #892", source_type: "iom" },
    { id: "sight-4", label: "Red Cross Intake", source_type: "shelter" },
    { id: "sight-5", label: "NamUs #MP-11029", source_type: "namus" },
    { id: "sight-6", label: "Community Tip", source_type: "shelter" },
  ];
  sightings.forEach((s) => {
    nodes.push({ ...s, type: "sighting", color: "#f59e0b", x: 0, y: 0, vx: 0, vy: 0 });
  });

  // Edges: person → location
  edges.push({ source: "person-1", target: "loc-houston", type: "reported_at", weight: 1, color: "#94a3b8", label: "reported at" });
  edges.push({ source: "person-2", target: "loc-paradise", type: "reported_at", weight: 1, color: "#94a3b8", label: "reported at" });
  edges.push({ source: "person-3", target: "loc-houston", type: "reported_at", weight: 1, color: "#94a3b8", label: "reported at" });
  edges.push({ source: "person-4", target: "loc-gatlinburg", type: "reported_at", weight: 1, color: "#94a3b8", label: "reported at" });
  edges.push({ source: "person-5", target: "loc-maui", type: "reported_at", weight: 1, color: "#94a3b8", label: "reported at" });

  // Edges: person → descriptor
  edges.push({ source: "person-1", target: "desc-child", type: "has_descriptor", weight: 0.6, color: "#a855f7", label: "descriptor" });
  edges.push({ source: "person-1", target: "desc-male", type: "has_descriptor", weight: 0.6, color: "#a855f7", label: "descriptor" });
  edges.push({ source: "person-2", target: "desc-child", type: "has_descriptor", weight: 0.6, color: "#a855f7", label: "descriptor" });
  edges.push({ source: "person-2", target: "desc-female", type: "has_descriptor", weight: 0.6, color: "#a855f7", label: "descriptor" });
  edges.push({ source: "person-3", target: "desc-scar", type: "has_descriptor", weight: 0.6, color: "#a855f7", label: "descriptor" });
  edges.push({ source: "person-4", target: "desc-glasses", type: "has_descriptor", weight: 0.6, color: "#a855f7", label: "descriptor" });
  edges.push({ source: "person-4", target: "desc-male", type: "has_descriptor", weight: 0.6, color: "#a855f7", label: "descriptor" });

  // Edges: person → sighting (matches)
  edges.push({ source: "person-1", target: "sight-1", type: "matched", weight: 0.87, color: "#ec4899", label: "match", fused: 0.87, vision: 0.91, rag: 0.82, geo: 0.88 });
  edges.push({ source: "person-2", target: "sight-4", type: "matched", weight: 0.72, color: "#ec4899", label: "match", fused: 0.72, vision: 0.65, rag: 0.78, geo: 0.73 });
  edges.push({ source: "person-3", target: "sight-2", type: "matched", weight: 0.64, color: "#ec4899", label: "match", fused: 0.64, vision: 0.5, rag: 0.71, geo: 0.7 });
  edges.push({ source: "person-4", target: "sight-3", type: "matched", weight: 0.91, color: "#ec4899", label: "match", fused: 0.91, vision: 0.88, rag: 0.93, geo: 0.91 });
  edges.push({ source: "person-1", target: "sight-6", type: "matched", weight: 0.45, color: "#ec4899", label: "match", fused: 0.45, vision: 0.3, rag: 0.55, geo: 0.5 });

  // Edges: sighting → source
  edges.push({ source: "sight-1", target: "src-shelter", type: "sourced_from", weight: 0.8, color: "#3b82f6", label: "sourced from" });
  edges.push({ source: "sight-2", target: "src-fbi", type: "sourced_from", weight: 0.8, color: "#3b82f6", label: "sourced from" });
  edges.push({ source: "sight-3", target: "src-iom", type: "sourced_from", weight: 0.8, color: "#3b82f6", label: "sourced from" });
  edges.push({ source: "sight-4", target: "src-shelter", type: "sourced_from", weight: 0.8, color: "#3b82f6", label: "sourced from" });
  edges.push({ source: "sight-5", target: "src-namus", type: "sourced_from", weight: 0.8, color: "#3b82f6", label: "sourced from" });
  edges.push({ source: "sight-6", target: "src-shelter", type: "sourced_from", weight: 0.8, color: "#3b82f6", label: "sourced from" });

  // Edges: sighting → location
  edges.push({ source: "sight-1", target: "loc-houston", type: "reported_at", weight: 0.5, color: "#94a3b8", label: "reported at" });
  edges.push({ source: "sight-4", target: "loc-paradise", type: "reported_at", weight: 0.5, color: "#94a3b8", label: "reported at" });
  edges.push({ source: "sight-3", target: "loc-knoxville", type: "reported_at", weight: 0.5, color: "#94a3b8", label: "reported at" });

  // Geo-proximity
  edges.push({ source: "loc-gatlinburg", target: "loc-knoxville", type: "geo_proximity", weight: 0.9, color: "#22c55e", label: "geo proximity" });

  // Shared descriptors create implicit connections — the graph reveals this visually

  const stats = {
    total_nodes: nodes.length,
    total_edges: edges.length,
    node_types: {} as Record<string, number>,
    edge_types: {} as Record<string, number>,
  };
  nodes.forEach((n) => { stats.node_types[n.type] = (stats.node_types[n.type] || 0) + 1; });
  edges.forEach((e) => { stats.edge_types[e.type] = (stats.edge_types[e.type] || 0) + 1; });

  return { nodes, edges, stats };
}

/* ─── Simple force simulation ─── */
function runForceSimulation(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number, iterations = 120) {
  // Initialize positions using a circular layout by type
  const typeGroups: Record<string, number> = {};
  let typeIdx = 0;
  nodes.forEach((n) => {
    if (!(n.type in typeGroups)) {
      typeGroups[n.type] = typeIdx++;
    }
    const group = typeGroups[n.type];
    const angle = (group / typeIdx) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const radius = 120 + Math.random() * 100;
    n.x = width / 2 + Math.cos(angle) * radius;
    n.y = height / 2 + Math.sin(angle) * radius;
    n.vx = 0;
    n.vy = 0;
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const alpha = 0.3;
  const repulsion = 3000;
  const attraction = 0.005;
  const damping = 0.85;
  const centerForce = 0.01;

  for (let iter = 0; iter < iterations; iter++) {
    const decay = 1 - iter / iterations;

    // Repulsion (all pairs — use spatial heuristic for large graphs)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (repulsion * decay) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction (edges)
    for (const e of edges) {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = dist * attraction * (e.weight || 1) * decay;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    }

    // Center gravity
    for (const n of nodes) {
      n.vx += (width / 2 - n.x) * centerForce * decay;
      n.vy += (height / 2 - n.y) * centerForce * decay;
    }

    // Apply velocity
    for (const n of nodes) {
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx * alpha;
      n.y += n.vy * alpha;
      // Clamp to bounds
      const r = nodeRadius[n.type] || 12;
      n.x = Math.max(r + 10, Math.min(width - r - 10, n.x));
      n.y = Math.max(r + 10, Math.min(height - r - 10, n.y));
    }
  }
}

/* ─── Component ─── */
export function IdentityGraphViz({ height = 600 }: { height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [filterType, setFilterType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [width, setWidth] = useState(900);

  // Fetch graph data
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";
    fetch(`${API_URL}/api/graph/`)
      .then((r) => r.json())
      .then((data) => {
        if (data.nodes && data.nodes.length > 0) {
          // Initialize positions
          data.nodes.forEach((n: GraphNode) => { n.x = 0; n.y = 0; n.vx = 0; n.vy = 0; });
          runForceSimulation(data.nodes, data.edges, width, height);
          setGraphData(data);
        } else {
          // Fallback
          const fb = generateFallbackGraph();
          runForceSimulation(fb.nodes, fb.edges, width, height);
          setGraphData(fb);
        }
      })
      .catch(() => {
        const fb = generateFallbackGraph();
        runForceSimulation(fb.nodes, fb.edges, width, height);
        setGraphData(fb);
      });
  }, [width, height]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Connected nodes for hover highlighting
  const connectedSet = useMemo(() => {
    if (!hoveredNode || !graphData) return new Set<string>();
    const s = new Set<string>();
    s.add(hoveredNode);
    graphData.edges.forEach((e) => {
      if (e.source === hoveredNode) s.add(e.target);
      if (e.target === hoveredNode) s.add(e.source);
    });
    return s;
  }, [hoveredNode, graphData]);

  // Filtered nodes
  const visibleNodes = useMemo(() => {
    if (!graphData) return [];
    let nodes = graphData.nodes;
    if (filterType) nodes = nodes.filter((n) => n.type === filterType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter((n) => n.label.toLowerCase().includes(q) || n.type.includes(q));
    }
    return nodes;
  }, [graphData, filterType, searchQuery]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    if (!graphData) return [];
    return graphData.edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [graphData, visibleNodeIds]);

  const nodeMap = useMemo(() => {
    if (!graphData) return new Map<string, GraphNode>();
    return new Map(graphData.nodes.map((n) => [n.id, n]));
  }, [graphData]);

  // Dragging
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName !== "circle" && (e.target as HTMLElement).tagName !== "text") {
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  if (!graphData) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Activity className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative" style={{ height }}>
      {/* Controls overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        {/* Search */}
        <div className="flex items-center gap-1.5 rounded-lg bg-background/90 backdrop-blur-sm border px-2.5 py-1.5 shadow-sm">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search graph..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs outline-none w-32 placeholder:text-muted-foreground"
          />
        </div>
        {/* Type filters */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFilterType(null)}
            className={`rounded-full px-2 py-0.5 text-[9px] font-medium border transition-colors ${
              !filterType ? "bg-foreground text-background" : "bg-background/90 backdrop-blur-sm text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({graphData.stats.total_nodes})
          </button>
          {Object.entries(graphData.stats.node_types).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={`rounded-full px-2 py-0.5 text-[9px] font-medium border transition-colors flex items-center gap-1 ${
                filterType === type ? "text-white" : "bg-background/90 backdrop-blur-sm text-muted-foreground hover:text-foreground"
              }`}
              style={filterType === type ? { backgroundColor: (graphData as any).node_colors?.[type] || "#6b7280" } : {}}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: (graphData as any).node_colors?.[type] || "#6b7280" }} />
              {type} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0 bg-background/90" onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}>
          <ZoomIn className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0 bg-background/90" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.3))}>
          <ZoomOut className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0 bg-background/90" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
          <Maximize2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Stats overlay */}
      <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-background/90 backdrop-blur-sm border px-3 py-2 shadow-sm">
        <div className="flex items-center gap-3 text-[10px]">
          <span className="font-medium">{graphData.stats.total_nodes} nodes</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium">{graphData.stats.total_edges} edges</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">Zoom: {Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* SVG Graph */}
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        className="rounded-lg bg-muted/20 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={(e) => {
          e.preventDefault();
          setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
        }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {visibleEdges.map((e, i) => {
            const s = nodeMap.get(e.source);
            const t = nodeMap.get(e.target);
            if (!s || !t) return null;
            const isHighlighted = hoveredNode && (connectedSet.has(e.source) && connectedSet.has(e.target));
            const opacity = hoveredNode ? (isHighlighted ? 0.8 : 0.08) : 0.3;
            const strokeWidth = e.type === "matched" ? 2 + e.weight * 2 : 1;
            return (
              <line
                key={`e-${i}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={e.color}
                strokeWidth={strokeWidth}
                strokeOpacity={opacity}
                strokeDasharray={e.type === "geo_proximity" ? "4,4" : e.type === "has_descriptor" ? "2,3" : undefined}
              />
            );
          })}

          {/* Edge labels for match edges (when hovered) */}
          {hoveredNode && visibleEdges
            .filter((e) => e.type === "matched" && (e.source === hoveredNode || e.target === hoveredNode))
            .map((e, i) => {
              const s = nodeMap.get(e.source);
              const t = nodeMap.get(e.target);
              if (!s || !t) return null;
              return (
                <text
                  key={`el-${i}`}
                  x={(s.x + t.x) / 2}
                  y={(s.y + t.y) / 2 - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill={e.color}
                >
                  {Math.round((e.fused || e.weight) * 100)}%
                </text>
              );
            })}

          {/* Nodes */}
          {visibleNodes.map((n) => {
            const r = nodeRadius[n.type] || 12;
            const isHighlighted = !hoveredNode || connectedSet.has(n.id);
            const opacity = isHighlighted ? 1 : 0.15;
            const isSelected = selectedNode?.id === n.id;

            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                opacity={opacity}
                style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={() => setHoveredNode(n.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={(e) => { e.stopPropagation(); setSelectedNode(n); }}
              >
                {/* Glow ring for selected */}
                {isSelected && (
                  <circle r={r + 6} fill="none" stroke={n.color} strokeWidth={2} strokeOpacity={0.4} strokeDasharray="4,2" />
                )}
                {/* Pulse ring for person nodes with active status */}
                {n.type === "person" && n.status && n.status !== "reunited" && (
                  <circle r={r + 3} fill="none" stroke={n.color} strokeWidth={1} strokeOpacity={0.3}>
                    <animate attributeName="r" from={String(r + 2)} to={String(r + 8)} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Node circle */}
                <circle
                  r={r}
                  fill={n.color}
                  fillOpacity={0.15}
                  stroke={n.color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {/* Label */}
                <text
                  y={r + 12}
                  textAnchor="middle"
                  fontSize={n.type === "descriptor" ? 8 : 9}
                  fontWeight={n.type === "person" ? 600 : 400}
                  fill="currentColor"
                  className="select-none"
                >
                  {n.label.length > 18 ? n.label.slice(0, 16) + "…" : n.label}
                </text>
                {/* Type icon character */}
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize={r * 0.8}
                  fill={n.color}
                  fontWeight={700}
                  className="select-none"
                >
                  {n.type === "person" ? "P" :
                   n.type === "location" ? "L" :
                   n.type === "source" ? "S" :
                   n.type === "descriptor" ? "D" :
                   n.type === "sighting" ? "E" : "?"}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Detail panel */}
      {selectedNode && (
        <div className="absolute bottom-3 right-3 z-10 w-72 rounded-xl border border-white/20 dark:border-white/8 bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ backgroundColor: `${selectedNode.color}15` }}>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedNode.color }} />
              <span className="text-xs font-bold uppercase tracking-wider">{selectedNode.type}</span>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="px-4 py-3 space-y-2">
            <h3 className="font-semibold text-sm">{selectedNode.label}</h3>

            {selectedNode.type === "person" && (
              <>
                {selectedNode.status && (
                  <Badge variant="outline" className="text-[9px] capitalize">{selectedNode.status}</Badge>
                )}
                {selectedNode.age && <p className="text-xs text-muted-foreground">Age: {selectedNode.age}</p>}
                {selectedNode.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{selectedNode.description}</p>
                )}
              </>
            )}

            {selectedNode.type === "source" && (
              <>
                {selectedNode.record_count != null && (
                  <p className="text-xs text-muted-foreground">{selectedNode.record_count} records indexed</p>
                )}
                {selectedNode.description && (
                  <p className="text-xs text-muted-foreground">{selectedNode.description}</p>
                )}
              </>
            )}

            {selectedNode.type === "location" && (
              <>
                {selectedNode.lat && selectedNode.lng && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {selectedNode.lat.toFixed(3)}, {selectedNode.lng.toFixed(3)}
                  </p>
                )}
              </>
            )}

            {/* Connections */}
            <div className="pt-1.5 border-t">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Connections
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {graphData.edges
                  .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                  .slice(0, 10)
                  .map((e, i) => {
                    const otherId = e.source === selectedNode.id ? e.target : e.source;
                    const other = nodeMap.get(otherId);
                    if (!other) return null;
                    return (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: other.color }} />
                          <span className="truncate">{other.label}</span>
                        </div>
                        <Badge variant="outline" className="text-[8px] ml-1 shrink-0" style={{ borderColor: e.color, color: e.color }}>
                          {e.label}
                          {e.type === "matched" && ` ${Math.round(e.weight * 100)}%`}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Action */}
            {selectedNode.type === "person" && selectedNode.case_id && (
              <a href={`/cases/${selectedNode.case_id}`}>
                <Button size="sm" className="w-full text-xs gap-1.5 h-7 mt-1">
                  <Eye className="h-3 w-3" /> Open Case File
                </Button>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
