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
    schemaVersion: 5,
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

// A requestedFormat can be channel-legal but leave zero buildable candidates (lib/brain/
// eligibility.ts's new refusal), stranding the run in choose-form forever with no NextAction
// verb to escape it. clear-requested-format is the way out: it drops requestedFormat AND the
// proposal built under it, so nextActionsForElement's own existing "no proposal -> propose"
// rule (manifest.ts) routes back to a fresh offer — no new invalidation rule invented, the
// same "clear a field the next step is conditioned on" mechanism the angle-changing kinds
// already use for staleness.
test("clearing the requested format drops it and the stale proposal built under it", () => {
  const el: RunElement = {
    id: "e1",
    requestedFormat: "scrolly",
    angle: { confirmedTakeaway: "t", altInsight: "a", unit: "u" },
    proposal: {
      options: [{ id: "choropleth", nativeType: "choropleth", why: "w" }],
      excluded: [],
      chosenId: "choropleth",
    },
  };
  const after = revise(el, { kind: "clear-requested-format" });
  expect(after.requestedFormat).toBeUndefined();
  expect(after.proposal).toBeUndefined();
  // The angle survives untouched — only the request and what was offered under it are gone.
  expect(after.angle).toEqual(el.angle);
});

// clear-requested-format does not need an angle to exist — a request can be cleared before
// CADRAGE ever confirms an angle, unlike emphasis/takeaway which revise the angle itself.
test("clearing the requested format does not require an angle to already exist", () => {
  const el: RunElement = { id: "e1", requestedFormat: "video" };
  const after = revise(el, { kind: "clear-requested-format" });
  expect(after.requestedFormat).toBeUndefined();
});
