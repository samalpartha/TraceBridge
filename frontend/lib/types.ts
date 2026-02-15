// TraceBridge shared TypeScript types

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "family" | "caseworker" | "ngo_admin";
  org_name?: string;
}

export interface MediaAsset {
  id: string;
  file_path: string;
  media_type: "photo" | "video";
  original_filename?: string;
}

export interface Case {
  id: string;
  person_name: string;
  age?: number;
  gender?: string;
  description?: string;
  last_known_location?: string;
  last_known_lat?: number;
  last_known_lng?: number;
  last_known_date?: string;
  contact_info?: string;
  status: CaseStatus;
  reporter_id?: string;
  media_assets: MediaAsset[];
  created_at?: string;
}

export type CaseStatus =
  | "open"
  | "searching"
  | "matched"
  | "verified"
  | "reunited"
  | "closed";

export interface MatchCandidate {
  id: string;
  case_id: string;
  source_record_id?: string;
  vision_score?: number;
  rag_score?: number;
  geo_score?: number;
  fused_score?: number;
  evidence?: MatchEvidence;
  status: "pending" | "approved" | "rejected" | "escalated";
  created_at?: string;
  verified_at?: string;
  // From source record (joined)
  person_name?: string;
  description?: string;
  photo_url?: string;
  location_name?: string;
  source_type?: string;
}

export interface MatchEvidence {
  vision_evidence?: {
    score: number;
    description: string;
  };
  rag_evidence?: {
    score: number;
    description: string;
  };
  geo_evidence?: {
    score: number;
    distance_km?: number;
    description: string;
  };
  modalities_agreeing: number;
  confidence_level: "high" | "medium" | "low";
  explanation?: string;
}

export interface DashboardStats {
  total_cases: number;
  status_counts: Record<string, number>;
  active_cases: number;
  total_matches: number;
  approved_matches: number;
  total_source_records: number;
  total_outreach_events: number;
  reunification_rate: number;
  reunited_count: number;
}

export interface HeatmapData {
  sightings: Array<{
    lat: number;
    lng: number;
    type: string;
    weight: number;
  }>;
  cases: Array<{
    lat: number;
    lng: number;
    name: string;
    status: string;
  }>;
}

export interface GeoEvent {
  id: string;
  case_id?: string;
  event_type: string;
  lat?: number;
  lng?: number;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface SearchPipelineEvent {
  type: string;
  case_id?: string;
  stage?: string;
  has_photo?: boolean;
  has_text_embedding?: boolean;
  agents?: string[];
  status?: string;
  candidates_found?: number;
  movement_prediction?: Record<string, unknown>;
  total_candidates?: number;
  matches_above_threshold?: number;
  matches?: Array<{
    match_id: string;
    fused_score: number;
    person_name?: string;
    evidence?: MatchEvidence;
  }>;
  message?: string;
}

export interface OutreachEvent {
  id: string;
  channel: string;
  status: string;
  tinyfish_run_id?: string;
  response_data?: Record<string, unknown>;
  created_at?: string;
}
