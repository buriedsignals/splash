import { describe, expect, it } from "bun:test";
import { makePlan, validatePlan } from "#shared/map-beat/plan.mjs";

const camera = {
  bounds: [
    [-25, 34],
    [42, 68],
  ],
  drawn: { width: 574, height: 436 },
};
const layer = (id) => ({
  id,
  type: "fill",
  data: { type: "FeatureCollection", features: [] },
});

describe("the map plan contract", () => {
  it("should accept a plan whose layer ids are all distinct", () => {
    const plan = makePlan({
      style: {},
      camera,
      layers: [layer("a"), layer("b")],
    });
    expect(validatePlan(plan)).toEqual([]);
  });

  it("should report a duplicated layer id, which MapLibre refuses in silence", () => {
    const plan = makePlan({
      style: {},
      camera,
      layers: [layer("cities"), layer("cities")],
    });
    expect(validatePlan(plan)).toEqual([
      'two layers share the id "cities" — MapLibre keeps the first and drops the second without an error',
    ]);
  });

  it("should refuse a plan with no drawn size, because the bake would pick one", () => {
    const plan = makePlan({
      style: {},
      camera: { bounds: camera.bounds },
      layers: [layer("a")],
    });
    expect(validatePlan(plan)).toContain(
      "the plan carries no drawn size — the layout must publish it before the bake",
    );
  });
});
