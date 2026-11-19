import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped module
import { PHONE_PLOT_PX, scaleRegisters } from "../craft/_shared/gesture-keyed-run.mjs";
// @ts-expect-error untyped module
import { crowdedHeads, profileScene } from "../craft/_shared/gesture-family-profile.mjs";

// A 375 px phone letterboxed the keyed plates (radar, parallel coordinates, sankey, gantt) at ~0.38 and their words
// printed at ~5 px (2026-11-19). The phone plate lays the scene out again with every register larger.
describe("scaleRegisters", () => {
  const regs = { axis: { fontSize: 12, letterSpacing: 0.5, fontFamily: "x" } };
  it("should multiply the font size the viewBox carries", () => {
    expect(scaleRegisters(regs, 908 / PHONE_PLOT_PX).axis.fontSize).toBeCloseTo((12 * 908) / 343, 6);
  });
  it("should multiply the letter spacing with it", () => {
    expect(scaleRegisters(regs, 2).axis.letterSpacing).toBe(1);
  });
});

describe("crowdedHeads", () => {
  const anchor = (k: number) => (k === 0 ? "start" : k === 2 ? "end" : "middle");
  it("should call two names that come within the gap crowded", () => {
    expect(crowdedHeads([0, 100, 200], [80, 80, 80], anchor, 8)).toBe(true);
  });
  it("should leave names with room between them alone", () => {
    expect(crowdedHeads([0, 300, 600], [80, 80, 80], anchor, 8)).toBe(false);
  });
});

// At the phone's registers seven axis names in 900 units printed over each other ("Hydraulique" over "Bioénergie").
describe("parallel coordinates at a phone's registers", () => {
  const axes = ["Nucléaire", "Éolien", "Solaire", "Hydraulique", "Bioénergie", "Gaz", "Charbon"];
  const entities = [
    { name: "France", values: Object.fromEntries(axes.map((a, k) => [a, 10 + k])) },
    { name: "Suède", values: Object.fromEntries(axes.map((a, k) => [a, 30 - k])) },
  ];
  const measure = (t: string) => String(t).length * 19;
  const scene = profileScene({ axes, entities, plan: [], box: { width: 900, height: 600 }, measure, lead: () => 37, variant: "parallel-coordinates" });
  it("should print no two axis names or top readings over each other", () => {
    const heads = scene.texts.filter((t: any) => t.role === "tick" && t.text !== "0");
    const span = (t: any) => (t.anchor === "start" ? [t.x, t.x + t.width] : t.anchor === "end" ? [t.x - t.width, t.x] : [t.x - t.width / 2, t.x + t.width / 2]);
    const clashes = heads.filter((a: any, i: number) => heads.some((b: any, j: number) => j > i && Math.abs(a.y - b.y) < 30 && span(a)[0] < span(b)[1] && span(b)[0] < span(a)[1]));
    expect(clashes.map((t: any) => t.text)).toEqual([]);
  });
});
