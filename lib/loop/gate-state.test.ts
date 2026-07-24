import { test, expect } from "bun:test";
import {
  gateStateOf,
  assertInvariants,
  provenanceHash,
  type RunManifest,
  type RunElement,
} from "./manifest";

function run(el: RunElement): RunManifest {
  return {
    runId: "r",
    schemaVersion: 2,
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
  chosenId: "slope",
};

test("empty element is 'empty'", () => {
  const r = run({ id: "e" });
  expect(gateStateOf(r, r.elements[0])).toBe("empty");
});
test("angle only → 'angled'", () => {
  const r = run({ id: "e", angle });
  expect(gateStateOf(r, r.elements[0])).toBe("angled");
});
test("proposal without choice → 'proposed'", () => {
  const r = run({ id: "e", angle, proposal: { options: proposal.options } });
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
    proposal: { options: proposal.options, chosenId: "ghost" },
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
