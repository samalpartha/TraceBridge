/**
 * Integration tests for all page components.
 * Verifies each page renders without crashing and contains expected content.
 */
import React from "react";
import { render, screen } from "@testing-library/react";

// ── Global mocks ─────────────────────────────────────────────────

jest.mock("@/components/app-shell", () => {
  const AppShellMock = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  AppShellMock.displayName = "AppShellMock";
  return {
    useSidebar: () => ({ collapsed: false, setCollapsed: jest.fn() }),
    AppShell: AppShellMock,
  };
});

jest.mock("@/components/crisis-mode", () => {
  const CrisisModeProviderMock = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  CrisisModeProviderMock.displayName = "CrisisModeProviderMock";
  return {
    useCrisisMode: () => ({ crisisMode: false, setCrisisMode: jest.fn() }),
    CrisisModeProvider: CrisisModeProviderMock,
  };
});

jest.mock("@/components/identity-graph", () => {
  const IdentityGraphVizMock = () => <div data-testid="identity-graph-viz">Graph Visualization Mock</div>;
  IdentityGraphVizMock.displayName = "IdentityGraphVizMock";
  return {
    IdentityGraphViz: IdentityGraphVizMock,
  };
});

jest.mock("recharts", () => {
  const MockComp = (name: string) => {
    const C = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
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
    Area: NullComp("Area"),
    Pie: NullComp("Pie"),
    Cell: NullComp("Cell"),
    XAxis: NullComp("XAxis"),
    YAxis: NullComp("YAxis"),
    CartesianGrid: NullComp("CartesianGrid"),
    Tooltip: NullComp("Tooltip"),
    Legend: NullComp("Legend"),
    RadialBarChart: MockComp("RadialBarChart"),
    RadialBar: NullComp("RadialBar"),
  };
});

jest.mock("@vis.gl/react-google-maps", () => {
  const APIProviderMock = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  APIProviderMock.displayName = "APIProviderMock";
  const MapMock = ({ children }: { children: React.ReactNode }) => <div data-testid="google-map">{children}</div>;
  MapMock.displayName = "MapMock";
  const AdvMarkerMock = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  AdvMarkerMock.displayName = "AdvMarkerMock";
  return {
    APIProvider: APIProviderMock,
    Map: MapMock,
    AdvancedMarker: AdvMarkerMock,
    useMap: () => null,
  };
});

// Mock framer-motion to avoid unknown prop warnings
jest.mock("framer-motion", () => {
  const ActualReact = jest.requireActual("react");
  const actual = jest.requireActual("framer-motion");

  const createMockComponent = (tag: string) => {
    const Component = ActualReact.forwardRef(function MockComponent(
      { children, ...props }: { children?: import("react").ReactNode } & Record<string, unknown>,
      ref: import("react").Ref<HTMLElement | SVGElement>
    ) {
      // Omit framer-motion props
      const {
        initial: _i, animate: _a, exit: _e, variants: _v, transition: _t,
        whileHover: _wh, whileTap: _wt, whileInView: _wiv, viewport: _vp,
        layout: _l, layoutId: _lid, ...validProps
      } = props;
      return ActualReact.createElement(tag, { ref, ...validProps }, children);
    });
    Component.displayName = `Motion${tag.charAt(0).toUpperCase() + tag.slice(1)}`;
    return Component;
  };

  const PathComponent = ActualReact.forwardRef((props: import("react").SVGProps<SVGPathElement>, ref: import("react").Ref<SVGPathElement>) => <path ref={ref} {...props} />);
  PathComponent.displayName = "MotionPath";

  const AnimatePresenceMock = ({ children }: { children: import("react").ReactNode }) => <>{children}</>;
  AnimatePresenceMock.displayName = "AnimatePresenceMock";

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

  return {
    ...actual,
    motion: motionMock,
    AnimatePresence: AnimatePresenceMock,
    useAnimation: () => ({ start: jest.fn() }),
    useInView: () => true,
    useScroll: () => ({ scrollYProgress: { get: () => 0, onChange: jest.fn() } }),
    useSpring: () => ({ get: () => 0 }),
    useTransform: () => 0,
  };
});

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ cases: [], total: 0 }),
  }) as Promise<Response>
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
