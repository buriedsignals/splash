// FINDING 5 (stress round four): A BEAT DRAWN FROM A COUNT WITH A DENOMINATOR BESIDE IT SAYS WHICH
// READING IT DRAWS — IN ITS OWN BRIEF.md, WHERE THE NEXT READER LOOKS.
//
// Nothing in this tree reasoned about a count against its denominator until this round:
// `grep -rn "per capita|perCapita|denominator"` across skills/ and scripts/ returned nothing.
// `stress-q-safety-incidents` ranks five districts by `incidents` with `residents` in the next
// column — Centro leads on the raw count (412) and Sul leads per resident (233 per 100,000 against
// Centro's 205), so the article's headline is true one way and false the other.
// `stress-p-transport-ridership` inverts at the very top: Porto carries 416 trips per resident
// against Lisboa's 393. Four of the twenty-one frozen stories carry an explicit denominator, and of
// the four producers who met one, two found it unprompted and built the honest chart while the other
// two were never in a position to.
//
// `intake` now NAMES the candidate column and `storyboard`'s grounding REFUSES to confirm a
// raw-count superlative while one exists. This is the producing half, and it is the same doctrine
// one step further on: it reports, it does not repair. It never divides, never re-ranks, never says
// a beat drew the wrong number — it says only whether the beat WROTE DOWN which of the two readings
// it is drawing.
//
// AND IT MUST NOT BECOME A FALSE POSITIVE ON stress-a-energy-bills, which is why it is written this
// way. That story carries `households` beside `price_eur`, and its beat draws `price_eur` RAW —
// correctly, because a household energy bill is already a per-household figure, and dividing again
// would be nonsense. `reading: raw` is a complete, correct answer here. The rule asks a question; it
// does not have an opinion about the answer.
//
// DECLARED, NEVER INFERRED. The reading is read off a `reading:` line the BRIEF actually carries —
// bare, bulleted or in the `**Field**:` form the BRIEFs already use — never guessed from prose. A
// detector that sniffed a BRIEF for the word "per" would go green on "Per-capita framing smuggled in
// here" in a beat that draws the raw count, which is the same silence-dressed-as-confirmation this
// whole round is about. It is the contract `carriedBy`, `disciplineIsWritten` and `walkedByExists`
// all already read, one level down.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["denominatorReadingStated"];

/** A denominator, read off a column's own NAME — the same token list `intake/scripts/profile.mjs`
 *  and `storyboard/scripts/ground-claim.mjs` read it by, written out again here rather than
 *  imported, because this tree allows no cross-skill runtime import. */
const DENOMINATOR_NAME_TOKENS = new Set([
  "resident",
  "residents",
  "population",
  "populations",
  "inhabitant",
  "inhabitants",
  "habitant",
  "habitants",
  "household",
  "households",
  "menage",
  "menages",
  "ménage",
  "ménages",
  "pupil",
  "pupils",
  "student",
  "students",
  "μαθητής",
  "μαθητές",
  "eleve",
  "eleves",
  "élève",
  "élèves",
]);

const NAME_TOKEN_SPLIT_RE = /[^\p{L}\p{N}]+/u;
const YEAR_COLUMN_NAME_RE = /year|date|ann[ée]e/i;
const NUMERIC_VALUE_RE = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$|^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/i;

/** A `reading:` declaration as a BRIEF may write it: bare, bulleted, or in the `**Field**:` form
 *  the BRIEFs in this tree already use for `**Proves**` and `**One accent**`. The VALUE is one
 *  word (`raw`) or `per` and one column name — whatever the beat goes on to say after that is
 *  prose for a human, and is deliberately not parsed. */
const READING_LINE_RE = /^[ \t>]*(?:[-*+]\s*)?\**\s*reading\s*\**\s*:\s*(raw|per\s+[\p{L}\p{N}_]+)/imu;

const tokensOf = (name) => name.split(NAME_TOKEN_SPLIT_RE).filter(Boolean).map((t) => t.toLowerCase());
const namesADenominator = (name) => tokensOf(name).some((t) => DENOMINATOR_NAME_TOKENS.has(t));

/** One CSV line, split on commas outside double quotes, with doubled quotes read as one quote. */
function splitCsvLine(line) {
  const out = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(field); field = ""; }
    else field += c;
  }
  out.push(field);
  return out;
}

/** The story directory above a beat — the nearest ancestor holding a frozen `source/data.csv`.
 *  `null` for a beat that has none, which is every worked example under `proof/`: those carry their
 *  own `data.csv` beside the component and were never frozen by `intake`, so there is no table in
 *  which a column could sit "beside" another. */
function frozenTableAbove(beatDir) {
  let dir = beatDir;
  for (let depth = 0; depth < 8; depth++) {
    const csv = join(dir, "source", "data.csv");
    if (existsSync(csv)) return csv;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
  return null;
}

/**
 * WHETHER A BEAT SAYS WHICH READING IT DRAWS, when the frozen table above it puts a denominator
 * beside a count.
 *
 * Returns `{ applies }` alone when the question does not arise — no frozen table above the beat, or
 * no denominator-shaped column in it, or no measure left to read against one. When it does arise,
 * `applies` is true and the answer is `stated`, with `denominators` and `counts` naming the columns
 * that raised it and `reading` carrying the beat's own words back.
 *
 * REPORTING, NEVER REPAIR, and never an opinion about which reading is right: `raw` and
 * `per <column>` are equally complete answers. `stress-a-energy-bills` draws `price_eur` raw
 * BECAUSE a household bill is already a per-household figure, and this returns `stated: true` for
 * it the moment its BRIEF says so.
 */
export function denominatorReadingStated(beatDir) {
  const csvPath = frozenTableAbove(beatDir);
  if (!csvPath) return { applies: false, reason: "no frozen source/data.csv above this beat" };

  const lines = readFileSync(csvPath, "utf8").replace(/^﻿/, "").split(/\r\n|\r|\n/).filter((l) => l !== "");
  if (lines.length < 2) return { applies: false, reason: "the frozen table carries no rows" };
  const header = splitCsvLine(lines[0]).map((n) => n.trim());
  const body = lines.slice(1).map(splitCsvLine);
  const numeric = header.filter((name, index) => {
    const values = body.map((row) => (row[index] ?? "").trim()).filter((v) => v !== "");
    return values.length > 0 && values.every((v) => NUMERIC_VALUE_RE.test(v));
  });
  const denominators = numeric.filter(namesADenominator);
  if (denominators.length === 0) return { applies: false, reason: "no denominator-shaped column in the frozen table" };
  const counts = numeric.filter((name) => !namesADenominator(name) && !YEAR_COLUMN_NAME_RE.test(name));
  if (counts.length === 0) return { applies: false, reason: "the frozen table carries no measure to read against a denominator" };

  const briefPath = join(beatDir, "BRIEF.md");
  if (!existsSync(briefPath))
    return { applies: true, denominators, counts, stated: false, reading: null, reason: "the beat has no BRIEF.md to state a reading in" };
  const declared = READING_LINE_RE.exec(readFileSync(briefPath, "utf8"));
  if (!declared)
    return {
      applies: true,
      denominators,
      counts,
      stated: false,
      reading: null,
      reason: `BRIEF.md states no reading, and "${denominators[0]}" sits beside "${counts[0]}" in the frozen table — write "reading: raw" or "reading: per ${denominators[0]}"`,
    };
  const reading = declared[1].trim();
  if (/^raw$/i.test(reading)) return { applies: true, denominators, counts, stated: true, reading };
  const named = tokensOf(reading.replace(/^per\s+/i, ""));
  const matches = denominators.some((name) => tokensOf(name).some((t) => named.includes(t)));
  return {
    applies: true,
    denominators,
    counts,
    stated: matches,
    reading,
    ...(matches
      ? {}
      : { reason: `BRIEF.md states "${reading}", which names no column in the frozen table — the denominators there are ${denominators.map((n) => `"${n}"`).join(", ")}` }),
  };
}

/** Every beat directory whose own committed runner calls the named skill. A runner CALLS a skill
 *  when its source names that skill's `scripts/` directory or its vendored `#shared/` copy — the
 *  same pair `example-runners.mjs` reads, and the pair a rename of either would break together. */
export function beatsCalling(root, skill) {
  const found = new Set();
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.mjs$/.test(name)) {
        const source = readFileSync(path, "utf8");
        if (source.includes(`shared/${skill}/`) || source.includes(`skills/${skill}/scripts`)) found.add(dir);
      }
    }
  };
  for (const top of ["stories", "proof"]) walk(join(root, top));
  return [...found].map((dir) => relative(root, dir).split(sep).join("/")).sort();
}
