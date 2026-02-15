"""
Integration tests for stateless API endpoints (legacy, namus, ai health).
These endpoints don't require a database — they use in-memory data.
Uses httpx AsyncClient directly against the FastAPI app.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")
os.environ.setdefault("DATABASE_URL_SYNC", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("BACKEND_CORS_ORIGINS", "http://localhost:3005")
os.environ.setdefault("GOOGLE_API_KEY", "test-key")

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ROOT & HEALTH
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@pytest.mark.asyncio
async def test_root(client):
    resp = await client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["app"] == "TraceBridge"
    assert data["version"] == "1.0.0"
    assert data["status"] == "running"


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  LEGACY INTEL ENDPOINTS (stateless — uses in-memory records)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@pytest.mark.asyncio
async def test_legacy_search(client):
    resp = await client.post("/api/legacy/search", json={"query": "scar tattoo male"})
    assert resp.status_code == 200
    data = resp.json()
    assert "matches" in data
    assert data["total_records_scanned"] == 7
    assert data["source"] == "Open Intelligence Registry"
    if data["matches"]:
        assert "relevance_score" in data["matches"][0]
        assert "matched_descriptors" in data["matches"][0]


@pytest.mark.asyncio
async def test_legacy_search_no_results(client):
    resp = await client.post("/api/legacy/search", json={"query": "alien spaceship", "min_score": 0.9})
    assert resp.status_code == 200
    assert resp.json()["matches"] == []


@pytest.mark.asyncio
async def test_legacy_records(client):
    resp = await client.get("/api/legacy/records")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 7
    assert len(data["records"]) == 7


@pytest.mark.asyncio
async def test_legacy_records_region_filter(client):
    resp = await client.get("/api/legacy/records?region=TX")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] > 0
    for r in data["records"]:
        assert "tx" in r["region"].lower()


@pytest.mark.asyncio
async def test_legacy_records_pagination(client):
    resp = await client.get("/api/legacy/records?limit=3&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["records"]) == 3


@pytest.mark.asyncio
async def test_legacy_geo(client):
    resp = await client.get("/api/legacy/geo")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 7
    for p in data["points"]:
        assert "lat" in p and "lng" in p
        assert -90 <= p["lat"] <= 90


@pytest.mark.asyncio
async def test_legacy_stats(client):
    resp = await client.get("/api/legacy/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] == 7
    assert data["unresolved"] == 7
    assert len(data["regions"]) > 0
    assert len(data["year_range"]) == 2


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  NAMUS ENDPOINTS (stateless — uses in-memory records)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@pytest.mark.asyncio
async def test_namus_search(client):
    resp = await client.post("/api/namus/search", json={"query": "Houston male compass tattoo"})
    assert resp.status_code == 200
    data = resp.json()
    assert "matches" in data
    assert data["source"] == "NamUs (public tier)"
    assert "provenance" in data
    assert data["provenance"]["data_tier"] == "public"


@pytest.mark.asyncio
async def test_namus_search_with_threshold(client):
    resp = await client.post("/api/namus/search", json={"query": "Houston", "min_score": 0.01, "limit": 5})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["matches"]) <= 5


@pytest.mark.asyncio
async def test_namus_records(client):
    resp = await client.get("/api/namus/records")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 5


@pytest.mark.asyncio
async def test_namus_records_state_filter(client):
    resp = await client.get("/api/namus/records?state=TX")
    assert resp.status_code == 200
    for r in resp.json()["records"]:
        assert r["state"] == "TX"


@pytest.mark.asyncio
async def test_namus_records_case_type_filter(client):
    resp = await client.get("/api/namus/records?case_type=unidentified_person")
    assert resp.status_code == 200
    for r in resp.json()["records"]:
        assert r["case_type"] == "unidentified_person"


@pytest.mark.asyncio
async def test_namus_stats(client):
    resp = await client.get("/api/namus/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] == 5
    assert data["missing_persons"] == 4
    assert data["unidentified_persons"] == 1
    assert "biometrics" in data
    assert "dna_available" in data["biometrics"]


@pytest.mark.asyncio
async def test_namus_geo(client):
    resp = await client.get("/api/namus/geo")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 5
    for p in data["points"]:
        assert "namus_id" in p
        assert "lat" in p and "lng" in p


@pytest.mark.asyncio
async def test_namus_provenance(client):
    resp = await client.get("/api/namus/provenance")
    assert resp.status_code == 200
    data = resp.json()
    assert "authority" in data
    assert "ethical_controls" in data
    assert len(data["ethical_controls"]) >= 5
    assert data["data_tier"] == "public"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  AI HEALTH (stateless)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@pytest.mark.asyncio
async def test_ai_health(client):
    resp = await client.get("/api/ai/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "model" in data
    assert "api_key_configured" in data
    assert "provider" in data


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  OPENAPI SCHEMA VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@pytest.mark.asyncio
async def test_openapi_schema_available(client):
    resp = await client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()
    assert schema["info"]["title"] == "TraceBridge"
    assert schema["info"]["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_openapi_schema_has_all_paths(client):
    resp = await client.get("/openapi.json")
    schema = resp.json()
    paths = schema["paths"]

    expected_prefixes = [
        "/api/auth", "/api/cases", "/api/matches", "/api/search",
        "/api/geo", "/api/outreach", "/api/dashboard", "/api/live",
        "/api/ai", "/api/tinyfish", "/api/legacy", "/api/namus", "/api/graph",
    ]
    for prefix in expected_prefixes:
        matching = [p for p in paths if p.startswith(prefix)]
        assert len(matching) > 0, f"No endpoints found for {prefix}"


@pytest.mark.asyncio
async def test_openapi_schema_has_components(client):
    resp = await client.get("/openapi.json")
    schema = resp.json()
    assert "components" in schema
    assert "schemas" in schema["components"]
    # Should have our Pydantic models
    component_names = list(schema["components"]["schemas"].keys())
    assert len(component_names) > 5  # At least CaseCreate, CaseResponse, etc.


@pytest.mark.asyncio
async def test_openapi_all_endpoints_have_responses(client):
    """Every endpoint in the schema must define at least one response."""
    resp = await client.get("/openapi.json")
    schema = resp.json()
    for path, methods in schema["paths"].items():
        for method, spec in methods.items():
            if method in ("get", "post", "put", "patch", "delete"):
                assert "responses" in spec, f"{method.upper()} {path} has no responses defined"
                assert len(spec["responses"]) > 0, f"{method.upper()} {path} has empty responses"
