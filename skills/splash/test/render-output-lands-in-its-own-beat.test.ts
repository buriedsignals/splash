/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * THE DEFECT. A beat's render script defaults its OUTPUT path to a scratch directory. Run it the
 * obvious way — no arguments, the way anyone re-renders after a fix — and it writes a fresh
 * artifact somewhere nobody looks, prints that path, exits zero, and leaves the committed artifact
 * in the repository untouched and stale. Nothing goes red. The reader sees a successful run and a
 * printed path and believes the file in the tree is what they just made. Measured 2026-08-09,
 * before this guard existed: **30 of the 65 beat scripts under `proof/` defaulted their output to
 * `/tmp`** — every video beat but three, every web chart beat, two map web beats. It had already
 * cost real verification twice in one session: `mapmore-scrolly-danube`'s non-collision
 * measurements turned out to have been taken against a build the repository did not contain, and
 * two map beats printed a path while leaving their committed HTML stale.
 *
 * WHY IT IS THE SAME DEFECT AS THE INVENTED MIGRATION SERIES, not a tidiness matter. The worst
 * thing this project shipped — three artifacts drawing a Swiss migration series that exists nowhere
 * in the tree, credited to the Federal Statistical Office, 1998 drawn negative where the real
 * series has it at +1,177 — had exactly this shape: a render whose file lived in `/tmp`, so
 * nothing committed could reproduce or audit it. Earlier fixes froze every beat's DATA beside it,
 * then the eleven map beats' basemap PLATES beside them. **Output was the half never done.**
 *
 * THE OTHER HALF, AND WHERE IT LIVES. `claims-grounded-in-data.test.ts` GUARD B is the INPUT half:
 * B1 asks whether every committed artifact has a render script in its ancestry, B2 whether a beat
 * script reads only files committed beside it. This file is the OUTPUT half: where the NEXT render
 * lands. The two do not overlap and neither implies the other — B2 passes a script that reads its
 * own frozen `data.csv` and writes the result to `/tmp`, which is precisely the state 30 beats were
 * in when both guards' populations were measured on the same tree. Read them together; do not read
 * either as covering the other.
 *
 * THE THREE RULES, and why each is shaped the way it is.
 *
 *   RULE 1 — `HERE` IS THE SCRIPT'S OWN DIRECTORY. Rules 2 and 3 are worth nothing if `HERE` can be
 *   anything, so this is checked first and separately: every beat script must define `HERE` from
 *   its own module URL (`import.meta.dirname`, or `dirname(fileURLToPath(import.meta.url))` — 61
 *   occurrences of the second form, one of the first, measured across the corpus). A script that
 *   defines `HERE = "/tmp/somewhere"` would satisfy rule 2 trivially; that is the one bypass a
 *   name-based check has, and it is closed here rather than argued about.
 *
 *   RULE 2 — EVERY OUTPUT DESTINATION RESOLVES INSIDE THE BEAT. Destinations are collected
 *   BEHAVIOURALLY, not by name, because a name allowlist cannot know about a script written next
 *   week: the first argument of every `writeFile`/`writeFileSync`/`mkdir`/`mkdirSync`/`copyFile`/
 *   `cp`/`cpSync`/`rename` call, plus every `outDir:` object property (the argument the shared
 *   `renderStill`/`renderWeb`/`renderScrolly` rasterisers write through), plus every `const` whose
 *   initialiser calls `flag("--out", …)` — whatever that const is called. Each destination
 *   expression is then resolved by inlining the file's own `const` declarations, transitively, and
 *   must (a) contain no absolute-path string literal, (b) contain no `".."` segment, and (c) be
 *   anchored on `HERE`. An explicit argument still overrides at runtime — `--out`, or a positional
 *   — so a scratch run stays possible; what is checked is only the DEFAULT, which is what an
 *   unadorned run uses.
 *
 *   RULE 3 — NO ABSOLUTE PATH LITERAL ANYWHERE IN A BEAT SCRIPT'S CODE. The belt to rule 2's
 *   braces. Rule 2 only sees destinations it knows how to collect; a path handed to a SPAWNED
 *   process is invisible to it (every video beat passes `--output <videoPath>` to Remotion, and
 *   Remotion, not this script, writes the mp4). Rule 3 catches an absolute literal wherever it is
 *   used — output, input, or subprocess argument — and is cheap enough to be worth the redundancy.
 *   Measured on the corpus after the 30 fixes: zero occurrences, so the rule costs nothing today.
 *
 * FALSE POSITIVES THAT SHAPED THESE RULES, each measured on this tree rather than imagined.
 *   - `web-co2-ranking` commits its html at `dist/co2-ranking.html`, not at the beat root. An
 *     earlier draft of rule 2 required the destination to be `HERE` exactly; it flagged that beat,
 *     and the beat is right — the rule is "inside the beat", not "at the beat's top level", so
 *     `join(HERE, "dist")` and `join(HERE, "render")` (nine map beats) both pass.
 *   - `outDir` is a FUNCTION PARAMETER in every web beat (`render({ dataPath, outDir, name })`) and
 *     in the shared `renderMapWeb` helpers, so `join(outDir, name)` cannot be resolved by inlining
 *     consts alone. Flagging those was rule 2's first output and all of them were noise: the value
 *     comes from a `const outDir` in the same file, which rule 2 checks on its own. A destination
 *     anchored on an out-family identifier the file also declares as a checked const therefore
 *     passes. This is a real hole — a caller could pass something else — and it is named again
 *     below rather than closed by a heuristic.
 *   - `readPalette(HERE, { stopAt: join(HERE, "..", "..") })` walks UP looking for a newsroom's
 *     `PALETTE.md`, by design (eight occurrences). It is an input search boundary, not an output,
 *     and rule 2 never sees it — which is why rule 2 collects destinations rather than scanning
 *     every path expression in the file. The `".."` ban in rule 2 applies only to destinations.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *   1. An explicit `--out /tmp/...` on the command line. Deliberate: a scratch run is legitimate,
 *      and this guard reads source, not shell history. What it guarantees is that the OBVIOUS run
 *      lands beside the beat.
 *   2. A destination passed INTO a beat script's exported `render({ outDir })` by a caller in
 *      another file. Rule 2 accepts an out-family parameter because the same file always declares
 *      the const that feeds it; a hypothetical importer could pass anything.
 *   3. Whether the committed artifact is CURRENT. A correct default proves the next render lands in
 *      the right place, never that the last one did. `beat-format-produces-artifact.test.ts` asks
 *      whether an artifact exists; nothing in the suite compares it against a fresh render, and for
 *      an mp4 nothing could cheaply.
 *   4. Scripts outside `proof/`. A SKILL's own seed renders (`skills/chart-web/scripts/
 *      render-web.mjs`, `skills/scrolly/scripts/render-scrolly.mjs`,
 *      `skills/chart-video/scripts/render-video.mjs`) still default to `/tmp`, and that is a
 *      DIFFERENT question: a seed render is a demonstration with no committed artifact to make
 *      stale — except `skills/chart-video/scripts/render-video.mjs`, whose `--data` default is
 *      `/tmp/video-twin/data.csv`, an INPUT living in a scratch directory, which is the exact shape
 *      that produced the invented migration series. Recorded here because it is real and out of
 *      this guard's scope, not because it is fine.
 *   5. `bake.mjs`, `bake-plate.mjs`, `interaction.mjs`, `render-still.mjs` and every other non-beat
 *      script under `proof/` — the same script set `claims-grounded-in-data.test.ts` uses, so the
 *      two guards' populations are comparable.
 *
 * PROVED IT CAN GO RED. Mutation-checked in a COPY of the tree under `/tmp`, never in the shared
 * tree — one agent's mutation here previously turned the suite red for five other people.
 *   M1, rule 2 — the real defect, reintroduced. Restoring `const outDir = flag("--out",
 *   "/tmp/video-twin")` in `proof/vidx-line-life-expectancy/render.mjs` turned rule 2 RED naming
 *   that beat and that expression, and rule 3 RED naming the literal.
 *   M2, rule 2, the subtler shape a `/tmp` scan misses — `join(HERE, "..", "video-twin")`, a
 *   relative escape into a sibling beat's folder with no absolute literal anywhere. Rule 2 RED,
 *   rule 3 green: this is why rule 2 is not a `/tmp` grep.
 *   M3, rule 1 — replacing `const HERE = dirname(fileURLToPath(import.meta.url))` with
 *   `const HERE = "/tmp/video-twin"` turned rule 1 RED for that beat, closing the bypass that would
 *   otherwise have made rules 2 and 3 pass on a script writing entirely into a scratch directory.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PROOF_ROOT = join(import.meta.dirname, "..", "..", "..", "proof");

/** Directories under proof/ that hold evidence ABOUT the experiment, not a beat's own production. */
const NOT_A_BEAT = new Set(["comparison", "seance", "trial"]);

/**
 * The beat scripts — the same set `claims-grounded-in-data.test.ts` scans, so the two guards'
 * populations can be compared. `render-still.mjs` is excluded there and here: all copies under
 * proof/ are vendored copies of a skill's shared rasteriser, verified by hash elsewhere.
 */
const BEAT_SCRIPTS = new Set([
  "render.mjs",
  "render-web.mjs",
  "render-map.mjs",
]);

/** Identifiers that name an output directory the file itself also declares as a const. */
const OUT_FAMILY = new Set(["outDir", "DEFAULT_OUT_DIR", "OUT_DIR", "outRoot"]);

/** Calls whose FIRST argument is a filesystem destination. */
const WRITE_CALLS = [
  "writeFile",
  "writeFileSync",
  "mkdir",
  "mkdirSync",
  "copyFile",
  "copyFileSync",
  "cp",
  "cpSync",
  "rename",
  "renameSync",
];

/**
 * Strip `//` and block comments while respecting string and template literals — vendored from
 * `claims-grounded-in-data.test.ts`, deliberately rather than shared: a naive strip cuts every
 * `source:` credit in half at the `//` of a URL, and a test that imports another test's internals
 * couples two guards that must be able to fail independently.
 */
function stripComments(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      out += c;
      i++;
      while (i < src.length) {
        if (src[i] === "\\") {
          out += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += src[i];
        if (src[i] === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * Read one balanced expression starting at `start`, stopping at the first `stop` character that
 * appears at bracket depth zero and outside any string. Returns the raw text.
 */
/** Whether a `/` at this point opens a REGEX rather than divides. Decided on the last non-space
 *  character consumed so far: after a value (an identifier, a number, a closing bracket) a slash is
 *  division; after an operator, an opening bracket, a comma, a colon or nothing at all, it can only
 *  open a pattern. */
function regexCanStart(consumedSoFar: string): boolean {
  const before = consumedSoFar.trimEnd().slice(-1);
  return before === "" || "=([{,;:!&|?+-*%~^<>".includes(before);
}

/** The whole regex literal starting at `at`, flags included, or null if it never closes on its own
 *  line. Character classes are tracked, because `/[^/]+/` is legal and its first `/` inside the
 *  class does not end anything. */
function regexLiteralAt(text: string, at: number): string | null {
  let i = at + 1;
  let inClass = false;
  while (i < text.length) {
    const c = text[i];
    if (c === "\n") return null;
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    else if (c === "/" && !inClass) {
      i++;
      while (i < text.length && /[a-z]/.test(text[i])) i++;
      return text.slice(at, i);
    }
    i++;
  }
  return null;
}

function balancedExpression(
  text: string,
  start: number,
  stops: string,
): string {
  let i = start;
  let depth = 0;
  let out = "";
  while (i < text.length) {
    const c = text[i];
    // A REGEX LITERAL IS NOT A STRING, and this scanner could not tell them apart until the
    // world-wrap block reached five `mapgen-*` renderers on 2026-08-23. Measured there:
    // `const className = /\bclass="([^"]+)"/.exec(tag)?.[1];` — the scanner met the quote inside the
    // PATTERN, went into string mode, and ran past its own `;\n` stop looking for a closing quote.
    // The const's "expression" then swallowed the rest of the file, including the CLI block's
    // `flag("--out", …)` and a `".."`, and this guard reported that a renderer writes outside its own
    // beat. A regex is recognised where a regex can legally begin — after an operator, an opening
    // bracket, a comma or nothing — which is exactly where a division cannot.
    if (
      c === "/" &&
      text[i + 1] !== "/" &&
      text[i + 1] !== "*" &&
      regexCanStart(out)
    ) {
      const literal = regexLiteralAt(text, i);
      if (literal) {
        out += literal;
        i += literal.length;
        continue;
      }
    }
    if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      out += c;
      i++;
      while (i < text.length) {
        if (text[i] === "\\") {
          out += text[i] + (text[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += text[i];
        if (text[i] === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if ("([{".includes(c)) depth++;
    if (")]}".includes(c)) {
      if (depth === 0 && stops.includes(c)) break;
      depth--;
    }
    if (depth === 0 && stops.includes(c)) break;
    out += c;
    i++;
  }
  return out.trim();
}

/** Every `const NAME = <expr>;` in the file, by name. */
function constDeclarations(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=/g)) {
    const at = (m.index ?? 0) + m[0].length;
    if (!out.has(m[1])) out.set(m[1], balancedExpression(text, at, ";\n"));
  }
  return out;
}

type Destination = { where: string; expr: string };

/** Every expression this script uses as a place to write, collected by behaviour, not by name. */
function destinations(text: string): Destination[] {
  const out: Destination[] = [];
  for (const call of WRITE_CALLS) {
    const re = new RegExp(`\\b${call}\\s*\\(`, "g");
    for (const m of text.matchAll(re)) {
      const at = (m.index ?? 0) + m[0].length;
      out.push({
        where: `${call}(…)`,
        expr: balancedExpression(text, at, ",)"),
      });
    }
  }
  for (const m of text.matchAll(/\boutDir\s*:\s*/g)) {
    const at = (m.index ?? 0) + m[0].length;
    const expr = balancedExpression(text, at, ",}");
    // `outDir,` shorthand in a destructuring pattern has no `:` and never reaches here.
    if (expr) out.push({ where: "outDir: …", expr });
  }
  for (const [name, expr] of constDeclarations(text))
    if (/\bflag\s*\(\s*["']--out["']/.test(expr))
      out.push({ where: `const ${name}`, expr });
  return out;
}

/**
 * Names bound by `const { outPath } = await renderWeb({ …, outDir })` — the path a shared renderer
 * REPORTS having written, handed back so the beat can post-process it. Writing to such a name is
 * writing where that call was told to write, and that argument is checked on its own.
 */
function pathsReportedByACheckedCall(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\bconst\s*\{([^}]*)\}\s*=\s*/g)) {
    const rhs = balancedExpression(text, (m.index ?? 0) + m[0].length, ";\n");
    if (![...OUT_FAMILY].some((n) => new RegExp(`\\b${n}\\b`).test(rhs)))
      continue;
    for (const part of m[1].split(",")) {
      const name = part.includes(":")
        ? part.slice(part.indexOf(":") + 1)
        : part;
      const id = name.trim().replace(/^\.\.\./, "");
      if (/^[A-Za-z_$][\w$]*$/.test(id)) out.add(id);
    }
  }
  return out;
}

/**
 * Inline the file's own consts into an expression, transitively — copying string literals through
 * VERBATIM. A naive `replace` over the whole text substitutes inside quotes too, and that is not
 * theoretical: `"/tmp/vidy-boxplot-co2-by-continent"` contains the word `boxplot`, which that same
 * file declares as a const, so the literal came out mangled and the absolute-path check stopped
 * seeing it — the guard reported "cannot be traced" for a beat whose defect was a plain `/tmp`
 * default. Found while proving this guard goes red on the pre-fix tree.
 */
function inline(
  expr: string,
  consts: Map<string, string>,
  seen = new Set<string>(),
): string {
  let out = "";
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      out += c;
      i++;
      while (i < expr.length) {
        if (expr[i] === "\\") {
          out += expr[i] + (expr[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += expr[i];
        if (expr[i] === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    const id = /^[A-Za-z_$][\w$]*/.exec(expr.slice(i));
    if (id) {
      const name = id[0];
      out +=
        name === "HERE" || seen.has(name) || !consts.has(name)
          ? name
          : `(${inline(consts.get(name)!, consts, new Set([...seen, name]))})`;
      i += name.length;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** A literal that could actually BE a filesystem path, not merely something that starts with a
 *  slash. The quote-pairing scan below cannot see a REGEX literal, so `/\s(?:aria-label)="[^"]*"/g,
 *  ""` pairs the quote inside the pattern with the one after it and hands this function `/g, `; and
 *  a real, ordinary string can begin with a slash without being a path at all — `"/>"`, the close of
 *  a self-closing tag, is one, and it is in every renderer that emits SVG.
 *
 *  So a candidate has to look like a path: one or more segments of path characters, nothing else.
 *  That is the same discrimination `no-cross-skill-imports.test.ts` already makes at its own scan
 *  ("a literal containing whitespace is skipped: prose reads as a sentence, a specifier never
 *  does"), and it keeps every shape this guard was written to catch — `/tmp/video-twin`,
 *  `/Users/…/out`, `~/Desktop/renders`. WHAT IT GIVES UP, said rather than discovered: an absolute
 *  path containing a space or a shell metacharacter is no longer seen. None exists in this tree, and
 *  a scanner that reads `/>` as a scratch directory is worse than one that misses `/My Renders`. */
const PATH_SHAPED = /^~?(?:\/[A-Za-z0-9._~@+-]+)+\/?$/;

/** String literals in an expression that name an absolute path. */
function absoluteLiterals(expr: string): string[] {
  const out: string[] = [];
  for (const m of expr.matchAll(/["'`]([^"'`\n]*)["'`]/g)) {
    const v = m[1];
    if (/^~?\/(?!\/)/.test(v) && !/^\/\//.test(v) && PATH_SHAPED.test(v))
      out.push(v);
  }
  return out;
}

type Finding = { beat: string; script: string; where: string; why: string };

function beatDirs(): string[] {
  return readdirSync(PROOF_ROOT)
    .filter((name) => !NOT_A_BEAT.has(name))
    .filter((name) => statSync(join(PROOF_ROOT, name)).isDirectory())
    .sort();
}

const scans = beatDirs().flatMap((beat) =>
  readdirSync(join(PROOF_ROOT, beat))
    .filter((f) => BEAT_SCRIPTS.has(f))
    .sort()
    .map((script) => ({
      beat,
      script,
      text: stripComments(readFileSync(join(PROOF_ROOT, beat, script), "utf8")),
    })),
);

// ---- rule 1: HERE is the script's own directory -------------------------------------------
const OWN_DIRECTORY =
  /const\s+HERE\s*=\s*(import\.meta\.dirname|dirname\s*\(\s*fileURLToPath\s*\(\s*import\.meta\.url\s*\)\s*\))/;

const unanchored = scans
  .filter(({ text }) => !OWN_DIRECTORY.test(text))
  .map(({ beat, script }) => `proof/${beat}/${script}`);

// ---- rules 2 and 3 ------------------------------------------------------------------------
const escaping: Finding[] = [];
const absoluteAnywhere: Finding[] = [];

for (const { beat, script, text } of scans) {
  const consts = constDeclarations(text);
  const anchors = new Set([
    ...[...consts.keys()].filter((name) => OUT_FAMILY.has(name)),
    ...pathsReportedByACheckedCall(text),
  ]);

  for (const { where, expr } of destinations(text)) {
    const resolved = inline(expr, consts);
    const absolute = absoluteLiterals(resolved);
    const why = absolute.length
      ? `writes to the absolute path ${JSON.stringify(absolute[0])}`
      : /["'`]\.\.["'`]/.test(resolved)
        ? "climbs out of the beat with a `..` segment"
        : /\bHERE\b/.test(resolved)
          ? null
          : [...anchors].some((n) => new RegExp(`\\b${n}\\b`).test(resolved))
            ? null
            : "cannot be traced to the beat's own directory";
    if (why) escaping.push({ beat, script, where, why: `${where} — ${why}` });
  }

  for (const literal of absoluteLiterals(text))
    absoluteAnywhere.push({
      beat,
      script,
      where: literal,
      why: `names the absolute path ${JSON.stringify(literal)}`,
    });
}

const show = (f: Finding) => `proof/${f.beat}/${f.script}: ${f.why}`;

describe("a beat render script writes beside its own beat by default", () => {
  it("should anchor HERE on the script's own directory", () => {
    expect(
      unanchored,
      "these beat scripts do not derive `HERE` from their own module URL, so every other check " +
        "here — all of which resolve an output path against `HERE` — is meaningless for them. " +
        "Define `const HERE = dirname(fileURLToPath(import.meta.url))`.",
    ).toEqual([]);
  });

  it("should resolve every output destination inside the beat's own directory", () => {
    expect(
      escaping.map(show),
      "run with no arguments, these scripts write outside their own beat. The artifact lands " +
        "somewhere nobody looks, the script prints that path and exits zero, and the committed " +
        "artifact stays stale — a successful run over a file that did not change. Default to " +
        "`HERE`, or to the subdirectory of the beat where its artifact is actually committed " +
        '(`join(HERE, "render")`, `join(HERE, "dist")`); an explicit `--out` still overrides. ' +
        "The input half of this question lives in claims-grounded-in-data.test.ts, guard B.",
    ).toEqual([]);
  });

  it("should name no absolute path in a beat script's code", () => {
    expect(
      absoluteAnywhere.map(show),
      "an absolute path in a beat script points outside the repository — a scratch directory " +
        "nothing can commit, audit or reproduce. This catches the paths the destination scan " +
        "cannot see, notably a path handed to a spawned renderer.",
    ).toEqual([]);
  });
});

/** The measurement this guard's header quotes, asserted so it cannot rot into false prose. */
describe("the population this guard covers", () => {
  it("should scan every beat script under proof/", () => {
    expect(scans.length).toBeGreaterThan(60);
    expect(scans.some((s) => s.beat === "vidx-line-life-expectancy")).toBe(
      true,
    );
    expect(scans.some((s) => s.beat === "comparison")).toBe(false);
  });

  it("still reads a real scratch path, and no longer reads SVG or a regex as one", () => {
    // The four shapes measured on 2026-08-23, when the world-wrap block reached five `mapgen-*`
    // renderers and turned both rules above red on markup and pattern syntax. Kept as an assertion
    // rather than a comment so that loosening `PATH_SHAPED` back cannot go unnoticed.
    expect(absoluteLiterals('const out = "/tmp/video-twin";')).toEqual([
      "/tmp/video-twin",
    ]);
    expect(absoluteLiterals('const out = "~/Desktop/renders";')).toEqual([
      "~/Desktop/renders",
    ]);
    expect(absoluteLiterals('title === undefined ? "/>" : "<title>"')).toEqual(
      [],
    );
    expect(
      absoluteLiterals('whole.replace(/\\sdata-detail="[^"]*"/g, "")'),
    ).toEqual([]);
    expect(
      absoluteLiterals('const classes = /\\bclass="([^"]*)"/.exec(whole)?.[1]'),
    ).toEqual([]);
  });
});
