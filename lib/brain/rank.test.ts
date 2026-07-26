// lib/brain/rank.test.ts
import { test, expect } from "bun:test";
import { deriveFacts } from "./facts";
import { eligible, type Candidate } from "./eligibility";
import { rank } from "./rank";
import type { Intent } from "./intents";
import type { TypeSheet } from "./typology";
// renderableSheets() only sees a type once its engine has self-registered into lib/core/registry
// — the same side-effect import lib/brain/eligibility.test.ts uses.
import "../loop/engines";

const BASE = {
  facts: deriveFacts({
    columns: ["canton", "2019", "2024"],
    numericColumns: ["2019", "2024"],
    rowCount: 8,
  }),
  channel: "article-web",
  route: "embed",
} as const;

// A minimal, valid TypeSheet + Candidate fixture, for tests that need to pin an exact
// intent/readiness combination rather than depend on whatever the real KB happens to contain
// (which a sheet edit is free to change).
function fakeCandidate(
  id: string,
  intent: Intent[],
  opts: { readiness?: Candidate["readiness"]; fill?: number } = {},
): Candidate {
  const sheet: TypeSheet = {
    id,
    engines: { "fake-engine": ["fake-key"] },
    intent,
    shape: "single",
    limits: {},
    formats: ["static"],
    bestFor: ["a fixture for rank.test.ts, not a real KB sheet"],
    notFor: ["anything real"],
    sheetPath: "test/fake.md",
    body: "",
  };
  return {
    id,
    engine: "fake-engine",
    key: "fake-key",
    format: "static",
    sheet,
    readiness: opts.readiness,
    fill: opts.fill ?? 0,
  };
}

test("THE INVARIANT: a wrong intent changes the ORDER and never the legal set", () => {
  const { eligible: legal } = eligible({ ...BASE });
  const right = rank(legal, ["change-over-time"]);
  // "flow" is not actually unserved by this KB (waterfall, route both declare it) — the point
  // is only that it is a genuinely DIFFERENT intent from change-over-time, so the two calls
  // are expected to disagree on order while still agreeing on membership.
  const wrong = rank(legal, ["flow"]);
  // engine is part of the key, not just id:format — several ids in this KB are reachable
  // through more than one engine (e.g. both chart-native and dw-chart render "bar"), so
  // id:format alone is not unique and would let a swap (drop the dw-chart variant, duplicate
  // the chart-native one) pass unnoticed.
  const ids = (cs: readonly Candidate[]) =>
    [...cs.map((c) => `${c.engine}:${c.id}:${c.format}`)].sort();
  expect(right.length).toBe(legal.length);
  expect(wrong.length).toBe(legal.length);
  expect(ids(right)).toEqual(ids(legal)); // same membership
  expect(ids(wrong)).toEqual(ids(legal)); // same membership
  expect(right.map((c) => c.id)).not.toEqual(wrong.map((c) => c.id)); // different order
});

test("a form that serves the intent outranks one that does not", () => {
  const { eligible: legal } = eligible({ ...BASE });
  const ordered = rank(legal, ["change-over-time"]);
  const slope = ordered.findIndex((c) => c.id === "slope");
  const dumbbell = ordered.findIndex((c) => c.id === "dumbbell");
  expect(slope).toBeLessThan(dumbbell); // slope declares change-over-time, dumbbell does not
});

test("a marked form ranks below an equally-fitting ready one", () => {
  const { eligible: legal } = eligible({
    ...BASE,
    readiness: [
      {
        id: "dw-chart",
        label: "Datawrapper",
        status: "missing",
        reason: "no API token",
        help: [],
      },
    ],
  });
  const ordered = rank(legal, ["magnitude"]);
  // "equally-fitting" means the same intent tier: readiness only orders WITHIN a match count
  // (see the property test below), it does not compare across match counts — a marked form
  // that also matches "magnitude" can rank ahead of a ready form that does not, by design, so
  // this check is scoped to the forms that actually fit magnitude.
  const fitting = ordered.filter((c) => c.sheet.intent.includes("magnitude"));
  const firstMarked = fitting.findIndex((c) => c.readiness);
  const lastReady = fitting.map((c) => !c.readiness).lastIndexOf(true);
  expect(firstMarked).toBeGreaterThan(lastReady - 1); // unconditional: this fixture always marks something
});

test("intent match count dominates readiness completely; readiness only orders equal match counts", () => {
  // One scenario, six candidates, exercising the full rule at once rather than isolated
  // fixtures: a single-match marked form must never fall behind a no-match ready one (at ANY
  // severity, including the mildest — missing, the worst — since a still-worse case cannot
  // fail if the mildest already doesn't); a higher match count wins outright over a lower one
  // regardless of readiness; and within one match count, readiness orders by eligibility.ts's
  // SEVERITY — ready, then unverified (could not be REACHED, may well work), then disabled
  // (the newsroom deliberately did not turn it on), then missing (cannot be built right now).
  const noMatchReady = fakeCandidate("no-match-ready", ["magnitude"]);
  const oneMatchReady = fakeCandidate("one-match-ready", ["spatial"]);
  const oneMatchUnverified = fakeCandidate(
    "one-match-unverified",
    ["spatial"],
    {
      readiness: { status: "unverified", reason: "could not reach provider" },
    },
  );
  const oneMatchDisabled = fakeCandidate("one-match-disabled", ["spatial"], {
    readiness: { status: "disabled", reason: "" },
  });
  const oneMatchMissing = fakeCandidate("one-match-missing", ["spatial"], {
    readiness: { status: "missing", reason: "no credential" },
  });
  const twoMatchReady = fakeCandidate("two-match-ready", ["spatial", "flow"]);

  const ordered = rank(
    [
      noMatchReady,
      oneMatchMissing,
      twoMatchReady,
      oneMatchDisabled,
      oneMatchUnverified,
      oneMatchReady,
    ],
    ["spatial", "flow"],
  );

  expect(ordered.map((c) => c.id)).toEqual([
    "two-match-ready", // higher match count wins outright
    "one-match-ready",
    "one-match-unverified",
    "one-match-disabled",
    "one-match-missing", // even the worst severity still outranks...
    "no-match-ready", // ...a ready form that serves the intent not at all
  ]);
});

test("between two forms that serve the intent equally, the roomier one leads", () => {
  // Marks one candidate (dw-chart) so this test also proves fill-monotonicity holds ACROSS a
  // readiness boundary, not only in a fixture with no marks at all — the filter below scopes
  // to unmarked peers because readiness is a separate, higher-priority tier (see the tests
  // above): mixing a marked and a ready candidate into one "equally-fitting" comparison would
  // assert a property fill was never meant to hold across that boundary.
  const { eligible: legal } = eligible({
    ...BASE,
    readiness: [
      {
        id: "dw-chart",
        label: "Datawrapper",
        status: "missing",
        reason: "no API token",
        help: [],
      },
    ],
  });
  const ordered = rank(legal, ["ranking"]);
  const scores = ordered
    .filter((c) => c.sheet.intent.includes("ranking") && !c.readiness)
    .map((c) => c.fill);
  expect(scores.length).toBeGreaterThan(0); // otherwise the assertion below is vacuous
  // fill is a 0..1 ratio, and the ordering is non-decreasing in it among equal-intent,
  // equally-ready peers
  expect(scores).toEqual([...scores].sort((a, b) => a - b));
});

test("ranking never mutates its input", () => {
  const { eligible: legal } = eligible({ ...BASE });
  const before = legal.map((c) => c.id);
  rank(legal, ["ranking"]);
  expect(legal.map((c) => c.id)).toEqual(before);
});
