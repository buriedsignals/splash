import { test, expect } from "bun:test";
import { revise } from "./revise";
import {
  stalenessOf,
  nextActions,
  provenanceHash,
  type RunManifest,
  type RunElement,
} from "./manifest";

function producedRun(): RunManifest {
  const run: RunManifest = {
    runId: "r",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: {
        columns: ["c", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 1,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: { confirmedTakeaway: "t", altInsight: "a", unit: "u" },
        proposal: {
          options: [{ id: "slope", nativeType: "slope", why: "w" }],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
  const el = run.elements[0];
  const artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: provenanceHash(run, el),
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  return { ...run, elements: [{ ...el, artifact }] };
}

test("revising the emphasis marks the artifact stale and routes back to produce", () => {
  const run = producedRun();
  const before = run.elements[0];
  expect(stalenessOf(run, before)).toBe(false);
  const after = revise(before, { kind: "emphasis", emphasis: "A" });
  expect(after.angle!.emphasis).toBe("A");
  expect(stalenessOf(run, after)).toBe(true);
  expect(nextActions({ ...run, elements: [after] })).toEqual(["produce"]);
});
test("revising the takeaway updates it and marks the artifact stale", () => {
  const run = producedRun();
  const before = run.elements[0];
  const after = revise(before, {
    kind: "takeaway",
    confirmedTakeaway: "New point",
    altInsight: "New alt",
  });
  expect(after.angle!.confirmedTakeaway).toBe("New point");
  expect(after.angle!.altInsight).toBe("New alt");
  expect(stalenessOf(run, after)).toBe(true);
});
test("revise throws before an angle exists", () => {
  const el: RunElement = { id: "e1" };
  expect(() => revise(el, { kind: "emphasis", emphasis: "A" })).toThrow();
});
