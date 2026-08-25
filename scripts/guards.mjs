import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  carriedBy,
  copiedDecisionDrift,
  decisionProblems,
  exceptedRows,
  owedRows,
  readCatalogue,
  strayRows,
  unstatedRows,
  walkedByProblems,
} from "./guard-model.mjs";
import {
  OUTSIDE_THE_CATALOGUE,
  TRAITS,
  cataloguedSkills,
  exclusionProblems,
  witnessedTraits,
} from "./traits.mjs";

export * from "./guard-model.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function modelOptions(options) {
  return options.witnesses
    ? options
    : { ...options, witnesses: await witnessedTraits(options) };
}

export async function catalogueProblems(catalogue, options = {}) {
  const model = await modelOptions(options);
  const knownTraits = new Set(TRAITS.map((trait) => trait.id));
  const decisions = new Set(
    catalogue.rules.map((rule) => rule.decidedBy ?? rule.detectedBy),
  );
  const invalidRules = catalogue.rules.flatMap((rule) =>
    !["guard", "capability"].includes(rule.kind) ||
    !Array.isArray(rule.requires) ||
    rule.requires.length === 0 ||
    rule.requires.some((trait) => !knownTraits.has(trait)) ||
    !(rule.decidedBy ?? rule.detectedBy) ||
    (rule.kind === "capability" && typeof rule.walkedBy !== "string")
      ? [{ rule: rule.id }]
      : [],
  );
  const invalidStates = catalogue.rules.flatMap((rule) =>
    Object.entries(rule.states ?? {})
      .filter(([, state]) => !["carried", "owed"].includes(state))
      .map(([skill]) => ({ rule: rule.id, skill })),
  );
  const unlistedDeclarations = cataloguedSkills(model).flatMap((skill) =>
    carriedBy(skill, model)
      .filter((decision) => !decisions.has(decision))
      .map((decision) => ({ skill, decision })),
  );
  const [excluded, stray, unstated, missing, drift, walkers] =
    await Promise.all([
      exclusionProblems(model),
      strayRows(catalogue, model),
      unstatedRows(catalogue, model),
      decisionProblems(catalogue, model),
      copiedDecisionDrift(catalogue, model),
      walkedByProblems(catalogue, model),
    ]);
  return [
    ...invalidRules,
    ...invalidStates,
    ...unlistedDeclarations,
    ...excluded,
    ...stray,
    ...unstated,
    ...owedRows(catalogue),
    ...exceptedRows(catalogue),
    ...missing,
    ...drift,
    ...walkers,
  ];
}

export async function renderGuardsDoc(catalogue, options = {}) {
  const model = await modelOptions(options);
  const skills = cataloguedSkills(model);
  const ruleRows = catalogue.rules.map(
    (rule) =>
      `| ${rule.id} | ${rule.kind} | ${rule.requires.join(", ")} | ${skills
        .map((skill) => (rule.states?.[skill] === "carried" ? "R" : ""))
        .join(" | ")} |`,
  );
  const traitRows = skills.map((skill) => {
    const traits = model.witnesses.get(skill);
    return `| ${skill} | ${TRAITS.map((trait) =>
      traits.includes(trait.id) ? "yes" : ""
    ).join(" | ")} |`;
  });
  return [
    "# Guard coverage",
    "",
    "**Generated — do not edit.** Run `bun run guards` to regenerate.",
    "",
    `Doctrine is the sole exclusion: ${OUTSIDE_THE_CATALOGUE.doctrine}.`,
    "",
    `| rule | kind | required traits | ${skills.join(" | ")} |`,
    `| --- | --- | --- | ${skills.map(() => "---").join(" | ")} |`,
    ...ruleRows,
    "",
    "## Trait witnesses",
    "",
    `| skill | ${TRAITS.map((trait) => trait.id).join(" | ")} |`,
    `| --- | ${TRAITS.map(() => "---").join(" | ")} |`,
    ...traitRows,
    "",
  ].join("\n");
}

if (import.meta.main) {
  const unknown = process.argv
    .slice(2)
    .filter((argument) => argument !== "--check");
  if (unknown.length > 0) {
    console.error(`unknown argument(s): ${unknown.join(" ")}`);
    process.exit(2);
  }
  const catalogue = readCatalogue();
  const options = { witnesses: await witnessedTraits() };
  const problems = await catalogueProblems(catalogue, options);
  if (problems.length > 0) {
    console.error(`guard catalogue is not closed: ${JSON.stringify(problems)}`);
    process.exit(1);
  }
  const path = join(ROOT, "GUARDS.md");
  const wanted = await renderGuardsDoc(catalogue, options);
  if (process.argv.includes("--check")) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== wanted) {
      console.error("GUARDS.md has drifted from the catalogue — run `bun run guards`");
      process.exit(1);
    }
    console.log("GUARDS.md matches the catalogue");
  } else {
    writeFileSync(path, wanted);
    console.log(`GUARDS.md ← ${catalogue.rules.length} rules`);
  }
}
