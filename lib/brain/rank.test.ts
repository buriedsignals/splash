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
  const firstMarked = ordered.findIndex((c) => c.readiness);
  const lastReady = ordered.map((c) => !c.readiness).lastIndexOf(true);
  expect(firstMarked).toBeGreaterThan(lastReady - 1); // unconditional: this fixture always marks something
});

test("a marked form that serves the intent twice still outranks a ready form that serves it not at all", () => {
  // Pins the graded trade-off: readiness is a penalty WITHIN the intent tier, not a tier of
  // its own above it — a capability check timing out must not bury the form that best serves
  // the journalist's angle (spec §3.4: marked, never silently removed).
  const marked = fakeCandidate("marked-two-match", ["spatial", "flow"], {
    readiness: { status: "missing", reason: "capability check failed" },
  });
  const readyNoMatch = fakeCandidate("ready-no-match", ["magnitude"]);
  const ordered = rank([readyNoMatch, marked], ["spatial", "flow"]);
  expect(ordered.map((c) => c.id)).toEqual([
    "marked-two-match",
    "ready-no-match",
  ]);
});

test("missing is penalised more than unverified, and both rank below ready", () => {
  // readiness.ts: "unverified" only means the provider could not be REACHED and may well
  // work; "missing" is the one status that means the form cannot be built now. A binary
  // marked/unmarked penalty would tie these two — graded by SEVERITY, it must not.
  const missing = fakeCandidate("missing-form", ["ranking"], {
    readiness: { status: "missing", reason: "no credential" },
  });
  const unverified = fakeCandidate("unverified-form", ["ranking"], {
    readiness: { status: "unverified", reason: "could not reach provider" },
  });
  const ready = fakeCandidate("ready-form", ["ranking"]);
  const ordered = rank([missing, unverified, ready], ["ranking"]);
  expect(ordered.map((c) => c.id)).toEqual([
    "ready-form",
    "unverified-form",
    "missing-form",
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
