import { describe, expect, it } from "bun:test";
import { bracketText, readPoints, tickLabel, timeModel, validateTime } from "../craft/_shared/gesture-family-time.mjs";

// real-gwis, 2026-11-08: Africa 689,651 → 611,023 (−11.4%), 60.05% of the 2015 stack.
const rows: [string, number, number][] = [
  ["Africa", 2015, 689651],
  ["Asia", 2015, 458848],
  ["Africa", 2022, 611023],
  ["Asia", 2022, 351596],
];
const model = timeModel({ variant: "area-and-stacked-area", points: readPoints(rows.map(([series, t, value]) => ({ series, t, value }))) });
const claim = { takeaway: "Africa accounts for about two-thirds of the world's recorded wildfires", entity: "Africa" };
const compare = (note: string) => () =>
  validateTime({ gestures: [{ do: "compare", marks: ["2022 · Africa", "2015 · Africa"], note }], model, format: "static", claim });

describe("a compare's note that names a change", () => {
  it("should refuse a share stated as a decline (60% decline since 2015)", () => {
    expect(compare("60% decline since 2015")).toThrow(/11% decline since 2015/);
  });

  it("should accept the readings' own change", () => {
    expect(compare("11% decline since 2015")).not.toThrow();
  });

  it("should still accept a share the note does not call a change", () => {
    expect(compare("Africa held 60% of the stack in 2015")).not.toThrow();
  });
});

describe("tickLabel", () => {
  const en = (v: number) => new Intl.NumberFormat("en-US").format(v);

  it("should keep a million's thousands groups (1,250,000, not 1,250)", () => {
    expect(tickLabel(en, 1250000)).toBe("1,250,000");
  });

  it("should drop a whole tick's decimal zeros", () => {
    expect(tickLabel((v: number) => v.toFixed(1), 40)).toBe("40");
  });
});

describe("bracketText", () => {
  const en = (v: number) => new Intl.NumberFormat("en-US").format(v);

  it("should say which times a bracket's sum and its share of the whole cover", () => {
    expect(bracketText(en, { sum: 962619, from: 2022, to: 2022, ofWhole: true, share: 6.8, span: [2012, 2026] })).toBe("962,619 in 2022 · 6.8 % of 2012–2026");
  });
});

describe("a compare's signed note", () => {
  it("should keep the minus when it offers the readings' own fall (-48% → -68%)", () => {
    const fall = timeModel({ variant: "area-and-stacked-area", points: readPoints([["Africa", 2015, 689651], ["Asia", 2015, 458848], ["Africa", 2026, 222057], ["Asia", 2026, 148337]].map(([series, t, value]) => ({ series, t, value }))) });
    expect(() =>
      validateTime({ gestures: [{ do: "compare", marks: ["2026 · Africa", "2015 · Africa"], note: "-48% vs 2015 peak" }], model: fall, format: "static", claim }),
    ).toThrow(/write "-68% vs 2015 peak"/);
  });
});

describe("a compare's change runs forward in time", () => {
  it("should offer the later reading against the earlier (-30%), never the reverse (-43%)", () => {
    const m = timeModel({ variant: "area-and-stacked-area", points: readPoints([["Africa", 2015, 689651], ["Asia", 2015, 458848], ["Africa", 2024, 481688], ["Asia", 2024, 290000]].map(([series, t, value]) => ({ series, t, value }))) });
    expect(() =>
      validateTime({ gestures: [{ do: "compare", marks: ["2024 · Africa", "2015 · Africa"], note: "-45% since 2015" }], model: m, format: "static", claim }),
    ).toThrow(/write "-30% since 2015"/);
  });
});
