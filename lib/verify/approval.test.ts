import { describe, it, expect } from "bun:test";
import { approvalDecision, type ApprovalContext } from "./approval";
import { makeFinding } from "./severity";
import type {
  Finding,
  Override,
  PreviewRecord,
  ReviewRecord,
  TasteRiskSignal,
} from "./types";

const ARTIFACT = "d".repeat(64);
const PROVENANCE = "prov-1";

function preview(over: Partial<PreviewRecord> = {}): PreviewRecord {
  return {
    deliverablePath: "/run/elements/e1/interactive.html",
    deliverableSha256: ARTIFACT,
    presentedAs: "opened",
    presentedAt: "2026-07-26T10:00:00.000Z",
    ...over,
  };
}

function review(over: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    findings: [],
    reviewedProvenanceHash: PROVENANCE,
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

function context(over: Partial<ApprovalContext> = {}): ApprovalContext {
  return {
    format: "interactive",
    artifactSha256: ARTIFACT,
    provenanceHash: PROVENANCE,
    ...over,
  };
}

const blocker = (id = "furniture-below-fold"): Finding =>
  makeFinding({
    id,
    criterion: "furniture",
    summary: "the source footer is out of frame",
    evidence: ["y 554→581 against 560"],
    provenance: "mechanical",
  });

const warner = (): Finding =>
  makeFinding({
    id: "unit-missing",
    criterion: "craft",
    summary: "no unit stated",
    evidence: [],
    provenance: "mechanical",
  });

function override(over: Partial<Override> = {}): Override {
  return {
    findingId: "furniture-below-fold",
    reason: "the CMS crops the footer and repeats the source in the caption",
    actorLabel: "yvan",
    at: "2026-07-26T11:00:00.000Z",
    artifactSha256: ARTIFACT,
    provenanceHash: PROVENANCE,
    ...over,
  };
}

describe("approvalDecision — the preview gate (#3)", () => {
  it("REFUSES when no preview was presented, even with a spotless review", () => {
    const d = approvalDecision(review({ preview: undefined }), context());
    expect(d.approvable).toBe(false);
    expect(d.reasons.map((r) => r.code)).toContain("preview-not-presented");
  });

  it("refuses a preview of the previous artifact", () => {
    const d = approvalDecision(
      review({ preview: preview({ deliverableSha256: "f".repeat(64) }) }),
      context(),
    );
    expect(d.reasons.map((r) => r.code)).toContain("stale-preview");
  });

  it("refuses a still standing in for the interactive", () => {
    const d = approvalDecision(
      review({
        preview: preview({ deliverablePath: "/run/review-primary.png" }),
      }),
      context(),
    );
    expect(d.reasons.map((r) => r.code)).toContain("not-the-deliverable");
  });

  it("approves a clean review whose deliverable was actually shown", () => {
    const d = approvalDecision(review(), context());
    expect(d.approvable).toBe(true);
    expect(d.reasons).toStrictEqual([]);
  });
});

describe("approvalDecision — the review must be about THIS artifact", () => {
  it("refuses a review frozen at an older provenance", () => {
    const d = approvalDecision(
      review({ reviewedProvenanceHash: "prov-0" }),
      context(),
    );
    expect(d.approvable).toBe(false);
    expect(d.reasons.map((r) => r.code)).toContain("review-stale");
  });
});

describe("approvalDecision — severity does different things (#11)", () => {
  it("refuses while a blocking finding is open, naming the ids", () => {
    const d = approvalDecision(review({ findings: [blocker()] }), context());
    expect(d.approvable).toBe(false);
    const r = d.reasons.find((x) => x.code === "blocking-findings-open")!;
    expect(r.findingIds).toStrictEqual(["furniture-below-fold"]);
  });

  it("refuses while a warning is neither acknowledged nor overridden", () => {
    const d = approvalDecision(review({ findings: [warner()] }), context());
    expect(d.approvable).toBe(false);
    expect(d.reasons.map((x) => x.code)).toContain("warnings-unacknowledged");
  });

  it("lets an ACKNOWLEDGED warning through — no override ceremony for a warning", () => {
    const d = approvalDecision(
      review({ findings: [warner()], acknowledged: ["unit-missing"] }),
      context(),
    );
    expect(d.approvable).toBe(true);
  });

  it("never interrupts approval for an informational finding", () => {
    const info = makeFinding({
      id: "value-label-abbreviation",
      criterion: "craft",
      summary: "large numbers are not abbreviated",
      evidence: [],
      provenance: "mechanical",
    });
    expect(
      approvalDecision(review({ findings: [info] }), context()).approvable,
    ).toBe(true);
  });

  it("ignores a finding that is already resolved", () => {
    const resolved = { ...blocker(), status: "resolved" as const };
    expect(
      approvalDecision(review({ findings: [resolved] }), context()).approvable,
    ).toBe(true);
  });
});

describe("approvalDecision — overrides are bound to the bytes (#11)", () => {
  it("lets a blocking finding through with a valid override", () => {
    const d = approvalDecision(
      review({ findings: [blocker()], overrides: [override()] }),
      context(),
    );
    expect(d.approvable).toBe(true);
    expect(d.overridden).toStrictEqual(["furniture-below-fold"]);
  });

  it("DROPS that same override once the artifact is re-produced", () => {
    // The exact requirement of #11: "Re-production invalidates overrides tied to the prior
    // artifact." Nobody has to remember to revoke it — the hash moved.
    const d = approvalDecision(
      review({ findings: [blocker()], overrides: [override()] }),
      context({ artifactSha256: "9".repeat(64) }),
    );
    expect(d.approvable).toBe(false);
    expect(d.reasons.map((r) => r.code)).toContain("blocking-findings-open");
    expect(d.staleOverrides).toStrictEqual(["furniture-below-fold"]);
  });

  it("drops an override whose provenance no longer matches, even at the same bytes", () => {
    const d = approvalDecision(
      review({ findings: [blocker()], overrides: [override()] }),
      context({ provenanceHash: "prov-2", artifactSha256: ARTIFACT }),
    );
    // The review itself is stale at that provenance too — both refusals are reported,
    // because hiding one behind the other is how a gate becomes unreadable.
    expect(d.approvable).toBe(false);
    expect(d.staleOverrides).toStrictEqual(["furniture-below-fold"]);
  });

  it("refuses an override with no reason — a record with nothing recorded", () => {
    const d = approvalDecision(
      review({
        findings: [blocker()],
        overrides: [override({ reason: "  " })],
      }),
      context(),
    );
    expect(d.approvable).toBe(false);
  });

  it("refuses an override with no actor — nobody can be said to have decided", () => {
    const d = approvalDecision(
      review({
        findings: [blocker()],
        overrides: [override({ actorLabel: "" })],
      }),
      context(),
    );
    expect(d.approvable).toBe(false);
  });

  it("ignores an override pointing at a finding that is not there", () => {
    const d = approvalDecision(
      review({
        findings: [blocker()],
        overrides: [override({ findingId: "some-other-finding" })],
      }),
      context(),
    );
    expect(d.approvable).toBe(false);
  });
});

describe("approvalDecision — the human lane is presented, not enforced", () => {
  it("carries the taste risks into the decision without blocking on them", () => {
    const risk: TasteRiskSignal = {
      dimension: "palette-adjacency",
      detector: "weighted RGB separation < 90",
      evidence: ["#1b7f79 and #1d8a80 are 25 apart"],
      routedTo: "human-signoff",
    };
    const d = approvalDecision(review({ tasteRisk: [risk] }), context());
    expect(d.approvable).toBe(true);
    expect(d.needsHumanEye).toStrictEqual([risk]);
  });

  it("says plainly that no independent semantic review ran", () => {
    const d = approvalDecision(review(), context());
    expect(d.independentSemanticReview).toBe("unavailable");
  });
});

describe("approvalDecision — the decision is a record (I6)", () => {
  it("reports every reason at once and round-trips through JSON", () => {
    const d = approvalDecision(
      review({
        findings: [blocker(), warner()],
        preview: undefined,
        reviewedProvenanceHash: "prov-0",
      }),
      context(),
    );
    expect(d.reasons.map((r) => r.code).sort()).toStrictEqual([
      "blocking-findings-open",
      "preview-not-presented",
      "review-stale",
      "warnings-unacknowledged",
    ]);
    expect(JSON.parse(JSON.stringify(d))).toStrictEqual(d);
  });

  it("refuses when there is no review at all", () => {
    const d = approvalDecision(undefined, context());
    expect(d.approvable).toBe(false);
    expect(d.reasons.map((r) => r.code)).toContain("not-reviewed");
  });
});
