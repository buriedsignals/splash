// lib/brain/rank.test.ts
import { test, expect } from "bun:test";
import { deriveFacts } from "./facts";
import { eligible } from "./eligibility";
import { rank } from "./rank";
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

test("THE INVARIANT: a wrong intent changes the ORDER and never the legal set", () => {
  const { eligible: legal } = eligible({ ...BASE });
  const right = rank(legal, ["change-over-time"]);
  const wrong = rank(legal, ["flow"]); // nothing here serves flow
  const ids = (cs: typeof legal) =>
    [...cs.map((c) => `${c.id}:${c.format}`)].sort();
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
  if (firstMarked !== -1) expect(firstMarked).toBeGreaterThan(lastReady - 1);
});

test("between two forms that serve the intent equally, the roomier one leads", () => {
  const { eligible: legal } = eligible({ ...BASE });
  const ordered = rank(legal, ["ranking"]);
  const scores = ordered
    .filter((c) => c.sheet.intent.includes("ranking"))
    .map((c) => c.fill);
  // fill is a 0..1 ratio, and the ordering is non-decreasing in it among equal-intent peers
  expect(scores).toEqual([...scores].sort((a, b) => a - b));
});

test("ranking never mutates its input", () => {
  const { eligible: legal } = eligible({ ...BASE });
  const before = legal.map((c) => c.id);
  rank(legal, ["ranking"]);
  expect(legal.map((c) => c.id)).toEqual(before);
});
