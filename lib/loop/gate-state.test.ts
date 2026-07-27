import { test, expect } from "bun:test";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  gateStateOf,
  assertInvariants,
  nextActionsForElement,
  provenanceHash,
  writeManifest,
  type RunManifest,
  type RunElement,
} from "./manifest";

function run(el: RunElement): RunManifest {
  return {
    runId: "r",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/d.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: { columns: ["a", "b"], numericColumns: ["a", "b"], rowCount: 2 },
      supportsPoint: true,
    },
    elements: [el],
    events: [],
  };
}
const angle = { confirmedTakeaway: "t", altInsight: "a", unit: "u" };
const proposal = {
  options: [{ id: "slope", nativeType: "slope", why: "w" }],
  excluded: [],
  chosenId: "slope",
};

test("element with no run-orient is 'empty'", () => {
  const r: RunManifest = {
    runId: "r",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/d.csv", sha256: "a".repeat(64) } },
    elements: [{ id: "e" }],
    events: [],
  };
  expect(gateStateOf(r, r.elements[0])).toBe("empty");
});
test("run oriented but element not angled is 'oriented'", () => {
  const r = run({ id: "e" });
  expect(gateStateOf(r, r.elements[0])).toBe("oriented");
});
test("angle only → 'angled'", () => {
  const r = run({ id: "e", angle });
  expect(gateStateOf(r, r.elements[0])).toBe("angled");
});
test("proposal without choice → 'proposed'", () => {
  const r = run({
    id: "e",
    angle,
    proposal: { options: proposal.options, excluded: [] },
  });
  expect(gateStateOf(r, r.elements[0])).toBe("proposed");
});
test("chosen form, no artifact → 'chosen'", () => {
  const r = run({ id: "e", angle, proposal });
  expect(gateStateOf(r, r.elements[0])).toBe("chosen");
});
test("fresh artifact → 'produced'", () => {
  const r = run({ id: "e", angle, proposal });
  r.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: provenanceHash(r, r.elements[0]),
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  expect(gateStateOf(r, r.elements[0])).toBe("produced");
});
test("artifact with mismatched provenance → 'stale'", () => {
  const r = run({ id: "e", angle, proposal });
  r.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: "old",
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  expect(gateStateOf(r, r.elements[0])).toBe("stale");
});
test("review is not inherited once provenance moved (falls back to stale)", () => {
  const r = run({ id: "e", angle, proposal });
  r.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: "old",
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  r.elements[0].review = { findings: [], reviewedProvenanceHash: "old" };
  expect(gateStateOf(r, r.elements[0])).toBe("stale");
});
test("fresh review → 'reviewed'", () => {
  const r = run({ id: "e", angle, proposal });
  const ph = provenanceHash(r, r.elements[0]);
  r.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: ph,
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  r.elements[0].review = { findings: [], reviewedProvenanceHash: ph };
  expect(gateStateOf(r, r.elements[0])).toBe("reviewed");
});
test("fresh approved → 'approved'", () => {
  const r = run({ id: "e", angle, proposal });
  const ph = provenanceHash(r, r.elements[0]);
  r.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: ph,
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  r.elements[0].approved = {
    signoffPath: "s.sig",
    approvedProvenanceHash: ph,
  };
  expect(gateStateOf(r, r.elements[0])).toBe("approved");
});
test("approved is not inherited once provenance moved (falls back to stale)", () => {
  const r = run({ id: "e", angle, proposal });
  r.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: "old",
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  r.elements[0].approved = {
    signoffPath: "s.sig",
    approvedProvenanceHash: "old",
  };
  expect(gateStateOf(r, r.elements[0])).toBe("stale");
});
test("fresh delivered → 'delivered'", () => {
  const r = run({ id: "e", angle, proposal });
  const ph = provenanceHash(r, r.elements[0]);
  r.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: ph,
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  r.elements[0].delivery = {
    requested: ["zip"],
    delivered: [
      {
        publisherId: "zip",
        kind: "package",
        artifact: { path: "out/e.zip", sha256: "c".repeat(64) },
        snippet: "",
        publishedAt: "2026-01-01T00:00:00.000Z",
        deliveredProvenanceHash: ph,
      },
    ],
  };
  expect(gateStateOf(r, r.elements[0])).toBe("delivered");
});
test("delivered is not inherited once provenance moved (falls back to stale)", () => {
  const r = run({ id: "e", angle, proposal });
  r.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: "old",
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  r.elements[0].delivery = {
    requested: ["zip"],
    delivered: [
      {
        publisherId: "zip",
        kind: "package",
        artifact: { path: "out/e.zip", sha256: "c".repeat(64) },
        snippet: "",
        publishedAt: "2026-01-01T00:00:00.000Z",
        deliveredProvenanceHash: "old",
      },
    ],
  };
  expect(gateStateOf(r, r.elements[0])).toBe("stale");
});
test("blocked element → 'blocked'", () => {
  const r = run({
    id: "e",
    blocked: { reason: "x", at: "2026-01-01T00:00:00.000Z" },
  });
  expect(gateStateOf(r, r.elements[0])).toBe("blocked");
});
test("dropped wins over everything", () => {
  const r = run({
    id: "e",
    angle,
    proposal,
    dropped: { reason: "cut", at: "2026-01-01T00:00:00.000Z" },
  });
  expect(gateStateOf(r, r.elements[0])).toBe("dropped");
});
test("assertInvariants throws when chosenId is not among options", () => {
  const r = run({
    id: "e",
    angle,
    proposal: { options: proposal.options, excluded: [], chosenId: "ghost" },
  });
  expect(() => assertInvariants(r)).toThrow();
});
test("assertInvariants throws when approved without an artifact", () => {
  const r = run({
    id: "e",
    angle,
    approved: { signoffPath: "s.sig", approvedProvenanceHash: "x" },
  });
  expect(() => assertInvariants(r)).toThrow();
});
test("assertInvariants throws when artifact without an angle", () => {
  const r = run({ id: "e", proposal });
  r.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: "x",
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  expect(() => assertInvariants(r)).toThrow();
});

// --- phrasing (host-journey slice) ---------------------------------------------------------
// An offer the brain built arrives with every `why` empty on purpose (propose.ts: the brain
// hands over grounding, the desk writes the language). A journalist cannot choose from an offer
// nobody wrote, so the loop asks for the writing BEFORE the choice — and once a choice exists,
// the invariant guarantees it was phrased, so there is nothing left to route out of.

test("nextActions asks for the phrasing before the choice when an option is unwritten", () => {
  const el: RunElement = {
    id: "e1",
    angle: { confirmedTakeaway: "t", altInsight: "a", unit: "CHF" },
    proposal: {
      options: [
        { id: "bar", nativeType: "bar", why: "une barre compare des grandeurs" },
        { id: "lollipop", nativeType: "lollipop", why: "" },
      ],
      excluded: [],
    },
  };
  expect(nextActionsForElement(run(el), el)).toEqual(["phrase"]);
});

test("nextActions moves on to the choice once every option is written", () => {
  const el: RunElement = {
    id: "e1",
    angle: { confirmedTakeaway: "t", altInsight: "a", unit: "CHF" },
    proposal: {
      options: [
        { id: "bar", nativeType: "bar", why: "une barre compare des grandeurs" },
        { id: "lollipop", nativeType: "lollipop", why: "une sucette allège" },
      ],
      excluded: [],
    },
  };
  expect(nextActionsForElement(run(el), el)).toEqual(["choose-form"]);
});

// The POSITION of the rule, asserted rather than described: it sits UNDER the `!chosenId` test.
// Above it, an in-memory manifest that pins an unbuildable chosen form would answer "phrase"
// instead of routing back to "choose-form" — and that dead-end routing is what
// lib/loop/driver.test.ts proves. The state this skips is one assertInvariants forbids on disk.
test("an element that already carries a choice is not sent back to phrase", () => {
  const el: RunElement = {
    id: "e1",
    angle: { confirmedTakeaway: "t", altInsight: "a", unit: "CHF" },
    proposal: {
      options: [{ id: "bar", nativeType: "bar", engine: "chart-native", why: "" }],
      excluded: [],
      chosenId: "bar",
    },
  };
  expect(nextActionsForElement(run(el), el)).toEqual(["produce"]);
});

// --- the chosen option must carry a why (host-journey slice) --------------------------------
// Parked by the residual sweep of 2026-07-27 with its reason: the rule was right, and asserting
// it made lib/host's choose-form STRUCTURALLY UNREACHABLE, because no façade command could
// phrase. That command now exists (`phrase`), so the ordering the sweep spelled out — caller
// first, invariant second — is satisfied and the rule can be enforced.

test("assertInvariants refuses a choice made on an option nobody wrote", () => {
  const el: RunElement = {
    id: "e1",
    angle,
    proposal: {
      options: [
        { id: "bar", nativeType: "bar", why: "" },
        { id: "lollipop", nativeType: "lollipop", why: "une sucette allège" },
      ],
      excluded: [],
      chosenId: "bar",
    },
  };
  expect(() => assertInvariants(run(el))).toThrow(/e1.*bar|bar.*e1/);
});

test("assertInvariants refuses a choice made on a whitespace-only why", () => {
  const el: RunElement = {
    id: "e1",
    angle,
    proposal: {
      options: [{ id: "bar", nativeType: "bar", why: "   \n" }],
      excluded: [],
      chosenId: "bar",
    },
  };
  expect(() => assertInvariants(run(el))).toThrow(/why/i);
});

test("assertInvariants accepts a choice made on an option that was written", () => {
  const el: RunElement = {
    id: "e1",
    angle,
    proposal: {
      options: [{ id: "bar", nativeType: "bar", why: "une barre compare" }],
      excluded: [],
      chosenId: "bar",
    },
  };
  expect(() => assertInvariants(run(el))).not.toThrow();
});

// The negative bound: a FRESH offer is legitimately unwritten, and nothing has been chosen from
// it. Writing that manifest is exactly what `advance`(propose) does on every run.
test("assertInvariants accepts an unwritten offer while nothing is chosen", () => {
  const el: RunElement = {
    id: "e1",
    angle,
    proposal: {
      options: [
        { id: "bar", nativeType: "bar", why: "" },
        { id: "lollipop", nativeType: "lollipop", why: "" },
      ],
      excluded: [],
    },
  };
  expect(() => assertInvariants(run(el))).not.toThrow();
});

test("writeManifest carries the refusal — an unwritten choice never reaches disk", () => {
  const dir = mkdtempSync(join(tmpdir(), "loop-why-invariant-"));
  const el: RunElement = {
    id: "e1",
    angle,
    proposal: {
      options: [{ id: "bar", nativeType: "bar", why: "" }],
      excluded: [],
      chosenId: "bar",
    },
  };
  expect(() => writeManifest(join(dir, "run.json"), run(el))).toThrow();
  expect(existsSync(join(dir, "run.json"))).toBe(false);
});

// The rung that was missing from an already-written ladder: produced → captured → reviewed →
// approved → delivered. Three of those five were unreachable until the loop routed to them.
test("fresh capture, no review yet → 'captured'", () => {
  const r = run({ id: "e", angle, proposal });
  const ph = provenanceHash(r, r.elements[0]);
  r.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: ph,
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  r.elements[0].capture = {
    images: [],
    checks: [],
    capturedProvenanceHash: ph,
  };
  expect(gateStateOf(r, r.elements[0])).toBe("captured");
});
test("a capture of an earlier provenance leaves the element 'produced'", () => {
  const r = run({ id: "e", angle, proposal });
  const ph = provenanceHash(r, r.elements[0]);
  r.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: ph,
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  r.elements[0].capture = {
    images: [],
    checks: [],
    capturedProvenanceHash: "old",
  };
  expect(gateStateOf(r, r.elements[0])).toBe("produced");
});
