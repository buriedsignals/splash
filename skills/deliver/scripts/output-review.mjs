import { createHash, randomUUID } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { rename, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

export const OUTPUT_REVIEW_FILE = "OUTPUT-REVIEW.json";
export const OUTPUT_REVIEW_SCHEMA_VERSION = 1;
export const QA_RUN_SCHEMA_VERSION = 1;
export const FEEDBACK_FILE = "FEEDBACK.md";

const DECISIONS = new Set(["approve", "changes-requested", "reject"]);
const QA_STATUSES = new Set(["passed", "failed"]);
const DRAFT_REF = "renders/";
const SHA256 = /^sha256:[0-9a-f]{64}$/;

function text(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

// WHAT THIS NUMBER ACTUALLY IS, because until round seven nothing said and a clean beat could not
// be reviewed at all.
//
// It reads like a pointer into a production plan. There is no production plan in this toolchain —
// no file, no function and no gate produces the value — and the only documented way to obtain one
// was this skill's own worked example, `const planVersion = 3;` under the comment *read these from
// the current production plan*. The measurement that settles it: all twenty reviews committed under
// `stories/` carry `planVersion: 1`. It is THIS BEAT'S OWN review revision, and its first value is
// 1; `derivedPlanVersion` below reads it back rather than asking for it again.
const PLAN_VERSION_MEANING =
  "this beat's own review revision — not a pointer into a plan kept elsewhere, because there is no such plan in this toolchain. A beat's first review is version 1, and `writeOutputReview` derives it from the review already on disk when a caller names none; it moves only when the PLAN for the beat changes, never because the render did";

function planVersion(value, label = "planVersion") {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer: it is ${PLAN_VERSION_MEANING}`);
  }
  return value;
}

// A FINDING ID NAMES A CLAIM THE QA RUN CHECKED, and the floor of one is real rather than
// bureaucratic: a review binds a decision to a set of claims, and a record binding the EMPTY set
// binds nothing at all. A beat always carries at least one such claim — the takeaway confirmed at
// Gate 1, which is the whole reason the beat exists.
//
// The refusal used to say only "must name at least one finding ID", naming neither what a finding
// ID is nor where one comes from, so a real run invented five to make the record validate.
const FINDING_ID_MEANING =
  "a finding ID names one claim this beat makes that its QA run actually checked. A beat that seems to have none still has one: the takeaway confirmed at Gate 1 and recorded in STORYBOARD.md, which is what the beat exists to show. Name that, and anything else the render was checked against";

function findingIds(value, label = "findingIds") {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must name at least one finding ID — ${FINDING_ID_MEANING}`);
  }
  const ids = value.map((id, index) => text(id, `${label}[${index}]`));
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label} must not contain duplicate finding IDs`);
  }
  return [...ids].sort();
}

function sameIds(left, right) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function timestamp(value, label) {
  text(value, label);
  if (Number.isNaN(Date.parse(value))) throw new Error(`${label} must be an ISO timestamp`);
  return value;
}

function currentOutputId(beatDir) {
  text(beatDir, "beatDir");
  const id = basename(beatDir);
  if (!id || id === "." || id === "..") {
    throw new Error("beatDir must end in a stable output ID");
  }
  return id;
}

function sortedEntries(directory) {
  return readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  );
}

function addFrame(hash, kind, relativePath, bytes = null) {
  const pathBytes = Buffer.from(relativePath, "utf8");
  hash.update(`${kind}:${pathBytes.length}:`);
  hash.update(pathBytes);
  if (bytes !== null) {
    hash.update(`:${bytes.length}:`);
    hash.update(bytes);
  }
  hash.update("\0");
}

/**
 * Digest the exact rendered tree: file names, directory names, and file bytes. The walk is sorted,
 * never follows a symbolic link, and rejects special files so approval cannot silently cover a
 * different tree when delivery reads it later.
 */
export function renderDigest(beatDir) {
  const rendersDir = join(text(beatDir, "beatDir"), "renders");
  let root;
  try {
    root = lstatSync(rendersDir);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`this output has no rendered draft at ${rendersDir}`);
    }
    throw new Error(`the rendered draft could not be inspected at ${rendersDir}`, { cause: error });
  }
  if (root.isSymbolicLink()) {
    throw new Error(`output review refuses a symlinked renders directory: ${rendersDir}`);
  }
  if (!root.isDirectory()) {
    throw new Error(`the rendered draft is not a directory: ${rendersDir}`);
  }

  const hash = createHash("sha256");
  hash.update("splash-render-tree-v1\0");
  let files = 0;

  function walk(directory, prefix) {
    for (const entry of sortedEntries(directory)) {
      const path = join(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        throw new Error(`output review refuses a symbolic link in rendered material: ${path}`);
      }
      if (stat.isDirectory()) {
        addFrame(hash, "directory", relativePath);
        walk(path, relativePath);
      } else if (stat.isFile()) {
        addFrame(hash, "file", relativePath, readFileSync(path));
        files++;
      } else {
        throw new Error(`output review refuses a special file in rendered material: ${path}`);
      }
    }
  }

  walk(rendersDir, "");
  if (files === 0) throw new Error(`the rendered draft contains no files: ${rendersDir}`);
  return `sha256:${hash.digest("hex")}`;
}

/** Bind an approval to the exact editor-feedback request it resolves, when one exists. */
export function feedbackDigest(beatDir) {
  const path = join(text(beatDir, "beatDir"), FEEDBACK_FILE);
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`editor feedback could not be inspected at ${path}`, { cause: error });
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`${FEEDBACK_FILE} must be a regular file in ${beatDir}`);
  }
  return `sha256:${createHash("sha256")
    .update("splash-editor-feedback-v1\0")
    .update(readFileSync(path))
    .digest("hex")}`;
}

function validateQaRun(run, index) {
  const label = `qaRuns[${index}]`;
  if (!run || typeof run !== "object" || Array.isArray(run)) {
    throw new Error(`${label} must be an object`);
  }
  if (run.schemaVersion !== QA_RUN_SCHEMA_VERSION) {
    throw new Error(
      `${label} has unsupported schemaVersion ${JSON.stringify(run.schemaVersion)}; expected ${QA_RUN_SCHEMA_VERSION}`,
    );
  }
  text(run.id, `${label}.id`);
  text(run.outputId, `${label}.outputId`);
  planVersion(run.planVersion, `${label}.planVersion`);
  text(run.draftDigest, `${label}.draftDigest`);
  if (!SHA256.test(run.draftDigest)) {
    throw new Error(`${label}.draftDigest must be a sha256 digest`);
  }
  findingIds(run.findingIds, `${label}.findingIds`);
  if (!QA_STATUSES.has(run.status)) {
    throw new Error(`${label}.status must be "passed" or "failed"`);
  }
  timestamp(run.completedAt, `${label}.completedAt`);
  return run;
}

export function validateOutputReview(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("OutputReview must be a JSON object");
  }
  if (record.schemaVersion !== OUTPUT_REVIEW_SCHEMA_VERSION) {
    throw new Error(
      `OutputReview has unsupported schemaVersion ${JSON.stringify(record.schemaVersion)}; expected ${OUTPUT_REVIEW_SCHEMA_VERSION}`,
    );
  }
  text(record.id, "OutputReview.id");
  text(record.outputId, "OutputReview.outputId");
  planVersion(record.planVersion, "OutputReview.planVersion");
  if (record.draftRef !== DRAFT_REF) {
    throw new Error(`OutputReview.draftRef must be ${JSON.stringify(DRAFT_REF)}`);
  }
  text(record.draftDigest, "OutputReview.draftDigest");
  if (!SHA256.test(record.draftDigest)) {
    throw new Error("OutputReview.draftDigest must be a sha256 digest");
  }
  findingIds(record.findingIds, "OutputReview.findingIds");
  if (!Array.isArray(record.qaRuns) || record.qaRuns.length === 0) {
    throw new Error("OutputReview.qaRuns must contain at least one QA run");
  }
  record.qaRuns.forEach(validateQaRun);
  text(record.angleEvidenceBrief, "OutputReview.angleEvidenceBrief");
  if (!DECISIONS.has(record.decision)) {
    throw new Error(
      'OutputReview.decision must be "approve", "changes-requested", or "reject"',
    );
  }
  if (record.reviewer !== undefined) text(record.reviewer, "OutputReview.reviewer");
  if (record.decidedAt !== undefined) timestamp(record.decidedAt, "OutputReview.decidedAt");
  if (record.notes !== undefined) text(record.notes, "OutputReview.notes");
  if (record.replacesReviewId !== undefined) {
    text(record.replacesReviewId, "OutputReview.replacesReviewId");
  }
  if (record.feedbackDigest !== undefined && !SHA256.test(record.feedbackDigest)) {
    throw new Error("OutputReview.feedbackDigest must be a sha256 digest");
  }
  return record;
}

function approvalAgainstCurrent(record, { beatDir, expectedPlanVersion, expectedFindingIds }) {
  validateOutputReview(record);
  const outputId = currentOutputId(beatDir);
  const currentPlanVersion = planVersion(expectedPlanVersion, "current planVersion");
  const currentFindingIds = findingIds(expectedFindingIds, "current findingIds");

  if (record.outputId !== outputId) {
    throw new Error(
      `OutputReview belongs to output ${JSON.stringify(record.outputId)}, not current output ${JSON.stringify(outputId)}`,
    );
  }
  if (record.planVersion !== currentPlanVersion) {
    throw new Error(
      `OutputReview is stale for plan version ${record.planVersion}; current plan version is ${currentPlanVersion}`,
    );
  }
  const reviewedFindingIds = findingIds(record.findingIds, "OutputReview.findingIds");
  if (!sameIds(reviewedFindingIds, currentFindingIds)) {
    throw new Error("OutputReview finding IDs do not match the current output plan");
  }
  const digest = renderDigest(beatDir);
  if (record.draftDigest !== digest) {
    throw new Error("OutputReview is stale because the rendered draft changed after review");
  }
  const currentFeedbackDigest = feedbackDigest(beatDir);
  if ((record.feedbackDigest ?? null) !== currentFeedbackDigest) {
    throw new Error("OutputReview is stale because it is not bound to the current editor feedback");
  }
  if (record.decision !== "approve") {
    throw new Error(`OutputReview decision is ${JSON.stringify(record.decision)}, not "approve"`);
  }

  const passingQa = record.qaRuns.find((run) => {
    if (run.status !== "passed") return false;
    const runFindingIds = findingIds(run.findingIds, `QA run ${JSON.stringify(run.id)} findingIds`);
    return (
      run.outputId === outputId &&
      run.planVersion === currentPlanVersion &&
      run.draftDigest === digest &&
      sameIds(runFindingIds, currentFindingIds)
    );
  });
  if (!passingQa) {
    throw new Error(
      "OutputReview has no passing QA run bound to the current output, render digest, plan version, and finding IDs",
    );
  }
  return record;
}

export function readOutputReview(beatDir) {
  const path = join(text(beatDir, "beatDir"), OUTPUT_REVIEW_FILE);
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`this output has no bound review: no ${OUTPUT_REVIEW_FILE} in ${beatDir}`);
    }
    throw new Error(`the output review could not be inspected at ${path}`, { cause: error });
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`${OUTPUT_REVIEW_FILE} must be a regular file in ${beatDir}`);
  }
  try {
    return validateOutputReview(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${OUTPUT_REVIEW_FILE} is not valid JSON`, { cause: error });
    }
    throw error;
  }
}

/**
 * THE PLAN BINDING THIS BEAT IS ALREADY UNDER — `{planVersion, findingIds}`, read off its own
 * `OUTPUT-REVIEW.json`.
 *
 * `offerForms` and `materialise` both require those two values, and until round six the only
 * documented way to obtain them was this skill's own worked example: `const planVersion = 3;` under
 * the comment *read these from the current production plan*. There is no production plan in this
 * toolchain — no file, no function and no gate produces either value — so a caller either invented
 * a pair, which binds nothing, or went looking for the record that already holds it. That is the
 * same shape as the round-four half of this defect, where a required record had no documented
 * producer at all; this is its other half, where a required ARGUMENT has no documented source.
 *
 * The first review is written by whoever ran production, who chooses the plan version and names the
 * findings that beat answers. Every consumer after that reads them back from here, and gets exactly
 * the pair `requireApprovedOutput` will accept — which is the point: a caller that guesses is a
 * caller whose delivery is refused for a reason it cannot see.
 *
 * It re-reads and re-validates the file on every call, so each caller gets its own object and a
 * record that has changed on disk since the last call is the record answered with.
 */
export function currentPlanBinding(beatDir) {
  const record = readOutputReview(beatDir);
  return { planVersion: record.planVersion, findingIds: record.findingIds };
}

/** Fail closed unless the record and one passing QA run match the exact current output. */
export function requireApprovedOutput({ beatDir, planVersion: version, findingIds: ids }) {
  return approvalAgainstCurrent(readOutputReview(beatDir), {
    beatDir,
    expectedPlanVersion: version,
    expectedFindingIds: ids,
  });
}

/**
 * The plan version this beat is already under, or 1 when nothing has reviewed it yet.
 *
 * A re-render is a new DRAFT, not a new plan — `draftDigest` is what moves when the picture is
 * corrected — so a second review of the same beat stays on the same version unless its caller says
 * otherwise. A review on disk that cannot be read is not silently replaced by 1: an unreadable
 * record is a fact to report, not a default to fall back on.
 */
function derivedPlanVersion(beatDir) {
  const path = join(text(beatDir, "beatDir"), OUTPUT_REVIEW_FILE);
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error?.code === "ENOENT") return 1;
    throw new Error(`the output review could not be inspected at ${path}`, { cause: error });
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`${OUTPUT_REVIEW_FILE} must be a regular file in ${beatDir}`);
  }
  let previous;
  try {
    previous = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${OUTPUT_REVIEW_FILE} is not valid JSON`, { cause: error });
  }
  return planVersion(previous?.planVersion, `the plan version recorded in ${OUTPUT_REVIEW_FILE}`);
}

/** Atomically serialize a review. This records QA supplied by its caller; it never runs QA itself. */
export async function writeOutputReview({
  beatDir,
  id,
  planVersion: statedVersion,
  findingIds: ids,
  qaRuns,
  angleEvidenceBrief,
  decision,
  reviewer,
  decidedAt,
  notes,
  replacesReviewId,
}) {
  const currentFeedbackDigest = feedbackDigest(beatDir);
  const outputId = currentOutputId(beatDir);
  const draftDigest = renderDigest(beatDir);
  // DERIVED WHEN NOT STATED — see `PLAN_VERSION_MEANING`. A caller who really is moving the beat to
  // a new plan states the number and keeps it.
  const version = statedVersion === undefined ? derivedPlanVersion(beatDir) : statedVersion;
  // A QA RUN IS COMPLETED FROM THE RECORD IT BELONGS TO, not repeated by its caller.
  //
  // This function computes the draft digest, reads the output id, and is handed the plan version
  // and the finding IDs — and it then required all five of those back, by hand, inside every QA
  // run. The first call of a round-six run failed on a missing QA draft digest and the caller had
  // to discover that `renderDigest` must be imported separately to satisfy a function that had
  // just called it. Five values repeated by hand is five chances to hand back a value that binds
  // nothing, on the record whose entire job is to bind.
  //
  // A caller that states one of them DIFFERENTLY keeps its own value: a QA run really taken against
  // another draft, or another plan version, is a fact, and `approvalAgainstCurrent` refuses the
  // approval over it one line below. This fills silence; it never overwrites an answer.
  const completedQaRuns = Array.isArray(qaRuns)
    ? qaRuns.map((run) =>
        !run || typeof run !== "object" || Array.isArray(run)
          ? run
          : {
              schemaVersion: QA_RUN_SCHEMA_VERSION,
              outputId,
              planVersion: version,
              draftDigest,
              findingIds: ids,
              ...run,
            },
      )
    : qaRuns;
  const record = {
    schemaVersion: OUTPUT_REVIEW_SCHEMA_VERSION,
    id,
    outputId,
    planVersion: version,
    draftRef: DRAFT_REF,
    draftDigest,
    findingIds: ids,
    qaRuns: completedQaRuns,
    angleEvidenceBrief,
    decision,
    ...(reviewer === undefined ? {} : { reviewer }),
    ...(decidedAt === undefined ? {} : { decidedAt }),
    ...(notes === undefined ? {} : { notes }),
    ...(replacesReviewId === undefined ? {} : { replacesReviewId }),
    ...(currentFeedbackDigest === null ? {} : { feedbackDigest: currentFeedbackDigest }),
  };
  validateOutputReview(record);
  if (decision === "approve") {
    approvalAgainstCurrent(record, {
      beatDir,
      expectedPlanVersion: version,
      expectedFindingIds: ids,
    });
  }

  const path = join(beatDir, OUTPUT_REVIEW_FILE);
  const temporary = join(beatDir, `.${OUTPUT_REVIEW_FILE}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
  return record;
}
