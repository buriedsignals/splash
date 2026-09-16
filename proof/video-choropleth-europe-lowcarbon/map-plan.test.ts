import { describe, expect, it } from "bun:test";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { buildDirection, loadBeat } from "./build.mjs";
import { MAP_FIELDS } from "./map-plan.mjs";
import { mapStateAt } from "./scene.mjs";

// The cameras are asserted in `map-cameras.test.ts`, which does not wait on `mapStateAt`.
const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  describe(`${id}'s map plan`, () => {
    it("should be renderable: no data-driven binding, every frame's state carrying a camera and every bound field", () => {
      const T = props.timing;
      const states = Array.from({ length: Math.ceil(T.total / 15) }, (_, i) =>
        mapStateAt(props, i * 15),
      );
      expect([
        ...validateScrollyPlan(props.mapPlan, states),
        ...validateExpressions(props.mapPlan),
      ]).toEqual([]);
      for (const s of states)
        for (const f of MAP_FIELDS) expect(typeof s[f]).toBe("number");
    });

    it("should draw the regions' borders only as the close-up arrives, beneath the water", () => {
      const regions = props.mapPlan.layers.find((l: any) => l.id === "regions");
      expect([
        regions.type,
        regions.beneath,
        JSON.stringify(regions.filter),
      ]).toEqual([
        "line",
        "water",
        JSON.stringify(["==", ["get", "level"], 1]),
      ]);
      expect(JSON.stringify(regions.bindings["line-opacity"])).toContain(
        '"$state":"zoom"',
      );
    });

    it("should draw every in-map word at 30 px or more", () => {
      for (const layer of props.mapPlan.layers.filter(
        (l: any) => l.type === "symbol",
      ))
        expect([layer.id, layer.layout["text-size"] >= 30]).toEqual([
          layer.id,
          true,
        ]);
    });

    it("should carry no key and point at MapTiler through the placeholder only", () => {
      const text = JSON.stringify(props.mapPlan);
      expect(text).toContain("__MAPTILER" + "_KEY__");
      expect(text).not.toMatch(/key=[A-Za-z0-9]{16,}/);
    });
  });
}
