import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INSTALL_ROOT_FILES } from "./install-root-files";

// The guard whose absence let two names be missed.
//
// INSTALL_ROOT_FILES is hand-maintained, and the delivered tree's reroot reaches every file the
// decor resolves from an install root — not the three that were noticed first. `.splash-runtime`
// and `.splash-preflight.json` were read at `installRoot()` by migrate-decor.ts and were not on
// the list, so a pre-newsroom.json install re-running the installer lost its runtime, its
// interface language and its green preflight stamps, silently. Nothing kept the list in step with
// what the install root actually holds. This does.
//
// It reads the SOURCE of the modules that perform those joins rather than a curated inventory: a
// new install-root file is a new `join(dir|root|projectDir, "…")` in one of them, and the day
// someone writes one this test names it.

const REPO = join(import.meta.dir, "../..");

/** The modules that join a filename to an install root. `decor.ts` resolves `installRoot()` and
 *  hands it down; `migrate-decor.ts` reads the legacy pair from it; `state.ts` owns the state
 *  file's name; `brand-profile.ts` is what `decor.ts` delegates the profile to, with the install
 *  root as its `projectDir`. */
const MODULES = [
  "lib/newsroom/decor.ts",
  "lib/newsroom/migrate-decor.ts",
  "lib/newsroom/state.ts",
  "skills/splash/src/brand-profile.ts",
];

/** The parameter names those modules give an install root. */
const DIR_PARAMS = ["dir", "root", "projectDir"];

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

/** Every filename those modules join to an install root, with `const` names resolved across the
 *  whole set (`join(dir, NEWSROOM_STATE_FILE)` lives in one module, its value in another). */
function installRootFilenames(): Map<string, string[]> {
  const sources = MODULES.map(
    (m) => [m, stripComments(readFileSync(join(REPO, m), "utf8"))] as const,
  );

  const consts = new Map<string, string>();
  for (const [, src] of sources)
    for (const c of src.matchAll(
      /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*"([^"]+)"/g,
    ))
      consts.set(c[1]!, c[2]!);

  const re = new RegExp(
    String.raw`join\(\s*(?:${DIR_PARAMS.join("|")})\s*,\s*(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))\s*\)`,
    "g",
  );
  const found = new Map<string, string[]>();
  for (const [mod, src] of sources) {
    for (const g of src.matchAll(re)) {
      const name = g[1] ?? consts.get(g[2]!);
      // An unresolvable identifier is not silently dropped: a name this scan cannot read is a
      // name it cannot guard, and that has to be visible rather than counted as "nothing found".
      const key = name ?? `<unresolved: ${g[2]}>`;
      const where = found.get(key) ?? [];
      if (!where.includes(mod)) where.push(mod);
      found.set(key, where);
    }
  }
  return found;
}

describe("INSTALL_ROOT_FILES stays in step with what the install root holds", () => {
  it("finds the joins at all — an empty scan would pass vacuously", () => {
    expect(installRootFilenames().size).toBeGreaterThanOrEqual(6);
  });

  it("resolves every filename it finds, so none is guarded by accident", () => {
    const unresolved = [...installRootFilenames().keys()].filter((n) =>
      n.startsWith("<unresolved"),
    );
    expect(unresolved).toEqual([]);
  });

  it("carries every file the decor resolves from an install root", () => {
    const listed = new Set(INSTALL_ROOT_FILES);
    const missing: string[] = [];
    for (const [name, where] of installRootFilenames())
      if (!listed.has(name))
        missing.push(
          `${name} (joined to an install root in ${where.join(", ")})`,
        );
    if (missing.length)
      throw new Error(
        `these files live at the install root and are NOT linked back into the delivered tree, ` +
          `so every script that resolves them from .dist/ finds nothing:\n  ${missing.join("\n  ")}\n` +
          `Add each to lib/newsroom/install-root-files.ts.`,
      );
  });

  it("is the list the packer actually uses — not a second copy of it", () => {
    const packer = readFileSync(join(REPO, "scripts/pack-skills.mjs"), "utf8");
    expect(packer).toContain(
      'import { INSTALL_ROOT_FILES } from "../lib/newsroom/install-root-files.ts"',
    );
    // A re-declared array in the packer would make this guard measure the wrong thing.
    expect(packer).not.toMatch(/const\s+INSTALL_ROOT_FILES\s*=/);
  });
});
