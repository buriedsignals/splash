import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { refuseDoubleCount, dropExcludedTimes, refuseRewrittenSeries } from "../craft/_shared/gesture-time-run.mjs";

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

// Osaurus run 5 (2026-11-08): refused for drawing 2026, the MLX 12B spent its last 20 minutes failing to edit the
// filter in. The storyboard already decided the year is out; the kit leaves it out instead of asking.
describe("dropExcludedTimes", () => {
  const at = (years: number[]) => years.map((t) => ({ series: "World", key: String(t), t, value: 1 }));
  const years = (points: { t: number }[]) => points.map((p) => p.t);

  it("should leave out a year the limits say is excluded", () => {
    expect(years(dropExcludedTimes(at([2025, 2026]), "Count of fire events. 2026 excluded as incomplete."))).toEqual([2025]);
  });

  it("should leave out a year the limits call incomplete", () => {
    expect(years(dropExcludedTimes(at([2025, 2026]), "Not area burned; 2026 is incomplete."))).toEqual([2025]);
  });

  it("should leave out a year the limits call a partial year", () => {
    expect(years(dropExcludedTimes(at([2025, 2026]), "Data for the partial year 2026 are provisional."))).toEqual([2025]);
  });

  it("should keep every year when the limits exclude none drawn", () => {
    expect(years(dropExcludedTimes(at([2024, 2025]), "Count of fire events. 2026 excluded as incomplete."))).toEqual([2024, 2025]);
  });

  it("should leave out a year named after excluding", () => {
    expect(years(dropExcludedTimes(at([2019, 2020, 2021]), "Rates per 100,000, excluding 2020 (pandemic)."))).toEqual([2019, 2021]);
  });
});
