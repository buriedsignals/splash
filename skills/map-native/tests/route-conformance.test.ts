import { describe, it, expect } from "bun:test";
import { validateRouteConfig } from "../src/validate-config";
import { checkRouteConfigConformance } from "../src/conformance";
import routeFixture from "../assets/sample-data/route.json";

// Minimal inline boundaries for conformance tests (three unit-square polygons).
const poly = (k: string, x0: number, y0: number): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: k, name: k },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [x0, y0],
        [x0 + 1, y0],
        [x0 + 1, y0 + 1],
        [x0, y0 + 1],
        [x0, y0],
      ],
    ],
  },
});
const boundaries: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [poly("AAA", 0, 0), poly("BBB", 1, 0), poly("CCC", 2, 0)],
};

const okColors = { text: ["#1a1a1a"], bg: "#ffffff" };

// A minimal valid route config for inline tests.
const okRoute = {
  type: "route" as const,
  route: [
    [0.2, 0.5],
    [1.5, 0.5],
  ] as [number, number][],
  basemap: "world",
  mapStyle: "dataviz-dark" as const,
  title: "The river that crosses two lands",
  description: "West to east across the plain",
  source: { name: "Natural Earth", url: "https://www.naturalearthdata.com" },
};

// ─── validateRouteConfig ─────────────────────────────────────────────────────

describe("validateRouteConfig", () => {
  it("rejects a route with fewer than 2 points", () => {
    const r = validateRouteConfig({ ...okRoute, route: [[0.2, 0.5]] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("route");
  });

  it("rejects a route with a malformed pair (not a 2-number array)", () => {
    const r = validateRouteConfig({
      ...okRoute,
      route: [
        [0.2, 0.5],
        [200, 0.5], // lon out of range
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("lon");
  });

  it("rejects a missing title", () => {
    const r = validateRouteConfig({ ...okRoute, title: undefined as never });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("title");
  });

  it("rejects a title that is too short to be an insight", () => {
    const r = validateRouteConfig({ ...okRoute, title: "Short" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("title");
  });
});

// ─── checkRouteConfigConformance ─────────────────────────────────────────────

describe("checkRouteConfigConformance", () => {
  it("passes route.json (the canonical fixture) against inline boundaries", () => {
    // route.json has 603 points — computeRoute may cross zero territories on our
    // tiny inline boundaries, but the function must not throw and must return no
    // structural violations (bounds, mapStyle, L0 furniture are all valid).
    const config = routeFixture as Parameters<
      typeof checkRouteConfigConformance
    >[0];
    const violations = checkRouteConfigConformance(
      config,
      boundaries,
      okColors,
    );
    // The fixture has a valid mapStyle, title ≥ 12 chars, description, source.
    // Any territory-count violations would mean "route crosses no territories" —
    // acceptable here since our inline boundaries don't overlap Nepal/India/Bangladesh.
    // The function must not throw, and no structural / furniture / mapStyle error should appear.
    expect(
      violations.filter((v) =>
        /mapStyle|title|description|source|bounds|route must/.test(v),
      ),
    ).toEqual([]);
  });

  it("flags a route with fewer than 2 points", () => {
    const config = {
      ...okRoute,
      route: [[0.5, 0.5]] as [number, number][],
    };
    const violations = checkRouteConfigConformance(
      config,
      boundaries,
      okColors,
    );
    expect(violations.some((v) => /route|point/.test(v))).toBe(true);
  });

  it("flags a bad mapStyle", () => {
    const config = { ...okRoute, mapStyle: "neon-pink" as never };
    const violations = checkRouteConfigConformance(
      config,
      boundaries,
      okColors,
    );
    expect(violations.some((v) => /mapStyle/.test(v))).toBe(true);
  });

  it("flags a title that is too short (L0 global check)", () => {
    const config = { ...okRoute, title: "Too short" };
    const violations = checkRouteConfigConformance(
      config,
      boundaries,
      okColors,
    );
    expect(violations.some((v) => /title/.test(v))).toBe(true);
  });

  it("flags a missing source name (L0 global check)", () => {
    const config = {
      ...okRoute,
      source: { name: "", url: "https://x" },
    };
    const violations = checkRouteConfigConformance(
      config,
      boundaries,
      okColors,
    );
    expect(violations.some((v) => /source/.test(v))).toBe(true);
  });
});
