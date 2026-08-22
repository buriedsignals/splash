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
  currentPlanBinding,
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

  // ROUND SIX, beat V: `writeOutputReview` computes the draft digest for the record it writes and
  // then required the caller to hand the IDENTICAL value back inside every QA run — along with the
  // plan version, the finding IDs, the output id and the schema version it also already holds. The
  // first call of that run failed on a missing QA draft digest, and the caller had to discover that
  // `renderDigest` must be imported separately to satisfy a function that had just called it. Five
  // values repeated by hand is five chances to hand back a value that binds nothing.
  it("completes a QA run from the record it is already writing", async () => {
    const record = await writeOutputReview({
      beatDir,
      id: "review-terse-qa",
      planVersion: TEST_PLAN_VERSION,
      findingIds: TEST_FINDING_IDS,
      qaRuns: [{ id: "qa-terse", status: "passed", completedAt: TEST_COMPLETED_AT }],
      angleEvidenceBrief: "The QA run says nothing the review does not already say.",
      decision: "approve",
      reviewer: "fixture-editor",
      decidedAt: TEST_COMPLETED_AT,
    });
    expect(record.qaRuns[0]).toEqual({
      schemaVersion: QA_RUN_SCHEMA_VERSION,
      id: "qa-terse",
      outputId: record.outputId,
      planVersion: record.planVersion,
      draftDigest: record.draftDigest,
      findingIds: record.findingIds,
      status: "passed",
      completedAt: TEST_COMPLETED_AT,
    });
  });

  // ROUND SIX: `offerForms` and `materialise` both require a `planVersion` and `findingIds`, and
  // the only documented way to obtain them was this skill's own worked example -- `const
  // planVersion = 3;` under the comment "read these from the current production plan". There is no
  // production plan in this toolchain: no file, no function and no gate produces either value. A
  // caller either invents a pair, and binds nothing, or reads it off the record that already holds
  // it. This is the one path that exists, named.
  it("hands a delivery caller the binding the beat's own review already holds", async () => {
    const binding = currentPlanBinding(beatDir);
    const record = readOutputReview(beatDir);
    expect(binding).toEqual({
      planVersion: record.planVersion,
      findingIds: record.findingIds,
    });
    // And it is the pair `requireApprovedOutput` accepts, which is the whole reason to read it.
    expect(() => requireApprovedOutput({ beatDir, ...binding })).not.toThrow();
    // And it re-reads the file rather than answering from a cache: a review rewritten between two
    // deliveries answers with what is on disk now. (Asserted rather than assumed — a memoised
    // reader here would hand a redelivery the previous plan's binding and refuse it for a reason
    // the caller could not see.)
    await approveCurrentOutput(beatDir, {
      planVersion: TEST_PLAN_VERSION + 1,
      findingIds: ["finding-second-plan"],
      reviewId: "review-second-plan",
    });
    expect(currentPlanBinding(beatDir)).toEqual({
      planVersion: TEST_PLAN_VERSION + 1,
      findingIds: ["finding-second-plan"],
    });
  });

  it("refuses to invent a binding for a beat that has no review", async () => {
    await rm(join(beatDir, OUTPUT_REVIEW_FILE));
    expect(() => currentPlanBinding(beatDir)).toThrow(/no bound review/);
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

  // `planVersion` HAD NO SOURCE, AND A CLEAN BEAT COULD NOT BE REVIEWED — round-seven finding 3.
  //
  // Measured: `writeOutputReview` refuses anything but a positive integer, and there is no
  // production plan in this toolchain — no file, no function and no gate produces the number. The
  // only documented way to obtain it was this skill's own worked example, `const planVersion = 3;`
  // under the comment *read these from the current production plan*. Every one of the twenty
  // reviews committed in `stories/` carries `planVersion: 1`, which is the measurement that says
  // what the field actually is: not a pointer into a plan that exists elsewhere, but THIS BEAT'S
  // OWN review revision, whose first value is 1.
  //
  // So it is derived, not demanded. A caller that states one keeps it.
  describe("the plan version a review is written under", () => {
    async function review(extra: Record<string, unknown> = {}) {
      return writeOutputReview({
        beatDir,
        id: `review-${Math.random().toString(36).slice(2)}`,
        findingIds: TEST_FINDING_IDS,
        qaRuns: [{ id: "qa-1", status: "passed", completedAt: TEST_COMPLETED_AT }],
        angleEvidenceBrief: "The output visualises the finding named here.",
        decision: "approve",
        ...extra,
      });
    }

    it("should be 1 for a beat's first review, without the caller naming one", async () => {
      await rm(join(beatDir, OUTPUT_REVIEW_FILE));
      expect(await review()).toMatchObject({ planVersion: 1 });
    });

    it("should stay what the beat is already under when a later review names none", async () => {
      await review({ planVersion: 4 });
      // A re-render is a new DRAFT, not a new plan: the version the beat is under does not move
      // because the picture was corrected.
      await writeFile(join(beatDir, "renders", "still.svg"), "<svg><!-- corrected --></svg>");
      expect(await review()).toMatchObject({ planVersion: 4 });
    });

    it("should keep a version the caller states", async () => {
      expect(await review({ planVersion: 7 })).toMatchObject({ planVersion: 7 });
    });

    it("should refuse a version that is not one, and say where the value comes from", async () => {
      await expect(review({ planVersion: "1" })).rejects.toThrow(
        /planVersion.*this beat's own review revision/s,
      );
    });

    it("should refuse to derive one from a review it cannot read", async () => {
      await writeFile(join(beatDir, OUTPUT_REVIEW_FILE), "{ not json");
      await expect(review()).rejects.toThrow(/not valid JSON/);
    });

    // A value read back off disk is checked exactly as one handed in is. Inheriting whatever a
    // previous record happened to hold would carry a bad version forward under the name of a
    // derivation, which is worse than asking for it.
    it("should refuse to inherit a version that is not one", async () => {
      await rewrite((record) => {
        record.planVersion = "1";
      });
      await expect(review()).rejects.toThrow(
        /plan version recorded in OUTPUT-REVIEW\.json must be a positive integer/,
      );
    });
  });

  // THE OTHER HALF OF THE SAME FINDING. `findingIds must name at least one finding ID` was refused
  // on a beat whose reviewer had nothing they would have called a finding, and the refusal named
  // neither what a finding ID is nor where one comes from — so five were invented to make the
  // record validate. The floor of one is right and stays: a beat always carries at least one claim,
  // the confirmed takeaway, and a record binding an empty set binds nothing. What changes is that
  // the refusal says so.
  it("should say what a finding ID is when a review names none", async () => {
    await rm(join(beatDir, OUTPUT_REVIEW_FILE));
    await expect(
      writeOutputReview({
        beatDir,
        id: "review-no-findings",
        planVersion: 1,
        findingIds: [],
        qaRuns: [{ id: "qa-1", status: "passed", completedAt: TEST_COMPLETED_AT }],
        angleEvidenceBrief: "Nothing was named.",
        decision: "approve",
      }),
    ).rejects.toThrow(/takeaway/);
  });
});
