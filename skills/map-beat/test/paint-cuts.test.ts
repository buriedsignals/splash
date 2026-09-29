import { describe, expect, it } from "bun:test";
import { evaluatePaint, paintJumps } from "#shared/map-beat/smoothness.mjs";

describe("evaluatePaint", () => {
  it("should read a square root the way MapLibre paints it", () => {
    expect(evaluatePaint(["sqrt", ["*", 4, 4]])).toBe(4);
  });

  it("should read an eased binding written with case, a comparison and a power", () => {
    // The choropleth's easeInOutQuad, as its plan hands it to MapLibre.
    const ease = (t: number) => [
      "case",
      ["<", t, 0.5],
      ["*", 2, t, t],
      ["-", 1, ["/", ["^", ["+", ["*", -2, t], 2], 2], 2]],
    ];
    expect([evaluatePaint(ease(0.25)), evaluatePaint(ease(0.75))]).toEqual([
      0.125, 0.875,
    ]);
  });

  it("should take case's fallback when no condition holds", () => {
    expect(
      evaluatePaint(["case", [">=", 1, 2], 10, ["==", 1, 2], 20, 30]),
    ).toBe(30);
  });
});

/** A plan with one fill layer whose opacity or colour is bound to `field`. */
const planOf = (bindings: Record<string, unknown>) => ({ layers: [{ id: "land", bindings }] });
/** easeInOutQuad, the gesture every directed beat runs its windows through. */
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
/** Sixty frames of one field travelling 0 → `to` across frames 10..40, eased. */
const eased = (to = 1) =>
  Array.from({ length: 60 }, (_, f) => ({ x: to * ease(Math.min(1, Math.max(0, (f - 10) / 30))) }));

describe("paintJumps", () => {
  it("should find nothing in an eased opacity", () => {
    expect(paintJumps(planOf({ "fill-opacity": { $state: "x" } }), eased())).toEqual([]);
  });

  it("should find nothing in a colour ramp carried by an eased field", () => {
    const ramp = ["interpolate", ["linear"], { $state: "x" }, 0, "#000000", 4, "#ffffff"];
    expect(paintJumps(planOf({ "fill-color": ramp }), eased(4))).toEqual([]);
  });

  it("should find a step over a class index, even one class of five", () => {
    const classes = ["step", { $state: "x" }, "#000000", 1, "#404040", 2, "#808080", 3, "#c0c0c0", 4, "#ffffff"];
    expect(paintJumps(planOf({ "fill-color": classes }), eased(4)).length).toBeGreaterThan(0);
  });

  it("should find a field floored to whole years — cold2's strobe", () => {
    const years = Array.from({ length: 60 }, (_, f) => ({ x: Math.floor(f / 10) }));
    const ramp = ["interpolate", ["linear"], { $state: "x" }, 0, "#000000", 5, "#ffffff"];
    expect(paintJumps(planOf({ "fill-color": ramp }), years).length).toBe(5);
  });

  it("should find an opacity that switches on in one frame", () => {
    const on = Array.from({ length: 60 }, (_, f) => ({ x: f < 30 ? 0 : 1 }));
    expect(paintJumps(planOf({ "fill-opacity": { $state: "x" } }), on)).toEqual([
      'layer "land": "fill-opacity" jumps 100% of its travel between frames 29 and 30, with no ramp either side — it cuts',
    ]);
  });

  it("should find a snap split across two frames", () => {
    const snap = Array.from({ length: 60 }, (_, f) => ({ x: f < 30 ? 0 : f === 30 ? 0.5 : 1 }));
    expect(paintJumps(planOf({ "fill-opacity": { $state: "x" } }), snap)).toEqual([
      'layer "land": "fill-opacity" jumps 100% of its travel between frames 29 and 31, with no ramp either side — it cuts',
    ]);
  });

  it("should find nothing in a fade eased over six frames — fast, but a movement", () => {
    const fade = Array.from({ length: 60 }, (_, f) => ({ x: ease(Math.min(1, Math.max(0, (f - 30) / 6))) }));
    expect(paintJumps(planOf({ "fill-opacity": { $state: "x" } }), fade)).toEqual([]);
  });

  it("should find nothing in a change too small to see, however sudden", () => {
    const drift = Array.from({ length: 60 }, (_, f) => ({ x: f < 30 ? 0.5 : 0.5 + 1e-12 }));
    const plan = planOf({ "fill-opacity": { $state: "x" }, "fill-color": ["interpolate", ["linear"], { $state: "x" }, 0, "#000000", 1, "#ffffff"] });
    expect(paintJumps(plan, drift)).toEqual([]);
  });

  it("should pass a jump the beat declares hidden where its condition holds, and only that layer's property", () => {
    const on = Array.from({ length: 60 }, (_, f) => ({ x: f < 30 ? 0 : 1 }));
    const plan = planOf({ "fill-opacity": { $state: "x" }, "fill-color": ["interpolate", ["linear"], { $state: "x" }, 0, "#000000", 1, "#ffffff"] });
    const hidden = [{ layers: /^land$/, property: "fill-opacity", when: () => true, why: "under an opaque fill" }];
    expect(paintJumps(plan, on, { hidden })).toHaveLength(1);
  });

  it("should still find a declared layer's jump where its condition does not hold", () => {
    const twice = Array.from({ length: 60 }, (_, f) => ({ x: f < 20 ? 0 : f < 40 ? 1 : 0, covered: f < 30 ? 1 : 0 }));
    const hidden = [{ layers: /^land$/, property: "fill-opacity", when: (s: any) => s.covered === 1, why: "under an opaque fill" }];
    expect(paintJumps(planOf({ "fill-opacity": { $state: "x" } }), twice, { hidden })).toEqual([
      'layer "land": "fill-opacity" jumps 100% of its travel between frames 39 and 40, with no ramp either side — it cuts',
    ]);
  });

  it("should refuse a declaration without the condition that proves it hidden", () => {
    const on = Array.from({ length: 60 }, (_, f) => ({ x: f < 30 ? 0 : 1 }));
    const hidden = [{ layers: /^land$/, property: "fill-opacity", why: "trust me" }] as any;
    expect(() => paintJumps(planOf({ "fill-opacity": { $state: "x" } }), on, { hidden })).toThrow("when");
  });
});
