import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_EXTENSIONS = /\.(?:mjs|js|ts|tsx)$/;
const GUARD_ADJACENT =
  /(?:^|\/)(?:verify|detect|guards?|check-[^/]*guards?)(?:[-.]|\/)/i;

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

function sourceFiles(skill, options = {}) {
  const root = skillDir(skill, options);
  const files = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && SOURCE_EXTENSIONS.test(entry.name))
        files.push(path);
    }
  };
  for (const name of ["scripts", "assets"]) walk(join(root, name));
  return files
    .filter((path) => !GUARD_ADJACENT.test(relative(root, path)))
    .map((path) => readFileSync(path, "utf8"));
}

function has(skill, path, options) {
  return existsSync(join(skillDir(skill, options), path));
}

function anySource(skill, pattern, options) {
  return sourceFiles(skill, options).some((source) => pattern.test(source));
}

function writesStandaloneHtml(skill, options) {
  return sourceFiles(skill, options).some(
    (source) =>
      /\bwrite(?:File(?:Sync)?|Atomic)\s*\(/.test(source) &&
      /\.html["'`]/.test(source) &&
      /<!doctype\s+html/i.test(source),
  );
}

export const TRAITS = [
  {
    id: "materialises-a-beat",
    describes: "a production entrypoint turns a beat into its delivered artifact",
    witness: (skill, options) =>
      [
        "render-still.mjs",
        "render-web.mjs",
        "render-video.mjs",
        "render-map.mjs",
        "render-scrolly.mjs",
        "produce.mjs",
      ].some((name) => has(skill, `scripts/${name}`, options)),
  },
  {
    id: "inlines-its-assets",
    describes: "production code embeds an image or font data URI in a delivered file",
    witness: (skill, options) =>
      anySource(skill, /data:image|data:font|;base64,/, options),
  },
  {
    id: "ships-standalone-html",
    describes: "production code writes a complete HTML document that opens without a build",
    witness: writesStandaloneHtml,
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

export function traitsOf(skill, options = {}) {
  const path = join(skillDir(skill, options), "TRAITS.json");
  if (!existsSync(path)) return [];
  const record = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(record.traits) ? record.traits : [];
}

export function provenTraits(skill, options = {}) {
  return TRAITS.filter((trait) => trait.witness(skill, options)).map(
    (trait) => trait.id,
  );
}

export function exclusionProblems(options = {}) {
  return Object.keys(OUTSIDE_THE_CATALOGUE).flatMap((skill) => {
    if (!allSkills(options).includes(skill)) return [{ skill, traits: [] }];
    const traits = provenTraits(skill, options);
    return traits.length === 0 ? [] : [{ skill, traits }];
  });
}
