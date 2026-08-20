// The guard catalogue, read and rendered.
//
// `MATRIX.md` says which type × format cells have a rendered artefact; this says which guards each
// producing skill carries. Both are generated, both have a `--check`, and both exist so a reader
// sees the state without running anything.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Every skill that PRODUCES a visual. `deliver`, `storyboard`, `intake` and the rest shape or ship
 *  a beat; they never draw one, so a guard about a drawing cannot reach them. */
export const PRODUCING_SKILLS = [
  "chart-beat",
  "chart-web",
  "chart-video",
  "dw-beat",
  "map-beat",
  "map-web",
  "image-beat",
  "scrolly",
];

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

/** Every cell whose blankness was ARGUED rather than obvious — a guard retired after measurement, or
 *  a whole column blank because the format works differently. Nobody looks for a scroll step in a
 *  static chart, and a reason there would be noise; a reason here is what stops the next reader
 *  re-opening a question this chantier already measured and closed. */
export function unreachableRows(catalogue) {
  return catalogue.guards.flatMap((guard) =>
    Object.entries(guard.unreachable ?? {}).map(([skill, reason]) => ({
      guard: guard.id,
      skill,
      reason,
    })),
  );
}

/** Every cell a format is reachable by and does not carry — the debt, enumerated. */
export function owedRows(catalogue) {
  return catalogue.guards.flatMap((guard) =>
    Object.entries(guard.formats)
      .filter(([, state]) => state === "owed")
      .map(([skill]) => ({ guard: guard.id, skill })),
  );
}

export function renderGuardsDoc(catalogue) {
  const skills = PRODUCING_SKILLS;
  const cell = (guard, skill) =>
    guard.formats[skill] === "carried" ? "**R**" : guard.formats[skill] === "owed" ? "·" : "";
  const owed = owedRows(catalogue);
  return [
    "# The guards, and what each creation process carries",
    "",
    "**Generated — do not edit by hand.** `bun scripts/guards.mjs --write` rewrites this file;",
    "`bun scripts/guards.mjs --check` fails if it has drifted from the catalogue.",
    "",
    "A guard is listed for a skill only where the defect it catches is REACHABLE there. **R** means the",
    "skill's own verification scripts declare it; **·** means the defect can happen there and nothing",
    "checks it; blank means it cannot happen there at all — and where that blankness was argued rather",
    "than obvious, the argument is written out below the table.",
    "",
    `| guard | ${skills.join(" | ")} |`,
    `| --- | ${skills.map(() => "---").join(" | ")} |`,
    ...catalogue.guards.map(
      (guard) => `| ${guard.id} | ${skills.map((skill) => cell(guard, skill)).join(" | ")} |`,
    ),
    "",
    `## What is still owed — ${owed.length} cell${owed.length === 1 ? "" : "s"}`,
    "",
    owed.length
      ? owed.map((row) => `- \`${row.skill}\` owes **${row.guard}**`).join("\n")
      : "Nothing. Every format carries every guard it can reach.",
    "",
    `## Why a cell is blank, where the blankness was argued — ${unreachableRows(catalogue).length} of them`,
    "",
    "Only the cells a reader would otherwise re-open: one retired after being measured absent, or one",
    "belonging to a format that works differently end to end.",
    "",
    ...unreachableRows(catalogue).map(
      (row) => `- \`${row.skill}\` cannot reach **${row.guard}** — ${row.reason}`,
    ),
    "",
    "## What each guard refuses, and the defect that earned it",
    "",
    ...catalogue.guards.flatMap((guard) => [
      `### ${guard.id} — \`${guard.decidedBy}\``,
      "",
      `**Refuses:** ${guard.refuses}`,
      "",
      `**Earned by:** ${guard.earnedBy}`,
      "",
      ...(guard.alsoReachedBy ? [`**Also reached by:** ${guard.alsoReachedBy}`, ""] : []),
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
    console.log(`GUARDS.md ← ${readCatalogue().guards.length} guards`);
  }
}
