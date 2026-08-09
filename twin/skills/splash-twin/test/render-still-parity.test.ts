/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * `helper-parity.test.ts` guards duplicated helpers by IMPORTING a hand-written list of copies.
 * That list is the hole: a copy nobody adds to it is a copy nobody guards, and the list cannot
 * know about a file created after it was written. Measured on 2026-08-09, the tree held **twenty**
 * `render-still.mjs` files; `helper-parity.test.ts` named six and `root-template-shared.test.ts`
 * byte-checked three. Fourteen were guarded by nothing at all — including eleven inside `proof/`
 * beats whose own headers say, in prose, that they are "kept in step by hand".
 *
 * This file does not take a list. It WALKS the tree, finds every `render-still.mjs`, and compares
 * each one against the canonical copy FUNCTION BY FUNCTION. A new copy is guarded the moment it
 * lands, with nobody remembering to wire it up. That is the whole reason it exists.
 *
 * WHY FUNCTION-BY-FUNCTION AND NOT BYTE-FOR-BYTE. A byte comparison is the obvious implementation
 * and it is wrong here, measured twice over:
 *
 *   1. Copies legitimately differ in their HEADER. Each one explains why it exists where it is —
 *      `twin-image-beat`'s says it carries the raster machinery a photograph needs; a `proof/`
 *      beat's says a beat never imports out of a skill. Those paragraphs are the opposite of drift.
 *   2. Copies legitimately differ in their SET of functions. `twin-image-beat` adds six
 *      (`readImageMeta`, `fitBox`, `toDataUri`, …); `twin-scrolly` and every `proof/` copy carry no
 *      `readPalette`/`parsePalette`, because nothing in them reads a recorded palette. A superset
 *      and a subset are both fine. What is never fine is two copies of the SAME function whose
 *      bodies disagree.
 *
 * WHY THE COMPARISON IS NORMALISED, and the false positive that forced it. The first draft of this
 * scan compared function bodies with whitespace collapsed, and reported `twin-scrolly`'s `mix` and
 * `measureText` as drifted. They were not. The repository's formatter had rewrapped both and added
 * a TRAILING COMMA before a closing paren — a pure formatting difference with identical semantics.
 * A guard that a formatter can turn red is a guard someone disables, so the normalisation below
 * removes trailing commas as well as whitespace. That is a real, named cost: this cannot see a
 * change whose only effect is a comma's position, which is also a change that cannot alter
 * behaviour.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. A drift inside a function this scan cannot delimit. It reads top-level `function NAME(...)`
 *    declarations by brace-matching. A helper written as `const NAME = (…) => …`, a method on an
 *    object literal, or a function nested inside another is invisible to it. Every copy of
 *    `render-still.mjs` uses the declaration form today; a future one need not.
 * 2. A drift in module-level CONSTANTS. `HEX`, `FONT_FAMILY` and the `measured` cache live outside
 *    any function and are not compared. `FONT_FAMILY` in particular is load-bearing — the seed
 *    draws with it and `measureText` measures with it, so a copy that disagreed would measure every
 *    gutter against a font nobody is looking at.
 * 3. A drift in IMPORTS. A copy importing a different `Resvg` would pass every assertion here.
 * 4. Anything about a helper duplicated in a file NOT named `render-still.mjs` — `fr`, `wrap`,
 *    `yTickValues`, `escapeHtml` and others are duplicated at least as widely. `helper-parity.test.ts`
 *    covers some of those by import; the rest are named as unguarded in `HANDOVER.md` and stay that
 *    way until someone does this same walk for them.
 * 5. Whether a function is EXPORTED. Presence and body are compared; `export` is not. A copy that
 *    stopped exporting `deriveFurniture` would break its own callers loudly and immediately, which
 *    is a different and better alarm than this one.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const CANONICAL = join(
  TWIN,
  "skills",
  "twin-chart-beat",
  "scripts",
  "render-still.mjs",
);

function findAll(dir: string, basename: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) findAll(p, basename, out);
    else if (e.name === basename) out.push(p);
  }
  return out;
}

// Remove trailing commas before a closer, then remove whitespace ENTIRELY. Collapsing it to a
// single space was tried first and was not enough: the formatter breaks a method chain across
// lines, so `x.replace(a).replace(b)` becomes `x\n  .replace(a)\n  .replace(b)`, and collapsing
// leaves `x .replace(a) .replace(b)` — still unequal, still a pure formatting difference, still a
// red guard nobody would keep. Measured on `twin-scrolly`'s copies of `mix` and `measureText`,
// which this reported as drifted twice before landing here; both are semantically identical to the
// canonical ones, character for character once the formatter's line breaks are gone.
//
// The cost, named: two bodies differing ONLY by whitespace inside a string literal now compare
// equal. Accepted deliberately — a guard a formatter can turn red is a guard someone disables, and
// that failure costs more than this one.
function stripComments(source: string): string {
  return source
    // Whole-line `//` comments and `/* … */` blocks only. A copy legitimately carries different
    // explanatory prose — this guard's own header argues that for file headers, and the same is
    // true inside a function: `twin-image-beat`'s `renderStill` is character-identical to the
    // canonical one except for a two-line comment, and reporting that as drift is noise.
    //
    // Deliberately NOT stripping trailing `//` after code, because a regex literal like
    // `/\bwidth="(\d+)"/` contains no `//` but a URL or a divided expression could, and eating
    // code here would make the comparison vacuously equal on both sides — a guard that always
    // passes is worse than one that occasionally cries wolf.
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function normalise(source: string): string {
  return source.replace(/,(\s*[)\]}])/g, "$1").replace(/\s+/g, "");
}

/** Top-level `function NAME(…) {…}` declarations, by brace matching. Nested forms are invisible. */
function topLevelFunctions(text: string): Map<string, string> {
  const found = new Map<string, string>();
  const re = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    // The body's `{`, found by BALANCING THE ARGUMENT PARENTHESES first — not by taking the next
    // `{` after the name. That naive version was the first draft and it was quietly broken: in
    // `wrap(text: string, maxWidth: number, font: { fontSize: number })` the next `{` is the
    // ARGUMENT TYPE's, so brace-matching from there closed at the end of the signature and every
    // comparison below ran on a signature instead of a body. Found by mutating a real `wrap`'s
    // `>` to `>=` and watching this guard stay green — a test that cannot go red proves nothing,
    // and this one could not, for every function whose parameters carry an inline object type or
    // a destructured argument. Which is most of them.
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
const copies = findAll(TWIN, "render-still.mjs").filter((p) => p !== CANONICAL);

describe("render-still.mjs — every copy in the tree, discovered rather than listed", () => {
  it("should find the canonical copy carrying the functions this guard compares", () => {
    // If the canonical file is renamed or emptied, every comparison below goes vacuously green.
    // This pins the premise instead of assuming it.
    for (const name of [
      "contrast",
      "deriveFurniture",
      "measureText",
      "renderStill",
    ]) {
      expect([name, canonical.has(name)]).toEqual([name, true]);
    }
  });

  it("should find more copies than any hand-written list names", () => {
    // Measured 2026-08-09: twenty copies, six named by `helper-parity.test.ts`. The number is not
    // asserted exactly — copies come and go with beats — but a tree where this walk finds fewer
    // copies than the import list names would mean the walk is broken, not that the tree is tidy.
    expect(copies.length).toBeGreaterThanOrEqual(6);
  });

  for (const copy of copies) {
    const label = relative(TWIN, copy);
    it(`${label} should not disagree with the canonical copy about any shared function`, () => {
      const theirs = topLevelFunctions(readFileSync(copy, "utf8"));
      const drifted: string[] = [];
      for (const [name, body] of theirs) {
        // A function the canonical copy does not have is this copy's own addition — legitimate,
        // and not this guard's business. Only SHARED names are compared.
        if (canonical.has(name) && canonical.get(name) !== body)
          drifted.push(name);
      }
      expect([label, drifted]).toEqual([label, []]);
    });
  }
});
