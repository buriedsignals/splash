// Regenerates `skills/twin-storyboard/references/type-survey.md` — every visual type this
// toolchain holds a sheet for, what each is FOR in its own words, and which genres are proven on
// disk for it.
//
//   bun scripts/type-survey.mjs           writes the survey
//   bun scripts/type-survey.mjs --check   fails if the survey has drifted from the tree
//
// WHY THIS EXISTS. Forty type sheets ship in this repository (32 chart, 8 map), each answering
// what its type is for and when not to reach for it, and `twin/MATRIX.md` records which of them
// are proven in which genre. Measured before this file was written, `grep -rn "references/types"
// skills/twin-storyboard/` and `grep -rn "MATRIX" skills/` BOTH returned nothing: the editorial
// exchange had never heard of any of it. In the run that produced this work, three candidates were
// offered and all three were stacked-or-grouped bars of the same three numbers.
//
// WHY IT IS GENERATED INTO THE SKILL rather than read from where it lives. A script inside
// `twin-storyboard` may not read `twin-chart-beat/references/types/` — that path resolves inside
// another skill and `no-cross-skill-imports.test.ts` flags it whatever it points at, because a
// skill directory has to stay copy-pasteable on its own. Scripts under `twin/scripts/` are outside
// `skills/` and may read the whole tree, so the twin's established answer applies: generate the
// material into the skill and drift-check the copy, exactly as `matrix.mjs` does for `MATRIX.md`.
//
// WHAT IT PROVABLY DOES NOT TELL YOU. Whether a type SUITS the story in front of you — that is the
// exchange's judgement, made against the frozen profile. And "reachable" here means an artifact of
// that genre exists on disk for that type somewhere in `proof/`; it is a coverage fact, never a
// quality one. Read `MATRIX.md`'s own header for the same caveat stated at more length.

import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { readBeats } from "./matrix.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TWIN = join(HERE, "..");
const SKILLS = join(TWIN, "skills");

// Where the sheets live, and the medium each set describes. `twin-map-web` and `twin-scrolly` hold
// no sheets of their own: a map is a map whichever genre renders it.
const SHEET_SETS = [
  { medium: "chart", dir: join(SKILLS, "twin-chart-beat", "references", "types") },
  { medium: "map", dir: join(SKILLS, "twin-map-beat", "references", "types") },
];

const GENRES = ["static", "web", "video", "scrolly"];

/** Lowercase word tokens, punctuation dropped — the shape both sides of the join are compared in. */
function tokens(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

const sameTokens = (a, b) => a.length === b.length && a.every((t, i) => t === b[i]);

/**
 * The names one sheet answers to, as token lists. Three of them, and each earns its place against
 * the real corpus: the title's head ("Area", from "Area (and stacked area)") matches the beat that
 * writes the plain name; the whole title with its parenthetical flattened ("flow map route")
 * matches the beat that writes the alternative first ("flow / route map"); the filename catches a
 * sheet whose title spells the type as two words where a brief spells it as one.
 */
function aliasesFor(file, title) {
  const head = title.replace(/^#\s*/, "").split("(")[0];
  return [tokens(head), tokens(title.replace(/^#\s*/, "")).sort(), tokens(basename(file, ".md"))];
}

const ABBREVIATION = /\b(?:e\.g|i\.e|vs|etc|approx|no|fig)\.$/i;

/**
 * The sheet's own opening sentence under "What it is for", VERBATIM — the type's purpose in the
 * words somebody already wrote and reviewed, never a paraphrase generated here. Line breaks inside
 * the paragraph are collapsed to single spaces; nothing else is touched.
 */
function purposeSentence(text, file) {
  // Measured across the 40 sheets, the purpose paragraph sits in three shapes: under a heading
  // spelled "What it is for" (22), under one spelled "What it's for" (12), and — in six sheets
  // written as flat prose with no `##` headings at all — as the first paragraph under the title.
  // All three are read. A sheet in a fourth shape fails loudly rather than being skipped, because
  // a type silently missing from the survey is the defect this file exists to end.
  const section =
    /##\s*What it(?: is|'s) for\s*\r?\n+([\s\S]*?)(?:\r?\n\s*\r?\n|\r?\n##)/.exec(text) ??
    /^#[^\n]*\r?\n\s*\r?\n([\s\S]*?)(?:\r?\n\s*\r?\n|\r?\n##|$)/.exec(text);
  if (!section) throw new Error(`${file}: could not find the paragraph saying what this type is for`);
  const paragraph = section[1]
    .replace(/\s+/g, " ")
    .replace(/\*\*/g, "")
    .trim();
  for (let i = 0; i < paragraph.length; i++) {
    if (paragraph[i] !== ".") continue;
    const before = paragraph.slice(0, i + 1);
    if (ABBREVIATION.test(before)) continue;
    const after = paragraph.slice(i + 1);
    if (after === "" || /^\s+["“(]?[A-Z0-9]/.test(after)) return before;
  }
  return paragraph;
}

function readSheets() {
  const sheets = [];
  for (const { medium, dir } of SHEET_SETS) {
    for (const name of readdirSync(dir).sort()) {
      if (!name.endsWith(".md") || name === "README.md") continue;
      const file = join(dir, name);
      const text = readFileSync(file, "utf8");
      const title = text.split(/\r?\n/)[0].replace(/^#\s*/, "").trim();
      sheets.push({
        medium,
        title,
        sheet: `${medium === "chart" ? "twin-chart-beat" : "twin-map-beat"}/references/types/${name}`,
        aliases: aliasesFor(file, title),
        purpose: purposeSentence(text, file),
      });
    }
  }
  return sheets;
}

/**
 * Which genres are proven for a sheet, read the way `matrix.mjs` reads them and through its own
 * reader: an ARTIFACT EXISTS ON DISK, or the cell is empty. A brief declaring a genre proves
 * nothing.
 */
function provenGenres(sheet, beats) {
  const proven = new Set();
  for (const beat of beats) {
    if (!beat.type) continue;
    const beatTokens = tokens(beat.type);
    const matches = sheet.aliases.some(
      (alias) => sameTokens(alias, beatTokens) || sameTokens(alias, [...beatTokens].sort()),
    );
    if (!matches) continue;
    for (const genre of beat.genres) proven.add(genre);
  }
  return GENRES.filter((g) => proven.has(g));
}

function render(sheets, beats) {
  const lines = [
    "# The type survey — what could be made of this data, and what is reachable",
    "",
    "**Generated — do not edit by hand.** `bun scripts/type-survey.mjs` rewrites this file;",
    "`bun scripts/type-survey.mjs --check` fails if it has drifted from the tree.",
    "",
    "Read this at movement ④, BEFORE any candidate is proposed. It is not a question and not a menu",
    "to read aloud: it is the ground the medium question stands on. Name the types the frozen profile",
    "could actually support — a type whose required shape the data cannot supply is listed to the",
    "journalist as not applicable, and why — and say of each whether this toolchain can reach it.",
    "",
    "**\"Proven\" means an artifact of that genre EXISTS ON DISK** for that type, read through",
    "`matrix.mjs`'s own reader. An empty genre column is not a refusal: reachability at the genre gate",
    "is `genre-catalog.mjs`'s `genreGap(medium, genre)`, which answers for the medium as a whole. A",
    "type with no proven genre is one nobody has rendered here yet, which is worth saying out loud",
    "rather than quietly omitting.",
    "",
    "The purpose column is each sheet's OWN opening sentence, verbatim. Read the sheet itself before",
    "writing the beat — the sheet is where the trap that type falls into is written down.",
    "",
  ];

  for (const medium of ["chart", "map"]) {
    const set = sheets.filter((s) => s.medium === medium);
    const reachable = set.filter((s) => provenGenres(s, beats).length > 0);
    lines.push(
      `## ${medium === "chart" ? "Chart" : "Map"} types — ${set.length} sheets, ${reachable.length} with at least one genre proven on disk`,
      "",
      "| type | what it is for | proven genres | sheet |",
      "|---|---|---|---|",
    );
    for (const sheet of set) {
      const proven = provenGenres(sheet, beats);
      lines.push(
        `| **${sheet.title}** | ${sheet.purpose} | ${proven.length ? proven.join(", ") : "— none rendered here yet"} | \`${sheet.sheet}\` |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

const target = join(SKILLS, "twin-storyboard", "references", "type-survey.md");
const built = render(readSheets(), readBeats());

if (process.argv.includes("--check")) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current !== built) {
    console.error("type-survey.md has drifted from the tree. Run: bun scripts/type-survey.mjs");
    process.exit(1);
  }
  console.log("type-survey.md matches the tree.");
} else {
  writeFileSync(target, built);
  console.log(`wrote ${target}`);
}
