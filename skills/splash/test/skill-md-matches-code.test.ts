/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * The failure this defends against: a `SKILL.md` asserts something about code — a path, a named
 * export or helper, a tuning constant's location — that stopped being true, and nothing red ever
 * says so. In the two days before this guard existed, that happened seven separate times across
 * three sweeps that each thought they had finished, always caught by a person reading, never by
 * the suite. This file is the mechanical backstop for the three shapes of claim a `SKILL.md` makes
 * that are actually checkable against the filesystem and the source text: a PATH resolves, a named
 * identifier a Files bullet credits to a file is actually PRESENT in that file's own text, and a
 * TUNING-KNOB constant exists in the file its own row names. All three are scoped deliberately
 * narrow — see "WHAT IT PROVABLY DOES NOT CATCH" below before trusting this for anything wider, the
 * same discipline `no-cross-skill-imports.test.ts` documents for its own guard.
 *
 * THREE RESOLUTION ROOTS, one established by convention rather than invented here. Measured across
 * this tree: a `SKILL.md` referring to a SIBLING skill writes the path from the `skills/` root —
 * `doctrine/references/geo-discipline.md`, never `../doctrine/...` (six occurrences of the
 * bare form, zero of the `../` form — two reviewers flagged the bare form as broken and both were
 * wrong). A path into a STORY WORKSPACE (`proof/<slug>/…`) resolves from `twin/` — the parent of
 * `skills/`. Every other path resolves from the SKILL'S OWN directory. A candidate is tried against
 * all three, in that order, plus one narrower fourth: five measured occurrences
 * (`twin/package.json`, `twin/.env`, `twin/TRIAL-THREE-BEATS.md` ×3) spell this repository's own
 * root by its actual directory name, one level higher than `twin/` itself resolves the `proof/` root
 * — so that literal `twin/` prefix is tried, stripped, against `twin/`'s own parent. A bare filename
 * with no `/` at all (`render-still.mjs`, `ChartSeed.tsx` — common in the Tuning-knobs "Where"
 * column) is resolved by SEARCHING for that basename, first inside the skill's own directory, then
 * across the whole `twin/` tree (`node_modules`/`.git` excluded) — deliberately loose: it confirms a
 * file with that name exists somewhere a reasonable reader would expect, not that this exact row
 * points at one particular copy. Several skills keep duplicate, unlinked copies of the same
 * filename by design (`render-still.mjs` exists once per format — see `no-cross-skill-imports.test.ts`
 * itself), so a bare name resolving against a DIFFERENT skill's copy is a real, accepted gap in this
 * guard's precision, not an oversight — see the numbered list below.
 *
 * WHAT COUNTS AS "PATH-SHAPED" AT ALL, and why the bar is deliberately high. A backtick token is
 * only ever treated as a path if it has no whitespace, does not start with `@` or `#` (an npm scope,
 * a subpath-imports alias), contains none of `< > * { }` (a placeholder, a glob, a brace-expansion
 * list), and either ends in `/` (a directory) or ends in one of a fixed, curated list of extensions
 * actually used as file references in this corpus (`.md .ts .tsx .mjs .js .jsx .json .png .csv .svg
 * .env .txt .lock`). This excludes, correctly and by design, things that merely contain a slash:
 * `1/50` (a fraction), `fps / 2` (arithmetic, and whitespace besides), `#shared/*` (an alias),
 * `@resvg/resvg-js` (a scoped npm package), `react-dom/server` (an npm subpath with no local
 * extension), `/bars|column/i` (a regex), `cloudflare/workers-sdk` (a GitHub slug in prose). Every
 * one of those is real prose in this corpus today; loosening the filter to catch an extensionless
 * module specifier (`proof/co2-suisse/crossing-geometry`, written without its own `.ts` several
 * times) would reopen exactly this false-positive surface, so it is left uncaught — named again
 * below.
 *
 * WHERE EACH CHECK LOOKS, and nowhere else — this is the main defence against false positives, more
 * than any single filter above. A `SKILL.md`'s Overview, "When to use", gotcha, "How it works" and
 * "Quick start" prose is read by NOTHING here: measured, that prose is where illustrative, future,
 * or per-installation paths live (`stories/annemasse-rain/beats/1-rainfall/RainfallLine.tsx`, a
 * worked example that has never existed on disk; `NEWSROOM.md`, created by a journalist at install
 * time, never checked into this repository — only `NEWSROOM.example.md` is). Even inside the three
 * sections this guard does read, it does not read every column:
 *   - Architecture: only the FILE column (never the "Role" prose column, which is where the same
 *     kind of forward-looking or cross-referential path shows up — e.g. `NEWSROOM.md` again, or a
 *     bare `migration`/`life-expectancy` story name that happens to be a valid-looking identifier
 *     but names nothing in the row's own file).
 *   - Tuning knobs: only the WHERE column.
 *   - Files: only the PRIMARY path — the one backtick token immediately after the leading `- ` — and,
 *     when that resolves to a source file, the identifiers claimed for it right there (see the FILES
 *     check below). A bullet's own continuation prose is not re-scanned for further paths, for the
 *     same reason as Architecture's Role column: measured, a bullet legitimately mentions paths and
 *     names that belong to a DIFFERENT file than its own primary one (`scripts/newsroom.mjs`'s own
 *     bullet mentions `NEWSROOM.md` in passing; that mention is not a claim that `newsroom.mjs` IS
 *     `NEWSROOM.md`).
 * A path that appears only in prose outside these exact positions is not checked at all — see the
 * numbered list below.
 *
 * THE FILES CHECK, precisely — and why it checks PRESENCE, not a real export statement. The first
 * attempt at this checked for an actual `export` keyword ahead of the name (a tighter, more literal
 * reading of "claims an export"). It produced real false positives, each measured in this corpus
 * before being rejected: `` `scripts/deliver.mjs` — `offerForms`, `materialise`, `copyTree` (its
 * recursive helper) `` names a real function that is deliberately NOT exported (only `offerForms`
 * and `materialise` are — `copyTree` is an internal helper, present, correctly described as one, and
 * would fail an export-keyword check for a reason that is not a documentation defect at all); ``
 * `assets/index.ts` — the one Remotion entry point (`registerRoot`) `` names a function the file
 * CALLS (imported from `remotion`), never one it exports. Both are real, both are true statements
 * about the code, and neither is "this file exports X" — so the check this settled on is whether the
 * name is PRESENT, as a whole word, anywhere in the file's own text; a rename or a deletion removes
 * the word from the file just as surely as it removes it from an `export` statement, and this stays
 * green on both of the shapes above without misreading them as defects. The cost, named honestly: a
 * rename would stay green if a stray copy of the OLD name survived elsewhere in the same file (a
 * stale comment, an unrelated string) — checked directly, by mutation, before this file was
 * finished: a rename that touched only a function's declaration and left the old name inside that
 * same function's own error-message string stayed green; the same rename, done cleanly (every
 * occurrence updated, the realistic shape a real rename takes), turned red.
 *
 * Which identifiers get checked at all is the tighter half of this guard, and where the real
 * precision lives. For a Files-section bullet whose primary path resolves to a source file
 * (`.mjs`/`.ts`/`.tsx`/`.js`/`.jsx`), TWO gates must both hold, or nothing in that bullet is checked:
 *   1. IMMEDIATE ADJACENCY — only whitespace/dash/colon may sit between the primary path and the
 *      first backtick token. This is what tells `` `scripts/newsroom.mjs` — `parseNewsroom`,
 *      `validateNewsroom` `` (a direct list, right after the dash) apart from `` `assets/index.ts` —
 *      the one Remotion entry point (`registerRoot`) `` (prose, THEN a parenthetical name) and ``
 *      `scripts/render-video.mjs` — the seed beat's render script: `readingsFromCsv`, still → mp4.
 *      Imports `deriveFurniture` from … `` (prose, then a first name, then MORE prose, then a second
 *      name describing an IMPORT, not this file's own contents).
 *   2. FIRST RUN ONLY — once a run of identifiers is found (consecutive backtick tokens joined only
 *      by `/`, `,`, or `and` — the exact separators this corpus uses, e.g.
 *      `` `chartPoints`/`tracePath`/`yTickValues` ``), scanning STOPS. A second, later mention in the
 *      same bullet is never collected: `` `scripts/ground-claim.mjs` — `groundTakeaway`, the
 *      claim-grounding guard `checkStoryboard` calls when given a profile `` names `checkStoryboard`
 *      as something that CALLS this file, not something this file contains — and `checkStoryboard`
 *      genuinely does not appear anywhere in `ground-claim.mjs`'s own text, so without this rule that
 *      sentence reads as a false claim that never was one.
 * Within the surviving first run, the whole run is discarded if the word "prop"/"props" appears in
 * the prose immediately after it — `` `ink`/`muted`/`grid`/`measure` are props `` names component
 * PROPS, not module contents; both words genuinely appear in `ChartWebSeed.tsx`'s own text (as
 * destructured parameter names), so even the presence check above would not have caught this one
 * without the exclusion — checked directly before writing it.
 *
 * THE TUNING-KNOBS CHECK, precisely, and its one deliberate refusal. Each row's "Where" column is
 * read on its own — NEVER carrying a file forward from a previous row, even though several rows in
 * this corpus rely on exactly that convention in prose (`CO2_TIMING`/`MAP_TIMING` repeated bare
 * across consecutive rows, the file named only once above them). That convention is real and this
 * guard does not follow it, on purpose: `splash`'s own Tuning-knobs table has a row — "How many
 * responsibilities this skill holds | `4`, and no fifth | this document, `Overview`" — whose
 * "Where" column names no file at all, just a section heading of the very same document. A blind
 * carry-over from the PREVIOUS row (`scripts/where.mjs`) would check the bare word `Overview`
 * against `where.mjs`'s own source and fail loud on a row that was never making a claim about that
 * file in the first place. So: a row is only checked when its OWN "Where" column names a
 * resolvable, code-extensioned path; every identifier-shaped token in that same row's "Where" column
 * is then required to appear, as a whole word, anywhere in that file's text (not necessarily
 * exported — a Tuning knob is as often a module-private `const` as an exported one). Rows that lean
 * on the previous row's file are silently skipped — a real, accepted gap, named again below.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. Any claim outside the three sections and the exact columns/positions named above — an Overview
 *    paragraph, a "How it works" step, a gotcha, a Quick start snippet, or an Architecture "Role"
 *    column, however path-shaped or export-shaped its own backtick tokens look. This is deliberate,
 *    not an oversight: three of this project's seven real documentation defects were exactly this
 *    kind of prose claim ("a dispatch table declaring two complete, tested skills do not exist yet";
 *    "a skill's seed shared geometry with a story workspace, after that import had been removed"; "a
 *    bullet claiming a skill's beats had departed when nothing had ever left it") — none of them is a
 *    structured path/export/constant claim in the first place, so no mechanical scan of this shape
 *    can reach them without an unacceptable false-positive rate (see the `NEWSROOM.md`/`Overview`
 *    cases threaded through the comment above, both real, both in this exact corpus, both would have
 *    broken a wider scan on the very first run).
 * 2. Any claim about a RELATIONSHIP between files rather than a file's own existence or contents —
 *    "the seed still imports the story's own geometry", "this skill's beats moved to that directory"
 *    stated in prose rather than as a Files-bullet primary path, "these two files are byte-identical"
 *    (that one already has its own dedicated guard, `root-template-shared.test.ts`). Verifying an
 *    import relationship would mean parsing the CODE's own import graph and cross-checking it
 *    against prose, a different and much larger tool.
 * 3. A path written WITHOUT its extension (`proof/co2-suisse/crossing-geometry`, several times in
 *    this corpus, for a real `.ts` file) is not recognised as a path at all — see "WHAT COUNTS AS
 *    'PATH-SHAPED' AT ALL" above for why broadening this reopens real false positives measured in
 *    this exact corpus.
 * 4. A bare filename (no `/`) resolves if a file with that basename exists ANYWHERE reachable from
 *    the skill's own directory or the whole `twin/` tree — not necessarily at the specific location
 *    the row implies. A row could pass by matching a different skill's or a different story's
 *    identically-named, unrelated copy. A token that names a directory (`assets/`, `references/`) is
 *    only checked for existence, never for containing what the prose around it claims.
 * 5. A Tuning-knobs row whose "Where" column names only a bare constant and no file at all, relying
 *    on an earlier row's file by the document's own prose convention, is skipped outright — seven
 *    such rows exist in this corpus today (`CO2_TIMING`/`MAP_TIMING` repeats, `checkStoryboard`
 *    alone, `FORMS_BY_FORMAT` alone, `MAP_TIMING` alone, `checkStoryboard` alone again, "this
 *    document, `Overview`"). See the TUNING-KNOBS section above for why a carry-over was rejected.
 * 6. A Tuning-knobs row that names its constant in the "Knob" column instead of "Where" — the exact
 *    shape `` `40` (`PAD`) | `ChartSeed.tsx` `` takes, where "Where" carries only the file — is also
 *    skipped: this check reads the "Where" column alone (see "WHERE EACH CHECK LOOKS" above), and
 *    `PAD` never appears there. Found by this file's own mutation proof: renaming `PAD` throughout
 *    `ChartSeed.tsx` and rerunning stayed green, which is what surfaced this gap rather than a
 *    parsing bug — the mutation that DOES land in this check's own stated scope (`FRAME`, named in
 *    the "Where" column of the very next row) turns red exactly as expected. This shape is common:
 *    roughly half of `chart-beat`'s own Tuning-knobs rows name their constant this way.
 * 7. Any file type this scan does not read — a `.svelte`/`.vue`/`.astro` component, or a name
 *    expressed through syntax this is not looking for in the first place (this check is presence,
 *    not parsing — see "THE FILES CHECK" above for why parsing an actual `export` statement was
 *    tried first and rejected).
 * 8. Presence is not parsing: a stray copy of an old name left elsewhere in the same file (a stale
 *    comment, an unrelated string) after an otherwise-real rename would keep this green — see "THE
 *    FILES CHECK" above for the mutation that measured exactly this gap directly, and why the
 *    presence check was kept anyway (the false positives a stricter export-statement check produced
 *    were real and worse).
 *
 * This guard defends against the ACCIDENTAL kind of drift this project actually had — a rename, a
 * move, a deletion that a `SKILL.md` was never updated to follow. It is not a general prose-fact
 * checker, and it should be trusted for exactly the three structural claims above and no more.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");
const TWIN = resolve(SKILLS, "..");
const CONTAINER = dirname(TWIN);

// The exact extensions this corpus uses as file references — see the header comment for why this
// list is curated rather than "any token with a dot", and why that matters.
const PATH_EXTENSIONS = [
  ".md",
  ".ts",
  ".tsx",
  ".mjs",
  ".js",
  ".jsx",
  ".json",
  ".png",
  ".csv",
  ".svg",
  ".env",
  ".txt",
  ".lock",
];

// The subset of PATH_EXTENSIONS that are actual source — a Files-bullet or Tuning-knob row pointing
// at a `.md`/`.json`/`.png` is a real path claim (checked above) but has no exports/constants of its
// own to check further.
const CODE_EXTENSIONS = [".mjs", ".ts", ".tsx", ".js", ".jsx"];

function isPathShaped(token: string): boolean {
  if (/\s/.test(token)) return false; // prose reads as a sentence, a path never does
  if (token.startsWith("@") || token.startsWith("#")) return false; // npm scope / subpath alias
  if (/[<>*{}]/.test(token)) return false; // placeholder, glob, brace-expansion list
  if (token.endsWith("/")) return true; // a directory reference
  return PATH_EXTENSIONS.some((ext) => token.toLowerCase().endsWith(ext));
}

function isIdentifierShaped(token: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(token);
}

// `whereIs(storyDir)` and `runPreflight({root, env, fetchFn})` name the bare function; the call
// signature is not part of its identity.
function stripCallParens(token: string): string {
  const i = token.indexOf("(");
  return i === -1 ? token : token.slice(0, i);
}

function findByBasename(root: string, basename: string): string[] {
  const results: string[] = [];
  function walk(dir: string) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === basename) results.push(p);
    }
  }
  walk(root);
  return results;
}

/**
 * Resolves a path-shaped token against the roots this corpus actually uses, in order: the skill's
 * own directory, the `skills/` root (the bare sibling-skill form), the `twin/` root (a story
 * workspace under `proof/`), and `twin/`'s own parent (the measured `twin/package.json`-shaped
 * literal prefix). A bare filename (no `/` at all) is instead searched for by basename — see the
 * header comment's "THREE RESOLUTION ROOTS" section for why each of these is real, not invented.
 */
function resolvePathToken(token: string, skillRoot: string): string | null {
  if (token.includes("/")) {
    for (const root of [skillRoot, SKILLS, TWIN, CONTAINER]) {
      const candidate = resolve(root, token);
      if (existsSync(candidate)) {
        if (token.endsWith("/")) {
          if (statSync(candidate).isDirectory()) return candidate;
          continue;
        }
        return candidate;
      }
    }
    return null;
  }
  const ownMatches = findByBasename(skillRoot, token);
  if (ownMatches.length > 0) return ownMatches[0];
  const treeMatches = findByBasename(TWIN, token);
  if (treeMatches.length > 0) return treeMatches[0];
  return null;
}

function extractBacktickTokens(
  text: string,
): { value: string; start: number; end: number }[] {
  const tokens: { value: string; start: number; end: number }[] = [];
  const re = /`([^`]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    tokens.push({ value: m[1], start: m.index, end: m.index + m[0].length });
  }
  return tokens;
}

// Deliberately NOT a single regex with a `$`/`m`-flag end anchor: every section in this corpus has
// a blank line right after its `## Header` line, and `$` under the `m` flag matches at THAT line
// ending too — the first attempt at this function matched zero characters every time, silently
// emptying every section (Files included) and making every check below vacuously green. Caught by
// this file's own mutation proof, not by inspection. Slicing on the next literal `\n## ` avoids the
// anchor entirely.
function getSection(text: string, header: string): string | null {
  const startMarker = `## ${header}\n`;
  const startIndex = text.indexOf(`\n${startMarker}`);
  const headerStart = text.startsWith(startMarker)
    ? 0
    : startIndex === -1
      ? -1
      : startIndex + 1;
  if (headerStart === -1) return null;
  const contentStart = headerStart + startMarker.length;
  const nextHeaderIndex = text.indexOf("\n## ", contentStart);
  return nextHeaderIndex === -1
    ? text.slice(contentStart)
    : text.slice(contentStart, nextHeaderIndex);
}

// A markdown table row, split into its own cells — skips the `| --- | --- |` separator and the
// header row (both start with a non-code, human-readable first cell in every table in this corpus).
function tableRows(section: string): string[][] {
  const rows: string[][] = [];
  for (const line of section.split("\n")) {
    if (line.startsWith("|") && !line.includes("---")) {
      const cols = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      rows.push(cols);
    }
  }
  return rows.length > 0 ? rows.slice(1) : rows; // drop the header row
}

function wholeWordRegex(name: string): RegExp {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${esc}\\b`);
}

// Whole-word PRESENCE, not a real export-statement parse — see the header comment's "THE FILES
// CHECK" section for why: a Files bullet's own comma-list routinely mixes true exports with a named
// internal helper ("`copyTree` (its recursive helper)" — real, present, deliberately not exported,
// in `deliver/scripts/deliver.mjs`) and a describes-what-it-calls mention (`registerRoot`,
// imported from `remotion` into `assets/index.ts`, never exported BY it). A stricter "must appear
// after a literal `export` keyword" check is exactly right for a rename or deletion — both remove
// the word from the file entirely — but flags both of those real, harmless shapes as false defects.
// A rename still turns this red as long as the rename actually removes the old name from the file's
// own text; it would stay green only if a stray copy of the old name survived elsewhere in the same
// file (a stale comment, an unrelated string) — a real, narrow gap, named again in the header.
async function fileNamesIdentifier(
  filePath: string,
  name: string,
): Promise<boolean> {
  const text = await readFile(filePath, "utf8");
  return wholeWordRegex(name).test(text);
}

// Files-section bullets, each joined into one string (soft-wrapped continuation lines rejoined with
// a space) — a blank line or the next `- ` ends the current bullet.
function fileBullets(section: string): string[] {
  const lines = section.split("\n");
  const bullets: string[] = [];
  let cur: string[] | null = null;
  for (const line of lines) {
    if (/^-\s+/.test(line)) {
      if (cur) bullets.push(cur.join(" "));
      cur = [line];
    } else if (cur && line.trim() !== "") {
      cur.push(line.trim());
    } else if (cur && line.trim() === "") {
      bullets.push(cur.join(" "));
      cur = null;
    }
  }
  if (cur) bullets.push(cur.join(" "));
  return bullets;
}

/**
 * The identifiers a Files-bullet claims for its primary file — see the header comment's "THE FILES
 * CHECK" section for the full reasoning; summarised at each rule below.
 *
 * Two gates, both required, both measured against real false positives in this corpus before being
 * added — this function returns `[]` (checks nothing) unless BOTH hold:
 *
 *   1. IMMEDIATE ADJACENCY. The text between the primary path and the first backtick token must be
 *      only whitespace/dash/colon — no prose word may sit between them. This is what tells
 *      `` `scripts/newsroom.mjs` — `parseNewsroom`, `validateNewsroom`, `isDeclinedProfile` `` (a
 *      real, direct list) apart from `` `assets/index.ts` — the one Remotion entry point
 *      (`registerRoot`) `` (a single parenthetical mention of a function the file CALLS, imported
 *      from `remotion`, never exported by it — real prose in this corpus, and a real false positive
 *      this gate exists to close) and `` `scripts/render-video.mjs` — the seed beat's render
 *      script: `readingsFromCsv`, still → mp4. Imports `deriveFurniture` from … ``. That second
 *      example is also why the SAME gate is applied again as rule 2.
 *   2. FIRST RUN ONLY. Once a run of identifiers is found (consecutive backtick tokens joined only
 *      by `/`, `,`, or `and`), scanning STOPS — a second, later mention in the same bullet's prose
 *      is never collected, whichever shape it takes: `` `scripts/ground-claim.mjs` — `groundTakeaway`,
 *      the claim-grounding guard `checkStoryboard` calls when given a profile `` names
 *      `checkStoryboard` as something that CALLS this file, not something this file contains —
 *      `checkStoryboard` does not appear anywhere in `ground-claim.mjs`'s own text, and without this
 *      rule that sentence would be misread as a second claimed name.
 *
 * Within the first run, a group is discarded (not just skipped — the whole run) if the word
 * "prop"/"props" appears in the prose immediately following it — `` `ink`/`muted`/`grid`/`measure`
 * are props `` names component PROPS, not exports; verified directly against the file this shape
 * appears in (`ChartWebSeed.tsx` exports none of the four).
 */
function collectClaimedExports(remainder: string): string[] {
  const tokens = extractBacktickTokens(remainder);
  if (tokens.length === 0) return [];
  const first = tokens[0];
  if (!/^[\s—:-]*$/.test(remainder.slice(0, first.start))) return []; // rule 1
  if (isPathShaped(first.value)) return []; // the bullet's very first mention is another file
  const firstBare = stripCallParens(first.value);
  if (!isIdentifierShaped(firstBare)) return [];

  const run = [0];
  let j = 1;
  while (j < tokens.length) {
    if (isPathShaped(tokens[j].value)) break;
    const between = remainder.slice(tokens[j - 1].end, tokens[j].start);
    const bareNext = stripCallParens(tokens[j].value);
    if (
      /^[\s,/]*(and[\s,/]*)?$/.test(between) &&
      isIdentifierShaped(bareNext)
    ) {
      run.push(j);
      j++;
    } else break;
  }
  const afterStart = tokens[run[run.length - 1]].end;
  const afterEnd =
    j < tokens.length
      ? tokens[j].start
      : Math.min(remainder.length, afterStart + 80);
  const after = remainder.slice(afterStart, afterEnd);
  if (/\bprops?\b/i.test(after)) return []; // rule 2's run, discarded whole
  return run.map((k) => stripCallParens(tokens[k].value));
}

async function skillList(): Promise<string[]> {
  const entries = await readdir(SKILLS, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

describe("every SKILL.md's structural claims about code hold true", () => {
  it("should resolve every path-shaped token in Architecture's File column, Tuning knobs' Where column, and each Files bullet's primary path", async () => {
    const offenders: string[] = [];
    for (const skill of await skillList()) {
      const skillRoot = join(SKILLS, skill);
      const skillMdPath = join(skillRoot, "SKILL.md");
      if (!existsSync(skillMdPath)) continue;
      const text = await readFile(skillMdPath, "utf8");

      const arch = getSection(text, "Architecture");
      if (arch) {
        for (const cols of tableRows(arch)) {
          if (cols.length < 2) continue;
          for (const tok of extractBacktickTokens(cols[1]).map(
            (t) => t.value,
          )) {
            if (!isPathShaped(tok)) continue;
            if (!resolvePathToken(tok, skillRoot)) {
              offenders.push(
                `${skill}/SKILL.md Architecture File column: \`${tok}\``,
              );
            }
          }
        }
      }

      const tuning = getSection(text, "Tuning knobs");
      if (tuning) {
        for (const cols of tableRows(tuning)) {
          if (cols.length < 3) continue;
          for (const tok of extractBacktickTokens(cols[2]).map(
            (t) => t.value,
          )) {
            if (!isPathShaped(tok)) continue;
            if (!resolvePathToken(tok, skillRoot)) {
              offenders.push(
                `${skill}/SKILL.md Tuning knobs Where column: \`${tok}\``,
              );
            }
          }
        }
      }

      const files = getSection(text, "Files");
      if (files) {
        for (const bullet of fileBullets(files)) {
          const m = /^-\s+`([^`]+)`/.exec(bullet);
          if (!m) continue;
          const primary = m[1];
          if (!isPathShaped(primary)) continue;
          if (!resolvePathToken(primary, skillRoot)) {
            offenders.push(
              `${skill}/SKILL.md Files bullet primary path: \`${primary}\``,
            );
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("should find every name a Files bullet claims for its primary file actually present there", async () => {
    const offenders: string[] = [];
    for (const skill of await skillList()) {
      const skillRoot = join(SKILLS, skill);
      const skillMdPath = join(skillRoot, "SKILL.md");
      if (!existsSync(skillMdPath)) continue;
      const text = await readFile(skillMdPath, "utf8");

      const files = getSection(text, "Files");
      if (!files) continue;
      for (const bullet of fileBullets(files)) {
        const m = /^-\s+`([^`]+)`/.exec(bullet);
        if (!m) continue;
        const primary = m[1];
        if (!isPathShaped(primary)) continue;
        const resolved = resolvePathToken(primary, skillRoot);
        if (!resolved) continue; // reported by the path-resolution test above
        if (
          !CODE_EXTENSIONS.some((ext) => resolved.toLowerCase().endsWith(ext))
        )
          continue;
        const remainder = bullet.slice(m.index! + m[0].length);
        for (const name of collectClaimedExports(remainder)) {
          if (!(await fileNamesIdentifier(resolved, name))) {
            offenders.push(
              `${skill}/SKILL.md Files bullet \`${primary}\` claims \`${name}\`, but ${resolved} contains no such name`,
            );
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("should find every Tuning-knob row's own named constant present in the file that same row names", async () => {
    const offenders: string[] = [];
    for (const skill of await skillList()) {
      const skillRoot = join(SKILLS, skill);
      const skillMdPath = join(skillRoot, "SKILL.md");
      if (!existsSync(skillMdPath)) continue;
      const text = await readFile(skillMdPath, "utf8");

      const tuning = getSection(text, "Tuning knobs");
      if (!tuning) continue;
      for (const cols of tableRows(tuning)) {
        if (cols.length < 3) continue;
        const toks = extractBacktickTokens(cols[2]).map((t) => t.value);
        // Only checked when THIS row's own Where column names a resolvable, code-extensioned file —
        // never carried over from a previous row. See the header comment's TUNING-KNOBS section for
        // why (the `Overview` false positive it would otherwise produce).
        let resolvedFile: string | null = null;
        for (const tok of toks) {
          if (!isPathShaped(tok)) continue;
          const resolved = resolvePathToken(tok, skillRoot);
          if (
            resolved &&
            CODE_EXTENSIONS.some((ext) => resolved.toLowerCase().endsWith(ext))
          ) {
            resolvedFile = resolved;
            break;
          }
        }
        if (!resolvedFile) continue;
        const fileText = await readFile(resolvedFile, "utf8");
        for (const tok of toks) {
          if (isPathShaped(tok)) continue;
          const bare = stripCallParens(tok);
          if (!isIdentifierShaped(bare)) continue;
          const esc = bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          if (!new RegExp(`\\b${esc}\\b`).test(fileText)) {
            offenders.push(
              `${skill}/SKILL.md Tuning knobs row "${cols[0]}": \`${bare}\` not found in ${resolvedFile}`,
            );
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("the splash dispatcher conforms to the orchestration spine", () => {
  // ORCHESTRATION-SPINE.md §1: one thin dispatcher per system, fixed section order, same headings
  // everywhere, ≤ ~250 lines. The bound below is the mechanical reading of "~250": a dispatcher
  // drifting past 260 lines is growing child-skill bodies back into itself.
  const DISPATCHER = join(SKILLS, "splash", "SKILL.md");
  const SPINE_SECTIONS = [
    "When to use",
    "Operating contract",
    "Dispatch table",
    "Gates",
    "Verbs",
    "Never-list",
    "Tuning knobs",
  ];
  const AGENTS = join(TWIN, "agents");
  const PERSONAS = ["analyst", "archivist", "courier", "designer", "editor"];
  const VERB_REGISTRY = [
    "read-file",
    "write-file",
    "execute-shell",
    "fetch",
    "search",
    "invoke-skill",
    "spawn-agent",
    "wait-agent",
  ];

  it("should carry the spine's seven sections in order, within the dispatcher line budget", async () => {
    const text = await readFile(DISPATCHER, "utf8");
    let cursor = -1;
    for (const heading of SPINE_SECTIONS) {
      const at = text.indexOf(`\n## ${heading}\n`);
      expect(at, `missing or out-of-order section: ${heading}`).toBeGreaterThan(
        cursor,
      );
      cursor = at;
    }
    expect(text.split("\n").length).toBeLessThanOrEqual(260);
  });

  it("should brief every pipeline persona with the shared spine §3 frontmatter contract", async () => {
    const files = (await readdir(AGENTS)).filter((f) => f.endsWith(".md")).sort();
    expect(files).toEqual(PERSONAS.map((p) => `${p}.md`));

    for (const file of files) {
      const raw = await readFile(join(AGENTS, file), "utf8");
      const m = /^---\n([\s\S]*?)\n---\n/.exec(raw);
      expect(m, `${file}: no frontmatter block`).toBeTruthy();
      const fm = m![1];

      // Minimal frontmatter reader: top-level `key: value` scalars and `key:` + `  - item` lists.
      const scalar = (key: string) =>
        new RegExp(`^${key}: (.*)$`, "m").exec(fm)?.[1].trim() ?? null;
      const list = (key: string) => {
        const block = new RegExp(`^${key}:\\n((?:  - .*(?:\\n|$))*)`, "m").exec(fm);
        if (!block) return null;
        return [...block[1].matchAll(/^  - (.*)$/gm)].map((v) => v[1].trim());
      };

      expect(scalar("name"), file).toBe(file.replace(/\.md$/, ""));
      expect(scalar("description"), file).toBeTruthy();
      const limit = scalar("iteration_limit");
      expect(limit, `${file}: iteration_limit`).toMatch(/^[1-9][0-9]*$/);
      expect(Number.isSafeInteger(Number(limit)), file).toBe(true);

      const allowed = list("allowed_verbs");
      const disallowed = list("disallowed_verbs");
      expect(allowed!.length, `${file}: allowed_verbs`).toBeGreaterThan(0);
      expect(disallowed!.length, `${file}: disallowed_verbs`).toBeGreaterThan(0);
      for (const verb of allowed!) {
        expect(VERB_REGISTRY, `${file}: ${verb} not in the spine registry`).toContain(verb);
      }
      for (const verb of disallowed!) {
        expect(VERB_REGISTRY, `${file}: ${verb} not in the spine registry`).toContain(verb);
      }
      for (const verb of allowed!) {
        expect(disallowed!, `${file}: ${verb} allowed and disallowed`).not.toContain(verb);
      }
      // Only the dispatcher spawns; no persona spawns personas.
      expect(allowed!, `${file}: personas never spawn agents`).not.toContain("spawn-agent");

      expect(scalar("return_contract"), file).toBeTruthy();

      // Body contract: role method, refusal conditions, and the exact return JSON — the three
      // elements spine §3 requires below the frontmatter.
      for (const section of ["## Method", "## Refusal conditions", "## Return"]) {
        expect(raw.includes(section), `${file}: missing ${section}`).toBe(true);
      }
      expect(/```json[\s\S]*```/.test(raw), `${file}: no return JSON`).toBe(true);
    }
  });
});
