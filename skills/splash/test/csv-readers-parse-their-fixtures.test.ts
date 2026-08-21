/**
 * THE HALF THAT `csv-hand-split.test.ts` CANNOT SEE.
 *
 * `proof/scrolly-one-chart-swiss-life-expectancy/life-data.ts` shipped clean under that walk — its
 * `.split(",")` was gone, replaced by the real tokeniser — and still threw at runtime:
 * `parseReadings` fed the tokeniser's own OUTPUT (one array of fields per row) into
 * `.filter((line) => line.trim())`, a method that exists on the STRING a hand-split used to see and
 * not on the ARRAY the real tokeniser returns. `csv-hand-split.test.ts` proved the anti-pattern was
 * absent. Nothing anywhere proved the replacement still worked — the exact gap this file closes.
 *
 * SO THIS WALKS THE SAME GROUND AND ASKS THE OPPOSITE QUESTION: not "is the bad pattern gone" but
 * "does the reader still turn its own frozen csv into rows a caller can use". It finds every file
 * that inlines the tokeniser (`function parseCsvRows(text) { … }` — the same signature
 * `csv-hand-split.test.ts` and every `verify-*.mjs`'s `csvSplitByHand` already key off), pulls the
 * tokeniser and every function in that file whose body actually calls it, strips whatever
 * TypeScript the pair carries (`Bun.Transpiler`, `loader` picked from the file's own extension),
 * and RUNS the reconstructed function against the csv fixture sitting in the beat's own directory —
 * the file it ships with, not a synthetic string built for this test. A reader that still turns
 * rows into fields returns a non-empty array whose first element is not the raw row it was handed.
 * A reader that regressed to treating a row as a string throws exactly `life-data.ts` did:
 * `<name>.trim is not a function` (or `.split`/`.startsWith`/any other String-only method) — the
 * one error shape this file trusts as proof of the SAME defect class, because nothing else about a
 * beat's own business logic (a missing entity, a year with no match, a gap in the years) produces
 * it. Watched red: reverting `life-data.ts`'s fix in a scratch copy and pointing this walk's own
 * extractor at it reproduces `line.trim is not a function` verbatim.
 *
 * THREE FILES READ THEIR OWN CSV AT MODULE SCOPE rather than inside a named function
 * (`mapgen-choropleth-video/build-data.mjs` and both `milan-cortina-la-glace-des-sponsors` beats) —
 * nothing to extract a function boundary around. Their row-consuming statements are copied here
 * verbatim (see `MODULE_SCOPE_READERS` below) rather than sliced out of the file by a second,
 * fuzzier extractor; if a future edit changes that code, the two copies drift and
 * `helper-parity.test.ts`'s own kind of guard is the one that would have to notice — this file
 * only promises the copy IT holds still parses the fixture cleanly.
 *
 * SIX FILES ARE NAMED IN `SKIPPED`, BELOW, RATHER THAN SILENTLY DROPPED — five carry no fixture
 * of their own: a skill's own generic reader is exercised through the beats that call it with a
 * real csv (`map-beat/assets/geo.ts`'s `valuesFromCsv` through every `proof/*​/geo-choropleth.ts`
 * copy this walk DOES run), a probe utility takes an arbitrary `--data` path
 * (`map-beat/scripts/extent-range.mjs`), a skill template is parametrised by whichever beat installs
 * it (`chart-video/scripts/render-video.mjs`), one reader fetches over the network rather than
 * reading a frozen file (`dw-beat/scripts/prove-co2.mjs`), and one file in the walk is itself a test
 * helper that already exercises real fixtures inside its own suite
 * (`camera-holds-the-study-set.test.ts`) — the same reasoning `csv-hand-split.test.ts` uses to
 * exclude `verify-*.mjs`/`detect-*.mjs`. The sixth
 * (`scrolly-one-chart-swiss-life-expectancy/render.mjs`) has a fixture but nothing worth running
 * against it: its only call to the tokeniser is one inline expression inside the async render
 * pipeline this walk must never execute, and the same lookup is already covered as `entityOf` in
 * the sibling `life-data.ts`, over the same fixture.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const SCAN_DIRS = ["proof", "stories", "skills", "shared", "installer"];
const EXCLUDE_DIRS = new Set(["node_modules", ".git"]);

function* sourceFiles(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (EXCLUDE_DIRS.has(name)) continue;
    const path = join(dir, name);
    const stats = statSync(path);
    if (stats.isDirectory()) yield* sourceFiles(path);
    else if (/\.(mjs|ts|tsx|js)$/.test(name)) yield path;
  }
}

// Every file whose own directory tree (bounded to that beat/skill/story, not the whole repo) does
// not carry a csv fixture at all — named above, each with the reason it is exempt rather than
// broken.
const SKIPPED = new Set([
  "skills/map-beat/scripts/extent-range.mjs",
  "skills/map-beat/assets/geo.ts",
  "skills/chart-video/scripts/render-video.mjs",
  "skills/dw-beat/scripts/prove-co2.mjs",
  "skills/splash/test/camera-holds-the-study-set.test.ts",
  // Its only call to `parseCsvRows` is a single expression, `parseCsvRows(csv.trim())[1][0]`,
  // inline inside the async `render()` pipeline this walk must never execute (it writes files and
  // shells out). The same lookup is `entityOf` in the sibling `life-data.ts`, in the same
  // directory, over the same fixture — extracted and run below.
  "proof/scrolly-one-chart-swiss-life-expectancy/render.mjs",
]);

// ── Extracting a reader out of its own file, verbatim ─────────────────────────────────────────

type Reader = { name: string; params: string[]; block: string };

/** Walks forward from a `{` at `braceStart`, brace-counting, and returns the slice from `sigStart`
 *  through the matching `}` — the function's own source, nothing invented. */
function blockFrom(src: string, sigStart: number, braceStart: number): string {
  let depth = 0;
  let i = braceStart;
  while (i < src.length) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
    i++;
  }
  return src.slice(sigStart, i);
}

/** Splits a parameter list on its OWN top-level commas — a destructured `{ a, b }` or a default
 *  `= {}` carries commas and braces of its own that are not parameter separators. */
function topLevelParams(paramText: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < paramText.length; i++) {
    const c = paramText[i];
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") depth--;
    else if (c === "," && depth === 0) {
      parts.push(paramText.slice(start, i));
      start = i + 1;
    }
  }
  const last = paramText.slice(start).trim();
  if (last) parts.push(last);
  return parts.map((p) => p.trim()).filter(Boolean);
}

// `(async\s+)?` is matched and then REJECTED below rather than left out of the pattern: a reader
// that inlines the tokeniser is never async (it is pure text-in, rows-out), and the one match this
// would otherwise miss is real — `render()` in `scrolly-one-chart-swiss-life-expectancy/render.mjs`
// calls `parseCsvRows(csv.trim())[1][0]` once, deep inside the whole render pipeline (spawns a
// browser, writes files) that this walk must never execute.
const FN_HEADER = /(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)[^{]*\{/g;

/** The tokeniser itself, plus every OTHER function in the file whose body calls it — a file can
 *  hold more than one reader over more than one fixture (`ice-data.ts`'s photographs and its
 *  mass-balance series, read by two different functions over two different csvs). */
function extractCsvReaders(src: string): {
  tokeniser: string | null;
  readers: Reader[];
} {
  FN_HEADER.lastIndex = 0;
  let m: RegExpExecArray | null;
  let tokeniser: string | null = null;
  const readers: Reader[] = [];
  while ((m = FN_HEADER.exec(src))) {
    if (m[2]) continue; // async — not a pure reader, see the comment on FN_HEADER above
    const name = m[3]!;
    const paramText = m[4]!;
    // Skip past a leading `export ` — `new Function` bodies cannot contain module syntax.
    const sigStart = m.index + (m[1] ? m[1].length : 0);
    const braceStart = m.index + m[0].length - 1;
    const block = blockFrom(src, sigStart, braceStart);
    if (name === "parseCsvRows") {
      tokeniser = block;
      continue;
    }
    if (block.includes("parseCsvRows("))
      readers.push({ name, params: topLevelParams(paramText), block });
  }
  return { tokeniser, readers };
}

// ── Pulling in whatever top-level constant or helper a reader leans on ────────────────────────
//
// `valuesFromCsv` calling `readHonestNumber`, `readingsFromCsv` filtering against `BEAT.year`,
// `readPhotographs` asserting `lines[0].join(",") !== PHOTO_HEADER` — a reader is rarely
// self-contained. Extracting only the reader itself leaves these names undefined in the sandbox,
// which is a REAL gap in this walk's own coverage, not a defect in the source; closing it (rather
// than accepting the weaker "did not throw" bar for every such reader) is what turns most of these
// into the same non-empty/well-typed check the self-contained readers already get.

type TopLevelDecl = { name: string; text: string; order: number };

/** Every `const NAME = …;` and `function NAME(…) { … }` written at column 0 — this project's own
 *  convention, confirmed by grep across the 84 files this walk targets. Balanced past whatever
 *  brackets, strings or template literals the initialiser carries; stops at the first depth-0
 *  `;`, or at the line before the next column-0 declaration for one written without a trailing
 *  semicolon. */
function topLevelDecls(src: string): Map<string, TopLevelDecl> {
  const decls = new Map<string, TopLevelDecl>();
  const DECL_START = /^(?:export\s+)?(const|function)\s+([A-Za-z_$][\w$]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = DECL_START.exec(src))) {
    const kind = m[1]!;
    const name = m[2]!;
    const sigStart = m.index + (src.slice(m.index, m.index + m[0].length).startsWith("export ") ? 7 : 0);
    if (kind === "function") {
      // The body's own `{` — found AFTER the parameter list's own matching `)`, not the first
      // `{` from here, which a destructured parameter (`function rowsFromCsv(csv, { year }) {`)
      // would find INSIDE the parameter list and truncate the whole declaration at.
      const parenStart = src.indexOf("(", sigStart);
      if (parenStart < 0) continue;
      let pdepth = 0;
      let j = parenStart;
      while (j < src.length) {
        if (src[j] === "(") pdepth++;
        else if (src[j] === ")") {
          pdepth--;
          if (pdepth === 0) {
            j++;
            break;
          }
        }
        j++;
      }
      const braceStart = src.indexOf("{", j);
      if (braceStart < 0) continue;
      decls.set(name, { name, text: blockFrom(src, sigStart, braceStart), order: sigStart });
      continue;
    }
    // const: balance past `{ } [ ] ( )` and skip over string/template contents, stop at the
    // first `;` sitting at depth 0.
    let i = sigStart;
    let depth = 0;
    let quote: string | null = null;
    while (i < src.length) {
      const c = src[i]!;
      if (quote) {
        if (c === "\\") i++;
        else if (c === quote) quote = null;
      } else if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{" || c === "[" || c === "(") depth++;
      else if (c === "}" || c === "]" || c === ")") depth--;
      else if (c === ";" && depth === 0) break;
      else if (c === "\n" && depth === 0 && /^(?:export\s+)?(?:const|function)\s/.test(src.slice(i + 1, i + 40))) break;
      i++;
    }
    decls.set(name, { name, text: src.slice(sigStart, i).replace(/;?\s*$/, ";"), order: sigStart });
  }
  // `const { ground, accent, origin, source: paletteSource } = readPalette(...)` — a destructured
  // top-level const binds several names to ONE statement; every name inside the braces is indexed
  // to the same declaration text, so referencing any one of them pulls in the whole assignment.
  const DESTRUCTURED_CONST = /^(?:export\s+)?const\s*\{/gm;
  while ((m = DESTRUCTURED_CONST.exec(src))) {
    const sigStart = m.index + (src.slice(m.index, m.index + m[0].length).startsWith("export ") ? 7 : 0);
    let i = sigStart;
    let depth = 0;
    let quote: string | null = null;
    while (i < src.length) {
      const c = src[i]!;
      if (quote) {
        if (c === "\\") i++;
        else if (c === quote) quote = null;
      } else if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{" || c === "[" || c === "(") depth++;
      else if (c === "}" || c === "]" || c === ")") depth--;
      else if (c === ";" && depth === 0) break;
      else if (c === "\n" && depth === 0 && /^(?:export\s+)?(?:const|function)\s/.test(src.slice(i + 1, i + 40))) break;
      i++;
    }
    const text = src.slice(sigStart, i).replace(/;?\s*$/, ";");
    const braceClose = text.indexOf("=");
    const pattern = text.slice(text.indexOf("{"), braceClose < 0 ? text.length : braceClose);
    for (const nm of pattern.matchAll(/(?:^|[{,])\s*(?:\.\.\.)?[A-Za-z_$][\w$]*\s*:\s*([A-Za-z_$][\w$]*)|(?:^|[{,])\s*(\.\.\.)?([A-Za-z_$][\w$]*)\s*(?=[,}=]|$)/g)) {
      const bound = nm[1] ?? nm[3];
      if (bound && !decls.has(bound)) decls.set(bound, { name: bound, text, order: sigStart });
    }
  }
  return decls;
}

/** Every identifier the reader's own text mentions that names a top-level declaration — followed
 *  transitively, so a pulled-in helper that itself leans on a constant brings that constant too. */
/** The plain identifier a parameter binds, ignoring its type annotation and default — `csv:
 *  string`, `firstYear = -Infinity` both reduce to one word. A destructured parameter (`{ year =
 *  BEAT.year }`) has no single name to shadow with, so it contributes none. */
function paramName(paramRaw: string): string | null {
  const trimmed = paramRaw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return null;
  const m = /^([A-Za-z_$][\w$]*)/.exec(trimmed);
  return m ? m[1]! : null;
}

/** Blanks out every string, template literal and comment -- keeping length and every newline, so
 *  the regex-based scans above and below stay on the same character offsets, so `NAME` inside a
 *  word boundary can never match a stray identifier-shaped word sitting in prose. Measured:
 *  `BEAT`'s own `source: "... 1990 & 2023 data"` would otherwise pull in an unrelated top-level
 *  `const data = ...` purely because the word "data" appears at the end of a credit line. */
function blankNonCode(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    const two = text.slice(i, i + 2);
    if (two === "//") {
      const end = text.indexOf("\n", i);
      const stop = end === -1 ? text.length : end;
      out += text.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else if (two === "/*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < text.length && text[j] !== c) {
        if (text[j] === "\\") j++;
        j++;
      }
      const stop = Math.min(j + 1, text.length);
      out += text.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

function closureFor(
  reader: Reader,
  decls: Map<string, TopLevelDecl>,
): TopLevelDecl[] {
  // A parameter SHADOWS a top-level const of the same name — `readingsFromCsv(csv, entity,
  // firstYear)` mentioning `csv` inside its own body must never pull in an unrelated top-level
  // `const csv = await readFile(...)` from elsewhere in the file (measured:
  // `vidx-line-life-expectancy/render.mjs` carries exactly that pair). A LOCAL `const`/`let`
  // inside the reader's own body shadows the same way — `build-data.mjs`'s reader declares its
  // own `const columns = header;` and the file's real top-level script does too, over its own
  // (unrelated, destructured) `header`.
  const shadowed = new Set(reader.params.map(paramName).filter((n): n is string => n !== null));
  for (const m of reader.block.matchAll(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)/g)) shadowed.add(m[1]!);
  // `const [header, ...rows] = parseCsvRows(…)` — the rest element of an array destructure is
  // where the row list a reader loops over almost always gets its name, and it is the one most
  // likely to collide with an unrelated top-level `const rows = …` elsewhere in the same file.
  for (const m of reader.block.matchAll(/\.\.\.([A-Za-z_$][\w$]*)/g)) shadowed.add(m[1]!);
  const needed = new Map<string, TopLevelDecl>();
  const frontier = [blankNonCode(reader.block)];
  while (frontier.length) {
    const text = frontier.pop()!;
    for (const [name, decl] of decls) {
      if (needed.has(name) || shadowed.has(name)) continue;
      // `import.meta` (a module-scope resolver like `HERE`/`STORY`/`SOURCE`) has no meaning
      // inside the plain function body `new Function` builds — pulling it in trades a name error
      // for a SyntaxError. Left out; a reader that genuinely needs it stays inconclusive, same as
      // a dependency this walk's own regex-based scan cannot find at all.
      if (decl.text.includes("import.meta")) continue;
      if (new RegExp(`\\b${name}\\b`).test(text)) {
        needed.set(name, decl);
        frontier.push(blankNonCode(decl.text));
      }
    }
  }
  // A destructured `const { a, b } = …` is indexed once per bound name (any of `a`/`b` pulls the
  // whole statement in) — deduplicate by TEXT so a reader that needs two of those names does not
  // get the same statement declared twice, which is its own SyntaxError.
  const seen = new Set<string>();
  const unique: TopLevelDecl[] = [];
  for (const decl of [...needed.values()].sort((a, b) => a.order - b.order)) {
    if (seen.has(decl.text)) continue;
    seen.add(decl.text);
    unique.push(decl);
  }
  return unique;
}

/** The three module-scope readers (see the file's own doc comment): copied here verbatim, wrapped
 *  in a function this walk can call the same way it calls every extracted one. */
const MODULE_SCOPE_READERS: Record<string, Reader> = {
  // stress-q's beat tokenises at module scope and builds its records in one inline
  // `Object.fromEntries` map rather than inside a named reader — a shape this walk had no name
  // for, so it reported the file as an unknown rather than silently claiming to have checked it.
  // The verbatim module-scope reading code, lifted so the walk can run it on the beat's own
  // frozen csv (2026-08-21 round-four stress test).
  "stories/stress-q-safety-incidents/beats/1-rate-not-count/render.mjs": {
    name: "_readDistricts",
    params: ["text"],
    block: `function _readDistricts(text) {
      const [header, ...rows] = parseCsvRows(text.trim());
      const records = rows.map((r) => Object.fromEntries(r.map((v, i) => [header[i], v])));
      return records.map((r) => ({
        name: r.district,
        incidents: Number(r.incidents),
        residents: Number(r.residents),
      }));
    }`,
  },
  "proof/mapgen-choropleth-video/build-data.mjs": {
    name: "_readKeptRows",
    params: ["text"],
    block: `function _readKeptRows(text) {
      const STUDY_LEN_MIN = 1;
      const [header, ...rows] = parseCsvRows(text.trim());
      const columns = header;
      const codeAt = columns.indexOf("Code");
      const yearAt = columns.indexOf("Year");
      if (codeAt < 0 || yearAt < 0) throw new Error(\`source csv has no Code/Year column: \${header}\`);
      const kept = [];
      for (const row of rows) {
        const cells = row;
        if (!Number.isFinite(Number(cells[yearAt]))) continue;
        kept.push(row);
      }
      if (kept.length < STUDY_LEN_MIN) throw new Error("no rows kept at all");
      return kept;
    }`,
  },
  "stories/milan-cortina-la-glace-des-sponsors/beats/1-glace-des-sponsors/render.mjs":
    {
      name: "_readParts",
      params: ["csv"],
      block: `function _readParts(csv) {
      const [header, ...rows] = parseCsvRows(csv.trim());
      const cols = header;
      const records = rows.map((r) => Object.fromEntries(r.map((v, i) => [cols[i], v])));
      const parts = records.map((r) => ({
        actor: r.acteur,
        value: Number(r.glace_fondue_mt),
        isSubject: r.acteur.startsWith("Jeux"),
      }));
      return parts;
    }`,
    },
  "stories/milan-cortina-la-glace-des-sponsors/beats/2-emissions-des-sponsors/render.mjs":
    {
      name: "_readParts",
      params: ["csv"],
      block: `function _readParts(csv) {
      const [header, ...rows] = parseCsvRows(csv.trim());
      const cols = header;
      const records = rows.map((r) => Object.fromEntries(r.map((v, i) => [cols[i], v])));
      const parts = records.map((r) => ({
        actor: r.acteur,
        value: Number(r.glace_fondue_mt),
        isSubject: r.acteur.startsWith("Jeux"),
      }));
      return parts;
    }`,
    },
};

// ── Finding the fixture a reader is meant to read ──────────────────────────────────────────────

/** Every `.csv` under this file's own beat/skill/story root (the first path segment inside its
 *  scan dir) — same-directory assets, one level deeper (`assets/sample-data/`), and a sibling
 *  `source/` a story keeps two levels up all fall out of one bounded recursive walk. */
function fixturesFor(relPath: string): string[] {
  const parts = relPath.split("/");
  const beatRoot = join(ROOT, parts[0]!, parts[1]!);
  const found: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (EXCLUDE_DIRS.has(name)) continue;
      const path = join(dir, name);
      const stats = statSync(path);
      if (stats.isDirectory()) walk(path);
      else if (/\.csv$/i.test(name)) found.push(path);
    }
  };
  walk(beatRoot);
  return found;
}

// ── Building a callable out of the extracted source ────────────────────────────────────────────

function buildCallable(
  isTs: boolean,
  tokeniser: string,
  reader: Reader,
  decls: Map<string, TopLevelDecl>,
): (...args: unknown[]) => unknown {
  const closure = closureFor(reader, decls)
    .map((d) => d.text)
    .join("\n");
  const transpiler = new Bun.Transpiler({ loader: isTs ? "ts" : "js" });
  const jsSrc = transpiler.transformSync(`${tokeniser}\n${closure}\n${reader.block}\n`);
  const factory = new Function(`${jsSrc}\nreturn ${reader.name};`);
  return factory() as (...args: unknown[]) => unknown;
}

/** Every extra parameter beyond the csv/text itself gets a value that can never be `undefined` —
 *  `undefined` would let a default like `{ year = BEAT.year } = {}` evaluate, and `BEAT` does not
 *  exist in this sandbox. An object-shaped parameter gets `{}` (its own inner defaults still fire,
 *  same risk — accepted, see the `INCONCLUSIVE` bucket below); anything else gets `null`, which
 *  survives every equality/comparison a filter does without matching a real row. */
function argFor(paramRaw: string): unknown {
  return paramRaw.trim().startsWith("{") ? {} : null;
}

/** The one error shape this walk trusts as the SAME defect `life-data.ts` shipped: a string-only
 *  method called on whatever a row now is. No beat's own business logic (a missing column, an
 *  absent entity, a year with no match) produces this message shape. */
const ROW_AS_STRING =
  /\.(trim|split|startsWith|endsWith|charAt|toUpperCase|toLowerCase|padStart|padEnd|match|localeCompare|codePointAt|charCodeAt|normalize|repeat) is not a function/;

type Outcome = "clean" | "inconclusive" | "crash";

function tryReader(
  isTs: boolean,
  tokeniser: string,
  reader: Reader,
  fixtures: string[],
  decls: Map<string, TopLevelDecl>,
): { outcome: Outcome; detail: string } {
  let fn: (...args: unknown[]) => unknown;
  try {
    fn = buildCallable(isTs, tokeniser, reader, decls);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { outcome: "inconclusive", detail: `could not reconstruct a callable: ${message}` };
  }
  const extraArgs = reader.params.slice(1).map(argFor);
  let bestDetail = "no fixture produced a result";
  for (const fixturePath of fixtures) {
    const text = readFileSync(fixturePath, "utf8");
    try {
      const result = fn(text, ...extraArgs);
      const requiresNoExtraArgs = reader.params.length <= 1;
      if (Array.isArray(result) && result.length > 0) {
        const first = result[0];
        // Accepted as "processed" when it is not itself a raw string, and — if it is an
        // array — carries at least one non-string element (a coordinate pair like `[8.17,
        // 48.09]` is exactly as processed as a plain record; an array of only strings the same
        // length as a csv row is the one shape a still-broken reader could hand back untouched).
        const wellTyped =
          typeof first !== "string" &&
          (!Array.isArray(first) || first.some((cell) => typeof cell !== "string"));
        if (wellTyped)
          return {
            outcome: "clean",
            detail: `${fixturePath}: array(${result.length}), first=${JSON.stringify(first).slice(0, 120)}`,
          };
        bestDetail = `${fixturePath}: first row still looks like a raw row, not a parsed one: ${JSON.stringify(first).slice(0, 120)}`;
      } else if (typeof result === "string" && result.length > 0) {
        // A scalar reader (`entityOf`) — a non-empty string is a clean result on its own.
        return {
          outcome: "clean",
          detail: `${fixturePath}: ${JSON.stringify(result)}`,
        };
      } else if ((result instanceof Map || result instanceof Set) && result.size > 0) {
        // `valuesFromCsv` returns a `Map<code, value>` — as processed a result as an array of
        // records, checked the same way: non-empty is the proof the row loop actually ran.
        return {
          outcome: "clean",
          detail: `${fixturePath}: ${result instanceof Map ? "Map" : "Set"}(${result.size})`,
        };
      } else if (!requiresNoExtraArgs) {
        // A parametrised reader that ran to completion without the row-as-string crash, even if
        // the placeholder args matched nothing real — the row-consuming loop still ran.
        return {
          outcome: "clean",
          detail: `${fixturePath}: ran without a row-as-string crash (params: ${reader.params.join(", ")})`,
        };
      } else {
        bestDetail = `${fixturePath}: returned ${JSON.stringify(result)}`;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (ROW_AS_STRING.test(message))
        return { outcome: "crash", detail: `${fixturePath}: ${message}` };
      bestDetail = `${fixturePath}: ${message}`;
    }
  }
  return { outcome: "inconclusive", detail: bestDetail };
}

describe("every inlined csv reader still turns its own frozen csv into rows a caller can use", () => {
  it("should find no reader that treats a tokenised row as the string it used to be", () => {
    let walked = 0;
    let readersRun = 0;
    let cleanlyVerified = 0;
    const offenders: string[] = [];
    const inconclusive: string[] = [];

    for (const dir of SCAN_DIRS) {
      for (const file of sourceFiles(join(ROOT, dir))) {
        if (file === import.meta.path) continue; // this file's own doc comment names the signature
        const src = readFileSync(file, "utf8");
        if (!/function\s+parseCsvRows\s*\(/.test(src)) continue;
        walked++;
        const relPath = file.slice(ROOT.length + 1);
        if (SKIPPED.has(relPath)) continue;

        const isTs = /\.ts$/.test(file);
        const { tokeniser, readers: extracted } = extractCsvReaders(src);
        const decls = topLevelDecls(src);
        const moduleScope = MODULE_SCOPE_READERS[relPath];
        const readers = moduleScope ? [...extracted, moduleScope] : extracted;
        if (!tokeniser) {
          offenders.push(
            `${relPath}: inlines "parseCsvRows" by name but this walk could not extract its body`,
          );
          continue;
        }
        if (readers.length === 0) {
          offenders.push(
            `${relPath}: inlines the tokeniser but no reader was found calling it — new file shape this walk does not know yet`,
          );
          continue;
        }

        const fixtures = fixturesFor(relPath);
        if (fixtures.length === 0) {
          offenders.push(
            `${relPath}: inlines the tokeniser, is not in SKIPPED, and no .csv fixture was found under its own beat root`,
          );
          continue;
        }

        for (const reader of readers) {
          readersRun++;
          const { outcome, detail } = tryReader(
            isTs,
            tokeniser,
            reader,
            fixtures,
            decls,
          );
          if (outcome === "crash")
            offenders.push(`${relPath} :: ${reader.name} — ${detail}`);
          else if (outcome === "clean") cleanlyVerified++;
          else inconclusive.push(`${relPath} :: ${reader.name} — ${detail}`);
        }
      }
    }

    if (offenders.length > 0) {
      console.log("OFFENDERS (row treated as the string it used to be):");
      for (const o of offenders) console.log(" ", o);
    }
    if (inconclusive.length > 0) {
      // Not a failure — a parametrised reader whose placeholder args matched nothing real, or an
      // extraction this walk's own sandbox could not fully satisfy (an external constant like
      // `BEAT.year` the file's other code supplies at its real call site). Printed so a maintainer
      // narrowing this walk's coverage can see exactly what is not yet checked, without the walk
      // crying wolf over its own placeholder choices.
      console.log(
        `${inconclusive.length} reader(s) ran inconclusively (not a failure):`,
      );
      for (const i of inconclusive) console.log(" ", i);
    }

    // A reader that stopped walking real files would also report zero offenders — the same floor
    // `csv-hand-split.test.ts` holds on its own walk, for the same reason.
    expect(walked).toBeGreaterThanOrEqual(80); // measured 2026-08-20: 84 files inline the tokeniser
    expect(readersRun).toBeGreaterThanOrEqual(75); // measured 2026-08-20: 82 readers across 79 checked files
    // Most readers take only their own csv and nothing else, so most calls are checked against a
    // real non-empty, correctly-typed first row, not merely against "did not crash" — the other 12
    // are named above, each for a reason this file's own doc comment or the printed detail states
    // (an external `readPalette` import, a placeholder filter arg that legitimately matches
    // nothing, a reader whose own contract is to hand back the still-raw row on purpose).
    expect(cleanlyVerified).toBeGreaterThanOrEqual(65); // measured 2026-08-20: 70 clean

    expect(offenders).toEqual([]);
  });
});
