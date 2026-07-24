import { test, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readManifest,
  writeManifest,
  nextActions,
  provenanceHash,
  type RunManifest,
} from "./manifest";

const m: RunManifest = {
  runId: "r1",
  schemaVersion: 1,
  input: { dataCsv: "canton,2015,2024\nGenève,449,583", statedPoint: "p" },
};

test("writeManifest then readManifest round-trips", () => {
  const p = join(mkdtempSync(join(tmpdir(), "loop-io-")), "run.json");
  writeManifest(p, m);
  expect(readManifest(p)).toEqual(m);
});
test("nextActions asks to orient first", () => {
  expect(nextActions(m)).toEqual(["orient"]);
});
test("nextActions returns [] (off-ramp) when the data supports no visual", () => {
  const off = {
    ...m,
    orient: {
      profile: { columns: ["x"], numericColumns: [], rowCount: 0 },
      supportsPoint: false,
    },
  };
  expect(nextActions(off)).toEqual([]);
});
test("nextActions routes to produce when the artifact is stale", () => {
  const full: RunManifest = {
    ...m,
    orient: {
      profile: {
        columns: ["c", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 1,
      },
      supportsPoint: true,
    },
    angle: { confirmedTakeaway: "t", altInsight: "a", unit: "u" },
    proposal: {
      options: [{ id: "slope", nativeType: "slope", why: "w" }],
      chosenId: "slope",
    },
    artifact: { path: "/x.png", provenanceHash: "stale" },
  };
  expect(nextActions(full)).toEqual(["produce"]);
});
test("nextActions off-ramps when propose returned zero options", () => {
  const m: RunManifest = {
    runId: "r",
    schemaVersion: 1,
    input: { dataCsv: "city,pop\nA,1", statedPoint: "p" },
    orient: {
      profile: {
        columns: ["city", "pop"],
        numericColumns: ["pop"],
        rowCount: 1,
      },
      supportsPoint: true,
    },
    angle: { confirmedTakeaway: "t", altInsight: "a", unit: "u" },
    proposal: { options: [] },
  };
  expect(nextActions(m)).toEqual([]);
});
test("nextActions is show when a fresh artifact exists", () => {
  const full: RunManifest = {
    ...m,
    orient: {
      profile: {
        columns: ["c", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 1,
      },
      supportsPoint: true,
    },
    angle: { confirmedTakeaway: "t", altInsight: "a", unit: "u" },
    proposal: {
      options: [{ id: "slope", nativeType: "slope", why: "w" }],
      chosenId: "slope",
    },
  };
  const fresh = {
    ...full,
    artifact: { path: "/x.png", provenanceHash: provenanceHash(full) },
  };
  expect(nextActions(fresh)).toEqual(["show"]);
});
