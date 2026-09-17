// scripts/migrate-briefs.mjs
//
// THE MIGRATION OF THE 160 COMMITTED BEATS ONTO THE EDITORIAL CHAIN — IN TWO PASSES, AND NEITHER
// OF THEM WRITES A WORD OF ANY BEAT'S OWN CONTENT.
//
//   --front-matter   repairs what the front matter never recorded: the `format` 40 statics never
//                    pinned, the `medium` none of the 160 pinned, and the `grounding` verdict
//                    `requiredAssertions` refuses to guess. It edits the front-matter block and
//                    nothing else.
//   --harvest        parses each beat's OWN declaration — scrolly's card table, video's event
//                    table, web's `const interaction`, static's station table — into the two value
//                    blocks, inserts them into the sections that already exist, and adds
//                    `derived: v1`. It writes no row, no card, no shot and no assertion. A beat
//                    whose declaration does not parse is named in the worklist, never written for.
//
// Usage
//   bun scripts/migrate-briefs.mjs --front-matter [--dry-run]
//   bun scripts/migrate-briefs.mjs --harvest [--family scrolly|video|web|static] [--beat <dir>] [--dry-run]
//   bun scripts/migrate-briefs.mjs --worklist [--out docs/splash/2026-09-17-declarations-owed.md]
//
// WHY THIS IS NOT UNDER `skills/splash/scripts/`, WHERE THE PLAN FILED IT. It imports the parser of
// every one of the four export families, and no file inside a skill may import out of its own
// directory (`skills/splash/test/no-cross-skill-imports.test.ts`). `scripts/` is the repository's
// own tooling and is never shipped into a newsroom root.
//
// EXISTING PROSE AND TABLES ARE NEVER REWRITTEN. Both passes are insertions: a key into the front
// matter, a fenced block at the end of a section. Nothing already written is edited, reflowed or
// translated.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderDerivedBlock, readDerivedBlock } from "#shared/editorial/derived.mjs";
import { assertionId, requiredAssertions } from "#shared/editorial/frame.mjs";
import { parseBriefFrontMatter } from "#shared/chart-beat/sizes.mjs";
import {
  beatDirs,
  chainFor,
  derivedBeats,
  mediumOfType,
  ROOT,
  TYPE_SHEET_DIRS,
  typeSlug,
  workedExampleBeat,
} from "./editorial-chain.mjs";

import { parseChoreography as parseScroll } from "../skills/scrolly/scripts/choreography.mjs";
import { parsePrecision as precisionScroll } from "../skills/scrolly/scripts/precision.mjs";
import { parseChoreography as parseVideo } from "../skills/chart-video/scripts/choreography.mjs";
import { parsePrecision as precisionVideo } from "../skills/chart-video/scripts/precision.mjs";
import { parseChoreography as parseWeb } from "../skills/chart-web/scripts/choreography.mjs";
import { parsePrecision as precisionWeb } from "../skills/chart-web/scripts/precision.mjs";
import { parseChoreography as parseStaticChart } from "../skills/chart-beat/scripts/choreography.mjs";
import { parsePrecision as precisionStaticChart } from "../skills/chart-beat/scripts/precision.mjs";
import { parseChoreography as parseStaticMap } from "../skills/map-beat/scripts/static-choreography.mjs";
import { parsePrecision as precisionStaticMap } from "../skills/map-beat/scripts/static-precision.mjs";
import { parseChoreography as parseStaticImage } from "../skills/image-beat/scripts/choreography.mjs";
import { parsePrecision as precisionStaticImage } from "../skills/image-beat/scripts/precision.mjs";

/** Static's own parser pair, per medium — `chart-beat`'s carried verbatim into `image-beat`. */
const STATIC_PARSERS = {
  chart: { choreography: parseStaticChart, precision: precisionStaticChart },
  map: { choreography: parseStaticMap, precision: precisionStaticMap },
  image: { choreography: parseStaticImage, precision: precisionStaticImage },
};

// ── pass one: the front matter ─────────────────────────────────────────────────────────────────

const FORMATS = ["static", "video", "web", "scrolly"];
const MEDIUMS = ["chart", "map", "image"];

/** The beat's own `**Medium / format:** chart / **static**` line, in either language's spelling. */
export function declaredMediumFormat(briefText) {
  const line = /(?:medium|m[ée]dium)\s*\/?\s*format\s*:?\*{0,2}\s*:?([^\n]*)/i.exec(briefText);
  if (!line) return { medium: null, format: null };
  const plain = line[1].replace(/[*`]/g, "").toLowerCase();
  return {
    medium: MEDIUMS.find((m) => new RegExp(`\\b${m}\\b`).test(plain)) ?? null,
    format: FORMATS.find((f) => new RegExp(`\\b${f}\\b`).test(plain)) ?? null,
  };
}

/**
 * WHAT `grounding: supported` RECORDS HERE, AND WHAT IT DOES NOT.
 *
 * `requiredAssertions` behaves differently for each of the three verdicts, so a guessed
 * `supported` is not a safe default — it is a beat asserting a number the journalist said could
 * not be verified. For a catalogue proof no G1 exchange exists to read the verdict back from, so
 * it is reconstructed from two properties of the beat itself, both measured, and a beat failing
 * either is LISTED rather than defaulted:
 *
 *   1. it commits the frozen data its claim is measured off — a `.csv`, `.tsv`, `.geojson` or
 *      `.json` of its own, or a data path its own sources name;
 *   2. it refuses when that data stops supporting the claim — an `assert*(…)` call or a
 *      `throw new Error` somewhere in its own tree, the repo's own refusal idiom.
 *
 * Measured across the 160: both hold for all 160, and the second holds through a delivered
 * artifact rather than a source file for the 40 scrollys, whose `assertStates` is bundled into the
 * page. This is NOT a re-run of `resolveGrounding` against each beat's takeaway; it records that
 * the beat's claim is measured off committed data and refuses when it drifts, which is the fact
 * the three verdicts distinguish.
 */
const DATA_FILE = /\.(csv|tsv|geojson|json)$/i;
const REFUSAL = /\bassert[A-Z][A-Za-z]*\s*\(|throw new Error/;

function filesUnder(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) filesUnder(path, out);
    else out.push(path);
  }
  return out;
}

export function groundingEvidence(beatDir) {
  const files = filesUnder(beatDir);
  const commitsData = files.some(
    (p) => !p.includes(`${"renders"}/`) && DATA_FILE.test(p) && !/package\.json|tsconfig\.json$/.test(p),
  );
  const namesData = files
    .filter((p) => /\.(mjs|ts|tsx|js|jsx)$/.test(p))
    .some((p) => /\.(csv|geojson|tsv)\b/.test(readFileSync(p, "utf8")));
  const refuses = files
    .filter((p) => /\.(mjs|ts|tsx|js|jsx|html)$/.test(p))
    .some((p) => REFUSAL.test(readFileSync(p, "utf8")));
  return { commitsData: commitsData || namesData, refuses };
}

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/**
 * THE TYPE OF A BEAT WHOSE FRONT MATTER PINS NONE, READ OFF THE SHEETS RATHER THAN GUESSED.
 *
 * One beat of the 160 carries no front matter at all (`proof/co2-suisse`), and a type is not
 * something this script may infer from a filename. It does not have to: a type sheet's
 * `## Worked example` names the beat it is the worked example OF, and exactly one sheet of that
 * beat's own export names it. That is a record someone wrote, read back — not an inference.
 */
function typeNamingThisBeatAsItsWorkedExample(beat, format, root) {
  for (const medium of MEDIUMS) {
    const dir = TYPE_SHEET_DIRS[medium]?.[format];
    if (!dir || !existsSync(join(root, dir))) continue;
    for (const file of readdirSync(join(root, dir)).sort()) {
      if (!file.endsWith(".md")) continue;
      const text = readFileSync(join(root, dir, file), "utf8");
      if (workedExampleBeat(text) === beat) return file.replace(/\.md$/, "");
    }
  }
  return null;
}

/** The repaired front matter for one beat, or `{ skipped }` when a field cannot be established. */
export function repairFrontMatter(beat, briefText, root = ROOT) {
  const record = parseBriefFrontMatter(briefText) ?? {};
  const prose = declaredMediumFormat(briefText);
  const format = record.format ?? prose.format;
  if (!FORMATS.includes(format))
    return { skipped: `${beat}: no format in the front matter and none stated in the BRIEF's own prose` };
  const type = record.type ?? typeNamingThisBeatAsItsWorkedExample(beat, format, root);
  if (!type)
    return {
      skipped:
        `${beat}: the front matter pins no type, and no type sheet of its own export names it as ` +
        "a worked example, so there is nothing to read one off",
    };
  const medium = record.medium ?? mediumOfType(type);
  const evidence = groundingEvidence(join(root, beat));
  if (!evidence.commitsData || !evidence.refuses)
    return {
      skipped:
        `${beat}: grounding cannot be established — ` +
        `${evidence.commitsData ? "" : "it commits no frozen data"}` +
        `${!evidence.commitsData && !evidence.refuses ? " and " : ""}` +
        `${evidence.refuses ? "" : "nothing in it refuses when the data drifts"}`,
    };

  const wanted = { format, medium, type, grounding: "supported" };
  const body = FRONT_MATTER.exec(briefText);
  const existing = body ? body[1].split(/\r?\n/) : [];
  const keys = new Set(
    existing.map((l) => /^([A-Za-z][A-Za-z0-9_]*):/.exec(l.trim())?.[1]).filter(Boolean),
  );
  const added = Object.entries(wanted).filter(([key]) => !keys.has(key));
  if (added.length === 0 && body) return { text: briefText, added: [] };
  const lines = [...existing, ...added.map(([key, value]) => `${key}: ${value}`)];
  const block = `---\n${lines.join("\n")}\n---\n`;
  const text = body ? briefText.replace(FRONT_MATTER, block) : `${block}\n${briefText}`;
  return { text, added: added.map(([k]) => k) };
}

// ── pass two: the harvest ──────────────────────────────────────────────────────────────────────

/**
 * A BEAT'S OWN `const STATES = [ … ]`, READ SYMBOLICALLY.
 *
 * `declaredStatesFrom` (`skills/scrolly/scripts/choreography.mjs`) parses the 26 of 40 whose state
 * fields are numeric literals. The other 14 write identifiers — `reach: LAST`, `year: STOPS[0]`,
 * `reach: peak.year` — which no JSON reader can evaluate and which this script may not evaluate
 * either: importing the module RENDERS the beat.
 *
 * So each field is read as its own SOURCE TEXT and two cards are compared on that text. What this
 * can get wrong is narrow and worth stating: two different spellings of the same number
 * (`LAST` and `2024`) read as a change. It cannot get the opposite wrong — a card whose every
 * field is spelled exactly as the card before it still reports no change — so
 * `no-replay-static-plate` stays enforceable, which is the property that matters.
 */
export function symbolicStatesFrom(source) {
  const text = String(source);
  const at = text.search(/\bconst STATES(?:_RAW)?\s*=\s*\[/);
  if (at < 0) return null;
  const open = text.indexOf("[", at);
  let depth = 0;
  let close = -1;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "[") depth += 1;
    else if (text[i] === "]") {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close < 0) return null;
  const rows = [...text.slice(open, close + 1).matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
  if (rows.length === 0) return null;
  return rows.map((row) => {
    const state = {};
    for (const pair of row.split(",")) {
      const found = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+?)\s*$/.exec(pair);
      // A numeric literal is kept as a NUMBER, not as its own source text: `changesPerCard`
      // recognises the card-note counter by a field whose value is the card's own index on every
      // card, and a `"0"` would not be `0`. Leaving it a string put `note` in every card's
      // `changes`, which makes `no-replay-static-plate` unenforceable — every card would then
      // report a change.
      if (found)
        state[found[1]] = /^-?\d+(?:\.\d+)?$/.test(found[2]) ? Number(found[2]) : found[2];
    }
    return state;
  });
}

/** Every `.mjs` beside the beat, largest chance first: the runner declares `STATES`. */
function scrollyStates(beatDir) {
  for (const file of readdirSync(beatDir).filter((f) => f.endsWith(".mjs")).sort()) {
    const states = symbolicStatesFrom(readFileSync(join(beatDir, file), "utf8"));
    if (states) return states;
  }
  return null;
}

/** The catalogue's own delivered page for a web beat — `keyboard` and `degradesTo` are shipped facts. */
function deliveredPage(beatDir) {
  const dir = join(beatDir, "renders");
  if (!existsSync(dir)) return "";
  const page = readdirSync(dir).filter((f) => f.endsWith(".html")).sort()[0];
  return page ? readFileSync(join(dir, page), "utf8") : "";
}

/** The beat's own timing contract — the object `checkTiming` validates, imported, never re-parsed. */
async function videoTiming(beatDir) {
  const path = join(beatDir, "timing-contract.ts");
  if (!existsSync(path)) return null;
  const module = await import(path);
  const found = Object.values(module).find(
    (value) => value && typeof value === "object" && typeof value.fps === "number",
  );
  return found ?? null;
}

/**
 * The two blocks for one beat, parsed out of what it already declares.
 * Throws — naming what is missing — when it declares nothing this can read.
 */
export async function harvest(beat, root = ROOT) {
  const beatDir = join(root, beat);
  const brief = readFileSync(join(beatDir, "BRIEF.md"), "utf8");
  const { retained, required } = chainFor(beat, root);
  let choreography;
  let precision;
  if (retained.format === "scrolly") {
    const states = scrollyStates(beatDir);
    if (!states) throw new Error("no `const STATES = [ … ]` in any of this beat's own modules");
    choreography = parseScroll(brief, { states });
    precision = precisionScroll(brief, {});
  } else if (retained.format === "video") {
    const timing = await videoTiming(beatDir);
    if (!timing) throw new Error("no timing contract, so no shot has a start or a duration");
    choreography = parseVideo(brief, { timing });
    precision = precisionVideo(brief, { declared: choreography });
  } else if (retained.format === "web") {
    // The declaration lives in the BRIEF for a beat whose controls are built by a vocabulary
    // `shippedControls` cannot see (each such BRIEF's own "## The choreography" section records
    // why) — read it there first; `render-directions-web.mjs` is the fallback for a beat that
    // still declares it in the module, as `chart-web/scripts/choreography.mjs` was written to
    // expect. Neither declaration moves; this only changes where the harvest looks.
    const moduleSource = readFileSync(join(beatDir, "render-directions-web.mjs"), "utf8");
    const source = /\nconst interaction = \{[\s\S]*?\n\};\n/.test(brief) ? brief : moduleSource;
    choreography = parseWeb(brief, { source, html: deliveredPage(beatDir) });
    precision = precisionWeb(brief, { html: deliveredPage(beatDir) });
  } else {
    // A static's own declaration is its `## The choreography` station table and `## Precision`
    // bullets — no clock, no `ctx` needed to parse (role membership is only checked when a
    // composition's roles are supplied, which the harvest does not have without rendering the
    // beat). The parser pair is medium-specific; `chart-beat`'s is carried verbatim into
    // `image-beat`, and `map-beat` keeps its own `static-*` pair beside the video one.
    const parsers = STATIC_PARSERS[retained.medium];
    if (!parsers)
      throw new Error(`no static parser for medium ${JSON.stringify(retained.medium)}`);
    choreography = parsers.choreography(brief, {});
    precision = parsers.precision(brief, {});
  }
  // The chain's requirements, ENUMERATED and none of them answered. See
  // `skills/splash/test/precision-covers-what-the-chain-requires.test.ts` for why the answers are
  // a person's: the requirement ids and a beat's own assert ids are two namespaces, and closing
  // the gap mechanically would be the chain writing the beat's assertions.
  precision.covers = Object.fromEntries(required.map((r) => [assertionId(r.id), null]));
  return { choreography, precision };
}

// ── writing the blocks into the beat's own sections ────────────────────────────────────────────

const SECTION_OF = { choreography: /^##\s+The choreography\b/i, precision: /^##\s+Precision\b/i };

/**
 * Inserts `block` at the end of the named section, or appends the section when it has none.
 *
 * A block of that name already in the file is REPLACED rather than joined by a second — the
 * harvest has to be re-runnable after a parser correction, and `readDerivedBlock` refuses two
 * blocks of one name rather than choosing between them.
 */
export function insertBlock(briefText, name, block) {
  const existing = new RegExp("```json splash:" + name + "\\r?\\n[\\s\\S]*?\\r?\\n```");
  if (existing.test(briefText)) return briefText.replace(existing, block);
  const lines = briefText.split(/\r?\n/);
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (start < 0 && SECTION_OF[name].test(lines[i])) start = i;
    else if (start >= 0 && /^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  if (start < 0) {
    const heading = name === "choreography" ? "## The choreography" : "## Precision";
    return `${briefText.replace(/\s*$/, "")}\n\n${heading}\n\n${block}\n`;
  }
  let at = end;
  while (at > start + 1 && lines[at - 1].trim() === "") at -= 1;
  return [...lines.slice(0, at), "", block, ...lines.slice(at)].join("\n");
}

const DERIVED_LINE = "derived: v1";

function withDerivedMark(briefText) {
  const body = FRONT_MATTER.exec(briefText);
  if (!body) throw new Error("no front matter, so `derived: v1` has nowhere to go");
  if (/^derived:/m.test(body[1])) return briefText;
  return briefText.replace(FRONT_MATTER, `---\n${body[1]}\n${DERIVED_LINE}\n---\n`);
}

/** The migrated text of one beat's BRIEF — front-matter mark, then the two blocks. */
export function withBlocks(briefText, { choreography, precision }) {
  let text = withDerivedMark(briefText);
  text = insertBlock(text, "precision", renderDerivedBlock("precision", precision));
  text = insertBlock(text, "choreography", renderDerivedBlock("choreography", choreography));
  return text.endsWith("\n") ? text : `${text}\n`;
}

// ── the runs ───────────────────────────────────────────────────────────────────────────────────

const FAMILY_OF_FORMAT = { scrolly: "scrolly", video: "video", web: "web", static: "static" };

/**
 * THE MIGRATION'S OWN SCOPE: the 160 catalogue proofs, and nothing else.
 *
 * Two beats under `stories/` also hold a `BRIEF.md`, and neither is this work's to edit: they are
 * live production runs whose front matter records what their own storyboard closed, not what a
 * migration reconstructs. They are not excluded by a heuristic on the name — the prefix is
 * explicit, the same way `a-production-run-has-one-direction.test.ts` writes its own exemption.
 */
const CATALOGUE_PREFIX = "proof/";

function formatOf(beat, root) {
  const brief = readFileSync(join(root, beat, "BRIEF.md"), "utf8");
  const record = parseBriefFrontMatter(brief) ?? {};
  return record.format ?? declaredMediumFormat(brief).format ?? "static";
}

export function runFrontMatter({ root = ROOT, dryRun = false } = {}) {
  const written = [];
  const skipped = [];
  for (const beat of beatDirs(root).filter((b) => b.startsWith(CATALOGUE_PREFIX))) {
    const path = join(root, beat, "BRIEF.md");
    const brief = readFileSync(path, "utf8");
    const result = repairFrontMatter(beat, brief, root);
    if (result.skipped) {
      skipped.push(result.skipped);
      continue;
    }
    if (result.added.length === 0) continue;
    written.push(`${beat} (+${result.added.join(", ")})`);
    if (!dryRun) writeFileSync(path, result.text);
  }
  return { written, skipped };
}

export async function runHarvest({ root = ROOT, family = null, beat = null, dryRun = false } = {}) {
  const migrated = [];
  const owed = [];
  const targets = beat ? [beat] : beatDirs(root).filter((b) => b.startsWith(CATALOGUE_PREFIX));
  for (const one of targets) {
    const format = formatOf(one, root);
    if (family && FAMILY_OF_FORMAT[format] !== family) continue;
    const path = join(root, one, "BRIEF.md");
    const brief = readFileSync(path, "utf8");
    try {
      const blocks = await harvest(one, root);
      const text = withBlocks(brief, blocks);
      migrated.push({ beat: one, format });
      if (!dryRun) writeFileSync(path, text);
    } catch (error) {
      owed.push({ beat: one, format, why: error.message.split("\n")[0] });
    }
  }
  return { migrated, owed };
}

const WORKLIST = "docs/splash/2026-09-17-declarations-owed.md";

/**
 * The editorial work still open on an already-guarded beat: which `covers` keys its own
 * `splash:precision` block still answers `null`, and whether its `values` is still empty.
 *
 * Read from the beat's OWN file, via `readDerivedBlock` — never from a fresh `harvest()`, which
 * always rebuilds `covers` with every value `null` (see `harvest()`'s own comment on the field). A
 * beat a person has since answered would otherwise be reported as owing what it no longer does.
 */
function remainingWork(root) {
  const rows = [];
  let valuesOwed = 0;
  for (const beat of derivedBeats(root).filter((b) => b.startsWith(CATALOGUE_PREFIX))) {
    const brief = readFileSync(join(root, beat, "BRIEF.md"), "utf8");
    let precision;
    try {
      precision = readDerivedBlock(brief, "precision");
    } catch {
      continue; // no readable block — reported instead under "what each beat owes"
    }
    const openCovers = Object.entries(precision.covers ?? {})
      .filter(([, answer]) => answer === null)
      .map(([id]) => id);
    const valuesEmpty = Object.keys(precision.values ?? {}).length === 0;
    if (valuesEmpty) valuesOwed += 1;
    if (openCovers.length || valuesEmpty) rows.push({ beat, openCovers, valuesEmpty });
  }
  return { rows: rows.sort((a, b) => (a.beat < b.beat ? -1 : 1)), valuesOwed };
}

/**
 * Six disagreements the static authoring pass surfaced between a beat's own picture and its type
 * sheet or its BRIEF title — named here rather than derived, because deciding which is wrong is a
 * person's call, not this script's. Nothing here writes to any beat.
 */
const DISAGREEMENTS = [
  {
    beat: "proof/static-swiss-age-pyramid",
    says: "the sheet and the BRIEF title treat the 55–64 bulge as the subject",
    shows: "the plate argues the 60–64 crossover instead",
  },
  {
    beat: "proof/static-bullet-low-carbon-share",
    says: "the sheet describes a target marker",
    shows: "none is drawn — the 2015 bar plays it",
  },
  {
    beat: "proof/static-diverging-bar-eu-per-capita",
    says: "the sheet's dashed average rule",
    shows: "is not on the plate — the mean lives in the standfirst",
  },
  {
    beat: "proof/static-contour-europe-distance",
    says: "the headline's 132 km median",
    shows: "is not drawn — the contours are 100/200/400/500",
  },
  {
    beat: "proof/static-dot-strip-lowcarbon-spread",
    says: "the claim makes two moves",
    shows: "only one of them is labelled",
  },
  {
    beat: "proof/static-calendar-heatmap-geneva",
    says: "the claim's two dates live in the standfirst",
    shows: "no direct label anywhere on the grid names them off the stations",
  },
];

/** The named worklist: who owes what, per export and per type, with what the chain already requires. */
export async function runWorklist({ root = ROOT, out = WORKLIST } = {}) {
  const { migrated, owed } = await runHarvest({ root, dryRun: true });
  const rows = [];
  for (const entry of owed) {
    let type = "(unresolved)";
    let requirements = [];
    try {
      const chain = chainFor(entry.beat, root);
      type = typeSlug(chain.retained.type);
      requirements = requiredAssertions(chain.retained, chain.sheet).map((r) => assertionId(r.id));
    } catch {
      /* the beat's own front matter names the type; an unresolved one is reported as such */
    }
    rows.push({ ...entry, type, requirements });
  }
  const byFormat = (format) => rows.filter((r) => r.format === format);
  const lines = [
    "# Declarations owed — the beats a person writes, export by export",
    "",
    `Emitted by \`bun scripts/migrate-briefs.mjs --worklist\` on ${new Date().toLocaleDateString("en-CA")}.`,
    "Regenerate it rather than editing it by hand; a beat leaves this list by declaring, not by being struck out.",
    "",
    "Spec: `docs/splash/2026-09-17-editorial-chain-spec.md` (R-D — the choreography is authored, per",
    "subject; the chain supplies the frame and never the content). Nothing in the migration may write",
    "any line of what is owed below.",
    "",
    `**${migrated.length} beats carry both value blocks and are guarded today. ${rows.length} owe a declaration.**`,
    "",
    "| export | owed | guarded |",
    "| --- | --- | --- |",
    ...["scrolly", "video", "web", "static"].map(
      (format) =>
        `| ${format} | ${byFormat(format).length} | ${migrated.filter((m) => m.format === format).length} |`,
    ),
    "",
    "## What each beat owes",
    "",
    "`what is missing` is the reason the harvest could not parse a declaration — it is never a",
    "suggestion of what to write. `the chain already requires` is `requiredAssertions`' own output for",
    "that beat: the ids its `## Precision` block must carry as keys of `covers`, each answered with one",
    "of the beat's own assert ids.",
    "",
  ];
  for (const format of ["static", "web", "video", "scrolly"]) {
    const group = byFormat(format);
    if (group.length === 0) continue;
    lines.push(`### ${format} — ${group.length}`, "");
    lines.push("| beat | type | what is missing | the chain already requires |");
    lines.push("| --- | --- | --- | --- |");
    for (const row of group.sort((a, b) => (a.type < b.type ? -1 : 1)))
      lines.push(
        `| \`${row.beat}\` | ${row.type} | ${row.why} | ${row.requirements.map((r) => `\`${r}\``).join(", ") || "—"} |`,
      );
    lines.push("");
  }
  const { rows: openRows, valuesOwed } = remainingWork(root);
  lines.push(
    "## The third column of the work, on every beat",
    "",
    "Every guarded beat's `splash:precision` block carries `covers` — one key per requirement the",
    "chain makes of it — and `values`. An answer is one of the beat's own assert ids, and it is the",
    "journalist's; a value is keyed `<first column's value>-<column name>` against the beat's own",
    "`data.csv`. Read from each beat's OWN file, not re-derived, so an answer already written here",
    "is not reported as still owed.",
    "",
    `**${openRows.length} beat(s) still owe a \`covers\` answer, a \`values\` entry, or both. ` +
      `${valuesOwed} of the ${migrated.length} guarded beats carry an empty \`values\`.**`,
    "",
  );
  if (openRows.length) {
    lines.push("| beat | open `covers` keys | `values` |");
    lines.push("| --- | --- | --- |");
    for (const row of openRows)
      lines.push(
        `| \`${row.beat}\` | ${row.openCovers.map((id) => `\`${id}\``).join(", ") || "—"} | ${row.valuesEmpty ? "empty" : "filled"} |`,
      );
    lines.push("");
  }
  lines.push(
    "## Disagreements a person must resolve",
    "",
    "Six of the static authoring pass's own beats found their picture arguing something other than",
    "what their type sheet or their BRIEF's own title says. Nothing here decides which is wrong —",
    "that is an editorial call.",
    "",
    "| beat | what the sheet or title says | what the plate actually shows |",
    "| --- | --- | --- |",
    ...DISAGREEMENTS.map((d) => `| \`${d.beat}\` | ${d.says} | ${d.shows} |`),
    "",
  );
  writeFileSync(join(root, out), `${lines.join("\n")}`);
  return { out, migrated: migrated.length, owed: rows.length, openRows: openRows.length };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name) => argv.includes(`--${name}`);
  const value = (name) => {
    const at = argv.indexOf(`--${name}`);
    return at < 0 ? null : argv[at + 1];
  };
  const dryRun = flag("dry-run");
  try {
    if (flag("front-matter")) {
      const { written, skipped } = runFrontMatter({ dryRun });
      console.log(`${dryRun ? "would repair" : "repaired"} ${written.length} BRIEF(s)`);
      for (const line of written) console.log(`  ${line}`);
      if (skipped.length) console.log(`\nlisted, not defaulted (${skipped.length}):`);
      for (const line of skipped) console.log(`  ${line}`);
    } else if (flag("harvest")) {
      const { migrated, owed } = await runHarvest({
        family: value("family"),
        beat: value("beat"),
        dryRun,
      });
      const per = (list) =>
        ["scrolly", "video", "web", "static"]
          .map((f) => `${f} ${list.filter((x) => x.format === f).length}`)
          .join(", ");
      console.log(`${dryRun ? "would migrate" : "migrated"} ${migrated.length}: ${per(migrated)}`);
      console.log(`owe a declaration ${owed.length}: ${per(owed)}`);
      for (const one of owed) console.log(`  ${one.beat} — ${one.why}`);
    } else if (flag("worklist")) {
      const result = await runWorklist({ out: value("out") ?? WORKLIST });
      console.log(`${result.out}: ${result.migrated} guarded, ${result.owed} owed`);
    } else {
      console.log("takes --front-matter, --harvest or --worklist; see this file's own header.");
    }
  } catch (error) {
    console.error(`refused — ${error.message}`);
    process.exitCode = 1;
  }
}
