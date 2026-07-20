import { describe, it, expect } from "bun:test";
import { buildDotOpacityExpression } from "./dot-density-story.ts";
import type { StagedEntrance } from "./core/staged-reveal.ts";

const staged = (fillOpacity: number): StagedEntrance => ({
  borderProgress: 1,
  fillOpacity,
  labelReveal: 1,
});

describe("buildDotOpacityExpression", () => {
  it("context: title/establish/takeaway (no dim, no highlight) → full opacity for every dot", () => {
    const expr = buildDotOpacityExpression(
      "context",
      { dim: false, highlight: [] },
      new Map(),
      0.25,
    );
    expect(expr).toBe(1);
  });

  it("context: reveal beat → highlighted region's own staged fillOpacity, others dimmed", () => {
    const stagedMap = new Map([
      ["FRA", staged(0.6)],
      ["DEU", staged(1)],
    ]);
    const expr = buildDotOpacityExpression(
      "context",
      { dim: true, highlight: ["FRA"] },
      stagedMap,
      0.25,
    );
    expect(expr).toEqual([
      "case",
      ["==", ["get", "__region"], "FRA"],
      0.6,
      0.25,
    ]);
  });

  it("context: reveal beat with no staged entry for the highlight falls back to full opacity", () => {
    const expr = buildDotOpacityExpression(
      "context",
      { dim: true, highlight: ["ITA"] },
      new Map(),
      0.25,
    );
    expect(expr).toEqual(["case", ["==", ["get", "__region"], "ITA"], 1, 0.25]);
  });

  it("sequential: builds a case expression over every triggered key's own staged fillOpacity, default 0", () => {
    const stagedMap = new Map([
      ["FRA", staged(1)], // already entered, holding full
      ["DEU", staged(0.3)], // mid stipple-in
      ["ITA", staged(0)], // not yet triggered (clamped 0)
    ]);
    const expr = buildDotOpacityExpression(
      "sequential",
      { dim: true, highlight: ["DEU"] },
      stagedMap,
      0.25,
    );
    expect(expr).toEqual([
      "case",
      ["==", ["get", "__region"], "FRA"],
      1,
      ["==", ["get", "__region"], "DEU"],
      0.3,
      ["==", ["get", "__region"], "ITA"],
      0,
      0,
    ]);
  });

  it("sequential: no triggers yet → default-only expression (everything 0)", () => {
    const expr = buildDotOpacityExpression(
      "sequential",
      { dim: false, highlight: [] },
      new Map(),
      0.25,
    );
    expect(expr).toEqual(["case", 0]);
  });
});
