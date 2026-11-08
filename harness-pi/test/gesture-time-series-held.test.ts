import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { refuseDoubleCount, refuseRewrittenSeries } from "../craft/_shared/gesture-time-run.mjs";

const here = mkdtempSync(join(tmpdir(), "series-held-"));
writeFileSync(
  join(here, "data.json"),
  JSON.stringify({
    columns: [{ name: "entity", type: "text" }, { name: "code", type: "text" }, { name: "year", type: "number" }, { name: "events", type: "number" }],
    rows: [
      ["Angola", "AGO", 2015, 100], ["Angola", "AGO", 2016, 90], ["Angola", "AGO", 2017, 80], ["Chad", "TCD", 2015, 50], ["Chad", "TCD", 2016, 50], ["Chad", "TCD", 2017, 50], ["Peru", "PER", 2015, 20], ["Peru", "PER", 2016, 20], ["Peru", "PER", 2017, 20],
      ["Africa", "OWID_AFR", 2015, 600], ["Africa", "OWID_AFR", 2016, 500], ["Africa", "OWID_AFR", 2017, 400],
      ["World", "OWID_WRL", 2015, 1000], ["World", "OWID_WRL", 2016, 900], ["World", "OWID_WRL", 2017, 800],
    ],
  }),
);
const series = (name: string, values: number[]) => values.map((value, i) => ({ series: name, t: 2015 + i, key: String(2015 + i), value }));

describe("refuseRewrittenSeries", () => {
  it("should refuse a series named like a data.json entity whose readings are not that entity's (World summed from every row)", () => {
    expect(() => refuseRewrittenSeries(series("World", [1700, 1490, 1280]), here)).toThrow(/World.*2015.*1,?000/);
  });

  it("should accept a series that draws its entity's readings as data.json holds them", () => {
    expect(() => refuseRewrittenSeries([...series("World", [1000, 900, 800]), ...series("Africa", [600, 500, 400])], here)).not.toThrow();
  });

  it("should accept a series whose name is no entity of data.json (one the beat composed, like Other regions)", () => {
    expect(() => refuseRewrittenSeries(series("Other regions", [400, 400, 400]), here)).not.toThrow();
  });

  it("should accept readings drawn in a power-of-ten unit (thousands of events)", () => {
    expect(() => refuseRewrittenSeries(series("World", [1, 0.9, 0.8]), here)).not.toThrow();
  });
});

describe("refuseDoubleCount", () => {
  it("should refuse a composed series that sums countries and aggregates together (Rest of World above the World row)", () => {
    expect(() => refuseDoubleCount(series("Rest of World", [1500, 1390, 1280]), here, false)).toThrow(/Rest of World.*2015.*1,500.*1,000/);
  });

  it("should refuse a stack whose total at a time exceeds the world's", () => {
    expect(() => refuseDoubleCount([...series("Africa", [600, 500, 400]), ...series("Others", [900, 800, 700])], here, true)).toThrow(/stack/);
  });

  it("should accept a composed series within the world's total (World minus Africa)", () => {
    expect(() => refuseDoubleCount([...series("Africa", [600, 500, 400]), ...series("Rest of World", [400, 400, 400])], here, true)).not.toThrow();
  });
});
