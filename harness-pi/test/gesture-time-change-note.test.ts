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
