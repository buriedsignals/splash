// Finding 1 (Task 16 review): MapLibre only populates a feature's per-source feature-state
// when its promoted id is truthy (the SDK's own setFeatureState/getFeatureState machinery is
// gated on `if (id && sourceFeatureState)`) — a feature whose join-key property is missing,
// null, "", or 0 never gets an entry. Reading `["feature-state", "hasData"]` on such a feature
// then returns `null`, and a bare `["==", null, false]` evaluates to `false` (no type
// checking on `==`) — NOT the no-data branch. The numeric threshold comparisons
// (`["<", ["feature-state","value"], n]`) then compare `null` against a number, which
// MapLibre's evaluator catches internally and substitutes the PROPERTY SPEC's own default —
// `#000000` (opaque black) for fill-color, and the "has data" numeric branch for fill-opacity.
// Net effect (verified below with a live rendering-free failure BEFORE the fix, using the real
// bundled expression evaluator): a feature with a falsy join key renders as an opaque black
// fill instead of invisible/no-data. Invisible on world.geojson (every iso_a3 is truthy) but a
// real risk for sub-national geometry-anywhere datasets, which routinely carry null/blank/zero
// admin codes.
//
// These tests exercise the REAL MapLibre expression compiler/evaluator (createPropertyExpression
// from @maplibre/maplibre-gl-style-spec — the same engine a live Map instance uses internally),
// not a live browser/WebGL Map. This is deliberately NOT a live-render test: proving the exact
// value MapLibre substitutes for a missing/mistyped feature-state read requires the real
// evaluator (a hand-rolled mock could not reproduce MapLibre's internal type-coercion/error-
// recovery semantics), but it does not require a canvas, WebGL context, or network — the
// evaluator is pure JS. A live-render proof (real MapLibre Map, real canvas) is out of scope for
// this file; produce.mjs-driven render verification for the shipped world/us-states basemaps is
// covered elsewhere (Task 16 report).
import { describe, it, expect } from "bun:test";
import { createPropertyExpression } from "@maplibre/maplibre-gl-style-spec";
// @ts-expect-error - JSON import, not typed by this package; resolved at runtime by bun.
import v8Spec from "@maplibre/maplibre-gl-style-spec/src/reference/v8.json";
import {
  choroplethFillColor,
  choroplethFillOpacity,
} from "../src/choropleth-paint";
import { NO_DATA_COLOR } from "../src/theme/colors";

const fillColorSpec = (v8Spec as any).paint_fill["fill-color"];
const fillOpacitySpec = (v8Spec as any).paint_fill["fill-opacity"];

const bins = [
  { min: 0, max: 10, color: "#aaa" },
  { min: 10, max: 20, color: "#bbb" },
  { min: 20, max: 30, color: "#ccc" },
];

const feature: any = {
  type: "Feature",
  id: undefined,
  properties: {},
  geometry: { type: "Point", coordinates: [0, 0] },
};

function evaluate(exprArr: unknown, spec: any, featureState: unknown) {
  const compiled = createPropertyExpression(exprArr, spec) as any;
  if (compiled.result !== "success")
    throw new Error(
      `expression failed to compile: ${JSON.stringify(compiled.value)}`,
    );
  return compiled.value.evaluate({ zoom: 3 }, feature, featureState);
}

// MapLibre's Color.toString() is NOT stably hex — it round-trips a literal string passthrough
// as hex ("#ccc") but serializes a colour that passed through actual expression evaluation
// (e.g. selected via a "case"/"<" branch) as "rgba(r,g,b,a)". Normalize both sides to rgba
// for a reliable comparison instead of depending on which internal path produced the value.
function hexToRgba(hex: string): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},1)`;
}

describe("choroplethFillColor/choroplethFillOpacity — safe under MISSING feature-state (Finding 1)", () => {
  it("fill-color resolves to NO_DATA_COLOR, not the property spec's opaque-black default, when feature-state is entirely absent", () => {
    const color = evaluate(choroplethFillColor(bins), fillColorSpec, undefined);
    expect(color.toString()).toBe(hexToRgba(NO_DATA_COLOR));
  });

  it("fill-opacity resolves to 0, not the visible dataOpacity, when feature-state is entirely absent", () => {
    const opacity = evaluate(
      choroplethFillOpacity(0.85),
      fillOpacitySpec,
      undefined,
    );
    expect(opacity).toBe(0);
  });

  it("fill-color resolves to NO_DATA_COLOR when feature-state is an empty object (the shape MapLibre passes for a promoted-but-never-set id)", () => {
    const color = evaluate(choroplethFillColor(bins), fillColorSpec, {});
    expect(color.toString()).toBe(hexToRgba(NO_DATA_COLOR));
  });

  it("fill-opacity resolves to 0 when feature-state is an empty object", () => {
    const opacity = evaluate(choroplethFillOpacity(0.85), fillOpacitySpec, {});
    expect(opacity).toBe(0);
  });
});

describe("choroplethFillColor/choroplethFillOpacity — unaffected for a genuinely data-bearing feature (regression guard)", () => {
  it("fill-color still picks the correct bin when feature-state is present", () => {
    const color = evaluate(choroplethFillColor(bins), fillColorSpec, {
      hasData: true,
      value: 15,
    });
    expect(color.toString()).toBe(hexToRgba("#bbb"));
  });

  it("fill-opacity still uses the supplied dataOpacity when feature-state is present", () => {
    const opacity = evaluate(choroplethFillOpacity(0.85), fillOpacitySpec, {
      hasData: true,
      value: 15,
    });
    expect(opacity).toBe(0.85);
  });

  it("fill-color still resolves to NO_DATA_COLOR for an EXPLICIT no-data state (hasData:false) — not just an absent one", () => {
    const color = evaluate(choroplethFillColor(bins), fillColorSpec, {
      hasData: false,
      value: null,
    });
    expect(color.toString()).toBe(hexToRgba(NO_DATA_COLOR));
  });
});

describe("non-vacuity: the pre-fix (unwrapped) expression shape actually fails these tests", () => {
  // Reconstructs the exact pre-Finding-1 expression shape (bare ["feature-state", ...] reads,
  // no ["boolean"/"number", ..., default] guard) to prove the tests above would have caught the
  // regression, not just exercised the already-fixed code.
  function unsafeFillColor(): unknown[] {
    const sorted = [...bins].sort((a, b) => a.min - b.min);
    const expr: unknown[] = [
      "case",
      ["==", ["feature-state", "hasData"], false],
      NO_DATA_COLOR,
    ];
    for (let i = 0; i < sorted.length - 1; i++) {
      expr.push(["<", ["feature-state", "value"], sorted[i].max]);
      expr.push(sorted[i].color);
    }
    expr.push(sorted[sorted.length - 1].color);
    return expr;
  }
  function unsafeFillOpacity(dataOpacity: number): unknown[] {
    return [
      "case",
      ["==", ["feature-state", "hasData"], false],
      0,
      dataOpacity,
    ];
  }

  it("pre-fix fill-color renders opaque black (#000000), not NO_DATA_COLOR, when feature-state is absent", () => {
    const color = evaluate(unsafeFillColor(), fillColorSpec, undefined);
    expect(color.toString()).not.toBe(hexToRgba(NO_DATA_COLOR));
    expect(color.toString()).toBe(hexToRgba("#000000"));
  });

  it("pre-fix fill-opacity renders visible (dataOpacity), not 0, when feature-state is absent", () => {
    const opacity = evaluate(
      unsafeFillOpacity(0.85),
      fillOpacitySpec,
      undefined,
    );
    expect(opacity).not.toBe(0);
    expect(opacity).toBe(0.85);
  });
});
