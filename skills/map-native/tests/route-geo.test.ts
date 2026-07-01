import { describe, it, expect } from "bun:test";
import {
  computeRoute,
  computeRouteReveal,
  routeRevealFrames,
  resolveMapStyle,
  MAP_STYLES,
} from "../src/route-geo";

// three unit squares side by side along +lon: A [0,0]-[1,1], B [1,0]-[2,1], C [2,0]-[3,1]
const poly = (k: string, x0: number): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: k, name: k },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [x0, 0],
        [x0 + 1, 0],
        [x0 + 1, 1],
        [x0, 1],
        [x0, 0],
      ],
    ],
  },
});
const boundaries: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [poly("AAA", 0), poly("BBB", 1), poly("CCC", 2)],
};
// route runs west→east across A then B (not C), at lat 0.5
const config = {
  type: "route" as const,
  route: [
    [0.2, 0.5],
    [1.5, 0.5],
  ] as [number, number][],
  basemap: "world",
  mapStyle: "dataviz-dark",
  title: "A river crossing two lands",
};

describe("computeRoute", () => {
  const layout = computeRoute(config, boundaries);
  it("auto-detects only the territories the route crosses, ordered along the route", () => {
    expect(layout.territories.map((t) => t.key)).toEqual(["AAA", "BBB"]);
  });
  it("gives each territory a distinct colour and an anchor inside its polygon", () => {
    const [a, b] = layout.territories;
    expect(a.color).not.toBe(b.color);
    expect(a.anchor[0]).toBeGreaterThanOrEqual(0);
    expect(a.anchor[0]).toBeLessThanOrEqual(1); // anchor inside AAA's x-range
  });
  it("computes bounds covering the route, latitude-clamped to ±85", () => {
    const [w, s, e, n] = layout.bounds;
    expect(w).toBeLessThanOrEqual(0.2);
    expect(e).toBeGreaterThanOrEqual(1.5);
    expect(s).toBeGreaterThanOrEqual(-85);
    expect(n).toBeLessThanOrEqual(85);
  });
  it("bounds union the crossed territories, not just the route line", () => {
    // The route sits at lat 0.5; cells AAA/BBB extend lat 0→1. Route-only bounds
    // would be a zero-height bbox at 0.5 — the territory extent must widen it.
    const [, s, , n] = layout.bounds;
    expect(s).toBeLessThanOrEqual(0); // AAA/BBB bottom edge
    expect(n).toBeGreaterThanOrEqual(1); // AAA/BBB top edge
  });
});

describe("resolveMapStyle", () => {
  it("maps known tokens and lists the option space", () => {
    expect(MAP_STYLES).toContain("dataviz-light");
    expect(MAP_STYLES).toContain("dataviz-dark");
    expect(resolveMapStyle("dataviz-dark")).toBeTruthy();
    expect(resolveMapStyle(undefined)).toBe(resolveMapStyle("dataviz-light")); // default
  });
});

describe("computeRouteReveal", () => {
  const layout = computeRouteReveal(config, boundaries);
  it("gives each crossed territory a stop in [0,1], ascending along the route", () => {
    const stops = layout.territories.map((t) => t.stop);
    for (const s of stops) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
    // AAA (route starts inside) triggers before BBB (entered mid-route)
    expect(stops[0]).toBeLessThan(stops[1]);
  });
  it("gives each territory a non-empty border", () => {
    for (const t of layout.territories) {
      expect(Array.isArray(t.border)).toBe(true);
      expect(t.border.length).toBeGreaterThan(0);
      expect(t.border[0].length).toBeGreaterThan(1); // a segment has ≥2 coords
    }
  });
  it("routeRevealFrames grows with territory count and is bounded", () => {
    expect(routeRevealFrames(3, 30)).toBeGreaterThan(routeRevealFrames(1, 30));
    expect(routeRevealFrames(50, 30)).toBeLessThanOrEqual(
      routeRevealFrames(60, 30) + 1,
    ); // clamped
  });
});
