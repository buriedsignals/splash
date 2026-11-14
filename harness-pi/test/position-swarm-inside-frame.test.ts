// A beeswarm circle sits at its value, its area its size; a circle near either end of the domain must still be drawn
// whole inside the plot — the page clips at the frame, so a circle centred on the axis's 0 lost its left half.
import { describe, expect, it } from "bun:test";
import * as familyModule from "../craft/_shared/gesture-family-position.mjs";

const { createPosition, modelOf, sceneOf } = familyModule as any;

const text = { lead: () => 14, measure: (t: string) => String(t).length * 7, format: (v: number) => String(v), moments: [] };
const frame = { x: 0, y: 0, width: 960, height: 500 };

function swarm(rows: { name: string; value: number; size: number }[]) {
  const model = modelOf("beeswarm", { rows, format: (v: number) => String(v), unit: "t" });
  const state = createPosition({ model }).rest();
  return sceneOf({ model, state, frame, text });
}

describe("a beeswarm's circles near the domain's ends", () => {
  const rows = [
    { name: "Low", value: 0.1, size: 4e8 },
    { name: "Mid", value: 10, size: 1e8 },
    { name: "High", value: 49.9, size: 4e8 },
    ...Array.from({ length: 20 }, (_, i) => ({ name: `R${i}`, value: 0.2 + i * 0.05, size: 2e7 })),
  ];

  it("should draw every circle whole inside the frame", () => {
    const circles = swarm(rows).prims.filter((p: any) => p.id.startsWith("p1-"));
    const outside = circles.filter((c: any) => c.cx - c.r < frame.x - 0.5 || c.cx + c.r > frame.x + frame.width + 0.5).map((c: any) => c.id);
    expect(outside).toEqual([]);
  });

  it("should keep the axis ticks on the same scale as the circles", () => {
    const scene = swarm(rows);
    const mid = scene.prims.find((p: any) => p.id === "p1-Mid");
    const ticks = scene.prims.filter((p: any) => p.id.startsWith("tick-")).map((p: any) => [Number(p.id.slice(5)), p.x]);
    const [t0, x0] = ticks[0];
    const [t1, x1] = ticks.at(-1);
    expect(Math.abs(x0 + ((10 - t0) / (t1 - t0)) * (x1 - x0) - mid.cx)).toBeLessThan(0.5);
  });
});
