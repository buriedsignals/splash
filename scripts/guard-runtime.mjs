import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import {
  containedPath,
  projectRoot,
  skillDirectory,
} from "./traits.mjs";

function scriptRecords(skill, options = {}) {
  const root = projectRoot(options);
  const base = skillDirectory(skill, { root });
  const scriptsPath = join(base, "scripts");
  if (!lstatSync(scriptsPath, { throwIfNoEntry: false })) return [];
  const directory = containedPath(scriptsPath, { root }, "directory");
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      if (!entry.name.endsWith(".mjs") || !entry.isFile()) {
        if (entry.name.endsWith(".mjs") && entry.isSymbolicLink())
          throw new Error(`${join(directory, entry.name)}: symlinks are not allowed`);
        return [];
      }
      const path = containedPath(join(directory, entry.name), { root });
      return [{ path, source: readFileSync(path, "utf8") }];
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

function effectiveTuning(loaded) {
  return Object.entries(loaded)
    .filter(
      ([name, value]) =>
        /^[A-Z][A-Z0-9_]*$/.test(name) &&
        (value === null ||
          ["boolean", "bigint", "number", "string"].includes(typeof value)),
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => {
      const rendered =
        typeof value === "string" ? JSON.stringify(value) : String(value);
      return `export ${name} = ${typeof value}:${rendered}`;
    });
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
  let record;
  try {
    record = decisionRecord(skill, decision, options);
  } catch (error) {
    return { problem: `cannot read ${decision}: ${error.message}` };
  }
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
    detector: loaded[decision],
    source: [...constants, ...effectiveTuning(loaded), body]
      .join("\n")
      .replaceAll("\r\n", "\n"),
  };
}

function containedWalker(skill, walkedBy, options) {
  if (!walkedBy) return null;
  const root = projectRoot(options);
  const base = skillDirectory(skill, { root });
  const path = resolve(base, walkedBy);
  const offset = relative(base, path);
  if (
    offset === "" ||
    offset === ".." ||
    offset.startsWith(`..${sep}`) ||
    isAbsolute(offset)
  )
    return null;
  return containedPath(path, { root });
}

export async function inspectWalker(
  skill,
  walkedBy,
  detectedBy,
  options = {},
) {
  let path;
  try {
    path = containedWalker(skill, walkedBy, options);
  } catch (error) {
    return { problem: `missing or uncontained walker: ${error.message}` };
  }
  if (!path) return { problem: "missing or uncontained walker" };
  let loaded;
  try {
    loaded = await import(pathToFileURL(path).href);
  } catch (error) {
    return { problem: `cannot import walker: ${error.message}` };
  }
  if (typeof loaded.verifyDeliveredArtifacts !== "function")
    return { problem: "walker does not export verifyDeliveredArtifacts" };

  const implementation = await decisionImplementation(
    skill,
    detectedBy,
    options,
  );
  if (implementation.problem)
    return {
      problem: `cannot bind walker to ${detectedBy}: ${implementation.problem}`,
    };

  let detectorCalls = 0;
  const detector = (...arguments_) => {
    detectorCalls += 1;
    return implementation.detector(...arguments_);
  };
  let result;
  try {
    result = await loaded.verifyDeliveredArtifacts(
      projectRoot(options),
      detector,
    );
  } catch (error) {
    return { problem: `walker threw: ${error.message}` };
  }
  if (
    !result ||
    typeof result !== "object" ||
    !Array.isArray(result.inspectedArtifacts) ||
    result.inspectedArtifacts.some((path) => typeof path !== "string") ||
    !Array.isArray(result.problems) ||
    result.problems.some((problem) => typeof problem !== "string")
  )
    return {
      problem:
        "walker must return inspectedArtifacts and problems string arrays",
    };
  if (result.inspectedArtifacts.length === 0 && result.problems.length === 0)
    return { problem: "walker inspected no delivered artifacts" };
  if (detectorCalls < result.inspectedArtifacts.length)
    return {
      problem: `walker must invoke ${detectedBy} for every inspected artifact`,
    };

  try {
    for (const artifact of result.inspectedArtifacts)
      containedPath(artifact, options);
  } catch (error) {
    return { problem: `walker reported an uncontained artifact: ${error.message}` };
  }
  return {
    source: readFileSync(path, "utf8").replaceAll("\r\n", "\n"),
    inspectedArtifacts: result.inspectedArtifacts,
    problems: result.problems,
  };
}
