/**
 * Integration tests for all page components.
 * Verifies each page renders without crashing and contains expected content.
 */
import React from "react";
import { render, screen } from "@testing-library/react";

// ── Global mocks ─────────────────────────────────────────────────

jest.mock("@/components/app-shell", () => ({
  useSidebar: () => ({ collapsed: false, setCollapsed: jest.fn() }),
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/crisis-mode", () => ({
  useCrisisMode: () => ({ crisisMode: false, setCrisisMode: jest.fn() }),
  CrisisModeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/identity-graph", () => ({
  IdentityGraphViz: () => <div data-testid="identity-graph-viz">Graph Visualization Mock</div>,
}));

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  Bar: () => null,
  Area: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  RadialBarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadialBar: () => null,
}));

jest.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Map: ({ children }: { children: React.ReactNode }) => <div data-testid="google-map">{children}</div>,
  AdvancedMarker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMap: () => null,
}));

// Mock framer-motion to avoid unknown prop warnings
jest.mock("framer-motion", () => {
  const ActualReact = jest.requireActual("react");
  const actual = jest.requireActual("framer-motion");

  const createMockComponent = (tag: string) => {
    const Component = ActualReact.forwardRef(({ children, ...props }: { children?: import("react").ReactNode } & Record<string, unknown>, ref: import("react").Ref<HTMLElement | SVGElement>) => {
      const {
        initial, animate, exit, variants, transition,
        whileHover, whileTap, whileInView, viewport,
        layout, layoutId, ...validProps
      } = props;
      return ActualReact.createElement(tag, { ref, ...validProps }, children);
    });
    Component.displayName = `Motion${tag.charAt(0).toUpperCase() + tag.slice(1)}`;
    return Component;
  };

  const PathComponent = ActualReact.forwardRef((props: import("react").SVGProps<SVGPathElement>, ref: import("react").Ref<SVGPathElement>) => <path ref={ref} {...props} />);
  PathComponent.displayName = "MotionPath";

  const AnimatePresence = ({ children }: { children: import("react").ReactNode }) => <>{children}</>;
  AnimatePresence.displayName = "AnimatePresence";

  const motion = {
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

  return {
    ...actual,
    motion,
    AnimatePresence,
    useAnimation: () => ({ start: jest.fn() }),
    useInView: () => true,
  };
});

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ cases: [], total: 0 }),
  })
) as jest.Mock;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HOME PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Home Page", () => {
  it("renders without crashing", async () => {
    const HomePage = (await import("@/app/page")).default;
    const { container } = render(<HomePage />);
    expect(container).toBeInTheDocument();
  });

  it("contains TraceBridge branding", async () => {
    const HomePage = (await import("@/app/page")).default;
    render(<HomePage />);
    // Should have branding content — logo image or text
    const hasImage = !!document.querySelector("img");
    const hasText = screen.queryAllByText(/TraceBridge/i).length > 0;
    expect(hasImage || hasText).toBeTruthy();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HELP PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Help Page", () => {
  it("renders without crashing", async () => {
    const HelpPage = (await import("@/app/help/page")).default;
    const { container } = render(<HelpPage />);
    expect(container).toBeInTheDocument();
  });

  it("contains help content", async () => {
    const HelpPage = (await import("@/app/help/page")).default;
    render(<HelpPage />);
    const hasHelp = screen.queryAllByText(/Help/i).length > 0;
    const hasGuide = screen.queryAllByText(/Guide/i).length > 0;
    expect(hasHelp || hasGuide).toBeTruthy();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PRICING PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Pricing Page", () => {
  it("renders without crashing", async () => {
    const PricingPage = (await import("@/app/pricing/page")).default;
    const { container } = render(<PricingPage />);
    expect(container).toBeInTheDocument();
  });

  it("shows pricing tiers", async () => {
    const PricingPage = (await import("@/app/pricing/page")).default;
    render(<PricingPage />);
    // Should have pricing content
    const hasFree = screen.queryAllByText(/Free/i).length > 0;
    const hasEnterprise = screen.queryAllByText(/Enterprise/i).length > 0;
    const hasMonth = screen.queryAllByText(/month/i).length > 0;

    expect(hasFree || hasEnterprise || hasMonth).toBeTruthy();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ARCHITECTURE PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Architecture Page", () => {
  it("renders without crashing", async () => {
    const ArchPage = (await import("@/app/architecture/page")).default;
    const { container } = render(<ArchPage />);
    expect(container).toBeInTheDocument();
  });

  it("shows agent pipeline", async () => {
    const ArchPage = (await import("@/app/architecture/page")).default;
    render(<ArchPage />);
    const hasAgent = screen.queryAllByText(/Agent/i).length > 0;
    const hasPipeline = screen.queryAllByText(/Pipeline/i).length > 0;
    const hasArch = screen.queryAllByText(/Architecture/i).length > 0;

    expect(hasAgent || hasPipeline || hasArch).toBeTruthy();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PARTNERS PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Partners Page", () => {
  it("renders without crashing", async () => {
    const PartnersPage = (await import("@/app/partners/page")).default;
    const { container } = render(<PartnersPage />);
    expect(container).toBeInTheDocument();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GRAPH PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Graph Page", () => {
  it("renders without crashing", async () => {
    const GraphPage = (await import("@/app/graph/page")).default;
    const { container } = render(<GraphPage />);
    expect(container).toBeInTheDocument();
  });
});
