import { test, expect } from "bun:test";
import { provenanceHash, stalenessOf, type RunManifest } from "./manifest";

const base: RunManifest = {
  runId: "r1",
  schemaVersion: 1,
  input: {
    dataCsv: "canton,2015,2024\nGenève,449,583",
    statedPoint: "premiums rose",
  },
  angle: { confirmedTakeaway: "Premiums rose", altInsight: "alt", unit: "CHF" },
  proposal: {
    options: [{ id: "slope", nativeType: "slope", why: "two points" }],
    chosenId: "slope",
  },
};

test("provenanceHash is stable for identical inputs", () => {
  expect(provenanceHash(base)).toBe(provenanceHash(structuredClone(base)));
});
test("provenanceHash changes when the angle changes", () => {
  const changed = structuredClone(base);
  changed.angle!.emphasis = "Genève";
  expect(provenanceHash(changed)).not.toBe(provenanceHash(base));
});
test("stalenessOf is false when artifact provenance matches current", () => {
  const m = structuredClone(base);
  m.artifact = { path: "/x.png", provenanceHash: provenanceHash(base) };
  expect(stalenessOf(m)).toBe(false);
});
test("stalenessOf flips true after the angle changes under a produced artifact", () => {
  const m = structuredClone(base);
  m.artifact = { path: "/x.png", provenanceHash: provenanceHash(base) };
  m.angle!.emphasis = "Genève";
  expect(stalenessOf(m)).toBe(true);
});
