import { test, expect } from "bun:test";
import { deriveFacts } from "./facts";
import { buildOffer } from "./offer";
import type { TypeSheet } from "./typology";
// renderableSheets() only sees a type once its engine has self-registered into
// lib/core/registry — the same side-effect import lib/brain/eligibility.test.ts and
// lib/brain/rank.test.ts use.
import "../loop/engines";

const INPUT = {
  facts: deriveFacts({
    columns: ["canton", "2019", "2024"],
    numericColumns: ["2019", "2024"],
    rowCount: 8,
  }),
  channel: "article-web" as const,
  intents: ["change-over-time" as const],
};

test("it offers at most three forms", () => {
  expect(buildOffer(INPUT).options.length).toBeLessThanOrEqual(3);
});

test("one form appears once — the best format for it, not one row per format", () => {
  const ids = buildOffer(INPUT).options.map((o) => o.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("every option carries the grounding a why can be written from", () => {
  for (const o of buildOffer(INPUT).options) {
    expect(o.whySource.sheet).toMatch(/\.md$/);
    expect(o.whySource.fragments.length).toBeGreaterThan(0);
    expect(Object.keys(o.whySource.facts).length).toBeGreaterThan(0);
  }
});

test("the facts are the real numbers, as strings ready to be quoted", () => {
  const [first] = buildOffer(INPUT).options;
  expect(first.whySource.facts.rows).toBe("8");
  expect(first.whySource.facts.points).toBe("2");
});

test("what was discarded rides along with the offer", () => {
  const offer = buildOffer({ ...INPUT, channel: "social-vertical" });
  expect(offer.excluded.length).toBeGreaterThan(0);
  for (const e of offer.excluded) expect(e.reason.length).toBeGreaterThan(0);
});

// A minimal, valid TypeSheet fixture — same pattern as eligibility.test.ts's fakeSheet, needed
// here for the same reason: the real KB always has at least one entirely-unconstrained sheet
// (scatter, waterfall, dot-strip…, limits: {}), so no `facts` shape alone can ever empty the
// real offer — "nothing legal" has to be proven against a scoped, single-sheet KB instead.
function fakeSheet(id: string, limits: Record<string, number>): TypeSheet {
  return {
    id,
    engines: { "fake-engine": ["fake-key"] },
    intent: ["magnitude"],
    shape: "single",
    limits,
    formats: ["static"],
    bestFor: ["a fixture for offer.test.ts, not a real KB sheet"],
    notFor: ["anything real"],
    sheetPath: "test/fake.md",
    body: "",
  };
}

test("nothing legal ⇒ an empty offer that still explains itself", () => {
  const onlyFixture = fakeSheet("fixture-two-points-only", { points: 2 });
  const offer = buildOffer(
    {
      ...INPUT,
      facts: deriveFacts({
        columns: ["name"],
        numericColumns: [],
        rowCount: 3,
      }),
    },
    [{ sheet: onlyFixture, engine: "fake-engine", key: "fake-key" }],
  );
  expect(offer.options).toEqual([]);
  expect(offer.excluded.length).toBeGreaterThan(0);
});
