import { describe, it, expect } from "bun:test";
import {
  buildDotOpacityExpression,
  STAGGER_SPAN,
} from "./dot-density-story.ts";
import type { StagedEntrance } from "./core/staged-reveal.ts";

const staged = (fillOpacity: number): StagedEntrance => ({
  borderProgress: 1,
  fillOpacity,
  labelReveal: 1,
});

// Minimal MapLibre-style-expression evaluator — just enough of the op vocabulary
// buildDotOpacityExpression ever emits ("case", "==", "get", "max", "min", "+", "-", "*", "/")
// to functionally exercise the built expression against a synthetic feature, instead of only
// asserting its structure.
type Props = Record<string, number | string>;
function evalExpr(expr: unknown, props: Props): number | string | boolean {
  if (!Array.isArray(expr)) return expr as number | string | boolean;
  const [op, ...args] = expr as [string, ...unknown[]];
  const num = (e: unknown) => evalExpr(e, props) as number;
  switch (op) {
    case "get":
      return props[args[0] as string];
    case "==":
      return evalExpr(args[0], props) === evalExpr(args[1], props);
    case "case": {
      for (let i = 0; i < args.length - 1; i += 2) {
        if (evalExpr(args[i], props)) return evalExpr(args[i + 1], props);
      }
      return evalExpr(args[args.length - 1], props);
    }
    case "max":
      return Math.max(...args.map(num));
    case "min":
      return Math.min(...args.map(num));
    case "+":
      return num(args[0]) + num(args[1]);
    case "-":
      return num(args[0]) - num(args[1]);
    case "*":
      return num(args[0]) * num(args[1]);
    case "/":
      return num(args[0]) / num(args[1]);
    default:
      throw new Error(`evalExpr: unsupported op ${String(op)}`);
  }
}

// Mirrors the production staggeredDotOpacityExpr formula (delayed-start, same-end remap) so
// structural expectations can be written without re-exporting an internal helper.
const stagger = (regionProgress: number): unknown[] => {
  const delay: unknown[] = ["*", ["get", "__dotOrder"], STAGGER_SPAN];
  return ["max", 0, ["/", ["-", regionProgress, delay], ["-", 1, delay]]];
};

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

  it("context: reveal beat → highlighted region's own staged fillOpacity (staggered per-dot), others dimmed", () => {
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
      stagger(0.6),
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

  it("sequential: builds a case expression over every triggered key's own staged fillOpacity (staggered per-dot), default 0", () => {
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
      stagger(1),
      ["==", ["get", "__region"], "DEU"],
      stagger(0.3),
      ["==", ["get", "__region"], "ITA"],
      stagger(0),
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

  describe("per-dot stagger (stipple-in ripple)", () => {
    it("mid-ramp: a dot with a higher __dotOrder lags a dot with a lower __dotOrder at the same region progress", () => {
      const stagedMap = new Map([["FRA", staged(0.4)]]);
      const expr = buildDotOpacityExpression(
        "context",
        { dim: true, highlight: ["FRA"] },
        stagedMap,
        0.25,
      );
      const early = evalExpr(expr, { __region: "FRA", __dotOrder: 0 });
      const late = evalExpr(expr, { __region: "FRA", __dotOrder: 0.9 });
      expect(typeof early).toBe("number");
      expect(typeof late).toBe("number");
      expect(early as number).toBeGreaterThan(late as number);
      expect(late as number).toBeGreaterThanOrEqual(0);
    });

    it("settled: every dot reaches full opacity regardless of __dotOrder once regionProgress hits 1", () => {
      const stagedMap = new Map([["FRA", staged(1)]]);
      const expr = buildDotOpacityExpression(
        "context",
        { dim: true, highlight: ["FRA"] },
        stagedMap,
        0.25,
      );
      expect(evalExpr(expr, { __region: "FRA", __dotOrder: 0 })).toBe(1);
      expect(evalExpr(expr, { __region: "FRA", __dotOrder: 0.5 })).toBe(1);
      expect(evalExpr(expr, { __region: "FRA", __dotOrder: 0.99 })).toBe(1);
    });

    it("not-yet-entered: opacity stays 0 for every __dotOrder", () => {
      const stagedMap = new Map([["FRA", staged(0)]]);
      const expr = buildDotOpacityExpression(
        "context",
        { dim: true, highlight: ["FRA"] },
        stagedMap,
        0.25,
      );
      expect(evalExpr(expr, { __region: "FRA", __dotOrder: 0 })).toBe(0);
      expect(evalExpr(expr, { __region: "FRA", __dotOrder: 0.8 })).toBe(0);
    });

    it("non-highlighted regions stay flat at dimOpacity regardless of __dotOrder", () => {
      const stagedMap = new Map([["FRA", staged(0.4)]]);
      const expr = buildDotOpacityExpression(
        "context",
        { dim: true, highlight: ["FRA"] },
        stagedMap,
        0.25,
      );
      expect(evalExpr(expr, { __region: "DEU", __dotOrder: 0 })).toBe(0.25);
      expect(evalExpr(expr, { __region: "DEU", __dotOrder: 0.9 })).toBe(0.25);
    });

    it("sequential: same stagger behaviour applies per triggered region", () => {
      const stagedMap = new Map([
        ["FRA", staged(1)],
        ["DEU", staged(0.5)],
        ["ITA", staged(0)],
      ]);
      const expr = buildDotOpacityExpression(
        "sequential",
        { dim: true, highlight: ["DEU"] },
        stagedMap,
        0.25,
      );
      // FRA settled → full regardless of order.
      expect(evalExpr(expr, { __region: "FRA", __dotOrder: 0.9 })).toBe(1);
      // DEU mid-ramp → higher order lags lower order.
      const deuEarly = evalExpr(expr, {
        __region: "DEU",
        __dotOrder: 0,
      }) as number;
      const deuLate = evalExpr(expr, {
        __region: "DEU",
        __dotOrder: 0.9,
      }) as number;
      expect(deuEarly).toBeGreaterThan(deuLate);
      // ITA never triggered → 0 regardless of order.
      expect(evalExpr(expr, { __region: "ITA", __dotOrder: 0 })).toBe(0);
      // A region absent from the map entirely → the case's terminal default (0).
      expect(evalExpr(expr, { __region: "ESP", __dotOrder: 0 })).toBe(0);
    });
  });
});
