import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cataloguedSkills,
  witnessedTraits,
} from "./traits.mjs";
import {
  carriedBy,
  decisionImplementation,
  inspectWalker,
} from "./guard-runtime.mjs";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = (options = {}) => resolve(options.root ?? DEFAULT_ROOT);

export { carriedBy } from "./guard-runtime.mjs";

async function modelOptions(options) {
  return options.witnesses
    ? options
    : { ...options, witnesses: await witnessedTraits(options) };
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

export async function reachable(rule, options = {}) {
  const model = await modelOptions(options);
  return cataloguedSkills(model).filter((skill) =>
    rule.requires.every((trait) => model.witnesses.get(skill).includes(trait)),
  );
}

export async function strayRows(catalogue, options = {}) {
  const model = await modelOptions(options);
  const rows = await Promise.all(
    catalogue.rules.map(async (rule) => {
      const derived = new Set(await reachable(rule, model));
      return [
        ...Object.keys(rule.states ?? {}),
        ...Object.keys(rule.exceptions ?? {}),
      ]
        .filter((skill) => !derived.has(skill))
        .map((skill) => ({ rule: rule.id, skill }));
    }),
  );
  return rows.flat();
}

export async function unstatedRows(catalogue, options = {}) {
  const model = await modelOptions(options);
  const rows = await Promise.all(
    catalogue.rules.map(async (rule) =>
      (await reachable(rule, model))
        .filter(
          (skill) =>
            !Object.hasOwn(rule.states ?? {}, skill) &&
            !Object.hasOwn(rule.exceptions ?? {}, skill),
        )
        .map((skill) => ({ rule: rule.id, skill })),
    ),
  );
  return rows.flat();
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

async function carriedImplementations(rule, options) {
  const decision = rule.decidedBy ?? rule.detectedBy;
  if (!decision) return [];
  const skills = (await reachable(rule, options)).filter(
    (skill) => rule.states?.[skill] === "carried",
  );
  return Promise.all(
    skills.map(async (skill) => ({
      skill,
      implementation: await decisionImplementation(skill, decision, options),
    })),
  );
}

export async function decisionProblems(catalogue, options = {}) {
  const model = await modelOptions(options);
  const results = await Promise.all(
    catalogue.rules.map(async (rule) =>
      (await carriedImplementations(rule, model))
        .filter(({ implementation }) => implementation.problem)
        .map(({ skill, implementation }) => ({
          rule: rule.id,
          skill,
          problem: implementation.problem,
        })),
    ),
  );
  return results.flat();
}

export async function copiedDecisionDrift(catalogue, options = {}) {
  const model = await modelOptions(options);
  const results = await Promise.all(
    catalogue.rules.map(async (rule) => {
      const implementations = await carriedImplementations(rule, model);
      if (
        implementations.length < 2 ||
        implementations.some(({ implementation }) => implementation.problem)
      )
        return [];
      const [{ skill: canonicalSkill, implementation: canonical }, ...peers] =
        implementations;
      return peers.flatMap(({ skill, implementation }) =>
        implementation.source === canonical.source
          ? []
          : [{ rule: rule.id, skill, canonicalSkill }],
      );
    }),
  );
  return results.flat();
}

export async function walkedByProblems(catalogue, options = {}) {
  const model = await modelOptions(options);
  const results = await Promise.all(
    catalogue.rules
      .filter((rule) => rule.kind === "capability")
      .map(async (rule) => {
        const skills = (await reachable(rule, model)).filter(
          (skill) => rule.states?.[skill] === "carried",
        );
        const inspections = await Promise.all(
          skills.map(async (skill) => ({
            skill,
            inspection: await inspectWalker(skill, rule.walkedBy, model),
          })),
        );
        const failures = inspections.flatMap(({ skill, inspection }) => {
          const problems = inspection.problem
            ? [inspection.problem]
            : inspection.problems;
          return problems.map((problem) => ({ rule: rule.id, skill, problem }));
        });
        const canonical = inspections.find(
          ({ inspection }) => inspection.source,
        );
        const drift = canonical
          ? inspections.flatMap(({ skill, inspection }) =>
              inspection.source && inspection.source !== canonical.inspection.source
                ? [
                    {
                      rule: rule.id,
                      skill,
                      canonicalSkill: canonical.skill,
                      problem: "walker implementation drift",
                    },
                  ]
                : [],
            )
          : [];
        return [...failures, ...drift];
      }),
  );
  return results.flat();
}

