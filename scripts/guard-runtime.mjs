import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = (options = {}) => resolve(options.root ?? DEFAULT_ROOT);
const skillDir = (skill, options) => join(projectRoot(options), "skills", skill);

function scriptRecords(skill, options = {}) {
  const dir = join(skillDir(skill, options), "scripts");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mjs"))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => {
      const path = join(dir, entry.name);
      return { path, source: readFileSync(path, "utf8") };
    });
}

function declaredGuards(source) {
  const declaration = /export const GUARDS\s*=\s*\[([\s\S]*?)\]/.exec(source);
  return declaration
    ? [...declaration[1].matchAll(/["']([A-Za-z][A-Za-z0-9]*)["']/g)].map(
        (match) => match[1],
      )
    : [];
}

const escapePattern = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function exportedFunction(source, name) {
  const match = new RegExp(
    `export\\s+function\\s+${escapePattern(name)}\\s*\\(`,
  ).exec(source);
  if (!match) return null;
  const opening = source.indexOf("{", match.index);
  let depth = 0;
  for (let index = opening; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(match.index, index + 1).trim();
  }
  return null;
}

function decisionRecord(skill, decision, options) {
  return scriptRecords(skill, options).find((record) =>
    declaredGuards(record.source).includes(decision),
  );
}

export function carriedBy(skill, options = {}) {
  return scriptRecords(skill, options)
    .flatMap((record) => declaredGuards(record.source))
    .filter((guard, index, guards) => guards.indexOf(guard) === index)
    .sort();
}

export async function decisionImplementation(skill, decision, options = {}) {
  const record = decisionRecord(skill, decision, options);
  if (!record) return { problem: `missing ${decision} declaration` };
  let loaded;
  try {
    loaded = await import(pathToFileURL(record.path).href);
  } catch (error) {
    return { problem: `cannot import ${decision}: ${error.message}` };
  }
  if (!Array.isArray(loaded.GUARDS) || !loaded.GUARDS.includes(decision))
    return { problem: `runtime GUARDS omits ${decision}` };
  if (typeof loaded[decision] !== "function")
    return { problem: `missing exported ${decision} implementation` };

  const body = exportedFunction(record.source, decision);
  if (!body) return { problem: `cannot compare ${decision} implementation` };
  const constants = [
    ...record.source.matchAll(
      /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*([^;\n]+);/g,
    ),
  ]
    .filter((match) =>
      new RegExp(`\\b${escapePattern(match[1])}\\b`).test(body),
    )
    .map((match) => `const ${match[1]} = ${match[2].trim()};`);
  return {
    source: [...constants, body].join("\n").replaceAll("\r\n", "\n"),
  };
}

function containedWalker(skill, walkedBy, options) {
  const base = skillDir(skill, options);
  const path = resolve(base, walkedBy ?? "");
  if (!walkedBy || !path.startsWith(`${base}${sep}`) || !existsSync(path))
    return null;
  const realBase = realpathSync(base);
  const realPath = realpathSync(path);
  return realPath.startsWith(`${realBase}${sep}`) && statSync(realPath).isFile()
    ? realPath
    : null;
}

export async function inspectWalker(skill, walkedBy, options = {}) {
  const path = containedWalker(skill, walkedBy, options);
  if (!path) return { problem: "missing or uncontained walker" };
  let loaded;
  try {
    loaded = await import(pathToFileURL(path).href);
  } catch (error) {
    return { problem: `cannot import walker: ${error.message}` };
  }
  if (typeof loaded.verifyDeliveredArtifacts !== "function")
    return { problem: "walker does not export verifyDeliveredArtifacts" };

  let problems;
  try {
    problems = await loaded.verifyDeliveredArtifacts(projectRoot(options));
  } catch (error) {
    return { problem: `walker threw: ${error.message}` };
  }
  if (!Array.isArray(problems) || problems.some((problem) => typeof problem !== "string"))
    return { problem: "walker must return an array of problem strings" };
  return {
    source: readFileSync(path, "utf8").replaceAll("\r\n", "\n"),
    problems,
  };
}
