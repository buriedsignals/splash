import { existsSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INLINE_ASSET =
  /data:(?:image|font)\/[^;,]+;base64,[A-Za-z0-9+/=]+/i;

export const OUTSIDE_THE_CATALOGUE = {
  doctrine:
    "the catalogue and its integrity checks live here; doctrine remains excluded only while it witnesses no production mechanism",
};

function projectRoot(options = {}) {
  return resolve(options.root ?? DEFAULT_ROOT);
}

function skillDir(skill, options) {
  return join(projectRoot(options), "skills", skill);
}

function witnessModule(skill, options) {
  const base = skillDir(skill, options);
  const path = join(base, "scripts", "trait-witness.mjs");
  if (!existsSync(path)) return null;
  const realBase = realpathSync(base);
  const realPath = realpathSync(path);
  if (!realPath.startsWith(`${realBase}${sep}`))
    throw new Error(`${skill}: trait witness must stay inside its skill`);
  return realPath;
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
  const root = join(projectRoot(options), "skills");
  return readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && existsSync(join(root, entry.name, "SKILL.md")),
    )
    .map((entry) => entry.name)
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
