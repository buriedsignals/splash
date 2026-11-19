import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped module
import {
  webFrameHeight,
  webRowFloor,
} from "../craft/_shared/position-row-floor.mjs";
import * as familyModule from "../craft/_shared/gesture-family-position.mjs";

const { createPosition, modelOf, sceneOf } = familyModule as any;

// A 375 px phone drew the ten dumbbell rows of gx-dumbbell (2026-11-19) in ~80 px: the names printed over each other,
// because the web Position kit declared no row floor and the plot cell kept its desktop ratio.
const lead = () => 16;

describe("webRowFloor", () => {
  it("should declare a floor for a dumbbell of several rows", () => {
    expect(
      webRowFloor({ variant: "dumbbell-range-plot", rows: 10, lead, px: 18 })
        ?.rows,
    ).toBe(10);
  });
  it("should take the pitch the scene lays its rows at, ticks above and below taken out", () => {
    const H = webFrameHeight("dumbbell-range-plot", 10);
    expect(
      webRowFloor({ variant: "dumbbell-range-plot", rows: 10, lead, px: 18 })
        ?.pitch,
    ).toBe((H - 2 * 16 - 8) / 10);
  });
  it("should declare nothing for a variant whose vertical is not a run of rows", () => {
    expect(
      webRowFloor({ variant: "slope-slopegraph", rows: 10, lead, px: 18 }),
    ).toBeNull();
  });
});

// The key's gaps are viewBox units that shrink with a phone while its words keep their CSS size: "2023" printed over
// "2000" at 375 px. On a page the second moment stands at the plot's far edge.
describe("the dumbbell's key on a page", () => {
  const rows = [
    { name: "Pologne", code: "POL", from: 73.7, to: 78.7 },
    { name: "France", code: "FRA", from: 79, to: 83.3 },
  ];
  const text = { lead: () => 14, measure: (t: string) => String(t).length * 7, format: (v: number) => String(v), moments: ["2000", "2023"], delta: (v: number) => `+${v}`, web: true, namesOutside: true };
  const model = modelOf("dumbbell-range-plot", { rows, format: (v: number) => String(v), unit: "ans" });
  const position = createPosition({ model });
  const scene = sceneOf({ model, state: position.rest(), frame: { x: 0, y: 0, width: 900, height: 300 }, text });
  it("should end the second moment at the plot's far edge", () => {
    const k = scene.prims.find((p: any) => p.id === "key-to");
    expect([k.anchor, k.x < scene.plot.x + scene.plot.width]).toEqual(["end", true]);
  });
});
