import { describe, it, expect } from "bun:test";
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

// A module specifier string wherever one can appear at runtime: a static `from "..."` import, a
// dynamic `import("...")`, or a CommonJS `require("...")` — either quote style. This only finds
// the specifier; whether it actually crosses a skill boundary is decided below by resolving it on
// disk, never by counting `../` segments — a fixed depth is exactly what let a file one directory
// deeper through.
const SPECIFIER =
  /(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;

describe("skills never import each other at runtime", () => {
  it("should find no cross-skill import outside test directories", async () => {
    const offenders: string[] = [];
    for (const skill of await readdir(SKILLS)) {
      const ownSkillRoot = join(SKILLS, skill) + sep;
      for (const dir of ["scripts", "assets"]) {
        const root = join(SKILLS, skill, dir);
        try {
          for await (const file of sourceFiles(root)) {
            const src = await readFile(file, "utf8");
            for (const m of src.matchAll(SPECIFIER)) {
              const specifier = m[1];
              if (!specifier.startsWith(".")) continue; // #shared/* and package specifiers are never a skill
              const resolved = resolve(dirname(file), specifier);
              // Offender shape: the path escapes this file's own skill directory AND re-enters
              // another skill's directory (both checked against the real filesystem location, so
              // any relative depth and either import syntax resolve to the same verdict). A path
              // that escapes to somewhere that isn't a sibling skill at all — `proof/`, `shared/`
              // — is a different, sanctioned route and not this guard's concern.
              const landsUnderSkills =
                (resolved + sep).startsWith(SKILLS + sep) ||
                resolved === SKILLS;
              const staysInOwnSkill = (resolved + sep).startsWith(ownSkillRoot);
              if (landsUnderSkills && !staysInOwnSkill) {
                offenders.push(`${file} → ${specifier}`);
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
