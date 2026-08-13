import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  OUTPUT_REVIEW_FILE,
  QA_RUN_SCHEMA_VERSION,
  readOutputReview,
  renderDigest,
  requireApprovedOutput,
  writeOutputReview,
} from "../scripts/output-review.mjs";
import {
  approveCurrentOutput,
  TEST_COMPLETED_AT,
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "./output-review-fixture";

let root: string;
let beatDir: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "output-review-"));
  beatDir = join(root, "story", "beats", "1-rainfall");
  await mkdir(join(beatDir, "renders"), { recursive: true });
  await writeFile(join(beatDir, "renders", "still.svg"), "<svg/>");
  await approveCurrentOutput(beatDir);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function rewrite(mutator: (record: any) => void) {
  const path = join(beatDir, OUTPUT_REVIEW_FILE);
  const record = JSON.parse(await readFile(path, "utf8"));
  mutator(record);
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`);
}

describe("OutputReview v1", () => {
  it("accepts an approval and passing QA bound to the current output", () => {
    expect(
      requireApprovedOutput({
        beatDir,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).toMatchObject({
      schemaVersion: 1,
      outputId: "1-rainfall",
      planVersion: TEST_PLAN_VERSION,
      decision: "approve",
    });
  });

  it("does not treat the legacy approval marker as a bound review", async () => {
    await rm(join(beatDir, OUTPUT_REVIEW_FILE));
    await writeFile(join(beatDir, "APPROVED.md"), "seen, approved");
    expect(() =>
      requireApprovedOutput({
        beatDir,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).toThrow(/no OUTPUT-REVIEW\.json/);
  });

  it("invalidates approval when any rendered byte changes", async () => {
    await writeFile(join(beatDir, "renders", "still.svg"), "<svg>changed</svg>");
    expect(() =>
      requireApprovedOutput({
        beatDir,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).toThrow(/rendered draft changed/);
  });

  it("binds a replacement approval to the exact editor-feedback request", async () => {
    await writeFile(join(beatDir, "FEEDBACK.md"), "Move the annotation above the line.");
    expect(() =>
      requireApprovedOutput({
        beatDir,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).toThrow(/current editor feedback/);

    const review = await approveCurrentOutput(beatDir, { reviewId: "review-feedback" });
    expect(review.feedbackDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(() =>
      requireApprovedOutput({
        beatDir,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).not.toThrow();

    await writeFile(join(beatDir, "FEEDBACK.md"), "Move it below the line instead.");
    expect(() =>
      requireApprovedOutput({
        beatDir,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).toThrow(/current editor feedback/);
  });

  it("invalidates approval for a different plan version or finding set", () => {
    expect(() =>
      requireApprovedOutput({
        beatDir,
        planVersion: TEST_PLAN_VERSION + 1,
        findingIds: TEST_FINDING_IDS,
      }),
    ).toThrow(/plan version/);
    expect(() =>
      requireApprovedOutput({
        beatDir,
        planVersion: TEST_PLAN_VERSION,
        findingIds: ["finding-other"],
      }),
    ).toThrow(/finding IDs/);
  });

  it("rejects a review copied from another output", async () => {
    await rewrite((record) => {
      record.outputId = "2-temperature";
    });
    expect(() =>
      requireApprovedOutput({
        beatDir,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).toThrow(/not current output/);
  });

  it("requires a passing QA run with the same complete binding", async () => {
    await rewrite((record) => {
      record.qaRuns[0].status = "failed";
    });
    expect(() =>
      requireApprovedOutput({
        beatDir,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).toThrow(/no passing QA run/);

    await approveCurrentOutput(beatDir);
    await rewrite((record) => {
      record.qaRuns[0].findingIds = ["finding-other"];
    });
    expect(() =>
      requireApprovedOutput({
        beatDir,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).toThrow(/no passing QA run/);
  });

  it("rejects non-approval decisions and unknown schemas", async () => {
    await rewrite((record) => {
      record.decision = "changes-requested";
    });
    expect(() =>
      requireApprovedOutput({
        beatDir,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).toThrow(/not "approve"/);

    await rewrite((record) => {
      record.schemaVersion = 2;
    });
    expect(() => readOutputReview(beatDir)).toThrow(/unsupported schemaVersion/);
  });

  it("digests nested paths and refuses rendered symlinks", async () => {
    const before = renderDigest(beatDir);
    await mkdir(join(beatDir, "renders", "nested"));
    await writeFile(join(beatDir, "renders", "nested", "label.txt"), "label");
    expect(renderDigest(beatDir)).not.toBe(before);

    const outside = join(root, "outside.txt");
    await writeFile(outside, "private");
    await symlink(outside, join(beatDir, "renders", "linked.txt"));
    expect(() => renderDigest(beatDir)).toThrow(/symbolic link/);
  });

  it("does not write an approval whose QA receipt is stale", async () => {
    const previous = await readFile(join(beatDir, OUTPUT_REVIEW_FILE), "utf8");
    await expect(
      writeOutputReview({
        beatDir,
        id: "review-stale-qa",
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
        qaRuns: [
          {
            schemaVersion: QA_RUN_SCHEMA_VERSION,
            id: "qa-stale",
            outputId: "1-rainfall",
            planVersion: TEST_PLAN_VERSION,
            draftDigest: `sha256:${"0".repeat(64)}`,
            findingIds: TEST_FINDING_IDS,
            status: "passed",
            completedAt: TEST_COMPLETED_AT,
          },
        ],
        angleEvidenceBrief: "This QA receipt belongs to an earlier render.",
        decision: "approve",
        reviewer: "fixture-editor",
        decidedAt: TEST_COMPLETED_AT,
      }),
    ).rejects.toThrow(/no passing QA run/);
    expect(await readFile(join(beatDir, OUTPUT_REVIEW_FILE), "utf8")).toBe(previous);
  });
});
