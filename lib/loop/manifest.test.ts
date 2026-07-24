import { test, expect } from "bun:test";
import {
  provenanceHash,
  stalenessOf,
  nextActions,
  parseManifest,
  type RunManifest,
} from "./manifest";

function base(): RunManifest {
  return {
    runId: "r1",
    schemaVersion: 2,
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
        angle: {
          confirmedTakeaway: "t",
          emphasis: "e",
          altInsight: "a",
          unit: "u",
        },
        proposal: {
          options: [{ id: "slope", nativeType: "slope", why: "w" }],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
}

test("provenanceHash is stable and 32-hex", () => {
  const m = base();
  expect(provenanceHash(m, m.elements[0])).toMatch(/^[0-9a-f]{32}$/);
});

test("provenanceHash changes when the angle changes", () => {
  const m = base();
  const h1 = provenanceHash(m, m.elements[0]);
  const el2 = {
    ...m.elements[0],
    angle: { ...m.elements[0].angle!, emphasis: "other" },
  };
  expect(provenanceHash(m, el2)).not.toBe(h1);
});

test("stalenessOf is true when artifact provenance no longer matches", () => {
  const m = base();
  m.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: "stale",
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  expect(stalenessOf(m, m.elements[0])).toBe(true);
});

test("nextActions is produce when element has a chosen form and no fresh artifact", () => {
  expect(nextActions(base())).toEqual(["produce"]);
});

test("nextActions is show when the artifact is fresh", () => {
  const m = base();
  m.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: provenanceHash(m, m.elements[0]),
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  expect(nextActions(m)).toEqual(["show"]);
});

test("nextActions off-ramps ([]) when data supports no visual", () => {
  const m = base();
  m.orient = {
    profile: { columns: ["x"], numericColumns: [], rowCount: 0 },
    supportsPoint: false,
  };
  expect(nextActions(m)).toEqual([]);
});

test("parseManifest rejects a manifest missing elements", () => {
  const bad = { runId: "r", schemaVersion: 2, input: {}, events: [] };
  expect(() => parseManifest(bad)).toThrow();
});
