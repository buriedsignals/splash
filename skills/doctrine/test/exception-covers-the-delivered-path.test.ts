/**
 * AN EXCEPTION IS ARGUED ABOUT THE ARTEFACT THE FORMAT ACTUALLY DELIVERS.
 *
 * `typeface-is-recorded` is a discipline — prose, presence-checked — and four skills are EXCEPTED
 * from it on a stronger claim: that they already carry the same decision in CODE, so asking their
 * authors to read a paragraph would be the weaker mechanism. That claim is the only thing standing
 * between those four and an owed cell, and nothing measured it.
 *
 * ROUND SIX, DEFECT Z4, measured on the delivered page of `stress-ab-emigration-flows`:
 *
 *     grep -c readTypeface skills/chart-web/scripts/render-web.mjs   -> 0
 *     render-web.mjs:524                                             -> font-family: Helvetica, Arial, sans-serif
 *     NEWSROOM.md                                                    -> typefaces: "Space Grotesk, Courier New"
 *
 * `chart-web`'s exception cited its vendored `scripts/render-still.mjs`, which does carry
 * `readTypeface`/`useTypeface`/`assertDrawnInActiveTypeface` — and which produces this format's
 * STATIC PREVIEW. The artefact `chart-web` delivers is the HTML page, and the page was set in a
 * literal stack no recorded answer could reach. The exception was true of a path the format does
 * not deliver, which is not an exception; and because it was written the same morning, on this
 * branch, whose whole premise is that an exception needs a MEASURED reason, nothing else in the
 * tree could have caught it.
 *
 * SO THE CLAIM IS MEASURED HERE. For a skill excepted from `typeface-is-recorded`, every
 * MATERIALISING entrypoint it ships — the six filenames `scripts/traits.mjs` names as the one
 * canonical route from a beat directory to a delivered artefact, never a preview and never a
 * verify script — must either reach the recorded answer or name no font stack at all. A file that
 * names a stack literally and reaches no recorded answer is the gap this test exists to see.
 *
 * WHAT IT DELIBERATELY DOES NOT ASK. `map-web`, `scrolly` and `image-beat` CARRY this discipline as
 * prose and their own delivered pages still hold the literal stack. That is the ordinary owed
 * state of a discipline, argued in `GUARDS.md` and visible there; this test is only about the
 * cells where blankness was traded for a claim about code. Nor does it ask whether the READER's
 * machine has the face: a self-contained page that embeds a subsetted face is a separate,
 * measured step (`survey/typeface-feasibility.md` §3), and a page that NAMES the recorded family
 * with the substrate stack behind it has already stopped being a beat set in a face nobody chose.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readCatalogue } from "../../../scripts/guards.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");

/** The six filenames `scripts/traits.mjs` names for `materialises-a-beat` — the route from a beat
 *  directory to the artefact a reader is handed, never `render-preview.mjs` and never a
 *  `verify-*`/`detect-*` file. Restated here rather than imported because the point of this test is
 *  to read the DELIVERED path, and a list that drifted from that one would silently narrow it —
 *  `traits.test.ts` is what holds the two in step. */
const MATERIALISING = [
  "render-still.mjs",
  "render-web.mjs",
  "render-video.mjs",
  "render-map.mjs",
  "render-scrolly.mjs",
  "produce.mjs",
];

/** A font stack named as a literal: the substrate's own generic families are the tell, because a
 *  stack that ends in one is a stack somebody typed rather than a value somebody recorded. */
const STACK_LITERAL = /sans-serif|monospace|\bserif\b/;

/** The recorded answer, reached: the file READS it or PUTS IT IN FORCE — or is the module that
 *  defines those two (a skill's own `render-still.mjs` is both library and entrypoint, and the
 *  definition is the same literal match).
 *
 *  `activeTypeface()` is deliberately NOT in this set, though it is the same module's export and
 *  is what `render-web.mjs`'s own `buildCss` default reads. It answers "what face is in force",
 *  which on a run where nothing was ever read back is the module's own untouched default — asking
 *  it proves the file avoided a literal, not that it reached a recorded answer. Measured: with
 *  `activeTypeface(` in this set, deleting BOTH real call sites from render-web.mjs left this
 *  block green. */
const REACHES_RECORDED = /\breadTypeface\(|\buseTypeface\(/;

/** A face named where it is USED, not merely mentioned — a CSS declaration or a markup attribute
 *  whose value is typed rather than interpolated. This is the half that keeps a file from earning
 *  the exception by importing the mechanism and then writing the literal anyway: a reach ANYWHERE
 *  in the file would otherwise excuse a stack in the stylesheet three hundred lines down. */
const NAMED_AT_THE_POINT_OF_USE = [
  [/font-family\s*:\s*(?!\$\{)["'A-Za-z]/, "a font-family declaration whose value is typed, not interpolated from a recorded answer"],
  [/\bfontFamily\s*=\s*["']/, "a fontFamily attribute whose value is typed, not passed from a recorded answer"],
] as const;

/** Comments and doc-comments are STRIPPED before that second check runs. Every one of these files
 *  quotes the defect it closes — this test's own subject is a line that read
 *  `font-family: Helvetica, Arial, sans-serif` — and a check that could not tell the evidence from
 *  the code would make writing the reason down the thing that reddens it. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const catalogue = readCatalogue();
const rule = catalogue.rules.find((r: { id: string }) => r.id === "typeface-is-recorded");

describe("an exception to typeface-is-recorded holds on the path the format delivers", () => {
  it("should find the rule and the skills excepted from it, so this block cannot pass vacuously", () => {
    expect(rule).toBeTruthy();
    expect(Object.keys(rule.exceptions).length).toBeGreaterThanOrEqual(1);
  });

  for (const skill of Object.keys(rule?.exceptions ?? {})) {
    it(`${skill}'s delivered path should reach a recorded typeface, not a literal stack`, () => {
      const offenders: string[] = [];
      let entrypoints = 0;
      for (const name of MATERIALISING) {
        const path = join(ROOT, "skills", skill, "scripts", name);
        if (!existsSync(path)) continue;
        entrypoints += 1;
        const source = readFileSync(path, "utf8");
        // BOTH CHECKS READ THE CODE, NOT THE PROSE. `guard-wired-to-run`'s own ruling — a comment
        // that mentions the function, a bare import and a re-export shim are each what an author
        // writes INSTEAD of wiring it — applies exactly as much to a mechanism a catalogue
        // EXCEPTION leans on. Measured: reading `readTypeface(` out of this file's own doc comment
        // left the whole check green after both call sites were deleted.
        const code = withoutComments(source);
        const literal = STACK_LITERAL.exec(source);
        const lineOf = (index: number) => source.slice(0, index).split("\n").length;
        if (literal && !REACHES_RECORDED.test(code)) {
          offenders.push(
            `scripts/${name}:${lineOf(literal.index)} names a font stack (${literal[0]}) and never ` +
              `reaches a recorded answer — this format's exception is argued on a path it does not deliver`,
          );
        }
        for (const [pattern, what] of NAMED_AT_THE_POINT_OF_USE) {
          const hit = pattern.exec(code);
          if (hit) offenders.push(`scripts/${name} carries ${what}: ${JSON.stringify(hit[0])}`);
        }
      }
      // A skill excepted on the strength of its code must have code on this path at all.
      if (entrypoints === 0) offenders.push(`${skill} ships no materialising entrypoint`);
      expect([skill, offenders]).toEqual([skill, []]);
    });
  }
});
