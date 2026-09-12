// LANE: heavy
import { describe, expect, it } from "bun:test";

/** Importing the runner RUNS the beat — it bakes nothing (the plates are frozen beside it) but it
 *  does render three stills through the rasteriser, which takes minutes rather than seconds. The
 *  module is evaluated once and every test here shares it. */
const RUN_MS = 600_000;
const runner = () =>
  import("../../../proof/static-choropleth-europe-lowcarbon/render-directions.mjs");

describe("the pilot choropleth on the plan", () => {
  it(
    "should still name the same countries above the floor",
    async () => {
      const { report } = await runner();
      expect(report.above.map((r) => r.iso).sort()).toEqual([
        "ALB",
        "CHE",
        "FIN",
        "FRA",
        "ISL",
        "NOR",
        "SWE",
      ]);
    },
    RUN_MS,
  );

  it(
    "should carry no beat layer that redraws the basemap",
    async () => {
      const { plans } = await runner();
      expect(Object.keys(plans).length).toBeGreaterThan(0);
      for (const plan of Object.values(plans))
        for (const layer of plan.layers)
          expect(layer.role ?? "").not.toMatch(/^basemap-/);
    },
    RUN_MS,
  );

  it(
    "should place the plate exactly where the marks are drawn",
    async () => {
      const { geometry } = await runner();
      expect(Object.keys(geometry).length).toBeGreaterThan(0);
      for (const g of Object.values(geometry)) {
        expect(g.plate.width).toBeCloseTo(g.mapW, 1);
        expect(g.plate.height).toBeCloseTo(g.mapH, 1);
        expect(g.plate.x).toBeCloseTo(g.mapX, 1);
        expect(g.plate.y).toBeCloseTo(g.mapY, 1);
      }
    },
    RUN_MS,
  );

  it(
    "should publish a drawn size on every plan, in whole pixels",
    async () => {
      const { plans } = await runner();
      expect(Object.keys(plans).length).toBeGreaterThan(0);
      for (const plan of Object.values(plans)) {
        expect(Number.isInteger(plan.camera.drawn.width)).toBe(true);
        expect(Number.isInteger(plan.camera.drawn.height)).toBe(true);
        expect(plan.camera.drawn.width).toBeGreaterThan(0);
      }
    },
    RUN_MS,
  );
});
