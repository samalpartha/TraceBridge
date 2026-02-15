// Backend API client

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";

async function fetchAPI(path: string, options?: RequestInit) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

// Cases
export async function getCases(status?: string) {
  const params = status ? `?status=${status}` : "";
  return fetchAPI(`/api/cases/${params}`);
}

export async function getCase(id: string) {
  return fetchAPI(`/api/cases/${id}`);
}

export async function createCase(formData: FormData) {
  const url = `${API_URL}/api/cases/`;
  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

export async function updateCaseStatus(id: string, status: string) {
  return fetchAPI(`/api/cases/${id}/status?status=${status}`, { method: "PATCH" });
}

// Matches
export async function getMatchesForCase(caseId: string) {
  return fetchAPI(`/api/matches/case/${caseId}`);
}

export async function verifyMatch(matchId: string, action: string, notes?: string) {
  return fetchAPI(`/api/matches/${matchId}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, notes }),
  });
}

// Search
export async function triggerSearch(caseId: string) {
  return fetchAPI("/api/search/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ case_id: caseId }),
  });
}

// Geo
export async function getHeatmapData() {
  return fetchAPI("/api/geo/heatmap");
}

export async function getGeoEvents(caseId?: string) {
  const params = caseId ? `?case_id=${caseId}` : "";
  return fetchAPI(`/api/geo/events${params}`);
}

// Dashboard
export async function getDashboardStats() {
  return fetchAPI("/api/dashboard/stats");
}

// Outreach
export async function triggerOutreach(matchId: string, channel?: string, targetUrl?: string) {
  return fetchAPI("/api/outreach/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ match_id: matchId, channel: channel || "tinyfish", target_url: targetUrl }),
  });
}

export async function getOutreachHistory(matchId: string) {
  return fetchAPI(`/api/outreach/history/${matchId}`);
}

// Live Data Feed
export async function getLiveFeed(page = 1, pageSize = 20, sourceType?: string) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (sourceType) params.set("source_type", sourceType);
  return fetchAPI(`/api/live/feed?${params}`);
}

export async function getLiveStats() {
  return fetchAPI("/api/live/stats");
}

export async function triggerIngestion(sources: "all" | "fbi" | "iom" = "all") {
  return fetchAPI(`/api/live/ingest?sources=${sources}`, { method: "POST" });
}

export async function getFbiMissing(page = 1, pageSize = 20) {
  return fetchAPI(`/api/live/fbi/missing?page=${page}&page_size=${pageSize}`);
}

// AI Analysis (Google Gemini)
export async function analyzeCase(caseId?: string, description?: string, analysisType = "risk") {
  return fetchAPI("/api/ai/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      case_id: caseId,
      description: description,
      analysis_type: analysisType,
    }),
  });
}

export async function suggestDescription(partialInfo: string) {
  return fetchAPI("/api/ai/suggest-description", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ partial_info: partialInfo }),
  });
}

export async function getAiHealth() {
  return fetchAPI("/api/ai/health");
}

// ── TinyFish Actions (7 workflows) ──

export async function tfOutreachPlan(caseId: string, matchSummary?: string) {
  return fetchAPI("/api/tinyfish/outreach-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ case_id: caseId, match_summary: matchSummary }),
  });
}

export async function tfScanSources(source = "all", reScore = true) {
  return fetchAPI("/api/tinyfish/scan-sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, re_score: reScore }),
  });
}

export async function tfVerifyAssist(caseId: string, matchId?: string) {
  return fetchAPI("/api/tinyfish/verify-assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ case_id: caseId, match_id: matchId }),
  });
}

export async function tfEscalate(caseId: string, slaHours: number, breachReason?: string) {
  return fetchAPI("/api/tinyfish/escalate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ case_id: caseId, sla_hours: slaHours, breach_reason: breachReason || "SLA exceeded" }),
  });
}

export async function tfAgencyPack(caseId: string, agency = "Red Cross", redact = true) {
  return fetchAPI("/api/tinyfish/agency-pack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ case_id: caseId, receiving_agency: agency, redact_sensitive: redact }),
  });
}

export async function tfCallAssist(caseId: string, callType = "inquiry", notes?: string) {
  return fetchAPI("/api/tinyfish/call-assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ case_id: caseId, call_type: callType, notes }),
  });
}

export async function tfClosure(caseId: string, details?: string) {
  return fetchAPI("/api/tinyfish/closure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ case_id: caseId, reunification_details: details }),
  });
}

// Auth
export async function login(email: string, password: string) {
  return fetchAPI("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function register(data: {
  email: string;
  password: string;
  full_name: string;
  role?: string;
}) {
  return fetchAPI("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
