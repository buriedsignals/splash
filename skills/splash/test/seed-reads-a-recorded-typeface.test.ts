/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * B1.3. `newsroom-charter` MEASURES a newsroom's typefaces off its own site,
 * `NEWSROOM.example.md` records them (`typefaces: "Source Serif, Source Sans"`) and
 * `newsroom.mjs` reads them back at preflight — and until 2026-08-10 no render took them:
 * `FONT_FAMILY = "Helvetica, Arial, sans-serif"` was a hard literal in every one of the 22 copies
 * of `render-still.mjs`. Collected, recorded, read back, dropped. That is the same failure
 * `readPalette`'s own header names for colour, left standing for type in the same file.
 *
 * This walks the craft skills and asserts that a runner which RASTERISES puts a recorded typeface
 * in force first, and that the recorded answer exists and parses.
 *
 * HOW THE POPULATION IS DEFINED — a rule, never a list, and a rule that GROWS on its own.
 *
 * A skill is in scope when its own vendored `scripts/render-still.mjs` carries `readTypeface` —
 * that is, when the mechanism has been vendored into it. So a skill joins this guard the moment
 * its copy is vendored, with nobody editing a list; and the three skills whose copies are NOT yet
 * vendored — `image-beat`, `map-web`, `scrolly` — are outside it by that rule
 * rather than by an exemption. The runner rule is below.
 *
 * THE RESIDUE, stated rather than hidden. Those three are real, un-migrated, and named in
 * `FEEDBACK-2026-08-10.md`'s B1.3 row with the reason: vendoring the mechanism into them is a
 * change to a SHARED function body, which `render-still-parity.test.ts` then requires in all 22
 * copies at once — and seven of those copies were being actively edited by other sessions when
 * this landed. The video and web substrates are a second, separate step: a Remotion composition
 * needs `delayRender` + `document.fonts.load` before its measuring canvas exists, and a
 * self-contained HTML needs a subsetted face embedded in it, both measured in
 * `survey/typeface-feasibility.md` §2 and §3.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. **That the value read is the value drawn.** This proves a runner MENTIONS the mechanism. The
 *    thing that proves the glyph is `assertDrawnInActiveTypeface`, which each runner calls on its
 *    own markup and which refuses when the element declares a family other than the one in force;
 *    check 4 below is what makes sure that call is there.
 * 2. **A face that resolves to something that merely LOOKS like it.** `familyResolves` compares
 *    ink boxes against a family that exists nowhere; a face with metrics identical to the
 *    fallback's at every character of the probe string would read as unresolved. That direction is
 *    the safe one — a false refusal is loud, a false acceptance is a PNG in a face nobody chose.
 * 3. **The beats.** 54 beat runners under `proof/` name no typeface at all; they inherit the
 *    skill's default through the same upward walk `readPalette` uses, which means they inherit
 *    "nobody chose this" honestly rather than a literal.
 *
 * THE MUTATIONS THAT REDDEN IT, run in a copy of the tree at /tmp/twinmut, never in this one.
 * Baseline in the copy: 9 pass, 0 fail; each mutation below leaves 8 pass, 1 fail.
 *
 *   M-T1  delete the `useTypeface(readTypeface(...))` line from
 *         `chart-beat/scripts/render-preview.mjs`:
 *           (fail) … chart-beat/scripts/render-preview.mjs should put a recorded typeface in
 *           force before it rasterises
 *           ["skills/chart-beat/scripts/render-preview.mjs", ["it never calls readTypeface(",
 *            "it never calls useTypeface("]]
 *
 *   M-T2  delete `skills/map-beat/TYPEFACE.md`:
 *           (fail) … map-beat should hold a TYPEFACE.md its own parser accepts
 *           "no TYPEFACE.md at skills/map-beat"
 *
 *   M-T3  corrupt `origin:` to `house` in `chart-beat/TYPEFACE.md` — caught through the real
 *         `parseTypeface`'s own throw:
 *           "origin must be newsroom, journalist or default — got \"house\""
 *
 *   M-T4  drop the `assertDrawnInActiveTypeface` call from a runner:
 *           ["skills/chart-web/scripts/render-preview.mjs", ["it never calls
 *            assertDrawnInActiveTypeface(, so an element drawn in another family would rasterise
 *            silently"]]
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
// The test-only cross-skill read this branch reserves for exactly this, as
// `seed-reads-a-recorded-palette.test.ts` and `format-shippability.test.ts` already do: the guard
// feeds each recorded answer to the REAL parser rather than re-implementing its rules.
import { parseTypeface } from "../../chart-beat/scripts/render-still.mjs";

const SKILLS = join(import.meta.dirname, "..", "..");
const TWIN = join(SKILLS, "..");

/** A skill is in scope when the mechanism has been vendored into its own copy. */
function skillsCarryingTheMechanism(): string[] {
  return readdirSync(SKILLS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => {
      const lib = join(SKILLS, name, "scripts", "render-still.mjs");
      return (
        existsSync(lib) &&
        /^export function readTypeface\b/m.test(readFileSync(lib, "utf8"))
      );
    })
    .sort();
}

/**
 * A runner is in scope when it LAYS OUT A COMPONENT and RASTERISES it — the moment a typeface is
 * chosen, because that is when the gutters are measured and the family is written into the markup,
 * and the moment it is committed to pixels. Three things fall outside by that rule rather than by
 * an exemption: `render-still.mjs` is the library, not a runner; `inspect-render.mjs` rasterises an
 * SVG already on disk and so has no typeface decision to make, it draws what the file declares; and
 * `render-web.mjs` emits HTML rather than a raster, which is a different substrate with a different
 * mechanism — a self-contained page has to carry a SUBSETTED face embedded in it, measured at
 * +9.6 KB for the exact glyph set against +296 KB unsubsetted (`survey/typeface-feasibility.md`
 * §3), and subsetting with default flags strips the OFL licence records, which is a named
 * requirement rather than a detail. That is a second step, not this one.
 */
function rasterisingRunners(skill: string): string[] {
  const dir = join(SKILLS, skill, "scripts");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mjs") && f !== "render-still.mjs")
    .map((f) => join(dir, f))
    .filter((p) => {
      const src = readFileSync(p, "utf8");
      const laysOut =
        /\brenderToStaticMarkup\(/.test(src) || /\brenderStill\(/.test(src);
      const rasterises =
        /\bnew Resvg\(/.test(src) || /\brenderStill\(/.test(src);
      return laysOut && rasterises;
    })
    .sort();
}

const SKILLS_IN_SCOPE = skillsCarryingTheMechanism();

describe("a rasterising runner puts a RECORDED typeface in force, discovered rather than listed", () => {
  it("should find the skills the mechanism has been vendored into", () => {
    // Without this the whole block goes vacuously green if the walk breaks. Measured 2026-08-10:
    // four craft skills carry `readTypeface`, and between them six rasterising runners.
    expect(SKILLS_IN_SCOPE.length).toBeGreaterThanOrEqual(4);
    expect(SKILLS_IN_SCOPE).toContain("chart-beat");
    const runners = SKILLS_IN_SCOPE.flatMap(rasterisingRunners);
    expect(runners.length).toBeGreaterThanOrEqual(4);
  });

  for (const skill of SKILLS_IN_SCOPE) {
    it(`${skill} should hold a TYPEFACE.md its own parser accepts`, () => {
      const path = join(SKILLS, skill, "TYPEFACE.md");
      const offenders: string[] = [];
      if (!existsSync(path))
        offenders.push(`no TYPEFACE.md at skills/${skill}`);
      else {
        try {
          const record = parseTypeface(readFileSync(path, "utf8"), path);
          if (!record.family) offenders.push("the record carries no family");
        } catch (error) {
          offenders.push(String((error as Error).message));
        }
      }
      expect([skill, offenders]).toEqual([skill, []]);
    });

    for (const runner of rasterisingRunners(skill)) {
      const label = relative(TWIN, runner);
      it(`${label} should put a recorded typeface in force before it rasterises`, () => {
        const src = readFileSync(runner, "utf8");
        const offenders: string[] = [];
        // 1 & 2. The recorded answer is read, and put in force. Reading without using it is the
        // shape this whole item exists to stop: measured, recorded, and then dropped.
        if (!/\breadTypeface\(/.test(src))
          offenders.push("it never calls readTypeface(");
        if (!/\buseTypeface\(/.test(src))
          offenders.push("it never calls useTypeface(");
        // 3. No literal stack smuggled back in beside the recorded answer.
        const literal = /FONT_FAMILY\s*=\s*"|font-family\s*:\s*"?[A-Z]/.exec(
          src,
        );
        if (literal)
          offenders.push(`it names a font stack literally: ${literal[0]}`);
        // 4. And the markup it hands the rasteriser is checked against the family in force —
        // otherwise a component that snapshotted the old value paints in one face while every
        // gutter was measured in another, which clips silently in the PNG.
        if (!/\bassertDrawnInActiveTypeface\(/.test(src))
          offenders.push(
            "it never calls assertDrawnInActiveTypeface(, so an element drawn in another family would rasterise silently",
          );
        expect([label, offenders]).toEqual([label, []]);
      });
    }
  }
});
