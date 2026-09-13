/**
 * `shared/` IS SHIPPED ON ITS OWN, SO NOTHING IN IT MAY IMPORT OUT OF IT.
 *
 * `skills/splash/assets/root-template/shared/` is what lands in a newsroom's root — the template
 * carries `shared/`, a `package.json` declaring `#shared/* → ./shared/*`, and nothing else. There
 * is no `skills/` directory beside it. So a module under `shared/` that climbs into `skills/`
 * resolves perfectly in THIS checkout and throws `ERR_MODULE_NOT_FOUND` in the install, which is
 * the worst shape a defect can take: green where it is watched, broken where it is used, and only
 * at the moment a journalist renders.
 *
 * MEASURED, not hypothetical. `shared/map-beat/glyphs.mjs` imported
 * `../../skills/splash/scripts/keys.mjs` and `shared/map-beat/tints.mjs` imported
 * `../../skills/palette/scripts/palette.mjs`. They were the only two in the tree, and they were
 * found by mirroring the trunk into the template — the mirror is what made them reachable from a
 * root that has no `skills/`.
 *
 * The rule is DERIVED, not a list: every source file under `shared/` is walked and every relative
 * specifier resolved. A new trunk module cannot be added outside it.
 *
 * MUTATION: put `import { matchConvention } from "../../skills/palette/scripts/palette.mjs";` back
 * into `shared/map-beat/tints.mjs` — the first case below goes red and names the file.
 *
 * The two parity cases are the other half of that rule: what may not be imported has to be
 * duplicated, and a duplicate that nothing holds in step is a value that drifts.
 * MUTATION: change `WATER_HUE` by one digit, or drop an alias from `MAPTILER_KEY_ALIASES`.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { WATER_HUE } from "#shared/map-beat/tints.mjs";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";
import { matchConvention } from "../../palette/scripts/palette.mjs";
import { resolveEnvKey } from "../../splash/scripts/keys.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const SHARED = join(ROOT, "shared");
const SOURCE = /\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)$/;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile() && SOURCE.test(entry.name)) yield path;
  }
}

/** Every relative specifier a module imports, in any of the syntaxes this tree uses. */
function relativeSpecifiers(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(
    /(?:from|import|require)\s*\(?\s*["'](\.[^"']*)["']/g,
  ))
    out.push(m[1]);
  return out;
}

describe("the trunk stands alone — nothing under shared/ imports out of shared/", () => {
  it("should find trunk modules to check at all (premise)", () => {
    expect([...walk(SHARED)].length).toBeGreaterThan(10);
  });

  it("should resolve every relative import inside shared/, and none outside it", () => {
    const escapes: string[] = [];
    for (const file of walk(SHARED)) {
      for (const spec of relativeSpecifiers(readFileSync(file, "utf8"))) {
        const target = resolve(dirname(file), spec);
        if (!target.startsWith(SHARED + "/"))
          escapes.push(
            `${relative(ROOT, file)} imports "${spec}" → ${relative(ROOT, target)}`,
          );
      }
    }
    expect(escapes.sort()).toEqual([]);
  });

  /** And it must actually LAND in the template, or the rule above protects nothing. */
  it("should carry the whole trunk into the root template", () => {
    for (const file of walk(join(SHARED, "map-beat"))) {
      const vendored = join(
        ROOT,
        "skills/splash/assets/root-template/shared",
        relative(SHARED, file),
      );
      expect([
        relative(ROOT, vendored),
        existsSync(vendored) && statSync(vendored).isFile(),
      ]).toEqual([relative(ROOT, vendored), true]);
    }
  });
});

describe("what the trunk may not import, it duplicates — and the duplicates are held in step", () => {
  it("should paint water in palette's own filed water convention", () => {
    expect(WATER_HUE).toBe(matchConvention("water")!.accent);
  });

  it("should read the MapTiler key under every name splash/scripts/keys.mjs reads it under", () => {
    for (const name of [
      "MAPTILER_KEY",
      "MAPTILER_API_KEY",
      "REMOTION_MAPTILER_KEY",
      "VITE_MAPTILER_KEY",
    ]) {
      const env = { [name]: `key-via-${name}` };
      expect([name, mapTilerKeyIn(env)]).toEqual([
        name,
        resolveEnvKey(env, "MAPTILER_KEY"),
      ]);
    }
    // …and the canonical name wins whenever both are set, never the alias.
    const both = { MAPTILER_KEY: "canonical", VITE_MAPTILER_KEY: "alias" };
    expect(mapTilerKeyIn(both)).toBe(resolveEnvKey(both, "MAPTILER_KEY"));
    expect(mapTilerKeyIn(both)).toBe("canonical");
    expect(mapTilerKeyIn({})).toBe(resolveEnvKey({}, "MAPTILER_KEY"));
  });
});
