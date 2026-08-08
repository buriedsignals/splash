/**
 * WHAT THIS GUARD DOES NOT CATCH.
 *
 * This is a static text scan: it reads source files as characters, never evaluates them. It cannot
 * see a specifier that does not exist as a literal until the program runs. Three genuine ways
 * around it, each verified to actually import the real sibling file at runtime:
 *
 *   const suffix = "beat";
 *   import(`../../twin-chart-${suffix}/scripts/render-still.mjs`)          // interpolation
 *
 *   import("\x2e\x2e/\x2e\x2e/twin-chart-beat/scripts/render-still.mjs")   // hex-escaped dots
 *
 *   const skillName = "twin-chart" + "-beat";
 *   import("../../" + skillName + "/scripts/render-still.mjs")             // concatenation
 *
 * Closing these needs an AST with constant folding, or a runtime import hook — a different tool,
 * out of proportion to what this guard defends. The limit is accepted, not fixed, because none of
 * these three is a shape anyone writes by accident. This guard's job is to catch an implementer
 * reintroducing the OBVIOUS import — the failure this project actually had, nine times over. It
 * cannot stop someone determined to obfuscate one past it, and it should not be read as though it
 * could.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");

async function* sourceFiles(dir: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "test") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* sourceFiles(p);
    else if (/\.(mjs|ts|tsx)$/.test(e.name)) yield p;
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

describe("skills never import each other at runtime", () => {
  it("should find no cross-skill import outside test directories", async () => {
    const offenders: string[] = [];
    const skillNames = await readdir(SKILLS);
    for (const skill of skillNames) {
      // Every OTHER skill's own directory — the specific thing a literal must land inside (or
      // exactly at) to be "re-entering another skill". Landing at the `skills/` root itself, or
      // anywhere that is not a named skill's directory (a runtime `resolve(HERE, "../..")` cwd
      // computation lands exactly here, and is not an import), is not an offence — only a
      // sibling skill's own boundary is.
      const otherSkillRoots = skillNames
        .filter((s) => s !== skill)
        .map((s) => ({
          exact: join(SKILLS, s),
          withSep: join(SKILLS, s) + sep,
        }));
      for (const dir of ["scripts", "assets"]) {
        const root = join(SKILLS, skill, dir);
        try {
          for await (const file of sourceFiles(root)) {
            const src = await readFile(file, "utf8");
            for (const literal of stringLiterals(src)) {
              if (!literal.startsWith(".")) continue; // #shared/* and package specifiers are never a skill
              if (/\s/.test(literal)) continue; // cheap: prose reads as a sentence, a specifier never does
              const resolved = resolve(dirname(file), literal);
              if (!resolvesOnDisk(resolved)) continue; // not a real module specifier — resolves to nothing
              const enterOtherSkill = otherSkillRoots.some(
                ({ exact, withSep }) =>
                  resolved === exact || resolved.startsWith(withSep),
              );
              if (enterOtherSkill) {
                offenders.push(`${file} → ${literal}`);
              }
            }
          }
        } catch {
          /* skill has no such directory */
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
