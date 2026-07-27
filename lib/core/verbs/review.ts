// The `review` verb — the contract's thin face over lib/verify/review.ts.
//
// It carries NO adapter over the wire, and that is deliberate rather than a limitation: a
// reviewer adapter is a function, a payload is JSON (I6), and a verb that accepted "the
// name of a reviewer to load" would be an arbitrary-code seam pointed at unpublished
// reporting. A host that wants an independent critique registers it in-process, through
// lib/verify/review.ts's typed adapter, where the redaction boundary is applied before
// anything leaves.
import { isChannel, isVisualFormat } from "../vocabulary";
import { runReview, type ReviewRequest } from "../../verify/review";
import type { ReviewRecord } from "../../verify/types";
import { fail, ok, type VerbResult } from "./types";

// The wire-shaped request: the in-process ReviewRequest minus its adapter.
export type ReviewVerbPayload = Omit<ReviewRequest, "adapter">;

export function isReviewPayload(p: unknown): p is ReviewVerbPayload {
  if (typeof p !== "object" || p === null) return false;
  const r = p as Record<string, unknown>;
  if (
    typeof r.reviewedProvenanceHash !== "string" ||
    typeof r.acceptedDestinationId !== "string" ||
    !Array.isArray(r.checks)
  )
    return false;
  const s = r.source as Record<string, unknown> | null | undefined;
  if (typeof s !== "object" || s === null) return false;
  return (
    isVisualFormat(s.format) &&
    isChannel(s.channel) &&
    typeof s.confirmedTakeaway === "string" &&
    typeof s.unit === "string" &&
    typeof s.altText === "string" &&
    typeof s.sourceName === "string" &&
    Array.isArray(s.evidenceExtracts) &&
    Array.isArray(s.captures) &&
    Array.isArray(s.interactionResults) &&
    Array.isArray(s.rubric)
  );
}

export const REVIEW_PAYLOAD_MESSAGE =
  "review: payload must carry source{format, channel, confirmedTakeaway, unit, altText, " +
  "sourceName, evidenceExtracts[], captures[], interactionResults[], rubric[]}, checks[], " +
  "reviewedProvenanceHash and acceptedDestinationId";

export async function review(
  p: ReviewVerbPayload,
): Promise<VerbResult<ReviewRecord>> {
  try {
    return ok(await runReview(p));
  } catch (e) {
    return fail("engine-failed", (e as Error)?.message ?? String(e));
  }
}

export type { ReviewRecord };
