/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * The rule it defends: a skill directory is copy-pasteable on its own, so NO import may leave it.
 * Not "may not re-enter another skill" — may not leave at all: another skill, a story workspace
 * under `proof/`, the vendored `shared/` tree, anywhere. That is the premise the whole twin rests
 * on (copy the directory into a journalist's root and it builds), and an earlier, narrower form of
 * this guard — which only flagged a specifier re-entering ANOTHER skill — was blind to the two
 * shipped files that imported a story workspace instead (`twin-chart-video/assets/EmissionsVideo.tsx`
 * reaching for `proof/co2-suisse/crossing-geometry`, `twin-chart-web/scripts/render-web.mjs` for
 * `proof/co2-suisse/EmissionsWeb.tsx`). A skill's `test/` directory may still import out, solely to
 * assert two implementations agree, so `test/` is excluded.
 *
 * WHAT IT CATCHES. Every source file (`.mjs`/`.mts`/`.cjs`/`.cts`/`.ts`/`.tsx`/`.js`/`.jsx`)
 * anywhere under a skill except its `test/` directory is read as text, comments stripped, and EVERY string literal
 * examined — single-quoted, double-quoted, backticked, and regardless of what syntax carries it
 * (`from`, `import(`, `require(`, a bare side-effect `import "…"`, or nothing at all). A literal is
 * an offender when, after normalisation, it resolves on disk OUTSIDE the skill it was written in.
 * Two grades of offence, because they need different discrimination:
 *
 *   - it lands in — or exactly at — ANOTHER skill's directory: an offence whatever it resolves to.
 *   - it lands anywhere else outside this skill: an offence when the target is a MODULE (a file with
 *     a module extension, or a directory with an `index.*` in it, or an extensionless specifier that
 *     resolves to one). A path to a non-module — `/tmp/map-twin/co2.csv`, `../../../.env`, an output
 *     directory — is a runtime file path a script reads or writes, not an import, and several
 *     legitimately exist; flagging those would make this guard depend on what happens to be sitting
 *     in `/tmp` on the machine running it.
 *
 * Normalisation is what a module resolver does, not what a reader assumes:
 *
 *   - relative (`./`, `../`, any depth) AND absolute (`/Users/…/skills/twin-chart-beat/…`) paths
 *     are both resolved. Absolute is not exotic here: two story files in this very repository had
 *     to have exactly that shape removed.
 *   - a module-loader suffix is stripped before resolving — `…/render-still.mjs?raw` (Vite's own
 *     convention) and `…/render-still.mjs#chunk` name the same file as the bare path.
 *   - `file://` URLs are converted to paths, and percent-escapes are decoded (`twin-chart-%62eat`).
 *     Measured, not assumed: `import("file:///…/twin-chart-beat/…")` loads the real sibling under
 *     both Bun and Node; the percent-escaped form loads it under Node (whose ESM resolution is
 *     URL-based) and is rejected by Bun's own resolver — caught here either way, since scripts in
 *     this repository run under both.
 *   - membership is decided on case-FOLDED paths. This machine's filesystem is case-insensitive, so
 *     `../../Twin-Chart-Beat/scripts/render-still.mjs` genuinely loads the sibling; a case-sensitive
 *     string compare would have stayed silent on every Mac and Windows dev machine.
 *   - a missing extension is resolved the way Node/Bun resolve it (bare path, then each of
 *     MODULE_EXTENSIONS, then `index.*` in a directory), so the extensionless
 *     `from "../../twin-chart-video/assets/timing"` — the exact shape three of the nine original
 *     violations took — is caught.
 *   - JS escape sequences are decoded, so `"\x2e\x2e/\x2e\x2e/twin-chart-beat/…"` is read as the
 *     `../../` it compiles to. This one used to be filed under "runtime-constructed", which was
 *     wrong: the value is fixed at compile time and fully present in the source text, so a text scan
 *     CAN see it, and now does.
 *
 * A literal containing whitespace is skipped: prose reads as a sentence, a specifier never does.
 * That is what keeps a real error message such as
 * `throw new Error("../../twin-chart-beat/scripts/render-still.mjs was moved, update your fixture path")`
 * from failing the build. A literal that resolves to nothing on disk is skipped for the same reason.
 *
 * WHAT IT PROVABLY DOES NOT CATCH. Two families, both open, both stated so no one reads this guard
 * as more than it is:
 *
 * 1. A specifier CONSTRUCTED AT RUNTIME — the sibling's name is not in any single literal, it is
 *    assembled from pieces while the program runs. This is a static text scan; it never evaluates
 *    anything, so it cannot see a value that does not exist until execution. Both of these import
 *    the real sibling and stay green:
 *
 *      const suffix = "beat";
 *      import(`../../twin-chart-${suffix}/scripts/render-still.mjs`)          // interpolation
 *
 *      const skillName = "twin-chart" + "-beat";
 *      import("../../" + skillName + "/scripts/render-still.mjs")             // concatenation
 *
 *    Anything of that family is open: a variable, a function return, a value read from JSON at
 *    startup. Closing it needs an AST with constant folding, or a runtime import hook — a different
 *    tool. The limit is deliberate, not an oversight, and it is the honest boundary of a text scan.
 *
 * 2. An INDIRECTION that never spells the sibling path in the literal at all. The literal is plain
 *    text here, so this one is not obfuscation — it is simply invisible to a path scan:
 *      - a `package.json` `imports` alias, or a bundler/tsconfig path alias, that points into a
 *        skill. Today `twin/package.json` maps only `#shared/* -> ./shared/*`, which cannot reach
 *        `skills/`, so nothing in the tree uses this route — but add a mapping into `skills/` and
 *        this guard is blind to every import through it.
 *      - a symlink inside `shared/` (or anywhere outside `skills/`) whose target is a skill
 *        directory: the literal resolves outside `skills/`, and the guard compares paths, not
 *        inodes.
 *    Both are caught only by reviewing the alias table / the symlink, not by this test.
 *
 * 3. Two narrower blind spots, named rather than left implicit:
 *      - a specifier containing WHITESPACE — the no-whitespace check that keeps prose out would
 *        also skip `"../../twin chart beat/…"`. No skill directory has a space in its name and none
 *        should; if one ever does, this heuristic has to be replaced, not tuned.
 *      - source in a file type this scan does not read. It reads
 *        `.mjs`/`.mts`/`.cjs`/`.cts`/`.ts`/`.tsx`/`.js`/`.jsx`; a `.svelte`/`.vue`/`.astro` file, or
 *        an import inlined in HTML, would go unscanned. None exists in this repository today.
 *
 * This guard defends against the ACCIDENTAL reintroduction — the failure this project actually had,
 * nine times over. Within plain literal text that names a path it is now exhaustive as far as it has
 * been probed; beyond that, the two families above are open, and it should be trusted for exactly
 * that much and no more.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SKILLS = join(import.meta.dirname, "..", "..");

async function* sourceFiles(dir: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "test") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* sourceFiles(p);
    else if (/\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)$/.test(e.name)) yield p;
  }
}

/**
 * Every string-literal VALUE in `src`, with comments removed first — never the syntax that carries
 * it. Two earlier attempts at this guard matched fixed keyword+quote shapes
 * (`from "..."` / `import("...")` / `require("...")`, then double- and single-quotes) and both were
 * beaten by ordinary JS the matcher had not been told about: a backtick dynamic import, a bare
 * side-effect `import "...";`. Enumerating syntax was the wrong axis — a specifier is a string
 * literal, full stop, whatever precedes it (`from`, `import(`, `require(`, nothing at all) and
 * whatever quotes it (`'`, `"`, `` ` ``). This is a single-pass character scanner, not a real JS
 * parser: it tracks exactly three things — inside a line comment, inside a block comment, inside a
 * string literal (any of the three quote characters) — skipping comments untouched and collecting
 * every string body it walks through. Escaped quotes (`\"`, `\'`, `` \` ``) do not end a literal
 * early. Known, accepted limitation: a template literal containing a NESTED unescaped backtick
 * inside `${...}` interpolation (rare, and not a shape any specifier in this repository takes) can
 * close early — a real parser would not have that gap, but nothing here needs one.
 */
function stringLiterals(src: string): string[] {
  const literals: string[] = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      i += 2;
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      let j = i + 1;
      let value = "";
      while (j < n && src[j] !== quote) {
        if (src[j] === "\\") {
          value += src[j] + (src[j + 1] ?? "");
          j += 2;
          continue;
        }
        value += src[j];
        j++;
      }
      literals.push(value);
      i = j + 1;
      continue;
    }
    i++;
  }
  return literals;
}

// The module extensions Node/Bun try when a specifier omits one — the same list a real resolver
// walks, not a list this guard invented. `twin-map-beat/assets/timing.ts` used to import
// `../../twin-chart-video/assets/timing`, no extension, three sites — TypeScript's own everyday
// convention, and the exact shape three of this task's nine original violations took. A guard that
// required a recognized extension would have missed the most likely accidental reintroduction while
// catching only the less likely ones, which inverts the point of having it.
const MODULE_EXTENSIONS = [".mjs", ".ts", ".tsx", ".js", ".json"];

// What counts as a MODULE when a specifier already carries its own extension — the discriminator
// between an import that leaves the skill and a runtime file path that leaves it (a CSV read, an
// output directory, `../../../.env`). Wider than MODULE_EXTENSIONS on purpose: that list is what a
// resolver APPENDS to an extensionless specifier, this one is what it will happily LOAD.
const MODULE_FILE_EXTENSIONS = [
  ".mjs",
  ".mts",
  ".cjs",
  ".cts",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
];

/**
 * A string literal's compiled VALUE: `stringLiterals` collects the raw source between the quotes, so
 * `"\x2e\x2e/twin-chart-beat"` arrives here spelled with backslashes and reaches the filesystem as
 * nothing. The escape is not runtime construction — the value is fixed at compile time and fully
 * present in the source — so a text scan can and should decode it. Unknown escapes fall through to
 * the escaped character itself, which is what JS does (`\q` is `q`).
 */
function decodeJsEscapes(raw: string): string {
  return raw.replace(
    /\\(x[0-9a-fA-F]{2}|u\{[0-9a-fA-F]{1,6}\}|u[0-9a-fA-F]{4}|[\s\S])/g,
    (_match, esc: string) => {
      if (esc[0] === "x")
        return String.fromCharCode(parseInt(esc.slice(1), 16));
      if (esc[0] === "u") {
        const hex = esc[1] === "{" ? esc.slice(2, -1) : esc.slice(1);
        return String.fromCodePoint(parseInt(hex, 16));
      }
      const simple: Record<string, string> = {
        n: "\n",
        t: "\t",
        r: "\r",
        b: "\b",
        f: "\f",
        v: "\v",
        "0": "\0",
      };
      return simple[esc] ?? esc;
    },
  );
}

/**
 * The path forms a module resolver would try for `literal`, or `[]` if the literal is not shaped
 * like a path specifier at all.
 *
 * Four things a naive reading of a literal gets wrong, each verified to reach a real sibling file:
 * an ABSOLUTE path (`/Users/…/skills/twin-chart-beat/scripts/render-still.mjs`) is as much an import
 * as a relative one; a `?raw`/`#chunk` SUFFIX belongs to the loader, not to the filename, so it must
 * come off before resolving; a JS ESCAPE (`\x2e\x2e/…`) compiles to the path it spells; and a
 * `file://` URL or a percent-escape (`twin-chart-%62eat`) is decoded by URL-based ESM resolution
 * before it ever reaches the filesystem. A bare specifier
 * (`react`, `node:path`, `#shared/*`) is not a path and is dropped here — see the header block for
 * the alias route that leaves open.
 */
function specifierCandidates(literal: string): string[] {
  let spec = decodeJsEscapes(literal).replace(/[?#].*$/s, ""); // "\x2e\x2e/…", "…mjs?raw", "…mjs#chunk"
  if (spec.startsWith("file://")) {
    try {
      spec = fileURLToPath(spec);
    } catch {
      return [];
    }
  }
  if (!spec.startsWith(".") && !isAbsolute(spec)) return [];
  const candidates = [spec];
  try {
    const decoded = decodeURIComponent(spec); // ESM resolves a specifier as a URL: %62 === "b"
    if (decoded !== spec) candidates.push(decoded);
  } catch {
    /* malformed escape — the raw form is the only candidate */
  }
  return candidates;
}

/**
 * Whether `candidatePath` (already resolved to an absolute path) is something a real module
 * resolver would actually load — the discriminator between a genuine specifier and a human-facing
 * string that merely starts with a path, e.g.
 * `"../../twin-chart-beat/scripts/render-still.mjs was moved, update your fixture path"` (a real
 * error message a test could throw). A specifier RESOLVES, with or without its extension, exactly
 * the way `import`/`require` would resolve it: the exact path, or the exact path plus one of
 * `MODULE_EXTENSIONS`, or — if it names a directory — an `index.*` inside it. The error message
 * resolves to nothing at all, because "fixture path" is not a file on disk.
 */
function resolvesOnDisk(candidatePath: string): boolean {
  if (existsSync(candidatePath)) {
    const stats = statSync(candidatePath);
    if (stats.isFile()) return true;
    if (stats.isDirectory()) {
      return MODULE_EXTENSIONS.some((ext) =>
        existsSync(join(candidatePath, `index${ext}`)),
      );
    }
    return false;
  }
  return MODULE_EXTENSIONS.some((ext) => existsSync(candidatePath + ext));
}

/**
 * Whether the thing `candidatePath` resolves to is a MODULE — something `import`/`require` loads —
 * rather than a data file or a directory a script writes into. Used only for the "leaves the skill
 * but does not enter another skill" grade of offence; a specifier landing inside another skill is an
 * offence whatever it points at.
 */
function resolvesToModule(candidatePath: string): boolean {
  if (existsSync(candidatePath)) {
    const stats = statSync(candidatePath);
    if (stats.isFile())
      return MODULE_FILE_EXTENSIONS.some((ext) =>
        candidatePath.toLowerCase().endsWith(ext),
      );
    if (stats.isDirectory())
      return MODULE_EXTENSIONS.some((ext) =>
        existsSync(join(candidatePath, `index${ext}`)),
      );
    return false;
  }
  return MODULE_EXTENSIONS.some((ext) => existsSync(candidatePath + ext));
}

describe("no import ever leaves the skill it was written in", () => {
  it("should find no import out of a skill outside test directories", async () => {
    const offenders: string[] = [];
    const skillNames = await readdir(SKILLS);
    for (const skill of skillNames) {
      // Every OTHER skill's own directory — landing inside (or exactly at) one of these is the
      // hardest grade of offence, flagged whatever the target is. Everything else outside this
      // skill is flagged too, but only when it resolves to a module (see `resolvesToModule`), so a
      // runtime `resolve(HERE, "../..")` cwd computation or a `/tmp` output path stays green.
      // Compared CASE-FOLDED: this filesystem is case-insensitive, so `../../Twin-Chart-Beat/…`
      // loads the real sibling and must not slip past a case-sensitive string compare.
      const otherSkillRoots = skillNames
        .filter((s) => s !== skill)
        .map((s) => ({
          exact: join(SKILLS, s).toLowerCase(),
          withSep: (join(SKILLS, s) + sep).toLowerCase(),
        }));
      const skillRoot = join(SKILLS, skill);
      if (!statSync(skillRoot).isDirectory()) continue; // a stray file next to the skills
      const ownRoot = {
        exact: skillRoot.toLowerCase(),
        withSep: (skillRoot + sep).toLowerCase(),
      };
      for await (const file of sourceFiles(skillRoot)) {
        const src = await readFile(file, "utf8");
        for (const literal of stringLiterals(src)) {
          if (/\s/.test(literal)) continue; // cheap: prose reads as a sentence, a specifier never does
          for (const candidate of specifierCandidates(literal)) {
            // Resolve with the case AS WRITTEN — a case-sensitive filesystem must still find
            // `../assets/Co2MapStill.tsx`. Only the membership compare below is case-folded.
            const resolved = resolve(dirname(file), candidate);
            if (!resolvesOnDisk(resolved)) continue; // not a real module specifier — resolves to nothing
            const folded = resolved.toLowerCase();
            const staysInOwnSkill =
              folded === ownRoot.exact || folded.startsWith(ownRoot.withSep);
            if (staysInOwnSkill) continue; // the only green shape: a skill importing itself
            const entersOtherSkill = otherSkillRoots.some(
              ({ exact, withSep }) =>
                folded === exact || folded.startsWith(withSep),
            );
            if (entersOtherSkill || resolvesToModule(resolved)) {
              offenders.push(`${file} → ${literal}`);
              break; // one offence per literal, whichever form of it resolved
            }
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
