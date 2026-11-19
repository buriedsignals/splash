import { describe, expect, it } from "bun:test";
import { EVENTS } from "../craft/_shared/gesture-video.mjs";
import { scheduleUnitsVideo, sceneUnitsAt } from "../craft/_shared/gesture-units-video.mjs";

// gx-histogram video mvg98 (Gemma 12B, 2026-11-19): `bracket` "0–4" of "whole" drew one even spine over all ten
// bins with "6 pays sur 10" at its middle — read as if every country were the six in ten. The part has to show.
const groups = [
  { name: "0–4", count: 127, lo: 0, hi: 4 },
  { name: "4–8", count: 53, lo: 4, hi: 8 },
  { name: "8–12", count: 33, lo: 8, hi: 12 },
];
const rows = groups.map((g, i) => ({ key: g.name, count: g.count, top: 100 + i * 40, band: 30, notes: [] }));

function sceneOf(plan: any[]) {
  const fields = Object.fromEntries(plan.map((p) => [p.field, 1]));
  const state = { fill: 1, title: 1, furniture: 1, source: 1, ...fields, ...Object.fromEntries(rows.flatMap((_, i) => [[`accent${i}`, 0], [`ring${i}`, 0], [`back${i}`, 0]])) };
  const props = {
    states: EVENTS.map(() => state), windows: {}, timing: {}, linear: [],
    layout: { x0: 100, span: 600, max: 127, gap: 10, right: 800, perLine: 10, cell: 4 },
    rows, plan, variant: "histogram", format: { below: 10, decimals: 0, small: 1 }, captions: [],
    bracketLabels: plan.filter((p) => p.do === "bracket").map((p) => ({ item: p.index, x: 820, note: null })),
  };
  return sceneUnitsAt(props, 0);
}

describe("units video — a bracket measured against the whole", () => {
  it("should mark where its own group ends on the whole's spine", () => {
    const { plan } = scheduleUnitsVideo({ gestures: [{ do: "highlight", marks: ["0–4"] }, { do: "name", marks: ["4–8"] }, { do: "bracket", marks: ["0–4"], of: "whole" }], groups });
    const [b] = sceneOf(plan.map((p: any, i: number) => ({ ...p, index: i, field: p.field ?? `g${i}` }))).brackets;
    expect(b.partY2).toBe(130);
  });

  // gx-pictogram-isotype scrolly mvq148 (Qwen3.5-9B, 2026-11-19): the middle row of three was marked, and the
  // accent ran from the top of the spine — over the 16 above it — down to the middle row's end.
  it("should start the group's stretch at its own row, not at the top of the whole", () => {
    const { plan } = scheduleUnitsVideo({ gestures: [{ do: "highlight", marks: ["4–8"] }, { do: "name", marks: ["0–4"] }, { do: "bracket", marks: ["4–8"], of: "whole" }], groups });
    const [b] = sceneOf(plan.map((p: any, i: number) => ({ ...p, index: i, field: p.field ?? `g${i}` }))).brackets;
    expect([b.partY1, b.partY2]).toEqual([140, 170]);
  });
});
