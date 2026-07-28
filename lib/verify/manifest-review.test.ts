import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  approvalSubjectOf,
  approveElement,
  assertInvariants,
  fileArtifact,
  gateStateOf,
  parseManifest,
  provenanceHash,
  readManifest,
  writeManifest,
  type RunElement,
  type RunManifest,
} from "../loop/manifest";
import type { PreviewRecord, ReviewRecord } from "./types";
import { makeFinding } from "./severity";

const ARTIFACT = "d".repeat(64);

function baseRun(): RunManifest {
  return {
    runId: "r1",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "data.csv", sha256: "1".repeat(64) } },
    orient: {
      profile: { columns: ["a", "b"], numericColumns: ["b"], rowCount: 2 },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Premiums rose",
          altInsight: "Both cantons rose.",
          unit: "CHF",
        },
        proposal: {
          options: [
            {
              id: "slope",
              nativeType: "slope",
              engine: "chart-native",
              format: "interactive",
              why: "two points",
            },
          ],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
}

function withArtifact(run: RunManifest): RunManifest {
  const el = run.elements[0]!;
  return {
    ...run,
    elements: [
      {
        ...el,
        artifact: {
          path: "elements/e1/interactive.html",
          sha256: ARTIFACT,
          provenanceHash: provenanceHash(run, el),
          producedAt: "2026-07-26T10:00:00.000Z",
        },
      },
    ],
  };
}

function preview(over: Partial<PreviewRecord> = {}): PreviewRecord {
  return {
    deliverablePath: "elements/e1/interactive.html",
    deliverableSha256: ARTIFACT,
    presentedAs: "opened",
    presentedAt: "2026-07-26T10:05:00.000Z",
    ...over,
  };
}

function reviewRecord(
  run: RunManifest,
  over: Partial<ReviewRecord> = {},
): ReviewRecord {
  return {
    findings: [],
    reviewedProvenanceHash: provenanceHash(run, run.elements[0]!),
    reviewer: {
      mode: "mechanical",
      name: "lib/verify/mechanical",
      version: "1.0.0",
      inputsHash: "a".repeat(64),
      outputHash: "b".repeat(64),
      independentSemanticReview: "unavailable",
    },
    captures: [],
    checks: [],
    tasteRisk: [],
    overrides: [],
    acknowledged: [],
    preview: preview(),
    ...over,
  };
}

function reviewed(over: Partial<ReviewRecord> = {}): RunManifest {
  const run = withArtifact(baseRun());
  return {
    ...run,
    elements: [{ ...run.elements[0]!, review: reviewRecord(run, over) }],
  };
}

describe("the dormant review slot holds a real record", () => {
  it("parses and round-trips a full review record through disk", () => {
    const run = reviewed();
    const dir = mkdtempSync(join(tmpdir(), "verify-manifest-"));
    const p = join(dir, "run.json");
    writeManifest(p, run);
    const back = readManifest(p);
    expect(back.elements[0]!.review).toStrictEqual(run.elements[0]!.review);
    expect(gateStateOf(back, back.elements[0]!)).toBe("reviewed");
  });

  it("still parses a manifest written before the record existed", () => {
    // The shape the slot has held since it was reserved: findings as opaque values plus a
    // provenance hash. A tightened schema that refused it would strand every run on disk.
    const run = withArtifact(baseRun());
    const legacy = {
      ...run,
      elements: [
        {
          ...run.elements[0]!,
          review: {
            findings: ["a free-text concern"],
            reviewedProvenanceHash: provenanceHash(run, run.elements[0]!),
          },
        },
      ],
    };
    const parsed = parseManifest(JSON.parse(JSON.stringify(legacy)));
    expect(parsed.elements[0]!.review!.findings).toHaveLength(1);
    expect(gateStateOf(parsed, parsed.elements[0]!)).toBe("reviewed");
  });
});

describe("approveElement — the only sanctioned writer of `approved`", () => {
  it("refuses, and writes nothing, when no preview was presented", () => {
    const run = reviewed({ preview: undefined });
    const r = approveElement(run, run.elements[0]!, {
      signoffPath: "signoff.sig",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.decision.reasons.map((x) => x.code)).toContain(
      "preview-not-presented",
    );
  });

  it("refuses when a still stood in for the interactive (#3)", () => {
    const run = reviewed({
      preview: preview({ deliverablePath: "elements/e1/review-primary.png" }),
    });
    const r = approveElement(run, run.elements[0]!, {
      signoffPath: "signoff.sig",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.decision.reasons.map((x) => x.code)).toContain(
      "not-the-deliverable",
    );
  });

  it("refuses while a blocking finding is open", () => {
    const run = reviewed({
      findings: [
        makeFinding({
          id: "furniture-below-fold",
          criterion: "furniture",
          summary: "source out of frame",
          evidence: [],
          provenance: "mechanical",
        }),
      ],
    });
    const r = approveElement(run, run.elements[0]!, {
      signoffPath: "signoff.sig",
    });
    expect(r.ok).toBe(false);
  });

  it("writes the approval — bound to the current provenance AND subject — when the gate clears", () => {
    const run = reviewed();
    const el = run.elements[0]!;
    const r = approveElement(run, el, { signoffPath: "signoff.sig" });
    if (!r.ok) throw new Error(JSON.stringify(r.decision.reasons));
    expect(r.element.approved).toStrictEqual({
      signoffPath: "signoff.sig",
      approvedProvenanceHash: provenanceHash(run, el),
      // WHAT was approved, beside WHEN — the artifact's own sha256 for a file. Provenance answers
      // "which run state", not "which artifact", and the two come apart for a hosted delivery
      // (provenanceHash never reads el.capture); deliver.ts re-derives this and compares.
      approvedSubject: approvalSubjectOf(el).sha256,
    });
    expect(approvalSubjectOf(el).sha256).toBe(fileArtifact(el.artifact)!.sha256);
    expect(gateStateOf(run, r.element)).toBe("approved");
  });

  it("refuses an element with no artifact at all", () => {
    const run = baseRun();
    const r = approveElement(run, run.elements[0]!, {
      signoffPath: "signoff.sig",
    });
    expect(r.ok).toBe(false);
  });
});

describe("new invariants — only about shapes that did not exist before", () => {
  function persisted(el: RunElement): RunManifest {
    const run = withArtifact(baseRun());
    return { ...run, elements: [el] };
  }

  it("throws when an override points at a finding that is not in the record", () => {
    const run = reviewed({
      overrides: [
        {
          findingId: "not-a-finding",
          reason: "shipped anyway",
          actorLabel: "yvan",
          at: "2026-07-26T11:00:00.000Z",
          artifactSha256: ARTIFACT,
          provenanceHash: "whatever",
        },
      ],
    });
    expect(() => assertInvariants(run)).toThrow(/override/i);
  });

  it("throws when the preview's bytes contradict the recorded artifact", () => {
    const run = reviewed({
      preview: preview({ deliverableSha256: "9".repeat(64) }),
    });
    expect(() => assertInvariants(run)).toThrow(/preview/i);
  });

  it("throws when an acknowledgement points at a finding that is not there", () => {
    const run = reviewed({ acknowledged: ["ghost-finding"] });
    expect(() => assertInvariants(run)).toThrow(/acknowledg/i);
  });

  it("leaves the pre-existing invariants exactly as they were", () => {
    // An element approved by hand, with no review at all. The refusal to tighten this was
    // first written as "three existing lib/loop tests rely on the shape"; that was an
    // estimate, and it is wrong. MEASURED on 2026-07-27 by adding `approved => review.preview`
    // to assertInvariants and running the whole lib/ suite: 1195 pass, 2 fail. The failures
    // are exactly TWO, and only one of them is a fixture —
    //
    //   1. lib/loop/driver.test.ts:236 ("run dir handoff"), which declares `approved` and then
    //      writeManifest()s it; its own comment says its subject is the run dir travelling
    //      whole, not the approval ceremony;
    //   2. this test, which IS the decision.
    //
    // gate-state.test.ts, deliver.test.ts and acceptance-deliver.test.ts do NOT fail: they
    // never write that manifest. So the invariant costs ONE fixture migration, in a file this
    // slice may not touch — which is still enough to refuse it, because an invariant written
    // against a test one cannot repair is a red suite or a forbidden edit. The preview gate
    // therefore stays where it is: at approveElement, and unconditionally at deliver().
    // Whoever owns lib/loop/driver.test.ts next has the complete list above.
    const el: RunElement = {
      ...withArtifact(baseRun()).elements[0]!,
      approved: { signoffPath: "s.sig", approvedProvenanceHash: "x" },
    };
    expect(() => assertInvariants(persisted(el))).not.toThrow();
  });
});
