#!/usr/bin/env bun
/**
 * THE MULTILINGUAL LABEL TABLE, MEASURED ONCE AND VENDORED — round six, task LANG.
 *
 * WHAT THIS EXISTS FOR. Three lexicons in this toolchain decide something by matching a WORD
 * against a list: `intake`'s denominator tokens (and its eight producer copies), `storyboard`'s
 * `isShareColumn`, and `palette`'s `SUBJECT_CONVENTIONS`. Each of them is a list of NAMES FOR A
 * CONCEPT, and each was written in the languages its first story happened to be in. A concept has
 * names in every language, so the list can be measured rather than remembered.
 *
 * WHY WIKIDATA AND NOT CLDR — measured, not assumed, before a line of this was written:
 *
 *   CLDR. `cldr-units-full/main/nl/units.json` carries 269 unit keys. Probed for the twelve
 *   concepts these three lexicons key on, it answers ONE of them: `concentr-percent` ("procent").
 *   `population`, `household`, `student`, `pupil`, `resident`, `inhabitant`, `water`, `coal`,
 *   `wind`, `heat`, `proportion`, `share` and `rate` are all ABSENT — CLDR's other locale data is
 *   language, territory, script and currency NAMES plus date fields, none of which is a concept
 *   any of these three lexicons asks about. 1 of 12 is not a source for this.
 *
 *   Wikidata. Entity labels and aliases, per language. Measured on the same twelve concepts:
 *   `human population` (Q33829) carries labels in 165 languages, `water` (Q283) in 350,
 *   `student` (Q48282) in 153, `household` (Q259059) in 68 — the thinnest of them. The specific
 *   word the acceptance names, Dutch `bevolking`, is Q33829's own `nl` label; Polish `ludność`,
 *   Italian `popolazione` and Indonesian `penduduk` are all present too. 12 of 12, at four to six
 *   times the language reach these lists needed.
 *
 *   Measuring it is also what kept a wrong entity out: `Q170314`, taken from memory for `lignite`,
 *   is the Second Sino-Japanese War. It was dropped because this script printed its English label.
 *
 * NEVER FETCHED AT RUNTIME. A lexicon that needs the network is a lexicon that fails in a newsroom
 * without one, and no script this toolchain runs for a journalist may reach for a network at all.
 * So `--fetch` is a MAINTAINER's command: it writes `skills/doctrine/references/concept-labels.json`,
 * which is the vendored table, and `--write` copies that table's tokens into the source files that
 * decide with them. Nothing at runtime reads either the network or the JSON — the tokens are in the
 * files, which is what keeps every skill directory copy-pasteable on its own.
 *
 * THE FILTERS, each with the reason it exists. `--fetch` prints the count each one removes.
 *
 *   1. ONE TOKEN, for the two lexicons that read a COLUMN NAME. A column name is split on
 *      everything that is not a letter or a digit before it is matched, so a multi-word label can
 *      never match one. `palette`'s conventions match a SENTENCE instead, so they keep phrases of
 *      up to three words.
 *   2. INSIDE THE DECLARED REPERTOIRE. `lettersNotRead` and `scriptsNotRead` already name a word
 *      written with a letter none of the four declared languages uses — that is what reports Polish
 *      `ludność` today. A token those nets can already see is NOT vendored: the two mechanisms
 *      partition the space with no overlap and no gap, and the hole this table exists to close is
 *      exactly the other half — a language spelled in the declared repertoire, which no character
 *      test can ever see. Dutch `bevolking` is that hole; it is ASCII.
 *   3. AT LEAST FOUR LETTERS. Measured on the unfiltered extract: Turkish `su` (water), `ab`
 *      (water), Swedish `kol` (coal), Indonesian `air` (water) and the bare `%` all survive every
 *      other filter and would fire on ordinary English and French column names.
 *   4. NOT AN ENGLISH WORD THAT IS NOT THIS CONCEPT'S OWN. A label contributed by some other
 *      language that happens to spell an English word is a false positive waiting for its first
 *      story: this drops `broad`, `foyer`, `studium`, `crude`, `petrol`, `strom`, `deluge`,
 *      `quota`, `rapport` and `quotient`. Decided against `/usr/share/dict/words`, and never
 *      against the concept's own English labels and aliases, which is why `household`, `student`,
 *      `water`, `coal`, `flood` and `drought` stay.
 *   5. NO CROSS-CONCEPT COLLISION. A token two concepts both claim decides nothing and would make
 *      `matchConvention` return null for both. Measured: zero, today.
 *   5b. REFUSED BY NAME, with the reason in the table. A handful of survivors are ordinary words in
 *      one of the FOUR DECLARED languages, which is where a collision is live rather than
 *      theoretical: English `child` and `house` (Wikidata's own aliases for `schoolchild` and
 *      `household`), English `temp`, the English idiom `star power` and its three variants, and
 *      French `tuile` — a roof tile, and Basque for a flood. Each is listed in the table's own
 *      `refuse` array beside the concept it was refused from, never dropped silently.
 *   6. NOT ALREADY IN THE HAND-WRITTEN FLOOR. Those entries stay where they are, written out by
 *      hand, above the generated region in each file — the existing behaviour is a floor and is
 *      visible as one.
 *
 * WHAT IT WAS MEASURED AGAINST. Every column name in every frozen story under `stories/` — 33
 * stories, 100 distinct names. The vendored denominator tokens fire on exactly `population` and
 * `residents`, both of which the hand-written floor already carried; no new token fires on any
 * frozen column at all. That is the false-positive measurement, on real material, and `--check`
 * re-runs it.
 *
 * Usage:
 *   bun run scripts/concept-labels.mjs            report drift between the table and the files
 *   bun run scripts/concept-labels.mjs --write    copy the vendored table into the files
 *   bun run scripts/concept-labels.mjs --fetch    re-measure from Wikidata and rewrite the table
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const TABLE = join(ROOT, "skills", "doctrine", "references", "concept-labels.json");

// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHERE EACH CONCEPT'S TOKENS LAND. One entry per generated region in the tree. `group` names the
// concept in the vendored table; `mark` is the region's own name inside the file, so one file can
// carry several regions (`ground-claim.mjs` carries both column lexicons).
// ─────────────────────────────────────────────────────────────────────────────────────────────
const PRODUCERS = ["chart-beat", "chart-web", "chart-video", "dw-beat", "map-beat", "map-web", "image-beat", "scrolly"];

export const REGIONS = [
  { file: "intake/scripts/profile.mjs", mark: "population", group: "population", style: "string" },
  { file: "storyboard/scripts/ground-claim.mjs", mark: "population", group: "population", style: "string" },
  { file: "storyboard/scripts/ground-claim.mjs", mark: "share", group: "share", style: "string" },
  ...PRODUCERS.map((skill) => ({
    file: `${skill}/scripts/detect-denominator-reading.mjs`,
    mark: "population",
    group: "population",
    style: "string",
  })),
  { file: "palette/scripts/palette.mjs", mark: "renewables", group: "renewables", style: "alternation" },
  { file: "palette/scripts/palette.mjs", mark: "fossil", group: "fossil", style: "alternation" },
  { file: "palette/scripts/palette.mjs", mark: "water", group: "water", style: "alternation" },
  { file: "palette/scripts/palette.mjs", mark: "heat", group: "heat", style: "alternation" },
];

const OPEN = (mark) => `// >>> generated: ${mark} — bun run scripts/concept-labels.mjs --write`;
const CLOSE = "// <<< generated";

/** The token list as the source text a region carries, indented to sit where the region does. */
export function renderRegion(tokens, style, indent) {
  if (style === "alternation")
    return tokens.map((t) => `${indent}"${escapeForRegex(t)}|" +`).join("\n");
  return tokens.map((t) => `${indent}"${escapeForJs(t)}",`).join("\n");
}

/** Non-ASCII written as an escape, the way every other lexicon in this tree writes it: a formatter
 *  hook and a byte-identical copy test both compare TEXT, and a literal Greek letter in one copy
 *  and its escape in another are the same token and two different files. */
function escapeForJs(token) {
  return [...token]
    .map((ch) => (ch.codePointAt(0) < 128 ? ch : `\\u${ch.codePointAt(0).toString(16).padStart(4, "0")}`))
    .join("");
}

function escapeForRegex(token) {
  return escapeForJs(token).replace(/ /g, "\\\\s+");
}

/** Every generated region in one file's text, as `{ mark, indent, body, start, end }`. */
export function regionsIn(text) {
  const found = [];
  const re = /^([ \t]*)\/\/ >>> generated: ([a-z-]+) — bun run scripts\/concept-labels\.mjs --write$/gm;
  for (const m of text.matchAll(re)) {
    const bodyStart = m.index + m[0].length + 1;
    const closeAt = text.indexOf(`${m[1]}${CLOSE}`, bodyStart);
    if (closeAt < 0) throw new Error(`region "${m[2]}" is opened and never closed`);
    found.push({ mark: m[2], indent: m[1], body: text.slice(bodyStart, closeAt), start: bodyStart, end: closeAt });
  }
  return found;
}

export function vendoredTable() {
  return JSON.parse(readFileSync(TABLE, "utf8"));
}

/** What every region SHOULD hold, given the vendored table. Keyed `file::mark`. */
export function expectedRegions(table = vendoredTable()) {
  const out = new Map();
  for (const r of REGIONS) out.set(`${r.file}::${r.mark}`, { ...r, tokens: table.concepts[r.group].tokens });
  return out;
}

function drift() {
  const expected = expectedRegions();
  const problems = [];
  for (const [key, r] of expected) {
    const path = join(ROOT, "skills", r.file);
    const text = readFileSync(path, "utf8");
    const region = regionsIn(text).find((x) => x.mark === r.mark);
    if (!region) { problems.push(`${key}: no such generated region in the file`); continue; }
    const want = `${renderRegion(r.tokens, r.style, region.indent)}\n`;
    if (region.body !== want) problems.push(`${key}: the region does not hold the vendored tokens`);
  }
  return problems;
}

function write() {
  const expected = expectedRegions();
  const byFile = new Map();
  for (const r of expected.values()) byFile.set(r.file, [...(byFile.get(r.file) ?? []), r]);
  for (const [file, wanted] of byFile) {
    const path = join(ROOT, "skills", file);
    let text = readFileSync(path, "utf8");
    // Last region first, so an earlier region's offsets survive a later one being replaced.
    const regions = regionsIn(text).sort((a, b) => b.start - a.start);
    for (const region of regions) {
      const r = wanted.find((w) => w.mark === region.mark);
      if (!r) continue;
      text = text.slice(0, region.start) + `${renderRegion(r.tokens, r.style, region.indent)}\n` + text.slice(region.end);
    }
    writeFileSync(path, text);
    console.log(`wrote ${file}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE MEASUREMENT. Only `--fetch` runs any of this, and only a maintainer runs `--fetch`.
// ─────────────────────────────────────────────────────────────────────────────────────────────

const SCRIPTS_READ = /[\p{Script=Latin}\p{Script=Greek}\p{Script=Arabic}]/u;
const LETTERS_READ = /[a-zàâäæçèéêëîïôöœùûüÿ\p{Script=Greek}\p{Script=Arabic}]/iu;

/** Filter 2: a token no character test in this tree can flag, because every letter in it is one
 *  the four declared languages are written with. Spaces are allowed for a phrase. */
export function insideTheRepertoire(token) {
  let letters = 0;
  for (const ch of token) {
    if (ch === " ") continue;
    if (!/\p{L}/u.test(ch)) return false;
    if (!SCRIPTS_READ.test(ch)) return false;
    if (!LETTERS_READ.test(ch)) return false;
    letters++;
  }
  return letters > 0;
}

async function fetchTable() {
  const table = vendoredTable();
  const english = new Set(readFileSync("/usr/share/dict/words", "utf8").split("\n").map((w) => w.toLowerCase()));
  const dropped = {};
  const claimed = new Map();
  for (const [group, spec] of Object.entries(table.concepts)) {
    const candidates = new Map();
    const ownEnglish = new Set();
    for (const id of spec.wikidata) {
      const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`);
      if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
      const entity = (await res.json()).entities[id];
      console.log(`  ${group} ${id} "${entity.labels?.en?.value}" — ${Object.keys(entity.labels ?? {}).length} languages`);
      for (const code of table.languages) {
        const add = (value) => candidates.set(value.toLocaleLowerCase(), code);
        if (entity.labels?.[code]) add(entity.labels[code].value);
        for (const alias of entity.aliases?.[code] ?? []) add(alias.value);
      }
      if (entity.labels?.en) ownEnglish.add(entity.labels.en.value.toLowerCase());
      for (const alias of entity.aliases?.en ?? []) ownEnglish.add(alias.value.toLowerCase());
      await new Promise((r) => setTimeout(r, 400));
    }
    const counts = { candidates: candidates.size, tooManyWords: 0, netsAlreadySeeIt: 0, tooShort: 0, englishWord: 0, refusedByName: 0, inTheFloor: 0 };
    const kept = [];
    const floor = new Set(spec.floor ?? []);
    const refused = new Set(Object.keys(spec.refuse ?? {}));
    const maxWords = spec.maxWords ?? 1;
    for (const token of candidates.keys()) {
      const words = token.split(" ");
      if (words.length > maxWords || /[^\p{L} ]/u.test(token)) { counts.tooManyWords++; continue; }
      if (!insideTheRepertoire(token)) { counts.netsAlreadySeeIt++; continue; }
      if (words.some((w) => [...w].length < 4)) { counts.tooShort++; continue; }
      if (english.has(token) && !ownEnglish.has(token)) { counts.englishWord++; continue; }
      if (refused.has(token)) { counts.refusedByName++; continue; }
      if (floor.has(token)) { counts.inTheFloor++; continue; }
      kept.push(token);
    }
    kept.sort();
    for (const token of kept) claimed.set(token, [...(claimed.get(token) ?? []), group]);
    spec.tokens = kept;
    dropped[group] = counts;
  }
  // Filter 5, applied across the groups once all of them are known.
  const collisions = [...claimed].filter(([, groups]) => groups.length > 1).map(([token]) => token);
  for (const spec of Object.values(table.concepts)) {
    const before = spec.tokens.length;
    spec.tokens = spec.tokens.filter((t) => !collisions.includes(t));
    dropped[Object.keys(table.concepts).find((k) => table.concepts[k] === spec)].crossConcept = before - spec.tokens.length;
  }
  table.measuredOn = new Date().toISOString().slice(0, 10);
  table.dropped = dropped;
  writeFileSync(TABLE, `${JSON.stringify(table, null, 2)}\n`);
  for (const [group, spec] of Object.entries(table.concepts))
    console.log(`${group.padEnd(12)} kept ${String(spec.tokens.length).padStart(4)}  dropped ${JSON.stringify(dropped[group])}`);
}

/** FALSE POSITIVES, ON REAL MATERIAL. Every column name in every frozen story, tokenised the way
 *  the two column lexicons tokenise one, matched against the vendored tokens. */
export function columnNameHits(table = vendoredTable(), storiesDir = join(ROOT, "stories")) {
  const hits = [];
  const split = /[^\p{L}\p{N}]+/u;
  for (const story of readdirSync(storiesDir)) {
    const source = join(storiesDir, story, "source");
    if (!existsSync(source)) continue;
    for (const file of readdirSync(source).filter((f) => f.endsWith(".csv"))) {
      const header = readFileSync(join(source, file), "utf8").split("\n")[0];
      for (const name of header.split(",").map((n) => n.replace(/^﻿|"/g, "").trim())) {
        for (const token of name.split(split).map((t) => t.toLowerCase()).filter(Boolean)) {
          for (const group of ["population", "share"])
            if (table.concepts[group].tokens.includes(token)) hits.push({ story, name, token, group });
        }
      }
    }
  }
  return hits;
}

if (import.meta.main) {
  const mode = process.argv[2] ?? "--check";
  if (mode === "--fetch") await fetchTable();
  else if (mode === "--write") write();
  else {
    const problems = drift();
    for (const p of problems) console.log(`DRIFT ${p}`);
    const hits = columnNameHits();
    console.log(`${problems.length} region(s) adrift; ${hits.length} frozen column name(s) matched: ${hits.map((h) => `${h.story}/${h.name}→${h.group}`).join(", ")}`);
    if (problems.length > 0) process.exitCode = 1;
  }
}
