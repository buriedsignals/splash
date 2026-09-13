// LANE: heavy
/**
 * A FILED SIZE IS A CAP HEIGHT, AND THE LADDER MAY CHANGE THE FACE WITHOUT CHANGING THE SIZE ON THE
 * PAGE.
 *
 * THE DEFECT. A direction files `display: 32`. `resolve-families.mjs` turns the ROLE that row names
 * into a concrete family by asking each candidate on the role's ladder whether it covers this beat's
 * own text, so the family is a function of the COPY — one missing code point moves it. The size did
 * not move with it, and two faces at 32px are not the same size on the page: measured across the
 * seventeen families the design base can resolve to, cap height per unit of nominal size runs from
 * 0.693 to 0.770. Eleven per cent of optical size, decided by a glyph-coverage question, with
 * nothing anywhere going red.
 *
 * This file holds the repair to the FACE'S OWN FILE. Nothing here reads a table of per-family
 * constants: every number is measured out of the `.ttf` `typefaces.mjs` fetched, through the same
 * rasteriser the render draws with. It spends no MapTiler key and bakes no plate — the layout
 * arithmetic is all this needs, and the picture the arithmetic produces is measured next door in
 * `pilot-choropleth.live.test.ts`.
 */
import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { LADDERS } from "#shared/design-base/resolve-families.mjs";
import { measureTextBand } from "#shared/chart-beat/render-still.mjs";
import { readDirection } from "../../../scripts/design-base/read-direction.mjs";
import { capRatioOf, registerOf } from "#shared/design-base/register.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
const FILED = ["creme", "rapport", "nocturne"].map((id) =>
  readDirection(join(DIRECTIONS, `${id}.md`)),
);

/** The registers the choropleth's panel actually draws, and the ones a swap can therefore move. */
const REGISTERS = ["display", "eyebrow", "body", "annot", "value"] as const;

/** A direction with one register's ROLE resolved to a named family, the way
 *  `resolveDirectionFamilies` leaves it — the concrete family in `registers`, the role recorded in
 *  `decisions`, which is what tells the sizing what its reference face is. */
function resolvedTo(direction: any, register: string, family: string) {
  const role = direction.registers[register].family;
  return {
    ...direction,
    registers: {
      ...direction.registers,
      [register]: { ...direction.registers[register], family },
    },
    decisions: [{ register, role, family }],
  };
}

describe("a register is sized to a cap height, not to a point size", () => {
  it("should find a real spread of cap heights across the ladders (premise)", () => {
    const ratios = [...new Set(Object.values(LADDERS).flat())].map(
      (family) => ({
        family,
        cap: capRatioOf(family, 400),
      }),
    );
    const low = Math.min(...ratios.map((r) => r.cap));
    const high = Math.max(...ratios.map((r) => r.cap));
    // Under 5 % and the whole mechanism would be arguing with rounding.
    expect(high / low).toBeGreaterThan(1.05);
  });

  for (const direction of FILED)
    for (const register of REGISTERS) {
      const role = direction.registers[register].family;
      const ladder: string[] = (LADDERS as Record<string, string[]>)[role];
      it(`${direction.id}'s ${register} should draw the same cap height on every ${role} the ladder can pick`, () => {
        const filedSize = direction.registers[register].size;
        const weight = direction.registers[register].weight;
        const target = filedSize * capRatioOf(ladder[0], weight);
        for (const family of ladder) {
          /** THE COMPONENT'S OWN RESOLUTION, not a second copy of its arithmetic. A test that
           *  recomputed the size here would pass whatever the component did with it, which is the
           *  exact shape of hollow guard this branch exists to remove. */
          const resolved = registerOf(
            resolvedTo(direction, register, family),
            register,
          );
          const drawn = measureTextBand("H", {
            fontSize: resolved.fontSize,
            fontWeight: weight,
            fontFamily: family,
          }).ascent;
          /** THE TOLERANCE IS THE INSTRUMENT'S, NOT A CUSHION. The ratio is measured on a 200 px
           *  probe and spent at 9.5 to 32, the solved size is rounded to 0.01, and resvg quantises
           *  its ink box — so a hundredth or two of residual is the rasteriser, not the arithmetic.
           *  A register sized WITHOUT the normalisation misses this target by 0.26 px on the
           *  smallest row here (nocturne's eyebrow in Inter) and by 1.9 px on the largest (creme's
           *  display in Libre Baskerville), three to twenty times the tolerance. */
          const off = Math.abs(drawn - target);
          expect(
            `${family} ${off <= 0.08 ? "on target" : `${off.toFixed(2)}px off`}`,
          ).toBe(`${family} on target`);
        }
      });
    }

  it("should refuse a face whose cap height cannot be measured at all", () => {
    // `loadSystemFonts: false` means a face the rasteriser was not handed draws NOTHING and reports
    // an empty ink box. A ratio of zero would silently divide the layout into infinity, so it is a
    // refusal that names the family instead.
    expect(() => capRatioOf("Zzz Fictive", 400)).toThrow();
  });
});
