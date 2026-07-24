import { test, expect } from "bun:test";
import { propose } from "./propose";
import type { RunManifest } from "./manifest";

function withNumeric(numericColumns: string[]): RunManifest {
  return {
    runId: "r",
    schemaVersion: 1,
    input: { dataCsv: "x", statedPoint: "p" },
    orient: {
      profile: {
        columns: ["label", ...numericColumns],
        numericColumns,
        rowCount: 3,
      },
      supportsPoint: true,
    },
  };
}

test("propose offers slope + dumbbell for two time points, each with a why", () => {
  const opts = propose(withNumeric(["2015", "2024"]));
  expect(opts.map((o) => o.id)).toEqual(["slope", "dumbbell"]);
  expect(opts[0].why.length).toBeGreaterThan(20);
});
test("propose offers a line for three or more points", () => {
  const opts = propose(withNumeric(["2010", "2015", "2020"]));
  expect(opts.map((o) => o.nativeType)).toEqual(["line"]);
});
test("propose returns nothing before orient has run", () => {
  expect(
    propose({
      runId: "r",
      schemaVersion: 1,
      input: { dataCsv: "x", statedPoint: "p" },
    }),
  ).toEqual([]);
});
