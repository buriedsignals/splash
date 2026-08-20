// The guard catalogue, read and rendered.
//
// `MATRIX.md` says which type × format cells have a rendered artefact; this says which guards each
// producing skill carries. Both are generated, both have a `--check`, and both exist so a reader
// sees the state without running anything.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCING_SKILLS, TRAITS, traitsOf } from "./traits.mjs";

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

/** Whether a skill's own SKILL.md or references/*.md WRITES a discipline's rule id, anywhere.
 *
 *  A discipline is prose, never a decision function: there is nothing to import and nothing to
 *  call, so this is the same DECLARED-NOT-INFERRED contract `carriedBy` reads for a guard, one
 *  level down — presence of the rule's own `id` as a literal substring, checked against the exact
 *  files an author actually opens (`SKILL.md`, everything under `references/`), and nothing more.
 *  `GUARDS.md` says so out loud: "Disciplines are checked for PRESENCE where an author reads them,
 *  and are not mechanically verified." This function IS that check — it does not read whether the
 *  rule is FOLLOWED, only whether it is written down where a reader of the skill would find it. */
export function disciplineIsWritten(skill, ruleId) {
  const dir = join(ROOT, "skills", skill);
  const files = [join(dir, "SKILL.md")];
  const refDir = join(dir, "references");
  if (existsSync(refDir))
    for (const name of readdirSync(refDir))
      if (name.endsWith(".md")) files.push(join(refDir, name));
  return files.some(
    (file) => existsSync(file) && readFileSync(file, "utf8").includes(ruleId),
  );
}

/** Whether a capability's own walking sweep exists where it claims to, and actually reads the
 *  detector it names.
 *
 *  A capability cell used to be confirmed by nothing more than a name sitting in an array: delete
 *  `map-web/test/accessible-table.test.ts` outright and every catalogue invariant stayed green,
 *  because `detect-accessible-table.mjs` still declared `tableCarriesTheMarks` and nothing checked
 *  that a SWEEP existed to call it against a delivered page. `walkedBy` is a path relative to the
 *  carrying skill's own directory — this reads that the file is THERE, and that its own text
 *  mentions the rule's `detectedBy` name, the same DECLARED-NOT-INFERRED contract `carriedBy` and
 *  `disciplineIsWritten` already read one level over. It does not read whether the sweep is
 *  correct, only whether one exists and is about the right function — `traits.test.ts`'s own
 *  both-directions witness is the mechanism that keeps THAT honest. */
export function walkedByExists(skill, rule) {
  if (!rule.walkedBy) return false;
  const file = join(ROOT, "skills", skill, rule.walkedBy);
  return existsSync(file) && readFileSync(file, "utf8").includes(rule.detectedBy);
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

/** The order a matrix appears in when its kind has any rules at all. A kind absent from the
 *  catalogue prints no heading and no empty table — an empty matrix teaches a reader nothing a
 *  missing heading does not already say. */
const KIND_ORDER = ["guard", "capability", "discipline"];

/** One matrix, for one kind, restricted to that kind's own rules. The first column is named after
 *  the kind so a reader scanning headings never has to check which table they are looking at. */
function matrixFor(catalogue, kind, skills, cell) {
  const rules = catalogue.rules.filter((rule) => rule.kind === kind);
  if (rules.length === 0) return [];
  return [
    `## ${kind}`,
    "",
    `| ${kind} | ${skills.join(" | ")} |`,
    `| --- | ${skills.map(() => "---").join(" | ")} |`,
    ...rules.map(
      (rule) => `| ${rule.id} | ${skills.map((skill) => cell(rule, skill)).join(" | ")} |`,
    ),
    "",
  ];
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
    "A rule is listed for a skill only where what it names is REACHABLE there — computed from the",
    "traits the skill declares. **R** means the skill's own verification scripts declare it; **·**",
    "means it can happen there and nothing checks it yet; blank means it cannot happen there at all",
    "— and where that blankness is a genuine exception rather than a missing trait, the argument is",
    "written out below the tables.",
    "",
    ...KIND_ORDER.flatMap((kind) => matrixFor(catalogue, kind, skills, cell)),
    "Disciplines are checked for PRESENCE where an author reads them, and are not mechanically verified.",
    "",
    `## What is still owed — ${owed.length} cell${owed.length === 1 ? "" : "s"}`,
    "",
    owed.length
      ? owed.map((row) => `- \`${row.skill}\` owes **${row.rule}**`).join("\n")
      : "Nothing. Every format carries every rule it can reach.",
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
    "## What each skill is",
    "",
    "WHY a rule reaches a skill, not restated from the matrices above: the traits",
    "`skills/doctrine/test/traits.test.ts` proves against each skill's own files. A rule REQUIRES",
    "some of these; a skill that carries all of them is reachable, computed, never typed.",
    "",
    `| skill | ${TRAITS.map((trait) => trait.id).join(" | ")} |`,
    `| --- | ${TRAITS.map(() => "---").join(" | ")} |`,
    ...skills.map((skill) => {
      const owned = traitsOf(skill);
      return `| ${skill} | ${TRAITS.map((trait) => (owned.includes(trait.id) ? "✓" : "")).join(" | ")} |`;
    }),
    "",
    "## What each rule refuses, and the defect that earned it",
    "",
    ...catalogue.rules.flatMap((rule) => [
      `### ${rule.id} — \`${rule.decidedBy ?? rule.detectedBy ?? rule.writtenIn}\``,
      "",
      rule.refuses
        ? `**Refuses:** ${rule.refuses}`
        : rule.offers
          ? `**Offers:** ${rule.offers}`
          : "",
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
