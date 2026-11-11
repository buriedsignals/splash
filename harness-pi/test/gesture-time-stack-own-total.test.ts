import { describe, expect, it } from "bun:test";
import { dropStackTotal, retargetStackTotal } from "../craft/_shared/gesture-time-run.mjs";

// Osaurus runs 30 and 31 (2026-11-10): the 12B stacked the World row with the six continents it is the sum of,
// the render refused the doubled stack three times, and the model put World back each time. The stack's top edge
// already draws that total, so the kit leaves the layer out.
const series = (name: string, values: number[]) => values.map((value, i) => ({ series: name, t: 2015 + i, key: String(2015 + i), value }));
const parts = [...series("Africa", [600, 500, 400]), ...series("Asia", [300, 300, 300]), ...series("Europe", [100, 100, 100])];

describe("dropStackTotal", () => {
  it("should leave out a stacked layer that is the sum of the other layers at every time", () => {
    const out = dropStackTotal([...parts, ...series("World", [1000, 900, 800])], true);
    expect(new Set(out.map((p: { series: string }) => p.series))).toEqual(new Set(["Africa", "Asia", "Europe"]));
  });

  // Seeded craft run 2 (2026-11-11): the 12B added the World row for one year only, from data.rows.find.
  it("should leave out a layer drawn at one time only when it is the sum of the others there", () => {
    const out = dropStackTotal([...parts, { series: "World", t: 2015, key: "2015", value: 1000 }], true);
    expect(out.some((p: { series: string }) => p.series === "World")).toBe(false);
  });

  it("should keep a layer that is the sum of the others at some times only", () => {
    const out = dropStackTotal([...parts, ...series("Other", [1000, 50, 800])], true);
    expect(out.some((p: { series: string }) => p.series === "Other")).toBe(true);
  });

  it("should keep every series of a chart that does not stack", () => {
    const out = dropStackTotal([...parts, ...series("World", [1000, 900, 800])], false);
    expect(out.some((p: { series: string }) => p.series === "World")).toBe(true);
  });

  it("should keep a two-layer stack whole, where each layer equals the other", () => {
    const out = dropStackTotal([...series("A", [5, 5, 5]), ...series("B", [5, 5, 5])], true);
    expect(out.length).toBe(6);
  });
});

describe("retargetStackTotal", () => {
  it("should move a gesture marked on the dropped total onto the beat's entity at the same time", () => {
    const g = [{ do: "name", mark: "2015 · World", note: "Peak: 1,148,499" }];
    retargetStackTotal(g, ["World"], "Africa", ["Africa", "Asia"]);
    expect(g[0].mark).toBe("2015 · Africa");
  });

  it("should move each of a compare's marks", () => {
    const g = [{ do: "compare", marks: ["2024 · World", "2015 · World"], note: "Down 33%" }];
    retargetStackTotal(g, ["World"], "Africa", ["Africa", "Asia"]);
    expect(g[0].marks).toEqual(["2024 · Africa", "2015 · Africa"]);
  });

  it("should leave a mark on a drawn layer as it is", () => {
    const g = [{ do: "name", mark: "2015 · Asia", note: "x" }];
    retargetStackTotal(g, ["World"], "Africa", ["Africa", "Asia"]);
    expect(g[0].mark).toBe("2015 · Asia");
  });
});
