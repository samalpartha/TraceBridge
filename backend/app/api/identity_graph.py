"""
Identity Graph API — the core intelligence layer.

The identity graph treats every entity as a node and every relationship
as a weighted edge.  Cases, matches, sightings, descriptors, and data
sources all live in a single connected graph.  This endpoint builds
the graph from real database records and returns it for visual exploration.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib, math, random

from app.database import get_db
from app.models import Case, MatchCandidate, SourceRecord

router = APIRouter()

# ── Node / edge colours ──────────────────────────────────────────
NODE_COLORS = {
    "person":     "#ef4444",   # red
    "location":   "#22c55e",   # green
    "source":     "#3b82f6",   # blue
    "descriptor": "#a855f7",   # purple
    "sighting":   "#f59e0b",   # amber
    "match":      "#ec4899",   # pink
}

EDGE_TYPES = {
    "reported_at":     {"color": "#94a3b8", "label": "reported at"},
    "matched":         {"color": "#ec4899", "label": "match"},
    "sourced_from":    {"color": "#3b82f6", "label": "sourced from"},
    "has_descriptor":  {"color": "#a855f7", "label": "descriptor"},
    "sighting_of":     {"color": "#f59e0b", "label": "sighting"},
    "geo_proximity":   {"color": "#22c55e", "label": "geo proximity"},
    "same_region":     {"color": "#6366f1", "label": "same region"},
}


def _hash_id(s: str) -> int:
    """Deterministic hash for stable layout positions."""
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


def _node(id: str, label: str, type: str, **kwargs):
    return {"id": id, "label": label, "type": type, "color": NODE_COLORS.get(type, "#6b7280"), **kwargs}


def _edge(source: str, target: str, type: str, weight: float = 1.0, **kwargs):
    cfg = EDGE_TYPES.get(type, {"color": "#94a3b8", "label": type})
    return {"source": source, "target": target, "type": type, "weight": weight, "color": cfg["color"], "label": cfg["label"], **kwargs}


@router.get("/")
async def get_identity_graph(db: AsyncSession = Depends(get_db)):
    """Build and return the full identity graph."""

    nodes = []
    edges = []
    node_ids = set()

    # ── 1.  Cases → person nodes ─────────────────────────────────
    result = await db.execute(select(Case))
    cases = result.scalars().all()
    for c in cases:
        pid = f"person-{c.id}"
        if pid not in node_ids:
            nodes.append(_node(
                pid, c.person_name, "person",
                case_id=c.id,
                status=c.status,
                age=c.age,
                gender=c.gender,
                description=c.description,
                photo=c.media_assets[0].file_path if c.media_assets else None,
            ))
            node_ids.add(pid)

        # Location node
        if c.last_known_location:
            lid = f"loc-{c.last_known_location[:30].lower().replace(' ', '-')}"
            if lid not in node_ids:
                nodes.append(_node(lid, c.last_known_location, "location",
                                   lat=c.last_known_lat, lng=c.last_known_lng))
                node_ids.add(lid)
            edges.append(_edge(pid, lid, "reported_at"))

        # Descriptor nodes from description text
        desc = (c.description or "").lower()
        for kw, cat in [("scar", "physical"), ("tattoo", "physical"),
                        ("glasses", "clothing"), ("jacket", "clothing"),
                        ("hat", "clothing"), ("red", "appearance"),
                        ("blue", "appearance"), ("child", "age_group"),
                        ("elderly", "age_group"), ("male", "gender"),
                        ("female", "gender")]:
            if kw in desc:
                did = f"desc-{kw}"
                if did not in node_ids:
                    nodes.append(_node(did, kw.title(), "descriptor", category=cat))
                    node_ids.add(did)
                edges.append(_edge(pid, did, "has_descriptor", weight=0.6))

    # ── 2.  Source records → sighting / source nodes ─────────────
    result = await db.execute(select(SourceRecord).limit(200))
    sources = result.scalars().all()
    source_type_ids: dict[str, str] = {}
    for sr in sources:
        # Source-type node (FBI, IOM, etc.)
        st = sr.source_type or "unknown"
        stid = f"src-{st}"
        if stid not in node_ids:
            nodes.append(_node(stid, st.upper().replace("_", " "), "source", record_count=0))
            node_ids.add(stid)
            source_type_ids[st] = stid
        # bump count
        for n in nodes:
            if n["id"] == stid:
                n["record_count"] = n.get("record_count", 0) + 1

        # Sighting node
        sid = f"sight-{sr.id}"
        if sid not in node_ids:
            nodes.append(_node(sid, sr.person_name or f"Record {sr.id[:8]}", "sighting",
                               source_type=st, location=sr.location_name))
            node_ids.add(sid)
        edges.append(_edge(sid, stid, "sourced_from", weight=0.8))

        # Location edge
        if sr.location_name:
            slid = f"loc-{sr.location_name[:30].lower().replace(' ', '-')}"
            if slid not in node_ids:
                nodes.append(_node(slid, sr.location_name, "location",
                                   lat=sr.geo_lat, lng=sr.geo_lng))
                node_ids.add(slid)
            edges.append(_edge(sid, slid, "reported_at", weight=0.5))

    # ── 3.  Matches → match edges between person and sighting ───
    result = await db.execute(select(MatchCandidate))
    matches = result.scalars().all()
    for m in matches:
        pid = f"person-{m.case_id}"
        # Find sighting for this source record
        if m.source_record_id:
            sid = f"sight-{m.source_record_id}"
            if pid in node_ids and sid in node_ids:
                edges.append(_edge(pid, sid, "matched",
                                   weight=m.fused_score or 0.5,
                                   vision=m.vision_score,
                                   rag=m.rag_score,
                                   geo=m.geo_score,
                                   fused=m.fused_score,
                                   status=m.status))

    # ── 4.  Geo-proximity edges between same-region nodes ────────
    loc_nodes = [n for n in nodes if n["type"] == "location" and n.get("lat") and n.get("lng")]
    for i, a in enumerate(loc_nodes):
        for b in loc_nodes[i+1:]:
            dist = math.sqrt((a["lat"] - b["lat"])**2 + (a["lng"] - b["lng"])**2)
            if dist < 2.0:  # ~200 km
                edges.append(_edge(a["id"], b["id"], "geo_proximity", weight=max(0.1, 1 - dist/2)))

    # ── 5.  Enrichment: legacy intel + NamUs simulated nodes ─────
    for label, src, desc in [
        ("Legacy Intel Registry", "legacy", "7 cold case records with structured descriptors"),
        ("NamUs (Public Tier)", "namus", "12 public NamUs records with biometric flags"),
    ]:
        nid = f"src-{src}"
        if nid not in node_ids:
            nodes.append(_node(nid, label, "source", description=desc, record_count=0))
            node_ids.add(nid)

    # ── Stats ────────────────────────────────────────────────────
    stats = {
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "node_types": {},
        "edge_types": {},
    }
    for n in nodes:
        stats["node_types"][n["type"]] = stats["node_types"].get(n["type"], 0) + 1
    for e in edges:
        stats["edge_types"][e["type"]] = stats["edge_types"].get(e["type"], 0) + 1

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": stats,
        "node_colors": NODE_COLORS,
        "edge_types": EDGE_TYPES,
    }


@router.get("/summary")
async def graph_summary(db: AsyncSession = Depends(get_db)):
    """Lightweight summary for dashboard widgets."""
    case_count = (await db.execute(select(func.count(Case.id)))).scalar()
    source_count = (await db.execute(select(func.count(SourceRecord.id)))).scalar()
    match_count = (await db.execute(select(func.count(MatchCandidate.id)))).scalar()

    return {
        "person_nodes": case_count,
        "sighting_nodes": min(source_count, 200),
        "match_edges": match_count,
        "source_types": ["FBI", "IOM", "Shelter", "NamUs", "Legacy"],
        "graph_density": round(match_count / max(case_count * source_count, 1) * 100, 2),
    }
