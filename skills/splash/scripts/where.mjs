// The state of a story is its directory. Nothing is remembered between sessions.

import { createHash } from "node:crypto";
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";
import {
  classifyProductionReservation,
  describeProductionOperation,
  isProductionReceiptApplicable,
  processIsAlive,
  PRODUCTION_ATTEMPTS_FILE,
  readProductionAttempts,
} from "./production-reservation.mjs";
import { readReviewAttempts, reviewDisclosure } from "./review-attempts.mjs";
import {
  checkStoryboard,
  openGate,
  parseStoryboard,
  REQUIRED_SCALARS,
  REQUIRED_SLOT_FIELDS,
  SURVEY_GAP,
} from "./gate-contract.mjs";

export { REQUIRED_SCALARS, REQUIRED_SLOT_FIELDS };

const CRAFT_SKILLS = Object.freeze({
  chart: Object.freeze({
    static: "chart-beat",
    web: "chart-web",
    video: "chart-video",
    scrolly: "scrolly",
  }),
  map: Object.freeze({
    static: "map-beat",
    web: "map-web",
    video: "map-beat",
    scrolly: "scrolly",
  }),
  image: Object.freeze({
    static: "image-beat",
    scrolly: "scrolly",
  }),
});

function createOwner(kind, id) {
  return Object.freeze({ kind, id });
}

const OWNER_REGISTRY = Object.freeze([
  Object.freeze({ phase: "intake", owner: createOwner("skill", "intake") }),
  Object.freeze({ phase: "framing", owner: createOwner("persona", "editor") }),
  Object.freeze({ phase: "storyboard", owner: createOwner("skill", "storyboard") }),
  Object.freeze({ phase: "production", step: "analysis", owner: createOwner("skill", "analyst") }),
  Object.freeze({ phase: "production", step: "review", owner: createOwner("persona", "designer") }),
  Object.freeze({ phase: "delivery", owner: createOwner("skill", "deliver") }),
  Object.freeze({ phase: "done", owner: null }),
]);

function isCraftProductionStep(state) {
  return state.phase === "production" && state.step === "craft";
}

function craftOwner(slot) {
  const id =
    slot?.medium === "chart" && slot.producer === "datawrapper"
      ? "dw-beat"
      : CRAFT_SKILLS[slot?.medium]?.[slot?.format];
  return id ? createOwner("skill", id) : null;
}

function unsupportedCraftDiagnostic(slot) {
  return `no Splash craft owner for ${JSON.stringify(slot?.medium)}/${JSON.stringify(slot?.format)}`;
}

function selectOwner(state) {
  if (state.status === "blocked") return null;
  if (isCraftProductionStep(state)) return craftOwner(state.slot);
  const entry = OWNER_REGISTRY.find(
    (candidate) =>
      candidate.phase === state.phase &&
      (!candidate.step || candidate.step === state.step),
  );
  if (!entry) {
    throw new Error(
      `no Splash owner registered for ${JSON.stringify(state.phase)}/${JSON.stringify(state.step ?? null)}`,
    );
  }
  return entry.owner
    ? createOwner(entry.owner.kind, entry.owner.id)
    : null;
}

function resumeDetail(state, owner, status) {
  const details = [];
  if (state.resume) details.push(state.resume);
  if (state.gate) {
    const slot = state.slotId ? ` for slot ${state.slotId}` : "";
    details.push(`Stop at ${state.gate}${slot}; the journalist must provide ${state.awaiting}.`);
  }
  if (state.revision?.reason === "editor-feedback") {
    details.push(`Revise editor feedback for beats ${state.revision.beats.join(", ")}.`);
  }
  if (state.legacy) details.push("Resume from the migrated legacy publication-format field.");
  if (details.length > 0) return details.join(" ");
  if (status === "done") return "Story is complete; stop.";
  if (!owner) return "Stop and return control to the journalist.";
  const missing = state.missing.length > 0
    ? ` Missing: ${state.missing.join("; ")}.`
    : "";
  return `Invoke ${owner.id} for the ${state.phase} phase.${missing}`;
}

function projectResolverResult(state) {
  let status = state.status ?? (state.phase === "done" ? "done" : "ready");
  const missing = Array.isArray(state.missing) ? [...state.missing] : [];
  const normalized = { ...state, missing };
  const owner = selectOwner(normalized);
  if (!owner && status !== "blocked" && isCraftProductionStep(state)) {
    status = "blocked";
    missing.push(unsupportedCraftDiagnostic(state.slot));
  }
  return Object.freeze({
    phase: state.phase,
    status,
    owner,
    missing: Object.freeze(missing),
    attempts: state.attempts ?? 0,
    resume: resumeDetail(normalized, owner, status),
  });
}

function managedProductionOperation(slot) {
  if (slot?.medium === "map") return "map-bake";
  if (slot?.medium === "chart") return "datawrapper-produce";
  return null;
}

async function list(path) {
  try { return await readdir(path); } catch { return []; }
}

async function read(path) {
  try { return await readFile(path, "utf8"); } catch { return null; }
}

// GATE 2 IS READ FROM ONE CONTRACT. `./gate-contract.mjs` is storyboard's own file, carried here
// verbatim (`splash/test/carried-copies.test.ts` holds the two byte for byte), so this reader and
// `checkStoryboard` cannot disagree about what the storyboard must carry or the words a gap is
// refused in — they are the same function.
async function surveyGap(storyDir) {
  const recorded = await read(join(storyDir, "SUBJECTS.md"));
  return recorded === null ? SURVEY_GAP : null;
}

async function regularFileStat(path) {
  try {
    const found = await lstat(path);
    if (found.isSymbolicLink() || !found.isFile()) {
      throw new Error(`story state must be a regular file: ${path}`);
    }
    return found;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function json(path) {
  const text = await read(path);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`story state is not valid JSON: ${path}`, { cause: error });
  }
}


const SHA256 = /^sha256:[0-9a-f]{64}$/;
const OUTPUT_REVIEW_SCHEMA_VERSION = 1;
const QA_RUN_SCHEMA_VERSION = 1;
const DELIVERY_MANIFEST_SCHEMA_VERSION = 1;

function isBeneath(root, candidate) {
  const path = relative(root, candidate);
  return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

async function containedStoryDirectory(storyRoot, storyDir, segments, label, optional = false) {
  let path = storyDir;
  for (const segment of segments) {
    path = join(path, segment);
    let stat;
    try {
      stat = await lstat(path);
    } catch (error) {
      if (optional && error?.code === "ENOENT") return null;
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`${label} has a symbolic-link ancestor: ${path}`);
    if (!stat.isDirectory()) throw new Error(`${label} must be a real directory: ${path}`);
  }
  if (!isBeneath(storyRoot, await realpath(path))) {
    throw new Error(`${label} resolves outside the story: ${path}`);
  }
  return path;
}

async function currentBeats(storyRoot, storyDir, slots) {
  const beatsRoot = await containedStoryDirectory(
    storyRoot,
    storyDir,
    ["beats"],
    "beat directory",
    true,
  );
  const names = beatsRoot ? await list(beatsRoot) : [];
  const beats = [];
  for (const [index, slot] of slots.entries()) {
    const id = String(slot.id ?? index + 1);
    const matches = names.filter(
      (candidate) => candidate === id || candidate.startsWith(`${id}-`),
    );
    if (matches.length > 1) {
      throw new Error(`multiple beat directories match storyboard slot ${id}`);
    }
    const name = matches[0] ?? null;
    const path = name
      ? await containedStoryDirectory(storyRoot, storyDir, ["beats", name], `beat ${name}`)
      : null;
    beats.push({ id, medium: slot.medium, name, path, slot });
  }
  return { beats, names };
}

async function unrenderedBeats(beats) {
  const unrendered = [];
  for (const beat of beats) {
    if (!beat.path) {
      unrendered.push(beat.id);
      continue;
    }
    const rendersPath = join(beat.path, "renders");
    let stat;
    try {
      stat = await lstat(rendersPath);
    } catch (error) {
      if (error?.code === "ENOENT") {
        unrendered.push(beat.name);
        continue;
      }
      throw error;
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`the rendered draft must be a real directory: ${rendersPath}`);
    }
    if ((await readdir(rendersPath)).length === 0) unrendered.push(beat.name);
  }
  return unrendered;
}

// The analyst pre-step of production. A chosen chart or map slot has no chart-ready data until
// `analyst` has written `beats/<id>/data.json` beside the beat — the file artifact every craft
// skill reads instead of the frozen CSV. Image slots carry no data contract, so they never
// appear here. Beat directories are `<id>-<slug>` (`new-story`/craft convention), so the lookup
// accepts the bare id or the prefixed form, exactly the way a human scans `beats/`.
//
// This sits ABOVE `beatsAwaitingApproval` in `whereIs`, which changes nothing about that gate's
// primacy: the approval rule stays the first thing consulted once anything has rendered, and
// nothing about `export/` may shorten the walk past it (see that comment). The analyst check can
// only fire while a beat has nothing produced yet — the moment `data.json` exists the question
// closes and the walk proceeds exactly as before.
const ANALYST_MEDIUMS = new Set(["chart", "map"]);

async function analystState(storyDir, beats) {
  const waiting = [];
  const stale = [];
  for (const beat of beats) {
    if (!ANALYST_MEDIUMS.has(beat.medium)) continue;
    if (!beat.path || !(await regularFileStat(join(beat.path, "data.json")))) {
      waiting.push(beat.name ?? beat.id);
      continue;
    }
    let hashes = null;
    try {
      const record = JSON.parse(await readFile(join(beat.path, "data.json"), "utf8"));
      if (record?.meta?.hashes && typeof record.meta.hashes === "object" && !Array.isArray(record.meta.hashes)) {
        hashes = record.meta.hashes;
      }
    } catch {
      hashes = null;
    }
    if (!hashes) {
      stale.push(beat.name);
      continue;
    }
    for (const [key, relativePath] of ANALYST_HASH_INPUTS) {
      const current = await fileDigest(join(storyDir, relativePath));
      if (!SHA256.test(hashes[key] ?? "") || current === null || hashes[key] !== current) {
        stale.push(beat.name);
        break;
      }
    }
  }
  return { waiting, stale };
}

const ANALYST_HASH_INPUTS = [
  ["storyboard", "STORYBOARD.md"],
  ["profile", "source/profile.json"],
  ["sourceData", "source/data.csv"],
];

async function fileDigest(path) {
  try {
    return `sha256:${createHash("sha256").update(await readFile(path)).digest("hex")}`;
  } catch {
    return null;
  }
}


// S6: the inverse walk of `beatsAwaitingData`, which goes slots→dirs. A directory under
// `beats/` that no longer matches any slot id in STORYBOARD.md is an orphan — its slot was
// removed from the storyboard while the beat directory stayed behind. It is reported, not
// silently walked past, because a producer dispatched by directory listing would otherwise
// render work the storyboard no longer asks for.
function orphanedBeats(names, slots) {
  const ids = slots.map((slot, index) => String(slot.id ?? index + 1));
  return names.filter(
    (beat) => !ids.some((id) => beat === id || beat.startsWith(`${id}-`)),
  );
}

function nonEmptyText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function stringSet(value) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => !nonEmptyText(item))) return null;
  const sorted = [...value].sort();
  return new Set(sorted).size === sorted.length ? sorted : null;
}

function sameStrings(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
// BRIEF.md's own front matter — a different file from STORYBOARD.md, read with a deliberately
// narrow scalar reader: `planVersion` and `findingIds` must each appear exactly once.
function extractFrontmatter(content) {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("---", 3);
  if (end === -1) return null;
  return content.substring(3, end);
}

function scalarText(raw) {
  const value = raw.trim();
  if (!value || value === '""' || value === "''" || value === "null" || value === "~") return null;
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return value.replace(/^["']|["']$/g, "");
}

function exactScalarFieldValue(frontmatter, field) {
  if (!frontmatter) return null;
  const matches = [
    ...frontmatter.matchAll(new RegExp(`^${field}:[ \\t]*([^\\n]*)$`, "gm")),
  ];
  return matches.length === 1 ? scalarText(matches[0][1]) : null;
}

async function currentBriefBinding(beatDir) {
  const path = join(beatDir, "BRIEF.md");
  if (!(await regularFileStat(path))) return null;
  const frontmatter = extractFrontmatter(await readFile(path, "utf8"));
  const planVersionValue = exactScalarFieldValue(frontmatter, "planVersion");
  const findingIds = stringSet(exactScalarFieldValue(frontmatter, "findingIds"));
  if (
    typeof planVersionValue !== "string" ||
    !/^[1-9][0-9]*$/.test(planVersionValue) ||
    !Number.isSafeInteger(Number(planVersionValue)) ||
    !findingIds
  ) {
    return null;
  }
  return { planVersion: Number(planVersionValue), findingIds };
}

function addDigestFrame(hash, kind, relativePath, bytes = null) {
  const pathBytes = Buffer.from(relativePath, "utf8");
  hash.update(`${kind}:${pathBytes.length}:`);
  hash.update(pathBytes);
  if (bytes !== null) {
    hash.update(`:${bytes.length}:`);
    hash.update(bytes);
  }
  hash.update("\0");
}

// Independent reader for deliver's OutputReview render binding. Skills remain installable alone,
// so this mirrors the persisted contract instead of importing a sibling skill at runtime.
async function currentRenderDigest(beatDir) {
  const rendersDir = join(beatDir, "renders");
  const root = await lstat(rendersDir);
  if (root.isSymbolicLink() || !root.isDirectory()) {
    throw new Error(`the rendered draft must be a real directory: ${rendersDir}`);
  }
  const hash = createHash("sha256");
  hash.update("splash-render-tree-v1\0");
  let files = 0;

  async function walk(directory, prefix) {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    );
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) throw new Error(`rendered material must not contain a symbolic link: ${path}`);
      if (stat.isDirectory()) {
        addDigestFrame(hash, "directory", relativePath);
        await walk(path, relativePath);
      } else if (stat.isFile()) {
        addDigestFrame(hash, "file", relativePath, await readFile(path));
        files++;
      } else {
        throw new Error(`rendered material must not contain a special file: ${path}`);
      }
    }
  }

  await walk(rendersDir, "");
  if (files === 0) throw new Error(`the rendered draft contains no files: ${rendersDir}`);
  return `sha256:${hash.digest("hex")}`;
}

async function currentFeedbackDigest(beatDir) {
  const path = join(beatDir, "FEEDBACK.md");
  const stat = await regularFileStat(path);
  if (!stat) return null;
  return `sha256:${createHash("sha256")
    .update("splash-editor-feedback-v1\0")
    .update(await readFile(path))
    .digest("hex")}`;
}

function validateRevisionReview(review, beat, path) {
  if (!review || typeof review !== "object" || Array.isArray(review)) throw new Error(`OutputReview must be an object: ${path}`);
  if (review.schemaVersion !== OUTPUT_REVIEW_SCHEMA_VERSION) throw new Error(`OutputReview has unsupported schemaVersion at ${path}`);
  if (!nonEmptyText(review.id)) throw new Error(`OutputReview.id is invalid at ${path}`);
  if (review.outputId !== beat) throw new Error(`OutputReview belongs to a different output at ${path}`);
  if (!positiveInteger(review.planVersion)) throw new Error(`OutputReview.planVersion is invalid at ${path}`);
  if (review.draftRef !== "renders/" || !SHA256.test(review.draftDigest ?? "")) throw new Error(`OutputReview draft binding is invalid at ${path}`);
  const findingIds = stringSet(review.findingIds);
  if (!findingIds) throw new Error(`OutputReview.findingIds are invalid at ${path}`);
  if (!Array.isArray(review.qaRuns) || review.qaRuns.length === 0) throw new Error(`OutputReview.qaRuns are invalid at ${path}`);
  if (!nonEmptyText(review.angleEvidenceBrief)) throw new Error(`OutputReview.angleEvidenceBrief is invalid at ${path}`);
  if (!["approve", "changes-requested", "reject"].includes(review.decision)) throw new Error(`OutputReview.decision is invalid at ${path}`);
  if (review.feedbackDigest !== undefined && !SHA256.test(review.feedbackDigest)) throw new Error(`OutputReview.feedbackDigest is invalid at ${path}`);

  let passingBoundQa = false;
  for (const run of review.qaRuns) {
    if (!run || typeof run !== "object" || Array.isArray(run) || run.schemaVersion !== QA_RUN_SCHEMA_VERSION) {
      throw new Error(`OutputReview has an invalid QA run at ${path}`);
    }
    const runIds = stringSet(run.findingIds);
    if (
      !nonEmptyText(run.id) || run.outputId !== beat || !positiveInteger(run.planVersion) ||
      !SHA256.test(run.draftDigest ?? "") || !runIds || !["passed", "failed"].includes(run.status) ||
      !nonEmptyText(run.completedAt) || Number.isNaN(Date.parse(run.completedAt))
    ) {
      throw new Error(`OutputReview has an invalid QA run at ${path}`);
    }
    if (
      run.status === "passed" && run.planVersion === review.planVersion &&
      run.draftDigest === review.draftDigest && sameStrings(runIds, findingIds)
    ) passingBoundQa = true;
  }
  return { findingIds, passingBoundQa };
}

function manifestArtifacts(value, path) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`delivery manifest artifacts are invalid at ${path}`);
  }
  const artifacts = [];
  const paths = new Set();
  for (const artifact of value) {
    const relativePath = artifact?.path;
    if (
      !nonEmptyText(relativePath) ||
      relativePath.includes("\\") ||
      relativePath.startsWith("/") ||
      relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..") ||
      !SHA256.test(artifact?.digest ?? "") ||
      paths.has(relativePath)
    ) {
      throw new Error(`delivery manifest artifact binding is invalid at ${path}`);
    }
    paths.add(relativePath);
    artifacts.push({ path: relativePath, digest: artifact.digest });
  }
  return artifacts;
}

function validateRevisionManifest(manifest, beat, path) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error(`delivery manifest must be an object: ${path}`);
  if (manifest.schemaVersion !== DELIVERY_MANIFEST_SCHEMA_VERSION || manifest.state !== "complete") {
    throw new Error(`delivery manifest has an unsupported contract at ${path}`);
  }
  if (manifest.outputId !== beat) throw new Error(`delivery manifest belongs to a different output at ${path}`);
  if (!nonEmptyText(manifest.operationId) || /[\\/\0]/.test(manifest.operationId) || manifest.operationId === "." || manifest.operationId === "..") {
    throw new Error(`delivery manifest operationId is invalid at ${path}`);
  }
  if (!nonEmptyText(manifest.reviewId) || !positiveInteger(manifest.planVersion) || !SHA256.test(manifest.draftDigest ?? "")) {
    throw new Error(`delivery manifest review binding is invalid at ${path}`);
  }
  const findingIds = stringSet(manifest.findingIds);
  if (!findingIds) throw new Error(`delivery manifest findingIds are invalid at ${path}`);
  if (manifest.feedbackDigest !== undefined && !SHA256.test(manifest.feedbackDigest)) {
    throw new Error(`delivery manifest feedbackDigest is invalid at ${path}`);
  }
  return { artifacts: manifestArtifacts(manifest.artifacts, path), findingIds };
}

async function currentExportArtifacts(exportDir) {
  const artifacts = [];

  async function walk(directory, prefix) {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    );
    for (const entry of entries) {
      if (!prefix && entry.name === ".delivery-manifest.json") continue;
      const path = join(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) {
        throw new Error(`delivery export must not contain a symbolic link: ${path}`);
      }
      if (stat.isDirectory()) {
        await walk(path, relativePath);
      } else if (stat.isFile()) {
        artifacts.push({ path: relativePath, digest: await fileDigest(path) });
      } else {
        throw new Error(`delivery export must not contain a special file: ${path}`);
      }
    }
  }

  await walk(exportDir, "");
  return artifacts;
}

function artifactsAreCurrent(current, recorded) {
  const left = [...current].sort((first, second) => first.path.localeCompare(second.path));
  const right = [...recorded].sort((first, second) => first.path.localeCompare(second.path));
  return (
    right.some((artifact) => artifact.path === "HANDOVER.md") &&
    left.length === right.length &&
    left.every(
      (artifact, index) =>
        artifact.path === right[index].path && artifact.digest === right[index].digest,
    )
  );
}

// Every current storyboard beat follows the same review and delivery walk. FEEDBACK.md only adds
// the revision label and digest; it never selects a stronger validation path.
async function completionState(storyRoot, storyDir, beats) {
  const production = [];
  const delivery = [];
  const feedbackProduction = [];
  const feedbackDelivery = [];
  for (const currentBeat of beats) {
    const beat = currentBeat.name;
    const beatDir = currentBeat.path;
    const feedbackDigest = await currentFeedbackDigest(beatDir);
    const reviewPath = join(beatDir, "OUTPUT-REVIEW.json");
    const reviewStat = await regularFileStat(reviewPath);
    if (!reviewStat) {
      production.push(beat);
      if (feedbackDigest) feedbackProduction.push(beat);
      continue;
    }
    const review = await json(reviewPath);
    const reviewBinding = validateRevisionReview(review, beat, reviewPath);
    const briefBinding = await currentBriefBinding(beatDir);
    const renderDigest = await currentRenderDigest(beatDir);
    if (
      !briefBinding ||
      review.planVersion !== briefBinding.planVersion ||
      !sameStrings(reviewBinding.findingIds, briefBinding.findingIds) ||
      review.decision !== "approve" ||
      review.draftDigest !== renderDigest ||
      (review.feedbackDigest ?? null) !== feedbackDigest ||
      !reviewBinding.passingBoundQa
    ) {
      production.push(beat);
      if (feedbackDigest) feedbackProduction.push(beat);
      continue;
    }

    const exportDir = await containedStoryDirectory(
      storyRoot,
      storyDir,
      ["export", beat],
      `export ${beat}`,
      true,
    );
    if (!exportDir) {
      delivery.push(beat);
      if (feedbackDigest) feedbackDelivery.push(beat);
      continue;
    }
    const currentArtifacts = await currentExportArtifacts(exportDir);
    const manifestPath = join(exportDir, ".delivery-manifest.json");
    const manifestStat = await regularFileStat(manifestPath);
    const handoverStat = await regularFileStat(join(exportDir, "HANDOVER.md"));
    if (!manifestStat || !handoverStat) {
      delivery.push(beat);
      if (feedbackDigest) feedbackDelivery.push(beat);
      continue;
    }
    const manifest = await json(manifestPath);
    const manifestBinding = validateRevisionManifest(manifest, beat, manifestPath);
    if (
      manifest.reviewId !== review.id ||
      manifest.planVersion !== review.planVersion ||
      manifest.draftDigest !== review.draftDigest ||
      (manifest.feedbackDigest ?? null) !== feedbackDigest ||
      !sameStrings(manifestBinding.findingIds, reviewBinding.findingIds) ||
      !artifactsAreCurrent(currentArtifacts, manifestBinding.artifacts)
    ) {
      delivery.push(beat);
      if (feedbackDigest) feedbackDelivery.push(beat);
    }
  }
  return { production, delivery, feedbackProduction, feedbackDelivery };
}

async function productionReservationState(beats) {
  let retryable = null;
  for (const currentBeat of [...beats].sort((left, right) =>
    left.id.localeCompare(right.id)
  )) {
    if (!currentBeat.path) continue;
    const receiptPath = join(currentBeat.path, PRODUCTION_ATTEMPTS_FILE);
    const receipt = await readProductionAttempts(receiptPath, currentBeat.name);
    if (!receipt) continue;
    const classification = classifyProductionReservation(
      receipt,
      receipt.status === "reserved" && processIsAlive(receipt.pid),
    );
    const operation = managedProductionOperation(currentBeat.slot);
    const currentOperation = operation
      ? describeProductionOperation(operation, currentBeat.name)
      : null;
    const inputDigest = currentOperation
      ? await fileDigest(join(currentBeat.path, currentOperation.inputPath))
      : null;
    if (
      classification.state !== "live" &&
      !isProductionReceiptApplicable(receipt, currentOperation, inputDigest)
    ) {
      continue;
    }

    const state = {
      phase: "production",
      status: classification.status,
      step: "craft",
      slot: currentBeat.slot,
      attempts: classification.attempts,
      resume: classification.resume,
      missing: [],
    };
    if (
      classification.state === "live" ||
      classification.state === "exhausted"
    ) {
      return state;
    }
    retryable ??= state;
  }
  return retryable;
}

async function resolveStoryState(storyDir) {
  const source = await list(join(storyDir, "source"));
  // S5 parity: `intake` freezes THREE artifacts (article.md, data.csv, profile.json — see that
  // skill's own SKILL.md), so the gate refuses to leave `intake` until all three exist. Two of
  // three used to pass, which let a story reach production whose craft work would read a CSV
  // that was never frozen.
  const FROZEN = ["article.md", "data.csv", "profile.json"];
  const unfrozen = FROZEN.filter((f) => !source.includes(f));
  if (unfrozen.length > 0)
    return { phase: "intake", missing: unfrozen.map((f) => `source/${f}`) };

  const storyboard = await read(join(storyDir, "STORYBOARD.md"));
  // Frozen source with no storyboard is still G1: name the journalist decision, not the
  // file. `missing: ["STORYBOARD.md"]` sent models to write a storyboard instead of asking
  // for a takeaway. Unterminated frontmatter stays a file diagnosis below.
  if (storyboard === null) {
    return {
      phase: "framing",
      gate: "G1",
      awaiting: "a confirmed takeaway",
      missing: ["a confirmed takeaway"],
    };
  }

  // S4: a file that opens a `---` block and never closes it is ONE diagnosable fact. Reporting
  // every scalar as missing instead would send a resumed session back through nine gates to fix
  // one truncated write.
  if (storyboard.startsWith("---") && storyboard.indexOf("---", 3) === -1) {
    return { phase: "storyboard", missing: ["STORYBOARD.md frontmatter unterminated"] };
  }
  const { meta, legacy } = parseStoryboard(storyboard);
  const slots = meta.slots ?? [];
  const legacyState = legacy ? { legacy: true } : {};
  const gaps = checkStoryboard(meta);
  if (gaps.length > 0) {
    return {
      phase: "storyboard",
      ...openGate(meta),
      ...legacyState,
      missing: gaps,
    };
  }

  // The storyboard's front matter is complete — and Gate 2 is still not closed, because it closes
  // into TWO files. The survey belongs to movement 10, where the angles the journalist dropped are
  // still in the room; asked for any later they have to be remembered, which is the failure the
  // file exists to prevent. Reported before production so the refusal lands where the answer is.
  const subjects = await surveyGap(storyDir);
  if (subjects !== null) {
    return {
      phase: "storyboard",
      gate: "G2-subjects",
      awaiting: "subjects",
      ...legacyState,
      missing: [subjects],
    };
  }

  const storyRoot = await realpath(storyDir);
  const current = await currentBeats(storyRoot, storyDir, slots);
  const exportRoot = await containedStoryDirectory(
    storyRoot,
    storyDir,
    ["export"],
    "export directory",
    true,
  );

  // Analyst/source drift is earlier than review or delivery, so it always reopens production even
  // when the story once reached done.
  const analyst = await analystState(storyDir, current.beats);
  const dataMissing = analyst.waiting.map((id) => `beat ${id}: run analyst (data.json)`);
  const staleMissing = analyst.stale.map(
    (beat) => `beat ${beat}: analyst data stale — rebuild`,
  );
  const orphanMissing = orphanedBeats(current.names, slots).map(
    (beat) => `beat ${beat}: orphaned — slot removed from storyboard`,
  );
  const analystMissing = [...dataMissing, ...staleMissing, ...orphanMissing];
  if (analystMissing.length > 0) {
    return {
      phase: "production",
      step: "analysis",
      ...legacyState,
      missing: analystMissing,
    };
  }

  const reservation = await productionReservationState(current.beats);
  if (reservation?.status === "blocked") {
    return { ...reservation, ...legacyState };
  }

  const unrendered = await unrenderedBeats(current.beats);
  if (unrendered.length > 0) {
    const exported = exportRoot ? await list(exportRoot) : [];
    const renderedCount = current.beats.length - unrendered.length;
    const missing = renderedCount === 0
      ? (exported.length > 0 ? ["no renders exist in any beat"] : [])
      : unrendered.map((beat) => `beat ${beat}: no current render`);
    const nextBeat = current.beats.find(
      (beat) => unrendered.includes(beat.name ?? beat.id),
    );
    return {
      phase: "production",
      step: "craft",
      slot: nextBeat?.slot,
      ...legacyState,
      ...reservation,
      missing,
    };
  }

  const completion = await completionState(storyRoot, storyDir, current.beats);
  if (completion.production.length > 0) {
    const feedback = new Set(completion.feedbackProduction);
    const missing = completion.production
      .filter((beat) => !feedback.has(beat))
      .map((beat) => `beat ${beat}: rendered but not currently approved`);
    const revision = completion.feedbackProduction.length > 0
      ? {
          reason: "editor-feedback",
          beats: completion.feedbackProduction,
        }
      : null;
    const nextBeat = current.beats.find((beat) =>
      (revision?.beats ?? completion.production).includes(beat.name)
    );
    // AN INDEPENDENT REVIEW THAT CANNOT BE OBTAINED DOES NOT STALL THE STORY — issue #46. State
    // here is derived from the filesystem, and nothing on the filesystem changes when a persona
    // dies to an HTTP 529, so this branch used to re-issue the same instruction that had just
    // failed twice, indefinitely. `REVIEW-ATTEMPTS.json` is what makes "could not run" visible in
    // the directory, distinct from "not yet run", and once it is exhausted the beat goes to the
    // journalist WITH the reason rather than going round again.
    if (!revision && nextBeat) {
      const disclosure = reviewDisclosure(await readReviewAttempts(nextBeat.path));
      if (disclosure) {
        return {
          phase: "production",
          step: "review",
          status: "blocked",
          slot: nextBeat.slot,
          ...legacyState,
          missing: [...missing, disclosure],
        };
      }
    }
    return {
      phase: "production",
      step: revision ? "craft" : "review",
      slot: nextBeat?.slot,
      ...legacyState,
      ...(revision ? { revision } : {}),
      missing,
    };
  }
  if (completion.delivery.length > 0) {
    return {
      phase: "delivery",
      ...legacyState,
      ...(completion.feedbackDelivery.length > 0
        ? {
            revision: {
              reason: "editor-feedback",
              beats: completion.feedbackDelivery,
            },
          }
        : {}),
      missing: [],
    };
  }

  return { phase: "done", ...legacyState, missing: [] };
}

export async function whereIs(storyDir) {
  return projectResolverResult(await resolveStoryState(storyDir));
}
