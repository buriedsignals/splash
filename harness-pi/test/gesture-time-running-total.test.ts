import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { refuseRunningTotal } from "../craft/_shared/gesture-time-run.mjs";

const yearly = [3, 5, 2, 7, 4, 6];
const here = mkdtempSync(join(tmpdir(), "running-total-"));
writeFileSync(join(here, "data.json"), JSON.stringify({ columns: [{ name: "Year", type: "number" }, { name: "Flow", type: "number" }], rows: yearly.map((v, i) => [2000 + i, v]) }));
const points = (values: number[]) => values.map((value, i) => ({ series: "A", t: 2000 + i, value }));

describe("refuseRunningTotal", () => {
  it("should refuse an area whose readings are a running total of a data.json column", () => {
    let run = 0;
    expect(() => refuseRunningTotal(points(yearly.map((v) => (run += v))), here)).toThrow(/running total of data.json's "Flow"/);
  });

  it("should accept the readings as data.json holds them", () => {
    expect(() => refuseRunningTotal(points(yearly), here)).not.toThrow();
  });
});
