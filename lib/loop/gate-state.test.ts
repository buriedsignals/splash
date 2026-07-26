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
