/**
 * EVERY CARRIED COPY IN THE TREE, HELD BYTE FOR BYTE TO ITS CANONICAL. ONE WALKER, NO LIST.
 *
 * Skills never import across a skill boundary at runtime (`no-cross-skill-imports.test.ts`), so a
 * mechanism two skills share is CARRIED: one canonical file, physically copied. The tree already
 * had a convention for saying which file is the canonical — line 1 is `// twin/<repo path>` — and
 * a copy carries the canonical's own line 1, so the two are identical to the byte. Nine
 * byte-identical groups were nevertheless guarded by nothing on 2026-09-04, and the gate contract
 * (`storyboard/scripts/gate-contract.mjs`) was being RE-IMPLEMENTED in `where.mjs` rather than
 * carried, with a test hoping the two matched. This walker is what makes carrying the only pattern.
 *
 * THE RULE. Any source file under `skills/` or `shared/` (outside `test/`, `node_modules`,
 * `output-proof/`) whose first line is `// twin/<path>` where `<path>` is NOT the file's own path is
 * a carried copy of `<path>`. The canonical must exist, and the copy must equal it byte for byte.
 * A file whose line 1 names ITSELF is a canonical (or a deliberate variant — `map-web`'s
 * `render-still.mjs`, `map-beat`'s `sizes.mjs` — and those are compared function-wise or row-wise
 * by the tests that know their shape). Nothing is registered anywhere.
 *
 * JSON TRAVELS WITH ITS IMPORTER. A carried `.mjs` that imports `./…json` or `../references/…json`
 * relatively brings that file with it: the copy's JSON must equal the canonical's, resolved the same
 * relative way. That is how `producer-gate.mjs` carries `datawrapper-chart-types.json` without a
 * marker a JSON file cannot hold.
 *
 * WHAT IT DOES NOT SEE. A file with no `// twin/` line is invisible here (Markdown records such as
 * `TYPEFACE.md`, which open on front matter, are the known case). A copy that was RENAMED away
 * from its canonical's path while keeping the marker still compares, which is the point.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const ROOTS = ["skills", "shared"];
const SOURCE = /\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)$/;
const SKIP = new Set(["node_modules", "test", "output-proof", ".git"]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile() && SOURCE.test(entry.name)) yield path;
  }
}

function firstLine(path: string): string {
  return readFileSync(path, "utf8").split(/\r?\n/, 1)[0] ?? "";
}

/** Relative JSON specifiers a module imports — the data it carries with it. */
function jsonImports(text: string): string[] {
  return [...text.matchAll(/from\s+["'](\.{1,2}\/[^"']+\.json)["']/g)].map((m) => m[1]);
}

const copies: Array<{ copy: string; canonical: string }> = [];
for (const root of ROOTS) {
  const dir = join(ROOT, root);
  if (!existsSync(dir)) continue;
  for (const path of walk(dir)) {
    const match = /^\/\/ twin\/(\S+)\s*$/.exec(firstLine(path));
    if (!match) continue;
    const named = match[1];
    const own = relative(ROOT, path);
    if (named === own) continue;
    copies.push({ copy: own, canonical: named });
  }
}

describe("carried copies — every file whose line 1 names another file as canonical", () => {
  it("should find carried copies at all (premise)", () => {
    // Six render-still copies, the size tables, the gate contract in two skills, the guard scripts
    // in four — a roster under ten means the walker has stopped seeing the tree.
    expect(copies.length).toBeGreaterThan(10);
  });

  for (const { copy, canonical } of copies) {
    it(`${copy} should be byte-identical to ${canonical}`, () => {
      const canonicalPath = join(ROOT, canonical);
      expect([canonical, "exists", existsSync(canonicalPath)]).toEqual([canonical, "exists", true]);
      expect(statSync(canonicalPath).isFile()).toBe(true);
      const theirs = readFileSync(join(ROOT, copy));
      const ours = readFileSync(canonicalPath);
      if (!theirs.equals(ours)) {
        const a = theirs.toString("utf8").split("\n");
        const b = ours.toString("utf8").split("\n");
        const at = a.findIndex((line, i) => line !== b[i]);
        throw new Error(
          `${copy} drifted from ${canonical} at line ${at + 1}:\n  copy:      ${JSON.stringify(a[at] ?? "<end>")}\n  canonical: ${JSON.stringify(b[at] ?? "<end>")}\nEdit the canonical, then copy it over.`,
        );
      }
    });

    for (const spec of jsonImports(readFileSync(join(ROOT, copy), "utf8"))) {
      it(`${copy} should carry ${spec} identical to the canonical's`, () => {
        const mine = resolve(join(ROOT, dirname(copy)), spec);
        const theirs = resolve(join(ROOT, dirname(canonical)), spec);
        expect([spec, "exists beside the copy", existsSync(mine)]).toEqual([spec, "exists beside the copy", true]);
        expect(readFileSync(mine).equals(readFileSync(theirs))).toBe(true);
      });
    }
  }

  it("should reach the live shared/ copies through the #shared specifier package.json declares", () => {
    // `proof/` stories import `#shared/chart-beat/render-still.mjs`; the walker above holds that
    // copy to `chart-beat`'s canonical, and this holds the alias that makes it reachable.
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(pkg.imports?.["#shared/*"]).toBe("./shared/*");
  });
});
