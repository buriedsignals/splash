// The guard catalogue, read and rendered.
//
// `MATRIX.md` says which type × format cells have a rendered artefact; this says which guards each
// producing skill carries. Both are generated, both have a `--check`, and both exist so a reader
// sees the state without running anything.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCING_SKILLS, traitsOf } from "./traits.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Every skill that PRODUCES a visual. `deliver`, `storyboard`, `intake` and the rest shape or ship
 *  a beat; they never draw one, so a guard about a drawing cannot reach them.
 *
 *  Defined in `traits.mjs` (a fact about skills, which is what that module is about) and re-exported
 *  here so every existing importer of this module keeps working unchanged. */
export { PRODUCING_SKILLS };

export function readCatalogue() {
  return JSON.parse(
    readFileSync(join(ROOT, "skills/doctrine/references/guard-catalogue.json"), "utf8"),
  );
}

/** The guard decision functions a skill's own verification scripts DECLARE.
 *
 *  Declared, not inferred: a verification script exports plenty that is not a guard —
 *  `resolveChrome`, `verifyOne`, `fingerprintDrift` — so scanning every export would make the
 *  catalogue's own completeness test vacuous. Each script names its guards in one `GUARDS` array,
 *  which is also the list a reader of that file sees first. */
export function carriedBy(skill) {
  const dir = join(ROOT, "skills", skill, "scripts");
  if (!existsSync(dir)) return [];
  const names = [];
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".mjs"))) {
    const source = readFileSync(join(dir, file), "utf8");
    const declared = /export const GUARDS = \[([^\]]*)\]/.exec(source);
    if (!declared) continue;
    for (const match of declared[1].matchAll(/"([a-zA-Z]+)"/g)) names.push(match[1]);
  }
  return names;
}

/** The skills a rule reaches: those whose declared traits contain every trait it requires.
 *
 *  COMPUTED, NEVER TYPED. The hand-typed version of this shipped on 2026-08-19 and had already
 *  failed by the next morning: `reveal-completes` named `chart-video` because that is the skill
 *  someone was working in, while `map-beat` — same timing contract, six video beats on disk — was
 *  not named and therefore owed nothing. A set nobody derives is a set nobody notices. */
export function reachable(rule) {
  return PRODUCING_SKILLS.filter((skill) => {
    const traits = traitsOf(skill);
    return rule.requires.every((id) => traits.includes(id));
  }).sort();
}

/** A state or an exception written against a skill the rule does not reach — the anti-noise
 *  invariant. A cartographic rule cannot be written onto a chart skill even by hand. */
export function strayRows(catalogue) {
  return catalogue.rules.flatMap((rule) => {
    const derived = new Set(reachable(rule));
    return [...Object.keys(rule.states ?? {}), ...Object.keys(rule.exceptions ?? {})]
      .filter((skill) => !derived.has(skill))
      .map((skill) => ({ rule: rule.id, skill }));
  });
}

/** A skill the rule reaches and which says nothing at all — neither carried, nor owed, nor excepted.
 *  This is the invariant that makes a fix impossible to leave behind: the day a skill has the trait,
 *  the cell exists. */
export function unstatedRows(catalogue) {
  return catalogue.rules.flatMap((rule) =>
    reachable(rule)
      .filter((skill) => !(skill in (rule.states ?? {})) && !(skill in (rule.exceptions ?? {})))
      .map((skill) => ({ rule: rule.id, skill })),
  );
}

/** Every cell whose blankness was ARGUED rather than obvious — a genuine exception within the
 *  reachable set, not the ordinary absence a missing trait already proves. */
export function unreachableRows(catalogue) {
  return catalogue.rules.flatMap((rule) =>
    Object.entries(rule.exceptions ?? {}).map(([skill, reason]) => ({
      rule: rule.id,
      skill,
      reason,
    })),
  );
}

/** Every cell a skill is reachable by and does not carry — the debt, enumerated. */
export function owedRows(catalogue) {
  return catalogue.rules.flatMap((rule) =>
    Object.entries(rule.states)
      .filter(([, state]) => state === "owed")
      .map(([skill]) => ({ rule: rule.id, skill })),
  );
}

export function renderGuardsDoc(catalogue) {
  const skills = PRODUCING_SKILLS;
  const cell = (rule, skill) =>
    rule.states[skill] === "carried" ? "**R**" : rule.states[skill] === "owed" ? "·" : "";
  const owed = owedRows(catalogue);
  return [
    "# The guards, and what each creation process carries",
    "",
    "**Generated — do not edit by hand.** `bun scripts/guards.mjs --write` rewrites this file;",
    "`bun scripts/guards.mjs --check` fails if it has drifted from the catalogue.",
    "",
    "A guard is listed for a skill only where the defect it catches is REACHABLE there — computed from",
    "the traits the skill declares. **R** means the skill's own verification scripts declare it; **·**",
    "means the defect can happen there and nothing checks it; blank means it cannot happen there at all",
    "— and where that blankness is a genuine exception rather than a missing trait, the argument is",
    "written out below the table.",
    "",
    `| guard | ${skills.join(" | ")} |`,
    `| --- | ${skills.map(() => "---").join(" | ")} |`,
    ...catalogue.rules.map(
      (rule) => `| ${rule.id} | ${skills.map((skill) => cell(rule, skill)).join(" | ")} |`,
    ),
    "",
    `## What is still owed — ${owed.length} cell${owed.length === 1 ? "" : "s"}`,
    "",
    owed.length
      ? owed.map((row) => `- \`${row.skill}\` owes **${row.rule}**`).join("\n")
      : "Nothing. Every format carries every guard it can reach.",
    "",
    `## Why a cell is blank, where the blankness was argued — ${unreachableRows(catalogue).length} of them`,
    "",
    "Only the cells a reader would otherwise re-open: a skill within the reachable set that is still",
    "excepted for a documented reason. A skill outside the reachable set needs no entry — the absent",
    "trait already proves it.",
    "",
    ...unreachableRows(catalogue).map(
      (row) => `- \`${row.skill}\` cannot reach **${row.rule}** — ${row.reason}`,
    ),
    "",
    "## What each guard refuses, and the defect that earned it",
    "",
    ...catalogue.rules.flatMap((rule) => [
      `### ${rule.id} — \`${rule.decidedBy}\``,
      "",
      `**Refuses:** ${rule.refuses}`,
      "",
      `**Earned by:** ${rule.earnedBy}`,
      "",
      ...(rule.alsoReachedBy ? [`**Also reached by:** ${rule.alsoReachedBy}`, ""] : []),
    ]),
  ].join("\n");
}

if (import.meta.main) {
  const wanted = renderGuardsDoc(readCatalogue());
  const path = join(ROOT, "GUARDS.md");
  if (process.argv.includes("--check")) {
    const found = existsSync(path) ? readFileSync(path, "utf8") : "";
    if (found !== wanted) {
      console.error("GUARDS.md has drifted from the catalogue — run `bun run guards`");
      process.exit(1);
    }
    console.log("GUARDS.md matches the catalogue");
  } else {
    writeFileSync(path, wanted);
    console.log(`GUARDS.md ← ${readCatalogue().rules.length} guards`);
  }
}
