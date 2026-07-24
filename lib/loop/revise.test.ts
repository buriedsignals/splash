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
test("revising the takeaway updates it and marks the artifact stale", () => {
  const before = produced();
  const after = revise(before, {
    kind: "takeaway",
    confirmedTakeaway: "New point",
    altInsight: "New alt",
  });
  expect(after.angle!.confirmedTakeaway).toBe("New point");
  expect(after.angle!.altInsight).toBe("New alt");
  expect(stalenessOf(after)).toBe(true);
});
test("revise throws before an angle exists", () => {
  const m: RunManifest = {
    runId: "r",
    schemaVersion: 1,
    input: { dataCsv: "x", statedPoint: "p" },
  };
  expect(() => revise(m, { kind: "emphasis", emphasis: "A" })).toThrow();
});
