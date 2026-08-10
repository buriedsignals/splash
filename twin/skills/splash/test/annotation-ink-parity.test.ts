/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * `annotation-ink.mjs` is duplicated, not imported across skills — the twin's method, and the same
 * arrangement `render-still.mjs` is in. Three copies exist on the day this lands: the canonical one
 * in `chart-beat/scripts/`, the live `twin/shared/chart-beat/` copy a `proof/` beat
 * reaches through `#shared/…`, and the `root-template` copy a journalist's fresh root is installed
 * with. Nothing stops a fourth.
 *
 * This does not take a LIST. It WALKS the tree for the basename, the way
 * `render-still-parity.test.ts` does, so a copy nobody remembers to register is still guarded.
 *
 * WHY BYTE-FOR-BYTE HERE, when `render-still.mjs`'s walker deliberately compares function by
 * function: those copies legitimately differ, each carrying a header explaining why it sits where
 * it does, and `image-beat`'s adds six functions of its own. These do not. All three are
 * vendored copies of one page of arithmetic, produced by `cp`, and the reason each exists is
 * written once in the canonical header rather than three times. Byte equality is the strongest
 * comparison available and there is nothing here that needs the weaker one.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. A drift where BOTH sides move together — this compares copies to each other, never to what
 *    they should say. `annotation-reads-over-what-it-crosses.test.ts` is what measures the result.
 * 2. A copy under a different basename. A file that pasted `inkThatReadsOver` into a beat component
 *    is invisible here, exactly as `render-still-parity.test.ts` is blind to the same move.
 * 3. Whether the canonical copy is CORRECT. `annotation-ink.test.ts` mutates the arithmetic; this
 *    only proves the three agree.
 *
 * THE MUTATION THAT REDDENS IT, run 2026-08-10 in a copy of the tree under
 * `/tmp/annotation-ink-parity/` — `NON_TEXT_CONTRAST_FLOOR` changed from 3 to 1 in the
 * `twin/shared/chart-beat/` copy only:
 *
 *   error: expect(received).toEqual(expected)
 *     "shared/chart-beat/annotation-ink.mjs",
 *   - "identical",
 *   + "differs from skills/chart-beat/scripts/annotation-ink.mjs",
 *   (fail) annotation-ink.mjs — every copy in the tree, discovered rather than listed >
 *          shared/chart-beat/annotation-ink.mjs should be byte-identical to the canonical copy
 *   3 pass · 1 fail
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const CANONICAL = join(
  TWIN,
  "skills",
  "chart-beat",
  "scripts",
  "annotation-ink.mjs",
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

const canonicalText = readFileSync(CANONICAL, "utf8");
const copies = findAll(TWIN, "annotation-ink.mjs").filter(
  (p) => p !== CANONICAL,
);

describe("annotation-ink.mjs — every copy in the tree, discovered rather than listed", () => {
  it("should find the canonical copy carrying the exports the beats draw with", () => {
    // If the canonical file is renamed or emptied, every comparison below goes vacuously green.
    // This pins the premise instead of assuming it, the same way the render-still walker does.
    for (const declaration of [
      "export const NON_TEXT_CONTRAST_FLOOR",
      "export const TEXT_CONTRAST_FLOOR",
      "export const LARGE_TEXT_CONTRAST_FLOOR",
      "export function textContrastFloor",
      "export function inkBox",
      "export function overlaps",
      "export function marksUnder",
      "export function worstContrast",
      "export function assertAnnotationReadsOverMarks",
      "export function inkThatReadsOver",
    ]) {
      expect([declaration, canonicalText.includes(declaration)]).toEqual([
        declaration,
        true,
      ]);
    }
  });

  it("should find the two vendored copies that exist today, and any later one", () => {
    expect(copies.map((p) => relative(TWIN, p)).sort()).toEqual([
      "shared/chart-beat/annotation-ink.mjs",
      "skills/splash/assets/root-template/shared/chart-beat/annotation-ink.mjs",
    ]);
  });

  for (const copy of copies) {
    const label = relative(TWIN, copy);
    it(`${label} should be byte-identical to the canonical copy`, () => {
      const theirs = readFileSync(copy, "utf8");
      expect([
        label,
        theirs === canonicalText
          ? "identical"
          : `differs from ${relative(TWIN, CANONICAL)}`,
      ]).toEqual([label, "identical"]);
    });
  }
});
