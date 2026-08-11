import { lstatSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { offerForms, materialise } from "./deliver.mjs";
import {
  canonicalStoriesRoot,
  deliveryDestinations,
  resolveDeliveryIdentity,
} from "./delivery-identity.mjs";

export const LEGACY_DELIVERY_ADAPTER_VERSION = 1;

function legacyIdentity({ storiesRoot, beatDir }, apiName) {
  if (!beatDir) throw new Error(`${apiName} v1 needs the beat directory`);
  const canonicalRoot = canonicalStoriesRoot(storiesRoot);
  const declaredRoot = resolve(storiesRoot);
  const resolvedBeat = resolve(beatDir);
  const stat = lstatSync(resolvedBeat);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`${apiName} v1 requires a real beat directory: ${resolvedBeat}`);
  }
  const canonicalBeat = realpathSync(resolvedBeat);
  const declaredRel = relative(declaredRoot, resolvedBeat);
  const rel = relative(canonicalRoot, canonicalBeat);
  if (declaredRel !== rel) {
    throw new Error(`${apiName} v1 refuses a symlinked ancestor in beatDir`);
  }
  const parts = rel.split(sep);
  if (
    rel === "" ||
    rel === ".." ||
    rel.startsWith(`..${sep}`) ||
    isAbsolute(rel) ||
    parts.length !== 3 ||
    parts[1] !== "beats"
  ) {
    throw new Error(
      `${apiName} v1 requires beatDir inside storiesRoot as <storyId>/beats/<outputId>`,
    );
  }
  const [storyId, , outputId] = parts;
  const identity = resolveDeliveryIdentity({
    storiesRoot: canonicalRoot,
    storyId,
    outputId,
  });
  if (identity.beatDir !== canonicalBeat) {
    throw new Error(`${apiName} v1 beatDir does not match its canonical story/output identity`);
  }
  return identity;
}

function assertLegacyExport(exportDir, identity, declaredStoriesRoot) {
  if (!exportDir) throw new Error("materialise v1 needs the export directory");
  const resolvedExport = resolve(exportDir);
  if (
    basename(resolvedExport) !== identity.outputId ||
    basename(dirname(resolvedExport)) !== "export"
  ) {
    throw new Error(
      `materialise v1 export directory must be export/${identity.outputId} for this output`,
    );
  }
  const candidateStory = realpathSync(dirname(dirname(resolvedExport)));
  const canonicalCandidate = join(candidateStory, "export", identity.outputId);
  const fromCanonicalRoot = relative(identity.storiesRoot, resolvedExport);
  const suppliedRel =
    fromCanonicalRoot !== ".." &&
    !fromCanonicalRoot.startsWith(`..${sep}`) &&
    !isAbsolute(fromCanonicalRoot)
      ? fromCanonicalRoot
      : relative(resolve(declaredStoriesRoot), resolvedExport);
  const canonicalRel = relative(identity.storiesRoot, canonicalCandidate);
  if (suppliedRel !== canonicalRel) {
    throw new Error("materialise v1 refuses a symlinked ancestor in exportDir");
  }
  if (canonicalCandidate !== identity.exportDir) {
    throw new Error(
      `materialise v1 export directory must be ${identity.exportDir}; the supplied path is never used as a replacement target`,
    );
  }
}

function canonicalOptions(options, identity) {
  const {
    beatDir: _beatDir,
    exportDir: _exportDir,
    storiesRoot: _storiesRoot,
    ...rest
  } = options;
  return {
    ...rest,
    storiesRoot: identity.storiesRoot,
    storyId: identity.storyId,
    outputId: identity.outputId,
  };
}

export function offerFormsLegacyV1(options) {
  const identity = legacyIdentity(options, "offerForms");
  return offerForms(canonicalOptions(options, identity));
}

export async function materialiseLegacyV1(options) {
  const identity = legacyIdentity(options, "materialise");
  assertLegacyExport(options.exportDir, identity, options.storiesRoot);
  return materialise(canonicalOptions(options, identity));
}

export function exportDirForLegacyV1({ storiesRoot, storyDir, beatName }) {
  const canonicalRoot = canonicalStoriesRoot(storiesRoot);
  const declaredRoot = resolve(storiesRoot);
  const resolvedStory = resolve(storyDir);
  const canonicalStory = realpathSync(resolvedStory);
  const storyId = relative(canonicalRoot, canonicalStory);
  if (relative(declaredRoot, resolvedStory) !== storyId) {
    throw new Error("exportDirFor v1 refuses a symlinked story directory");
  }
  if (
    storyId === "" ||
    storyId === ".." ||
    storyId.startsWith(`..${sep}`) ||
    isAbsolute(storyId) ||
    storyId.includes(sep)
  ) {
    throw new Error("exportDirFor v1 requires one story directory directly inside storiesRoot");
  }
  return deliveryDestinations({
    storiesRoot: canonicalRoot,
    storyId,
    outputId: beatName,
  }).exportDir;
}
