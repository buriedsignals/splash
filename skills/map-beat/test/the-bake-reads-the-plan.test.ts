/**
 * THE BAKE IS A RENDERER, AND A RENDERER VALIDATES THE PLAN IT MOUNTS — plus the one guard that
 * could not fail while the bake decided its own size.
 *
 * TWO DEFECTS, both found in the whole-branch review, both of the same family: a guard that exists
 * and cannot redden.
 *
 *   1. `bake.mjs` mounted a plan it had never checked. `render-directions.mjs` validated the plan
 *      it BUILT and the bake trusted the file, which holds only while the two are one run — and
 *      `references/map-plan.md` §1 says `validatePlan` is what every renderer calls before it
 *      draws. A duplicated layer id, a pair property assembled from two expressions, or a layer
 *      that redraws the basemap all reach MapLibre as a wrong picture drawn in silence.
 *      MUTATION: drop `assertPlanIsRenderable` from `bake()` — the three cases below stay green
 *      because they call it directly, so each also asserts the CALL, by reading the source for the
 *      one line that makes the guard reachable.
 *
 *   2. `bakePlan` was handed `drawn: { width, height }` built from `--size`, which OVERWROTE the
 *      plan's own `camera.drawn`. Guard 5 — "the map is baked at the size the layout published" —
 *      therefore compared the caller's number against the caller's own number. The two agreed only
 *      because the runner passes the same value twice.
 *      MUTATION: make `drawnSizeFor` prefer `--size` over the plan (`return { width, height }`
 *      instead of throwing) and the disagreement case below goes red.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertPlanIsRenderable,
  drawnSizeFor,
} from "../../../proof/static-choropleth-europe-lowcarbon/bake.mjs";

const BAKE_SOURCE = readFileSync(
  join(
    import.meta.dirname,
    "../../../proof/static-choropleth-europe-lowcarbon/bake.mjs",
  ),
  "utf8",
);

/** The smallest thing that is a plan: one layer, a camera with a drawn size. */
const planWith = (over: Record<string, unknown> = {}) => ({
  style: { name: "dataviz-light" },
  camera: {
    bounds: [
      [-25, 34],
      [42, 68],
    ],
    drawn: { width: 574, height: 436 },
  },
  layers: [
    {
      id: "classes",
      type: "fill",
      data: { type: "FeatureCollection", features: [] },
    },
  ],
  ...over,
});

describe("the bake reads the size off the plan, and refuses a flag that disagrees", () => {
  it("should take the drawn size from the plan when no --size is given", () => {
    expect(drawnSizeFor(planWith(), null)).toEqual({ width: 574, height: 436 });
  });

  it("should accept a --size that agrees with the plan", () => {
    expect(drawnSizeFor(planWith(), "574x436")).toEqual({
      width: 574,
      height: 436,
    });
  });

  /** THE CASE THE WHOLE GUARD EXISTS FOR. Before this, the flag silently won. */
  it("should refuse when --size and the plan's camera.drawn disagree", () => {
    expect(() => drawnSizeFor(planWith(), "1000x760")).toThrow(
      /two answers to one question/,
    );
    expect(() => drawnSizeFor(planWith(), "574x437")).toThrow(
      /574x437.*574x436/s,
    );
  });

  it("should refuse a plan that publishes no drawn size at all", () => {
    const bare = planWith({
      camera: {
        bounds: [
          [-25, 34],
          [42, 68],
        ],
      },
    });
    expect(() => drawnSizeFor(bare, null)).toThrow(/carries no camera\.drawn/);
    expect(() => drawnSizeFor(bare, "574x436")).toThrow(
      /carries no camera\.drawn/,
    );
  });

  it("should refuse a --size that is not a size", () => {
    expect(() => drawnSizeFor(planWith(), "wide")).toThrow(/--size must be/);
  });

  /** AND THE BAKE MUST ACTUALLY ASK. A pure function nobody calls is a guard that cannot fail. */
  it("should read the drawn size through drawnSizeFor in bake() itself", () => {
    expect(BAKE_SOURCE).toMatch(
      /const \{ width, height \} = drawnSizeFor\(plan, sizeArg\);/,
    );
    expect(BAKE_SOURCE).not.toMatch(/drawn: \{ width, height \}/);
  });
});

describe("the bake validates the plan it mounts", () => {
  it("should accept a plan with nothing wrong with it", () => {
    expect(assertPlanIsRenderable(planWith())).toBeDefined();
  });

  /** Guard 1 — MapLibre keeps the first layer and drops the second without a word. */
  it("should refuse two layers that share an id", () => {
    const doubled = planWith({
      layers: [
        { id: "classes", type: "fill", data: {} },
        { id: "classes", type: "symbol", data: {} },
      ],
    });
    expect(() => assertPlanIsRenderable(doubled)).toThrow(
      /two layers share the id "classes"/,
    );
  });

  /** Guard 8 — a pair property assembled from two expressions draws an EMPTY layer, silently. */
  it("should refuse a pair property assembled from two expressions", () => {
    const bad = planWith({
      layers: [
        {
          id: "sea-names",
          type: "symbol",
          data: {},
          layout: {
            "text-offset": [
              ["get", "dx"],
              ["get", "dy"],
            ],
          },
        },
      ],
    });
    expect(() => assertPlanIsRenderable(bad)).toThrow(
      /is an array of expressions/,
    );
  });

  /** Guard 6 — a beat layer that redraws the ground lays a second geography over MapTiler's. */
  it("should refuse a layer that redraws the basemap", () => {
    const doubledBasemap = planWith({
      layers: [{ id: "coast", type: "line", role: "basemap-coast", data: {} }],
    });
    expect(() => assertPlanIsRenderable(doubledBasemap)).toThrow(
      /the basemap would be doubled/,
    );
  });

  /** AND THE BAKE MUST ACTUALLY ASK — the same reason as above. */
  it("should validate the plan in bake() before mounting it", () => {
    const at = BAKE_SOURCE.indexOf("assertPlanIsRenderable(plan, planPath);");
    const mount = BAKE_SOURCE.indexOf("await bakePlan({");
    expect(at).toBeGreaterThan(-1);
    expect(mount).toBeGreaterThan(at);
  });
});
