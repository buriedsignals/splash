import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { cataloguedSkills, traitsOf } from "./traits.mjs";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = (options = {}) => resolve(options.root ?? DEFAULT_ROOT);
const skillDir = (skill, options) => join(projectRoot(options), "skills", skill);

function scriptSources(skill, options = {}) {
  const dir = join(skillDir(skill, options), "scripts");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mjs"))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => readFileSync(join(dir, entry.name), "utf8"));
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

function decisionSource(skill, decision, options = {}) {
  for (const source of scriptSources(skill, options)) {
    if (!declaredGuards(source).includes(decision)) continue;
    const body = exportedFunction(source, decision);
    if (!body) continue;
    const constants = [
      ...source.matchAll(
        /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*([^;\n]+);/g,
      ),
    ]
      .filter((match) =>
        new RegExp(`\\b${escapePattern(match[1])}\\b`).test(body),
      )
      .map((match) => `const ${match[1]} = ${match[2].trim()};`);
    return [...constants, body].join("\n").replaceAll("\r\n", "\n");
  }
  return null;
}

export function readCatalogue(options = {}) {
  return JSON.parse(
    readFileSync(
      join(
        projectRoot(options),
        "skills/doctrine/references/guard-catalogue.json",
      ),
      "utf8",
    ),
  );
}

export function carriedBy(skill, options = {}) {
  return scriptSources(skill, options)
    .flatMap(declaredGuards)
    .filter((guard, index, guards) => guards.indexOf(guard) === index)
    .sort();
}

export function reachable(rule, options = {}) {
  return cataloguedSkills(options).filter((skill) => {
    const traits = traitsOf(skill, options);
    return rule.requires.every((trait) => traits.includes(trait));
  });
}

export function strayRows(catalogue, options = {}) {
  return catalogue.rules.flatMap((rule) => {
    const derived = new Set(reachable(rule, options));
    return [...Object.keys(rule.states ?? {}), ...Object.keys(rule.exceptions ?? {})]
      .filter((skill) => !derived.has(skill))
      .map((skill) => ({ rule: rule.id, skill }));
  });
}

export function unstatedRows(catalogue, options = {}) {
  return catalogue.rules.flatMap((rule) =>
    reachable(rule, options)
      .filter(
        (skill) =>
          !Object.hasOwn(rule.states ?? {}, skill) &&
          !Object.hasOwn(rule.exceptions ?? {}, skill),
      )
      .map((skill) => ({ rule: rule.id, skill })),
  );
}

export function owedRows(catalogue) {
  return catalogue.rules.flatMap((rule) =>
    Object.entries(rule.states ?? {})
      .filter(([, state]) => state === "owed")
      .map(([skill]) => ({ rule: rule.id, skill })),
  );
}

export function exceptedRows(catalogue) {
  return catalogue.rules.flatMap((rule) =>
    Object.entries(rule.exceptions ?? {}).map(([skill, reason]) => ({
      rule: rule.id,
      skill,
      reason,
    })),
  );
}

export function copiedDecisionDrift(catalogue, options = {}) {
  return catalogue.rules.flatMap((rule) => {
    const decision = rule.decidedBy ?? rule.detectedBy;
    const skills = reachable(rule, options).filter(
      (skill) => rule.states?.[skill] === "carried",
    );
    if (!decision || skills.length < 2) return [];
    const canonicalSkill = skills[0];
    const canonical = decisionSource(canonicalSkill, decision, options);
    return skills.slice(1).flatMap((skill) =>
      decisionSource(skill, decision, options) === canonical
        ? []
        : [{ rule: rule.id, skill, canonicalSkill }],
    );
  });
}

export function walkedByProblems(catalogue, options = {}) {
  return catalogue.rules
    .filter((rule) => rule.kind === "capability")
    .flatMap((rule) =>
      reachable(rule, options)
        .filter((skill) => rule.states?.[skill] === "carried")
        .flatMap((skill) => {
          const base = skillDir(skill, options);
          const file = resolve(base, rule.walkedBy ?? "");
          const contained =
            file.startsWith(`${base}${sep}`) &&
            existsSync(file) &&
            realpathSync(file).startsWith(`${realpathSync(base)}${sep}`);
          const source = contained ? readFileSync(file, "utf8") : "";
          const callsDetector = new RegExp(
            `\\b${escapePattern(rule.detectedBy ?? "")}\\s*\\(`,
          ).test(source);
          const walks =
            /\bdeliveredArtifacts\s*\(/.test(source) &&
            /\breadFileSync\s*\(/.test(source) &&
            callsDetector;
          return walks ? [] : [{ rule: rule.id, skill }];
        }),
    );
}

