import {
  closeSync,
  lstatSync,
  openSync,
  opendirSync,
  readSync,
  realpathSync,
} from "node:fs";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { CEILING_BYTES, weightAgainstCeiling } from "./verify-guards.mjs";

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ROOT = resolve(SKILL_ROOT, "..", "..");
const TEXT_ARTIFACTS = new Set([".html", ".svg"]);
const LOCAL_PROOF_ARTIFACTS = new Set([".html", ".svg", ".png"]);
const INLINE_ASSET = /data:image|data:font|;base64,/;
const DEFAULT_LIMITS = {
  maxRoots: 4096,
  maxEntries: 100000,
  maxArtifacts: 4096,
  maxDepth: 64,
  maxMarkerBytes: 4 * 1024 * 1024,
};

function tightened(value, ceiling) {
  return Number.isSafeInteger(value) && value >= 0
    ? Math.min(value, ceiling)
    : ceiling;
}

function workLimits(options) {
  const requested = options.limits ?? {};
  return Object.fromEntries(
    Object.entries(DEFAULT_LIMITS).map(([name, ceiling]) => [
      name,
      tightened(requested[name], ceiling),
    ]),
  );
}

function isContained(root, path) {
  const offset = relative(root, path);
  return (
    offset === "" ||
    (offset !== ".." && !offset.startsWith(`..${sep}`) && !isAbsolute(offset))
  );
}

function addProblem(state, problem) {
  if (!state.problems.includes(problem)) state.problems.push(problem);
}

function inspectPath(path, project, state, label, optional = false) {
  const info = lstatSync(path, { throwIfNoEntry: false });
  if (!info) {
    if (!optional) addProblem(state, `${path}: missing ${label}`);
    return null;
  }
  if (info.isSymbolicLink()) {
    addProblem(state, `${path}: symlinked ${label} is not allowed`);
    return null;
  }
  const real = realpathSync(path);
  if (!isContained(project, real)) {
    addProblem(state, `${path}: ${label} must stay inside the project`);
    return null;
  }
  return { path: resolve(path), info };
}

function readEntries(path, state) {
  if (state.entryLimitReached) return [];
  const directory = opendirSync(path);
  const entries = [];
  try {
    for (let entry = directory.readSync(); entry; entry = directory.readSync()) {
      state.entries += 1;
      if (state.entries > state.limits.maxEntries) {
        addProblem(state, "delivered-artifact traversal entry limit exceeded");
        state.entryLimitReached = true;
        break;
      }
      entries.push(entry);
    }
  } finally {
    directory.closeSync();
  }
  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

function addRoot(path, project, state, roots) {
  const inspected = inspectPath(path, project, state, "artifact root", true);
  if (!inspected) return;
  if (!inspected.info.isDirectory()) {
    addProblem(state, `${path}: artifact root is not a directory`);
    return;
  }
  state.roots += 1;
  if (state.roots > state.limits.maxRoots) {
    addProblem(state, "delivered-artifact root limit exceeded");
    return;
  }
  roots.push(inspected.path);
}

function configuredRoots(base, project, localProof, state) {
  const roots = [];
  addRoot(join(base, "proof"), project, state, roots);
  addRoot(localProof, project, state, roots);
  const stories = inspectPath(
    join(base, "stories"),
    project,
    state,
    "stories root",
    true,
  );
  if (!stories) return roots.sort();
  if (!stories.info.isDirectory()) {
    addProblem(state, `${stories.path}: stories root is not a directory`);
    return roots.sort();
  }
  for (const entry of readEntries(stories.path, state)) {
    const story = inspectPath(
      join(stories.path, entry.name),
      project,
      state,
      "story candidate",
    );
    if (!story || !story.info.isDirectory()) continue;
    addRoot(join(story.path, "beats"), project, state, roots);
    addRoot(join(story.path, "export"), project, state, roots);
  }
  return [...new Set(roots)].sort();
}

function containsInlineMarker(path, size, state) {
  const length = Math.min(size, state.limits.maxMarkerBytes);
  if (length === 0) return false;
  const bytes = Buffer.allocUnsafe(length);
  const descriptor = openSync(path, "r");
  let read = 0;
  try {
    while (read < length) {
      const count = readSync(descriptor, bytes, read, length - read, read);
      if (count === 0) break;
      read += count;
    }
  } finally {
    closeSync(descriptor);
  }
  return INLINE_ASSET.test(bytes.toString("utf8", 0, read));
}

function scanArtifacts(root, options = {}) {
  const base = resolve(root);
  const project = realpathSync(base);
  const projectInfo = lstatSync(project);
  if (!projectInfo.isDirectory())
    throw new Error(`${root}: project root is not a directory`);
  const state = {
    limits: workLimits(options),
    problems: [],
    entries: 0,
    roots: 0,
    entryLimitReached: false,
    artifactLimitReached: false,
  };
  const ceiling = tightened(options.ceilingBytes, CEILING_BYTES);
  const localProof = join(
    base,
    relative(DEFAULT_ROOT, SKILL_ROOT),
    "output-proof",
  );
  const roots = configuredRoots(base, project, localProof, state);
  const queue = roots.map((path) => ({
    path,
    depth: 0,
    local: path === localProof,
  }));
  const artifacts = [];

  for (let index = 0; index < queue.length && !state.entryLimitReached; index += 1) {
    const directory = queue[index];
    for (const entry of readEntries(directory.path, state)) {
      const candidate = inspectPath(
        join(directory.path, entry.name),
        project,
        state,
        "artifact candidate",
      );
      if (!candidate) continue;
      if (candidate.info.isDirectory()) {
        const depth = directory.depth + 1;
        if (depth > state.limits.maxDepth)
          addProblem(state, "delivered-artifact traversal depth limit exceeded");
        else queue.push({ path: candidate.path, depth, local: directory.local });
        continue;
      }
      if (!candidate.info.isFile()) continue;
      const extension = extname(candidate.path).toLowerCase();
      const accepted = directory.local
        ? LOCAL_PROOF_ARTIFACTS.has(extension)
        : TEXT_ARTIFACTS.has(extension) &&
          (candidate.info.size > ceiling ||
            containsInlineMarker(candidate.path, candidate.info.size, state));
      if (!accepted) continue;
      if (artifacts.length >= state.limits.maxArtifacts) {
        addProblem(state, "delivered-artifact population limit exceeded");
        state.artifactLimitReached = true;
        break;
      }
      artifacts.push({ path: candidate.path, size: candidate.info.size });
    }
    if (state.artifactLimitReached) break;
  }
  return {
    artifacts: artifacts.sort((left, right) => left.path.localeCompare(right.path)),
    problems: state.problems,
    ceiling,
  };
}

export function deliveredArtifacts(root = DEFAULT_ROOT, options = {}) {
  return scanArtifacts(root, options).artifacts.map(({ path }) => path);
}

export function verifyDeliveredArtifacts(
  root = DEFAULT_ROOT,
  detector = weightAgainstCeiling,
  options = {},
) {
  const scan = scanArtifacts(root, options);
  const problems = [...scan.problems];
  for (const artifact of scan.artifacts) {
    const weight = detector(artifact.size, scan.ceiling);
    if (weight.over)
      problems.push(
        `${artifact.path}: ${weight.bytes} bytes exceeds ${weight.ceiling}`,
      );
  }
  if (scan.artifacts.length === 0 && problems.length === 0)
    problems.push("no delivered artifacts found");
  return {
    inspectedArtifacts: scan.artifacts.map(({ path }) => path),
    problems,
  };
}

if (import.meta.main) {
  const { problems } = verifyDeliveredArtifacts();
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
  console.log("delivered artifacts satisfy local guards");
}
