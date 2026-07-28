// lib/brain/eligibility-drift.test.ts
// A16: the coupling between the `limits` schema (typology.ts) and eligibility.ts's
// limitFailure() used to be held ONLY by a comment ("adding a key here is a promise that
// limitFailure() checks it"). A key added to the strictObject without a matching branch in
// limitFailure() would validate clean and then vanish — the exact silent-drop failure mode the
// strict object exists to prevent on its OTHER side (an unmeasurable key is already a hard
// error at load time, proven in typology.test.ts). This file closes the direction that wasn't:
// it reads LIMIT_KEYS straight off the real schema, not a hand-copied list of its own, so a 7th
// key added to typology.ts's LimitsSchema shows up here automatically — and fails, loudly,
// until limitFailure() is taught to check it too.
import { test, expect } from "bun:test";
import { eligible } from "./eligibility";
import { deriveFacts } from "./facts";
import { LIMIT_KEYS, type TypeSheet } from "./typology";

function fixtureSheet(limits: TypeSheet["limits"]): TypeSheet {
  return {
    id: "fixture",
    engines: { "fake-engine": ["fake-key"] },
    intent: ["magnitude"],
    shape: "single",
    limits,
    formats: ["static"],
    bestFor: ["a fixture for eligibility-drift.test.ts"],
    notFor: ["anything real"],
    sheetPath: "test/fixture.md",
    body: "",
  };
}

// One case per LIMIT_KEYS entry: a limit value, and facts that violate ONLY that limit (every
// other key stays undefined on the fixture sheet, so it cannot contribute to the exclusion).
const CASES: Record<
  (typeof LIMIT_KEYS)[number],
  { limit: number; facts: Parameters<typeof deriveFacts>[0] }
> = {
  points: {
    limit: 2,
    facts: {
      columns: ["a", "b", "c", "d"],
      numericColumns: ["b", "c", "d"],
      rowCount: 5,
    }, // 3 numeric columns != 2
  },
  minPoints: {
    limit: 3,
    facts: { columns: ["a", "b"], numericColumns: ["b"], rowCount: 5 }, // 1 numeric column < 3
  },
  maxPoints: {
    limit: 2,
    facts: {
      columns: ["a", "b", "c", "d"],
      numericColumns: ["b", "c", "d"],
      rowCount: 5,
    }, // 3 > 2
  },
  maxSeries: {
    limit: 2,
    facts: { columns: ["a", "b"], numericColumns: ["b"], rowCount: 5 }, // series (= rows) 5 > 2
  },
  maxCategories: {
    limit: 2,
    facts: { columns: ["a", "b"], numericColumns: ["b"], rowCount: 5 }, // rows 5 > 2
  },
  minRows: {
    limit: 3,
    facts: { columns: ["a", "b"], numericColumns: ["b"], rowCount: 1 }, // rows 1 < 3
  },
};

test("DRIFT: every key the `limits` schema accepts actually excludes when its data breaks it", () => {
  expect(LIMIT_KEYS.sort()).toEqual(
    [
      "points",
      "minPoints",
      "maxPoints",
      "maxSeries",
      "maxCategories",
      "minRows",
    ].sort(),
  );
  for (const key of LIMIT_KEYS) {
    const { limit, facts } = CASES[key];
    const sheet = fixtureSheet({ [key]: limit });
    const { eligible: ok, excluded } = eligible(
      { facts: deriveFacts(facts), channel: "article-web" },
      [{ sheet, engine: "fake-engine", key: "fake-key" }],
    );
    expect(
      ok.length,
      `${key}: a value that breaks the limit must not be offered`,
    ).toBe(0);
    const reason = excluded.find((e) => e.id === "fixture")?.reason;
    expect(
      reason,
      `${key}: limitFailure() must exclude WITH a reason — got none, meaning this key is declared in the schema but never checked (A16)`,
    ).toBeDefined();
    expect(reason).toContain(String(limit));
  }
});
