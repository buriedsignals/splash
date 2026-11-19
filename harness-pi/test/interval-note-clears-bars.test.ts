// gx-gantt web and video, Gemma 12B (mvg100, mvg101, 2026-11-19): the highlight's note "6 pays présents les 35
// années" stood on the last lit bar (Inde): its anchor is that bar's end at the axis's right edge, so every candidate
// right of it left the plot and every one left of it covered the bar. The note now finds clear ground.
import { describe, expect, it } from "bun:test";
import { INTERVAL_SPEC, intervalRows } from "../craft/_shared/gesture-family-interval.mjs";
import { stageKeyedFormat } from "../craft/_shared/gesture-keyed.mjs";
import { ganttModel } from "./keyed-fixtures.ts";

const raw = ganttModel();
const model = { ...raw, rows: intervalRows(raw) };
const SIX = model.rows.filter((r: any) => r.years === 35).map((r: any) => r.name);
const claim = { takeaway: "Six countries never left the top 10 emitters since 1990", subject: `The six: ${SIX.join(", ")}`, comparison: "Kuwait, present one year" };
const NOTE = "6 countries present all 35 years";
const measure = (t: string) => t.length * 8.5;
const lead = () => 22;

describe("the gantt's note on a highlight", () => {
  it("should not stand on a drawn bar", () => {
    const { scheduled } = stageKeyedFormat({ spec: INTERVAL_SPEC, model, format: "static", gestures: [{ do: "highlight", marks: SIX, note: NOTE }], claim, repair: false });
    const scene = INTERVAL_SPEC.scene(model, { plan: scheduled.plan, box: { width: 1500, height: 600 }, measure, lead });
    const n = scene.notes.find((x: any) => x.text === NOTE);
    const box = { x: n.x, y: n.y - n.lead * 0.78, w: n.width, h: n.lines.length * n.lead };
    const bars = scene.marks.flatMap((m: any) => m.shapes.map((s: any) => s.attrs));
    const covered = bars.filter((b: any) => box.x < b.x + b.width && b.x < box.x + box.w && box.y < b.y + b.height && b.y < box.y + box.h);
    expect(covered.length).toBe(0);
  });
  it("should not lay a compare's words on the next row's bar", () => {
    // mvg102 (scrolly): "35 ans contre 1", under the first row's copy, stood on the second row's bar.
    const { scheduled } = stageKeyedFormat({ spec: INTERVAL_SPEC, model, format: "static", gestures: [{ do: "highlight", marks: SIX }, { do: "compare", marks: [SIX[0], "Kuwait"], note: "35 years against 1" }], claim, repair: false });
    const scene = INTERVAL_SPEC.scene(model, { plan: scheduled.plan, box: { width: 1500, height: 600 }, measure, lead });
    const l = scene.overlays.find((o: any) => o.label).label;
    const box = { x: l.x, y: l.y - 22 * 0.78, w: l.width, h: 22 };
    const bars = scene.marks.flatMap((m: any) => m.shapes.map((s: any) => s.attrs));
    expect(bars.filter((b: any) => box.x < b.x + b.width && b.x < box.x + box.w && box.y < b.y + b.height && b.y < box.y + box.h).length).toBe(0);
  });
});
