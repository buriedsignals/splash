import { describe, expect, it } from "bun:test";
import { nameLoneSeries } from "../craft/_shared/gesture-time-run.mjs";

// r8 on Osaurus (2026-11-12): the pedelec line was labelled by its rows' filter value.
describe("nameLoneSeries", () => {
  const old = "Innerhalb und außerhalb von Ortschaften";
  const points = [2015, 2025].map((t) => ({ series: old, t, key: String(t), value: t === 2015 ? 36 : 214 }));

  it("should name a lone series by the beat's entity", () => {
    expect(nameLoneSeries(points, [], "Pedelecs").map((p: { series: string }) => p.series)).toEqual(["Pedelecs", "Pedelecs"]);
  });

  it("should carry the gestures' marks to the new name", () => {
    const gestures = [{ do: "compare", marks: [`2025 · ${old}`, `2015 · ${old}`] }, { do: "highlight", mark: old }];
    nameLoneSeries(points, gestures, "Pedelecs");
    expect(gestures).toEqual([{ do: "compare", marks: ["2025 · Pedelecs", "2015 · Pedelecs"] }, { do: "highlight", mark: "Pedelecs" }]);
  });

  it("should leave several series as named", () => {
    const two = [...points, { series: "Bicycles", t: 2015, key: "2015", value: 300 }];
    expect(nameLoneSeries(two, [], "Pedelecs")).toBe(two);
  });
});
