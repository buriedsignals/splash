import { test, expect } from "bun:test";
import { revise } from "./revise";
import {
  stalenessOf,
  nextActions,
  provenanceHash,
  type RunManifest,
} from "./manifest";

function produced(): RunManifest {
  const m: RunManifest = {
    runId: "r",
    schemaVersion: 1,
    input: { dataCsv: "c,2015,2024\nA,1,2", statedPoint: "p" },
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
  return {
    ...m,
    artifact: { path: "/x.png", provenanceHash: provenanceHash(m) },
  };
}

test("revising the emphasis marks the artifact stale and routes back to produce", () => {
  const before = produced();
  expect(stalenessOf(before)).toBe(false);
  const after = revise(before, { kind: "emphasis", emphasis: "A" });
  expect(after.angle!.emphasis).toBe("A");
  expect(stalenessOf(after)).toBe(true);
  expect(nextActions(after)).toEqual(["produce"]);
});
test("revise throws before an angle exists", () => {
  const m: RunManifest = {
    runId: "r",
    schemaVersion: 1,
    input: { dataCsv: "x", statedPoint: "p" },
  };
  expect(() => revise(m, { kind: "emphasis", emphasis: "A" })).toThrow();
});
