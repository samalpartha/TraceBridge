/**
 * Unit tests for feature components.
 * Tests rendering, data display, and user interaction.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

// ── Mock providers ───────────────────────────────────────────────

jest.mock("@/components/app-shell", () => ({
  useSidebar: () => ({ collapsed: false, setCollapsed: jest.fn() }),
}));

jest.mock("@/components/crisis-mode", () => ({
  useCrisisMode: () => ({ crisisMode: false, setCrisisMode: jest.fn() }),
  CrisisModeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Area: () => null,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

jest.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: any) => <div>{children}</div>,
  Map: ({ children }: any) => <div data-testid="google-map">{children}</div>,
  AdvancedMarker: ({ children }: any) => <div>{children}</div>,
  useMap: () => null,
}));

jest.mock("framer-motion", () => {
  const React = require("react");
  const actual = jest.requireActual("framer-motion");
  const motion = {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const {
        initial, animate, exit, variants, transition,
        whileHover, whileTap, whileInView, viewport,
        layout, layoutId, ...validProps
      } = props;
      return <div ref={ref} {...validProps}>{children}</div>;
    }),
    span: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const {
        initial, animate, exit, variants, transition,
        whileHover, whileTap, whileInView, viewport,
        layout, layoutId, ...validProps
      } = props;
      return <span ref={ref} {...validProps}>{children}</span>;
    }),
    button: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const {
        initial, animate, exit, variants, transition,
        whileHover, whileTap, whileInView, viewport,
        layout, layoutId, ...validProps
      } = props;
      return <button ref={ref} {...validProps}>{children}</button>;
    }),
    li: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const {
        initial, animate, exit, variants, transition,
        whileHover, whileTap, whileInView, viewport,
        layout, layoutId, ...validProps
      } = props;
      return <li ref={ref} {...validProps}>{children}</li>;
    }),
    path: React.forwardRef((props: any, ref: any) => <path ref={ref} {...props} />),
    h1: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const {
        initial, animate, exit, variants, transition,
        whileHover, whileTap, whileInView, viewport,
        layout, layoutId, ...validProps
      } = props;
      return <h1 ref={ref} {...validProps}>{children}</h1>;
    }),
    h2: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const {
        initial, animate, exit, variants, transition,
        whileHover, whileTap, whileInView, viewport,
        layout, layoutId, ...validProps
      } = props;
      return <h2 ref={ref} {...validProps}>{children}</h2>;
    }),
    p: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const {
        initial, animate, exit, variants, transition,
        whileHover, whileTap, whileInView, viewport,
        layout, layoutId, ...validProps
      } = props;
      return <p ref={ref} {...validProps}>{children}</p>;
    }),
    a: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const {
        initial, animate, exit, variants, transition,
        whileHover, whileTap, whileInView, viewport,
        layout, layoutId, ...validProps
      } = props;
      return <a ref={ref} {...validProps}>{children}</a>;
    }),
    section: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const {
        initial, animate, exit, variants, transition,
        whileHover, whileTap, whileInView, viewport,
        layout, layoutId, ...validProps
      } = props;
      return <section ref={ref} {...validProps}>{children}</section>;
    }),
  };

  return {
    ...actual,
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
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
    render(<CaseCard caseData={caseData} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  it("shows location", () => {
    render(<CaseCard caseData={caseData} />);
    expect(screen.getByText(/New York/i)).toBeInTheDocument();
  });

  it("shows age", () => {
    render(<CaseCard caseData={caseData} />);
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
    render(<MatchEvidenceCard match={match} />);
    expect(screen.getByText(/82/)).toBeInTheDocument();
  });

  it("shows person name", () => {
    render(<MatchEvidenceCard match={match} />);
    expect(screen.getByText(/Possible Match/i)).toBeInTheDocument();
  });

  it("shows evidence signal badges", () => {
    render(<MatchEvidenceCard match={match} />);
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
