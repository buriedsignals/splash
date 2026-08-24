import { basename, join } from "node:path";
import { writeFile } from "node:fs/promises";
import {
  QA_RUN_SCHEMA_VERSION,
  renderDigest,
  writeOutputReview,
} from "../scripts/output-review.mjs";

export const TEST_PLAN_VERSION = 1;
export const TEST_FINDING_IDS = ["finding-test-1"];
export const TEST_COMPLETED_AT = "2026-08-10T12:00:00.000Z";

export interface BoundReviewFixture {
  id: string;
  planVersion: number;
  draftDigest: string;
  findingIds: string[];
  feedbackDigest?: string | null;
}

export async function approveCurrentOutput(
  beatDir: string,
  {
    planVersion = TEST_PLAN_VERSION,
    findingIds = TEST_FINDING_IDS,
    reviewId = `review-${basename(beatDir)}-1`,
  }: { planVersion?: number; findingIds?: string[]; reviewId?: string } = {},
): Promise<BoundReviewFixture> {
  const outputId = basename(beatDir);
  const draftDigest = renderDigest(beatDir);
  await writeFile(
    join(beatDir, "BRIEF.md"),
    `---
planVersion: ${planVersion}
findingIds: [${findingIds.join(", ")}]
---

# Current beat plan
`,
  );
  return writeOutputReview({
    beatDir,
    id: reviewId,
    planVersion,
    findingIds,
    qaRuns: [
      {
        schemaVersion: QA_RUN_SCHEMA_VERSION,
        id: `qa-${outputId}-1`,
        outputId,
        planVersion,
        draftDigest,
        findingIds,
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
