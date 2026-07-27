// Whether this artifact may be approved — the gate issues #3 and #11 both land on.
//
// Pure on purpose. It takes a review record and the facts about the artifact in front of
// the journalist, and answers with EVERY reason it refuses, all at once: a gate that
// reports one blocker at a time teaches people to re-run it rather than to read it.
//
// It decides nothing about who may override what — that is newsroom policy. It decides
// whether the ceremony each severity requires has actually happened, and it binds every
// clearance to the exact bytes it was given for.
import type { VisualFormat } from "../core/vocabulary";
import { previewCoversDeliverable } from "./preview";
import type { Finding, Override, ReviewRecord, TasteRiskSignal } from "./types";

export type ApprovalContext = {
  format: VisualFormat;
  artifactSha256: string;
  provenanceHash: string;
};

export type ApprovalReasonCode =
  | "not-reviewed"
  | "review-stale"
  | "preview-not-presented"
  | "stale-preview"
  | "not-the-deliverable"
  | "fallback-unexplained"
  | "blocking-findings-open"
  | "warnings-unacknowledged";

export type ApprovalReason = {
  code: ApprovalReasonCode;
  detail: string;
  findingIds?: string[];
};

export type ApprovalDecision = {
  approvable: boolean;
  reasons: ApprovalReason[];
  /** Blocking findings a valid override cleared, so the record shows what was shipped past. */
  overridden: string[];
  /** Overrides that no longer apply because the artifact moved under them. */
  staleOverrides: string[];
  /** Presented at approval, never blocking — the lane routed to the human editor. */
  needsHumanEye: TasteRiskSignal[];
  independentSemanticReview: ReviewRecord["reviewer"]["independentSemanticReview"];
};

// An override only counts when it is COMPLETE and still about this artifact. "Complete"
// means a reason and an actor: #11 asks for "an explicit journalist action that records
// finding ID, reason, timestamp, actor label, and the exact artifact hash" — an override
// with an empty reason is a record with nothing recorded in it.
function overrideApplies(
  o: Override,
  finding: Finding,
  ctx: ApprovalContext,
): boolean {
  return (
    o.findingId === finding.id &&
    o.reason.trim().length > 0 &&
    o.actorLabel.trim().length > 0 &&
    o.at.trim().length > 0 &&
    o.artifactSha256 === ctx.artifactSha256 &&
    o.provenanceHash === ctx.provenanceHash
  );
}

export function approvalDecision(
  review: ReviewRecord | undefined,
  ctx: ApprovalContext,
): ApprovalDecision {
  if (!review)
    return {
      approvable: false,
      reasons: [
        {
          code: "not-reviewed",
          detail:
            "no review record for this artifact — approval cannot follow a review that never ran",
        },
      ],
      overridden: [],
      staleOverrides: [],
      needsHumanEye: [],
      independentSemanticReview: "unavailable",
    };

  const reasons: ApprovalReason[] = [];

  // A review of an earlier provenance is not a review of this artifact. The manifest
  // already refuses to call such an element "reviewed"; this refuses to let it be approved.
  if (review.reviewedProvenanceHash !== ctx.provenanceHash)
    reasons.push({
      code: "review-stale",
      detail: `the review covers provenance ${review.reviewedProvenanceHash}, the element is now at ${ctx.provenanceHash}`,
    });

  const previewVerdict = previewCoversDeliverable(
    ctx.format,
    review.preview,
    ctx.artifactSha256,
  );
  if (!previewVerdict.ok)
    reasons.push({
      code: previewVerdict.reason,
      detail: previewVerdict.detail,
    });

  const open = review.findings.filter((f) => f.status === "open");

  const overridden: string[] = [];
  const staleOverrides: string[] = [];
  const blocking: string[] = [];
  for (const f of open.filter((f) => f.severity === "blocking")) {
    if (review.overrides.some((o) => overrideApplies(o, f, ctx)))
      overridden.push(f.id);
    else {
      blocking.push(f.id);
      // An override that names this finding but no longer matches the artifact is worth
      // reporting separately: "you cleared this once, and then re-produced" is a different
      // situation from "nobody has ever looked at this".
      if (review.overrides.some((o) => o.findingId === f.id))
        staleOverrides.push(f.id);
    }
  }
  if (blocking.length)
    reasons.push({
      code: "blocking-findings-open",
      detail: `${blocking.length} blocking finding(s) still open`,
      findingIds: blocking,
    });

  // Warnings ask for visible acknowledgement, not the override ceremony (#11). An override
  // also clears one — a journalist who wrote a reason has done strictly more than
  // acknowledge.
  const unacknowledged = open
    .filter((f) => f.severity === "warning")
    .filter(
      (f) =>
        !review.acknowledged.includes(f.id) &&
        !review.overrides.some((o) => overrideApplies(o, f, ctx)),
    )
    .map((f) => f.id);
  if (unacknowledged.length)
    reasons.push({
      code: "warnings-unacknowledged",
      detail: `${unacknowledged.length} warning(s) have not been acknowledged`,
      findingIds: unacknowledged,
    });

  return {
    approvable: reasons.length === 0,
    reasons,
    overridden,
    staleOverrides,
    // Never a reason: blocking on a RISK would make it noise people learn to click past,
    // and would make an autonomous run impossible. It is carried so the approval prompt
    // can show it and the human sign-off can act on it.
    needsHumanEye: review.tasteRisk,
    independentSemanticReview: review.reviewer.independentSemanticReview,
  };
}
