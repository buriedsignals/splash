import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { refuseRewrittenSeries } from "../craft/_shared/gesture-time-run.mjs";

const here = mkdtempSync(join(tmpdir(), "series-held-"));
writeFileSync(
  join(here, "data.json"),
  JSON.stringify({
    columns: [{ name: "entity", type: "text" }, { name: "code", type: "text" }, { name: "year", type: "number" }, { name: "events", type: "number" }],
    rows: [
      ["Angola", "AGO", 2015, 100], ["Angola", "AGO", 2016, 90], ["Angola", "AGO", 2017, 80],
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
