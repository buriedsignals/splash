// Updated for Task 16 (geography-anywhere, D5+D8): choroplethFillColor/choroplethFillOpacity
// now read the join via ["feature-state", ...] instead of ["get", "__..."] — the brief's own
// Files list omitted this pre-existing test file even though it directly asserts the exact
// expressions being changed; updated here so it keeps testing the real (new) contract instead
// of going stale/red. Updated AGAIN in Fix round 1 (Finding 1) — hasData/value reads are now
// wrapped in ["boolean"/"number", ..., default] for a safe default when a feature's join-key
// property is falsy and MapLibre never populated its feature-state at all (see
// choropleth-paint-feature-state-safety.test.ts for the runtime proof of why this matters).
import { describe, it, expect } from "bun:test";
import {
  choroplethFillColor,
  choroplethFillOpacity,
  choroplethFillPaint,
} from "../src/choropleth-paint";
import { NO_DATA_COLOR } from "../src/theme/colors";

const bins = [
  { min: 0, max: 10, color: "#aaa" },
  { min: 10, max: 20, color: "#bbb" },
  { min: 20, max: 30, color: "#ccc" },
];

describe("choroplethFillColor", () => {
  it("paints no-data regions with NO_DATA_COLOR as the first case", () => {
    const expr = choroplethFillColor(bins) as unknown[];
    expect(expr[0]).toBe("case");
    expect(expr[1]).toEqual([
      "==",
      ["boolean", ["feature-state", "hasData"], false],
      false,
    ]);
    expect(expr[2]).toBe(NO_DATA_COLOR);
  });

  it("terminates with the last bin's colour as the fallback", () => {
    const expr = choroplethFillColor(bins) as unknown[];
    expect(expr[expr.length - 1]).toBe("#ccc");
  });

  it("sorts bins ascending before building thresholds", () => {
    const shuffled = [bins[2], bins[0], bins[1]];
    const expr = choroplethFillColor(shuffled) as unknown[];
    // First threshold compares against the LOWEST bin max (10), lowest colour.
    expect(expr[3]).toEqual([
      "<",
      ["number", ["feature-state", "value"], NaN],
      10,
    ]);
    expect(expr[4]).toBe("#aaa");
  });
});

describe("choroplethFillOpacity", () => {
  it("forces no-data regions to opacity 0 (default basemap shows through)", () => {
    const expr = choroplethFillOpacity(0.85) as unknown[];
    expect(expr[0]).toBe("case");
    expect(expr[1]).toEqual([
      "==",
      ["boolean", ["feature-state", "hasData"], false],
      false,
    ]);
    expect(expr[2]).toBe(0);
  });

  it("uses the supplied data opacity for data-bearing regions", () => {
    const expr = choroplethFillOpacity(0.9) as unknown[];
    expect(expr[3]).toBe(0.9);
  });
});

describe("choroplethFillPaint", () => {
  it("bundles the no-data-aware colour and opacity into a paint object", () => {
    const paint = choroplethFillPaint(bins, 0.85) as Record<string, unknown>;
    expect(paint["fill-color"]).toEqual(choroplethFillColor(bins));
    expect(paint["fill-opacity"]).toEqual(choroplethFillOpacity(0.85));
  });
});
