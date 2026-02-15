import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
jest.mock("next/link", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: React.forwardRef(function MockLink(props: any, ref: any) {
      const { children, href, ...rest } = props;
      return React.createElement("a", { href, ref, ...rest }, children);
    }),
  };
});

// Mock next/image
jest.mock("next/image", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: function MockImage(props: any) {
      return React.createElement("img", props);
    },
  };
});
