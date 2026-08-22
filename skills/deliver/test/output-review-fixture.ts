import { basename } from "node:path";
import { writeOutputReview } from "../scripts/output-review.mjs";

export const TEST_PLAN_VERSION = 1;
export const TEST_FINDING_IDS = ["finding-test-1"];
export const TEST_COMPLETED_AT = "2026-08-10T12:00:00.000Z";

export async function approveCurrentOutput(
  beatDir: string,
  {
    planVersion = TEST_PLAN_VERSION,
    findingIds = TEST_FINDING_IDS,
    reviewId = `review-${basename(beatDir)}-1`,
  }: { planVersion?: number; findingIds?: string[]; reviewId?: string } = {},
) {
  // The QA run says only what is ITS OWN: which run this was, whether it passed, and when. The
  // output id, the plan version, the draft digest and the finding IDs are the review's, and
  // `writeOutputReview` completes them from the record it is writing. This fixture used to repeat
  // all four and import `renderDigest` to do it — the shape round six's beat V hit on its first
  // call, failing on a missing QA draft digest that the function had already computed.
  return writeOutputReview({
    beatDir,
    id: reviewId,
    planVersion,
    findingIds,
    qaRuns: [
      {
        id: `qa-${basename(beatDir)}-1`,
        status: "passed",
        completedAt: TEST_COMPLETED_AT,
      },
    ],
    angleEvidenceBrief: "The output visualises the finding named by this fixture.",
    decision: "approve",
    reviewer: "fixture-editor",
    decidedAt: TEST_COMPLETED_AT,
  });
}
