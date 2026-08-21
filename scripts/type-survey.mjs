// Regenerates `skills/storyboard/references/type-survey.md` — every visual type this
// toolchain holds a sheet for, what each is FOR in its own words, and which formats are proven on
// disk for it.
//
//   bun scripts/type-survey.mjs           writes the survey
//   bun scripts/type-survey.mjs --check   fails if the survey has drifted from the tree
//
// WHY THIS EXISTS. Forty type sheets ship in this repository (32 chart, 8 map), each answering
// what its type is for and when not to reach for it, and `twin/MATRIX.md` records which of them
// are proven in which format. Measured before this file was written, `grep -rn "references/types"
// skills/storyboard/` and `grep -rn "MATRIX" skills/` BOTH returned nothing: the editorial
// exchange had never heard of any of it. In the run that produced this work, three candidates were
// offered and all three were stacked-or-grouped bars of the same three numbers.
//
// WHY IT IS GENERATED INTO THE SKILL rather than read from where it lives. A script inside
// `storyboard` may not read `chart-beat/references/types/` — that path resolves inside
// another skill and `no-cross-skill-imports.test.ts` flags it whatever it points at, because a
// skill directory has to stay copy-pasteable on its own. Scripts under `twin/scripts/` are outside
// `skills/` and may read the whole tree, so the twin's established answer applies: generate the
// material into the skill and drift-check the copy, exactly as `matrix.mjs` does for `MATRIX.md`.
//
// WHAT IT PROVABLY DOES NOT TELL YOU. Whether a type SUITS the story in front of you — that is the
// exchange's judgement, made against the frozen profile. And "reachable" here means an artifact of
// that format exists on disk for that type somewhere in `proof/`; it is a coverage fact, never a
// quality one. Read `MATRIX.md`'s own header for the same caveat stated at more length.

import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { PROOF_FORMATS, readBeats } from "./matrix.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TWIN = join(HERE, "..");
const SKILLS = join(TWIN, "skills");

// Where the sheets live, and the medium each set describes. `map-web` and `scrolly` hold
// no sheets of their own: a map is a map whichever format renders it.
const SHEET_SETS = [
  { medium: "chart", dir: join(SKILLS, "chart-beat", "references", "types") },
  { medium: "map", dir: join(SKILLS, "map-beat", "references", "types") },
];

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

/** The first sentence of a paragraph, by the same reading both generated columns use. */
function firstSentence(paragraph) {
  for (let i = 0; i < paragraph.length; i++) {
    if (paragraph[i] !== ".") continue;
    const before = paragraph.slice(0, i + 1);
    if (ABBREVIATION.test(before)) continue;
    const after = paragraph.slice(i + 1);
    if (after === "" || /^\s+["“(]?[A-Z0-9]/.test(after)) return before;
  }
  return paragraph;
}

function flatten(text) {
  return text.replace(/\s+/g, " ").replace(/\*\*/g, "").trim();
}

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
  return firstSentence(purposeParagraph(text, file));
}

function purposeParagraph(text, file) {
  const section =
    /##\s*What it(?: is|'s) for\s*\r?\n+([\s\S]*?)(?:\r?\n\s*\r?\n|\r?\n##)/.exec(text) ??
    /^#[^\n]*\r?\n\s*\r?\n([\s\S]*?)(?:\r?\n\s*\r?\n|\r?\n##|$)/.exec(text);
  if (!section) throw new Error(`${file}: could not find the paragraph saying what this type is for`);
  return flatten(section[1]);
}

// ---------------------------------------------------------------------------------------------
// WHEN NOT TO REACH FOR IT — the other half of every sheet, which the exchange had never read.
//
// ROUND FOUR (2026-08-21), finding 24. The survey carried each sheet's *What it is for* sentence
// and nothing else, so `formatCandidates` could render a menu offering a SCATTER of six rows
// although `types/scatter.md` refuses that outright — "If there are fewer than about eight or ten
// points, a scatter is an expensive way to draw what a labelled dot-strip or a small table would
// show just as well — a cloud needs enough members to have a shape." The sentence was on disk the
// whole time; nothing carried it to the person choosing. Both halves are generated now.
// ---------------------------------------------------------------------------------------------

// Measured across the 40 sheets, the refusal sits in two shapes: under a heading spelled some
// variant of "When NOT to use it" / "When not to reach for it" (34), and — in the six sheets
// written as flat prose with no `##` headings — as the paragraph opening "Do not reach for it" or
// "Do not use it". Both are read; a sheet in a third shape fails loudly, because a type whose
// refusal quietly vanishes from the survey is the defect this section exists to end.
const REFUSAL_SECTION_RE = /##\s*When (?:NOT|not) to [^\n]*\r?\n+([\s\S]*?)(?:\r?\n\s*\r?\n|\r?\n##)/;
// ROUND SIX (2026-08-22), AB2. The `m` flag makes `$` match at every LINE end, so the lazy body
// stopped at the sheet's first wrapped line: `boxplot.md`'s refusal reached the survey as 19 of its
// 146 words. The anchor still needs `m` — the paragraph starts a line — so the terminator is the
// one that cannot mean "end of line": a blank line, or the end of the file and nothing after it.
const REFUSAL_FLAT_RE = /^((?:Do not|Don't) (?:reach for it|use it)[\s\S]*?)(?:\r?\n[ \t]*\r?\n|$(?![\s\S]))/m;

function refusalParagraph(text, file) {
  const section = REFUSAL_SECTION_RE.exec(text) ?? REFUSAL_FLAT_RE.exec(text);
  if (!section) throw new Error(`${file}: could not find the paragraph saying when NOT to reach for this type`);
  return flatten(section[1]);
}

// A REFUSAL IS THE WHOLE PARAGRAPH, NOT ITS OPENING SENTENCE (round six, AB2).
//
// The first version lifted one sentence and grew a special case for the two sheets that open with
// a fragment — `slope.md` with "Two points only." and `histogram.md` with "Do not use it to compare
// categories." That special case was the symptom. Measured across the corpus, the opening sentence
// is the whole refusal in NONE of the forty sheets: every one of them writes a hundred words or
// more, and what the opening sentence names is rarely the trap that stops the beat in front of you.
//
// `flow-map.md` is the case that paid for this. Its first sentence refuses a route drawn between
// two places with no journey between them; its SECOND refuses many-to-many origin-destination data
// — "a route is a SINGLE path with the territories it crosses, not a many-to-many flow" — which is
// the sentence, and the only sentence, that would have stopped `stress-ab-emigration-flows`, the
// beat with the highest defect count in six rounds. It was on disk the whole time. The generator
// dropped it.
//
// So nothing is selected here any more. The paragraph the sheet wrote is the paragraph that
// travels, flattened onto one line and otherwise untouched.

// A COUNT STATED IN PROSE THAT NO MACHINE CAN SEE IS THE SAME DEFECT ONE LAYER DOWN. A sheet whose
// refusal names a number of things it refuses below or above must ALSO declare it in the one
// machine-readable form this file reads, or the generator throws naming the sheet. The declaration
// sits beside the sentence it encodes, in the sheet itself, so the two cannot drift apart:
//
//     <!-- limit: rows < 8 -->
//
// Read as "this type refuses when <unit> <op> <n>". Only `rows` is a fact the frozen profile
// carries, so only `rows` is ENFORCED (in `formatCandidates`); every other unit — slices, bins,
// series, levels — travels to the journalist as a limit to check by hand, which is the honest
// answer about what a column profile can and cannot decide.
// The number word is a closed list on purpose: "more than ONE series" is a shape statement, not a
// stated ceiling, and a bare `[a-z]+` here made `area.md` fail the generator for saying it.
const STATED_COUNT_RE =
  /\b(?:fewer|more) than (?:about |roughly )?(?:two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|fifty|\d+)(?:[- ]?(?:or|to) (?:two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|twenty-five|thirty|fifty|\d+))? (?:points|rows|observations|categories|slices|series|bins|levels|periods)\b/i;
const LIMIT_RE = /<!--\s*limit:\s*([a-z]+)\s*([<>])\s*(\d+)\s*-->/g;

function limitsFor(text, refusal, file) {
  const limits = [...text.matchAll(LIMIT_RE)].map((m) => ({ unit: m[1], op: m[2], value: Number(m[3]) }));
  if (limits.length === 0 && STATED_COUNT_RE.test(refusal)) {
    throw new Error(
      `${file}: its refusal states a count in prose ("${STATED_COUNT_RE.exec(refusal)[0]}") and declares no machine-readable limit beside it. Add one, e.g. <!-- limit: rows < 8 -->`,
    );
  }
  return limits;
}

// TWO LABELS FOR ONE IDEA (finding 24, second half). `assertDistinctWays` compared NAMES, so it
// accepted ["Bar and column", "Lollipop", "Treemap"] as three ways of seeing one table — although
// `types/lollipop.md` opens by calling itself "a bar chart's thin sibling: same job ... Treat it
// as 'a bar, minus the fill' rather than as a different chart type with its own rules — because
// that's exactly what it is." A sheet that says so in prose declares it machine-readably too:
//
//     <!-- same idea as: Bar and column -->
//
// and a sheet whose purpose paragraph declares kinship without the marker fails here rather than
// letting the exchange offer one idea twice.
const KINSHIP_PROSE_RE = /\bthin sibling\b|\bsame job\b|rather than as a different chart type/i;
const SAME_IDEA_RE = /<!--\s*same idea as:\s*([^\n]+?)\s*-->/;

function sameIdeaFor(text, purpose, file) {
  const declared = SAME_IDEA_RE.exec(text);
  if (declared) return declared[1];
  if (KINSHIP_PROSE_RE.test(purpose)) {
    throw new Error(
      `${file}: its own opening paragraph says this type is another type's idea wearing a second label, and nothing says WHICH type machine-readably. Add <!-- same idea as: <the other type's title> --> beside that sentence.`,
    );
  }
  return null;
}

export function readTypeSheets() {
  const sheets = [];
  for (const { medium, dir } of SHEET_SETS) {
    for (const name of readdirSync(dir).sort()) {
      if (!name.endsWith(".md") || name === "README.md") continue;
      const file = join(dir, name);
      const text = readFileSync(file, "utf8");
      const title = text.split(/\r?\n/)[0].replace(/^#\s*/, "").trim();
      const purpose = purposeParagraph(text, file);
      const refusal = refusalParagraph(text, file);
      sheets.push({
        medium,
        title,
        sheet: `${medium === "chart" ? "chart-beat" : "map-beat"}/references/types/${name}`,
        aliases: aliasesFor(file, title),
        purpose: firstSentence(purpose),
        refusal,
        limits: limitsFor(text, refusal, file),
        sameIdeaAs: sameIdeaFor(text, purpose, file),
      });
    }
  }
  return sheets;
}

/**
 * Which formats are proven for a sheet, read the way `matrix.mjs` reads them and through its own
 * reader: an ARTIFACT EXISTS ON DISK, or the cell is empty. A brief declaring a format proves
 * nothing.
 */
export function provenFormats(sheet, beats) {
  const proven = new Set();
  for (const beat of beats) {
    if (!beat.type) continue;
    const beatTokens = tokens(beat.type);
    const matches = sheet.aliases.some(
      (alias) => sameTokens(alias, beatTokens) || sameTokens(alias, [...beatTokens].sort()),
    );
    if (!matches) continue;
    for (const format of beat.formats) proven.add(format);
  }
  return PROOF_FORMATS.filter((g) => proven.has(g));
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
    "**\"Proven\" means an artifact of that format EXISTS ON DISK** for that type, read through",
    "`matrix.mjs`'s own reader. An empty format column is not a refusal: reachability at the format gate",
    "is `format-catalog.mjs`'s `formatGap(medium, format)`, which answers for the medium as a whole. A",
    "type with no proven format is one nobody has rendered here yet, which is worth saying out loud",
    "rather than quietly omitting.",
    "",
    "The purpose column is each sheet's OWN opening sentence, verbatim, and the refusal column is",
    "that same sheet's WHOLE \"when NOT to reach for it\" paragraph, also verbatim. BOTH halves",
    "travel to the candidate menu: round four closed a storyboard slot on a scatter of six rows",
    "although `types/scatter.md` refuses that outright, because only the first half had ever been",
    "carried anywhere. Round six found the same defect one level down — only the opening SENTENCE",
    "of each refusal was carried, and `flow-map.md` refuses many-to-many origin-destination data in",
    "its second — so the paragraph now travels whole. Read the sheet itself before writing the beat",
    "— the sheet is where the trap that type falls into is written down.",
    "",
    "**`refuses when`** is the machine-readable form of a count a sheet states in prose, declared in",
    "the sheet beside the sentence it encodes. Only `rows` is a fact `source/profile.json` carries,",
    "so only `rows` is enforced (`formatCandidates` throws); a limit in any other unit — slices,",
    "levels — is carried to the journalist as something to check by hand.",
    "",
    "**`same idea as`** names the type this one IS, where a sheet says so itself: a lollipop is",
    "\"a bar, minus the fill\", in its own words. `assertDistinctWays` counts ideas, not labels, so a",
    "menu offering a bar and a lollipop as two ways of seeing one table is refused.",
    "",
  ];

  for (const medium of ["chart", "map"]) {
    const set = sheets.filter((s) => s.medium === medium);
    const reachable = set.filter((s) => provenFormats(s, beats).length > 0);
    lines.push(
      `## ${medium === "chart" ? "Chart" : "Map"} types — ${set.length} sheets, ${reachable.length} with at least one format proven on disk`,
      "",
      "| type | what it is for | when NOT to reach for it | refuses when | same idea as | proven formats | sheet |",
      "|---|---|---|---|---|---|---|",
    );
    for (const sheet of set) {
      const proven = provenFormats(sheet, beats);
      const limits = sheet.limits.map((l) => `${l.unit} ${l.op} ${l.value}`).join("; ");
      lines.push(
        `| **${sheet.title}** | ${sheet.purpose} | ${sheet.refusal} | ${limits || "—"} | ${sheet.sameIdeaAs ?? "—"} | ${proven.length ? proven.join(", ") : "— none rendered here yet"} | \`${sheet.sheet}\` |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function buildTypeSurvey() {
  return render(readTypeSheets(), readBeats());
}

if (import.meta.main) {
  const target = join(SKILLS, "storyboard", "references", "type-survey.md");
  const built = buildTypeSurvey();
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
}
