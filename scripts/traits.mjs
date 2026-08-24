import { lstatSync, readdirSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INLINE_ASSET =
  /data:(?:image|font)\/[^;,]+;base64,[A-Za-z0-9+/=]+/i;

export const OUTSIDE_THE_CATALOGUE = {
  doctrine:
    "the catalogue and its integrity checks live here; doctrine remains excluded only while it witnesses no production mechanism",
};

export function projectRoot(options = {}) {
  const requested = resolve(options.root ?? DEFAULT_ROOT);
  const real = realpathSync(requested);
  const info = lstatSync(real);
  if (!info.isDirectory())
    throw new Error(`${requested}: project root is not a directory`);
  return real;
}

function isContained(root, path) {
  const offset = relative(root, path);
  return (
    offset === "" ||
    (offset !== ".." && !offset.startsWith(`..${sep}`) && !isAbsolute(offset))
  );
}

export function containedPath(path, options = {}, kind = "file") {
  const requestedRoot = resolve(options.root ?? DEFAULT_ROOT);
  const root = projectRoot(options);
  const target = resolve(path);
  const canonicalTarget = isContained(root, target)
    ? target
    : isContained(requestedRoot, target)
      ? join(root, relative(requestedRoot, target))
      : null;
  if (!canonicalTarget)
    throw new Error(`${target}: path must stay inside the project`);

  let current = root;
  let info = lstatSync(root);
  for (const part of relative(root, canonicalTarget).split(sep).filter(Boolean)) {
    current = join(current, part);
    info = lstatSync(current);
    if (info.isSymbolicLink())
      throw new Error(`${current}: symlinks are not allowed`);
  }
  if (kind === "directory" ? !info.isDirectory() : !info.isFile())
    throw new Error(`${target}: expected ${kind}`);

  const real = realpathSync(canonicalTarget);
  if (!isContained(root, real))
    throw new Error(`${target}: real path must stay inside the project`);
  return real;
}

export function skillDirectory(skill, options = {}) {
  const root = projectRoot(options);
  const skills = containedPath(join(root, "skills"), { root }, "directory");
  const directory = containedPath(join(skills, skill), { root }, "directory");
  containedPath(join(directory, "SKILL.md"), { root });
  return directory;
}

function witnessModule(skill, options) {
  const root = projectRoot(options);
  const base = skillDirectory(skill, { root });
  const scripts = join(base, "scripts");
  const scriptsInfo = lstatSync(scripts, { throwIfNoEntry: false });
  if (!scriptsInfo) return null;
  const realScripts = containedPath(scripts, { root }, "directory");
  const path = join(realScripts, "trait-witness.mjs");
  if (!lstatSync(path, { throwIfNoEntry: false })) return null;
  return containedPath(path, { root });
}

async function witnessesInlinedAssets(skill, options) {
  const path = witnessModule(skill, options);
  if (!path) return false;
  const loaded = await import(pathToFileURL(path).href);
  if (typeof loaded.witnessInlinedAssets !== "function")
    throw new Error(`${skill}: trait witness must export witnessInlinedAssets`);
  const artifacts = await loaded.witnessInlinedAssets();
  if (
    !Array.isArray(artifacts) ||
    artifacts.some((artifact) => typeof artifact !== "string")
  )
    throw new Error(`${skill}: witnessInlinedAssets must return artifact strings`);
  return artifacts.some((artifact) => INLINE_ASSET.test(artifact));
}

export const TRAITS = [
  {
    id: "inlines-its-assets",
    describes: "production code embeds an image or font data URI in a delivered file",
    witness: witnessesInlinedAssets,
  },
];

export function allSkills(options = {}) {
  const project = projectRoot(options);
  const root = containedPath(join(project, "skills"), { root: project }, "directory");
  return readdirSync(root, { withFileTypes: true })
    .map((entry) => {
      if (entry.isSymbolicLink())
        throw new Error(`${join(root, entry.name)}: symlinks are not allowed`);
      if (!entry.isDirectory()) return null;
      const directory = containedPath(
        join(root, entry.name),
        { root: project },
        "directory",
      );
      const marker = join(directory, "SKILL.md");
      const markerInfo = lstatSync(marker, { throwIfNoEntry: false });
      if (!markerInfo) return null;
      containedPath(marker, { root: project });
      return entry.name;
    })
    .filter(Boolean)
    .sort();
}

export function cataloguedSkills(options = {}) {
  return allSkills(options).filter(
    (skill) => !Object.hasOwn(OUTSIDE_THE_CATALOGUE, skill),
  );
}

export async function provenTraits(skill, options = {}) {
  const proofs = await Promise.all(
    TRAITS.map(async (trait) => ({
      id: trait.id,
      proven: await trait.witness(skill, options),
    })),
  );
  return proofs.filter((proof) => proof.proven).map((proof) => proof.id);
}

export async function witnessedTraits(options = {}) {
  return new Map(
    await Promise.all(
      cataloguedSkills(options).map(async (skill) => [
        skill,
        await provenTraits(skill, options),
      ]),
    ),
  );
}

export async function exclusionProblems(options = {}) {
  const results = await Promise.all(
    Object.keys(OUTSIDE_THE_CATALOGUE).map(async (skill) => {
      if (!allSkills(options).includes(skill)) return { skill, traits: [] };
      const traits = await provenTraits(skill, options);
      return traits.length === 0 ? null : { skill, traits };
    }),
  );
  return results.filter(Boolean);
}
