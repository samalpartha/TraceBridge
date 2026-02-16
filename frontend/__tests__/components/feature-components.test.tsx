/**
 * Unit tests for feature components.
 * Tests rendering, data display, and user interaction.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import type { Case, MatchCandidate } from "@/lib/types";

// ── Mock providers ───────────────────────────────────────────────

jest.mock("@/components/app-shell", () => ({
  useSidebar: () => ({ collapsed: false, setCollapsed: jest.fn() }),
}));

jest.mock("@/components/crisis-mode", () => ({
  useCrisisMode: () => ({ crisisMode: false, setCrisisMode: jest.fn() }),
  CrisisModeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("recharts", () => {
  const MockComp = (name: string) => {
    const C = ({ children }: { children?: React.ReactNode }) => <div data-testid={name.toLowerCase()}>{children}</div>;
    C.displayName = name;
    return C;
  };
  const NullComp = (name: string) => {
    const C = () => null;
    C.displayName = name;
    return C;
  };
  return {
    ResponsiveContainer: MockComp("ResponsiveContainer"),
    LineChart: MockComp("LineChart"),
    BarChart: MockComp("BarChart"),
    AreaChart: MockComp("AreaChart"),
    PieChart: MockComp("PieChart"),
    Line: NullComp("Line"),
    Bar: NullComp("Bar"),
    XAxis: NullComp("XAxis"),
    YAxis: NullComp("YAxis"),
    CartesianGrid: NullComp("CartesianGrid"),
    Tooltip: NullComp("Tooltip"),
    Legend: NullComp("Legend"),
    Area: NullComp("Area"),
    Pie: NullComp("Pie"),
    Cell: NullComp("Cell"),
  };
});

jest.mock("@vis.gl/react-google-maps", () => {
  const MockComp = (name: string) => {
    const C = ({ children }: { children?: React.ReactNode }) => <div data-testid={name.toLowerCase()}>{children}</div>;
    C.displayName = name;
    return C;
  };
  return {
    APIProvider: MockComp("APIProvider"),
    Map: MockComp("Map"),
    AdvancedMarker: MockComp("AdvancedMarker"),
    useMap: () => null,
  };
});

// Mock framer-motion to avoid unknown prop warnings
jest.mock("framer-motion", () => {
  const ActualReact = jest.requireActual("react");
  const actual = jest.requireActual("framer-motion");

  interface MockProps extends Record<string, unknown> {
    children?: React.ReactNode;
  }

  const createMockComponent = (tag: string) => {
    const Component = ActualReact.forwardRef(function MockComponent(
      { children, ...props }: MockProps,
      ref: React.Ref<HTMLElement | SVGElement>
    ) {
      // Omit framer-motion props
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const {
        initial: _i, animate: _a, exit: _e, variants: _v, transition: _t,
        whileHover: _wh, whileTap: _wt, whileInView: _wiv, viewport: _vp,
        layout: _l, layoutId: _lid, ...validProps
      } = props;
      /* eslint-enable @typescript-eslint/no-unused-vars */
      return ActualReact.createElement(tag, { ref, ...validProps }, children);
    });
    Component.displayName = `Motion${tag.charAt(0).toUpperCase() + tag.slice(1)}`;
    return Component;
  };

  const PathComponent = ActualReact.forwardRef((props: React.SVGProps<SVGPathElement>, ref: React.Ref<SVGPathElement>) => <path ref={ref} {...props} />);
  PathComponent.displayName = "MotionPath";

  const motionMock = {
    div: createMockComponent("div"),
    span: createMockComponent("span"),
    button: createMockComponent("button"),
    li: createMockComponent("li"),
    path: PathComponent,
    h1: createMockComponent("h1"),
    h2: createMockComponent("h2"),
    p: createMockComponent("p"),
    a: createMockComponent("a"),
    section: createMockComponent("section"),
  };

  const AnimatePresenceMock = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  AnimatePresenceMock.displayName = "AnimatePresenceMock";

  return {
    ...actual,
    motion: motionMock,
    AnimatePresence: AnimatePresenceMock,
    useAnimation: () => ({ start: jest.fn() }),
    useInView: () => true,
  };
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  KPI DASHBOARD — fetches data internally
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { KPIDashboard } from "@/components/kpi-dashboard";

describe("KPIDashboard", () => {
  const mockStats = {
    total_cases: 142,
    active_cases: 47,
    total_matches: 89,
    approved_matches: 34,
    reunification_rate: 24.0,
    reunited_count: 34,
    total_source_records: 1500,
    total_outreach_events: 230,
    status_counts: { open: 30, searching: 17, matched: 20, reunited: 34, closed: 41 },
  };

  it("renders KPI data after fetch", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStats),
    });
    render(<KPIDashboard />);
    await waitFor(() => {
      expect(screen.getByText("142")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("displays active cases", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStats),
    });
    render(<KPIDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Active Searches/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CASE CARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { CaseCard } from "@/components/case-card";

describe("CaseCard", () => {
  const caseData = {
    id: "test-uuid-1",
    person_name: "John Doe",
    age: 32,
    gender: "Male",
    status: "searching",
    last_known_location: "New York, NY",
    description: "Last seen wearing blue jacket",
    created_at: "2026-01-15T10:00:00Z",
    media_assets: [],
  };

  it("renders person name and status", () => {
    render(<CaseCard caseData={caseData as Case} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  it("shows location", () => {
    render(<CaseCard caseData={caseData as Case} />);
    expect(screen.getByText(/New York/i)).toBeInTheDocument();
  });

  it("shows age", () => {
    render(<CaseCard caseData={caseData as Case} />);
    expect(screen.getByText(/Age 32/)).toBeInTheDocument();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MATCH EVIDENCE CARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { MatchEvidenceCard } from "@/components/match-evidence-card";

describe("MatchEvidenceCard", () => {
  const match = {
    id: "match-1",
    case_id: "case-1",
    fused_score: 0.82,
    vision_score: 0.9,
    rag_score: 0.75,
    geo_score: 0.65,
    status: "pending",
    person_name: "Possible Match Person",
    location_name: "Brooklyn, NY",
    description: "Similar appearance reported",
    source_type: "fbi_missing",
    created_at: "2026-01-16T14:00:00Z",
  };

  it("renders match score", () => {
    render(<MatchEvidenceCard match={match as MatchCandidate} />);
    expect(screen.getByText(/82/)).toBeInTheDocument();
  });

  it("shows person name", () => {
    render(<MatchEvidenceCard match={match as MatchCandidate} />);
    expect(screen.getByText(/Possible Match/i)).toBeInTheDocument();
  });

  it("shows evidence signal badges", () => {
    render(<MatchEvidenceCard match={match as MatchCandidate} />);
    expect(screen.getByText(/Face/i)).toBeInTheDocument();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SYSTEM HEALTH STRIP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { SystemHealthStrip } from "@/components/system-health-strip";

describe("SystemHealthStrip", () => {
  it("renders system metrics", () => {
    const { container } = render(<SystemHealthStrip />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  NAMUS PANEL — fetches data internally
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NamusStatusBlock } from "@/components/namus-panel";

describe("NamusStatusBlock", () => {
  it("renders NamUs integration info after fetch", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        total_records: 5,
        missing_persons: 4,
        unidentified_persons: 1,
        biometrics: { dna_available: 3, dental_available: 3, fingerprints_available: 3 },
        states_covered: ["TX", "CA"],
        source: "NamUs (public tier)",
      }),
    });
    render(<NamusStatusBlock />);
    await waitFor(() => {
      // Component renders NamUs source link text
      const namusElements = document.querySelectorAll("*");
      const hasNamus = Array.from(namusElements).some(el =>
        el.textContent?.includes("NamUs") || el.textContent?.includes("namus")
      );
      expect(hasNamus).toBe(true);
    }, { timeout: 3000 });
  });
});
