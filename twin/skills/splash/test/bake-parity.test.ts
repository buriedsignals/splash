/**
 * THE MAP CAMERA'S OWN WALK.
 *
 * `render-still-parity.test.ts` walks the tree for files named exactly `render-still.mjs`, and its
 * own header (`:48-51`) names the hole it leaves: *"Anything about a helper duplicated in a file NOT
 * named `render-still.mjs` … stays that way until someone does this same walk for them."* The
 * bakes are the largest such family. Measured 2026-08-10: **nineteen** of them — twelve `bake.mjs`
 * and four `bake-plate.mjs` under `proof/`, three `bake-plate.mjs` under `skills/` — 4,600+ lines,
 * `resolveChrome` in all nineteen, `parseEnvFile` in all nineteen, and **nothing comparing any of
 * them to anything**.
 *
 * WHY IT KEYS ON TWO BASENAMES. Keying on `bake.mjs` alone would miss four `proof/` beats and all
 * three skill seeds — the identical mistake to a hand-written import list, made with a walk. Both
 * names are searched.
 *
 * WHAT IS DELIBERATELY NOT COMPARED, and this is the point rather than an omission: **`BEAT` is a
 * module-level `const`, so it is never seen here.** The camera literal is the journalist's own
 * frame — the geography this beat is about — and it must stay per-beat. This guard compares the
 * MACHINERY around it. Same reasoning for `CAMERA`, `STATION`, `WATER_FILL` and every other
 * module-level constant: `render-still-parity.test.ts:41-45` names the same limit for its own
 * family and accepts it for the same reason.
 *
 * The canonical copy is a SKILL's, not a `proof/` beat's. A seed is what a new beat is copied from,
 * so a `proof/` canonical would invert the tree's own direction of authority — a defect fixed in a
 * beat would leave the seed to regenerate it.
 *
 * Superset and subset are both fine, exactly as in the render-still walk: a point bake has no
 * polygon join, and a seed carries machinery a beat does not need. What is never fine is two copies
 * of the same named function whose bodies disagree.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const CANONICAL = join(
  TWIN,
  "skills",
  "map-beat",
  "scripts",
  "bake-plate.mjs",
);

function findAll(
  dir: string,
  matches: (name: string) => boolean,
  out: string[] = [],
): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) findAll(p, matches, out);
    else if (matches(e.name)) out.push(p);
  }
  return out;
}

function stripComments(source: string): string {
  return source
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function normalise(source: string): string {
  return source.replace(/,(\s*[)\]}])/g, "$1").replace(/\s+/g, "");
}

/** Top-level `function NAME(…) {…}` declarations, by brace matching — the
 *  `render-still-parity.test.ts:109-146` method, argument parens balanced first so a destructured
 *  or inline-typed parameter cannot make the scan close at the end of the signature. */
function topLevelFunctions(text: string): Map<string, string> {
  const found = new Map<string, string>();
  const re = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let p = text.indexOf("(", m.index);
    if (p === -1) continue;
    let pd = 0;
    for (; p < text.length; p++) {
      if (text[p] === "(") pd++;
      else if (text[p] === ")") {
        pd--;
        if (pd === 0) break;
      }
    }
    const open = text.indexOf("{", p);
    if (open === -1) continue;
    let depth = 0;
    let end = open;
    for (; end < text.length; end++) {
      if (text[end] === "{") depth++;
      else if (text[end] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    found.set(m[1], normalise(stripComments(text.slice(m.index, end + 1))));
  }
  return found;
}

const canonical = topLevelFunctions(readFileSync(CANONICAL, "utf8"));
const copies = findAll(
  TWIN,
  (n) => n === "bake.mjs" || n === "bake-plate.mjs",
).filter((p) => p !== CANONICAL);

describe("the bakes — every camera in the tree, discovered rather than listed", () => {
  it("should find the canonical bake carrying the machinery this guard compares", () => {
    // Without this, renaming or emptying the canonical file turns every comparison below vacuously
    // green. It pins the premise instead of assuming it.
    for (const name of [
      "resolveChrome",
      "parseEnvFile",
      "mercY",
      "minFrameHeightPx",
      "frameCornersOf",
      "cameraFacts",
      "assertWorldFillsFrame",
      "assertCameraReachesBounds",
      "normaliseLon",
    ])
      expect([name, canonical.has(name)]).toEqual([name, true]);
  });

  it("should find more bakes than any hand-written list names", () => {
    // Measured 2026-08-10: nineteen, of which `helper-parity.test.ts` names zero.
    expect(copies.length).toBeGreaterThanOrEqual(12);
  });

  it("should find both basenames, because keying on one would miss seven files", () => {
    const plates = copies.filter((p) => p.endsWith("bake-plate.mjs"));
    expect(plates.length).toBeGreaterThanOrEqual(6);
  });

  for (const copy of copies) {
    const label = relative(TWIN, copy);
    it(`${label} should not disagree with the canonical bake about any shared function`, () => {
      const theirs = topLevelFunctions(readFileSync(copy, "utf8"));
      const drifted: string[] = [];
      for (const [name, body] of theirs)
        if (canonical.has(name) && canonical.get(name) !== body)
          drifted.push(name);
      expect([label, drifted]).toEqual([label, []]);
    });
  }
});

describe("minFrameHeightPx — the derivation that replaced a constant tuned for one beat", () => {
  // The constant it replaced was `Math.ceil(width * 0.5685)`, correct only for [-60°, 78°]. These
  // pin that (a) it still answers that range, and (b) it answers a DIFFERENT range differently —
  // which the constant could not, and which is the whole reason it was derived.
  const src = readFileSync(CANONICAL, "utf8");
  const mercY = (lat: number) =>
    Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const minFrameHeightPx = (w: number, s: number, n: number) =>
    Math.ceil((w * (mercY(n) - mercY(s))) / (2 * Math.PI));

  it("should still answer the world camera the constant was tuned for, within a pixel", () => {
    expect(minFrameHeightPx(836, -60, 78)).toBe(475);
    expect(Math.ceil(836 * 0.5685)).toBe(476);
  });

  it("should answer a narrow latitude range with a small height, where the constant said 476", () => {
    // Europe, the choropleth's own range. The constant would have demanded 476px of height for a
    // 31° band that needs 120 — an error message that does not fix anything.
    expect(minFrameHeightPx(836, 35, 66)).toBe(120);
  });

  it("should be the body every bake actually carries, not a re-typed copy in this test", () => {
    expect(src).toContain(
      "Math.ceil((width * (mercY(north) - mercY(south))) / (2 * Math.PI))",
    );
  });
});
