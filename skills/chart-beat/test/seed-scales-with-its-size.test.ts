/**
 * THE THREE THINGS `three-sizes-no-collision.test.ts` STOPPED BEING ABLE TO SEE, AND WHY.
 *
 * That guard renders the seed at all three sizes and measures real ink boxes. Its fourth assertion
 * used to reach a frozen spacing literal by comparing the layout's TIGHTEST MOMENT across the
 * sizes: the same pair of words is closest at every size, and by the same proportion. It reddened
 * `HEADER_TO_PLOT` back to a bare 34.
 *
 * It cannot any more, and the reason is a real design change rather than a weakening. Once portrait
 * and square type for a PHONE (36px floor) instead of for an article column, three things stop
 * being invariant across the sizes, all of them deliberately:
 *
 *   - the title wraps to a different number of lines, and the credit wraps at two sizes and not the
 *     third, so the closest pair by TEXT is legitimately a different pair;
 *   - ladder rung R2 drops the labelled gridlines from five to three on a phone frame, so the
 *     topmost tick sits somewhere else in the plot and the header-to-plot distance measured from it
 *     is not comparable;
 *   - `PAD` deliberately stops scaling with the type. It is the frame's MARGIN and it scales with
 *     the canvas — which is exactly the shape of the defect assertion 4 hunts, now intentional.
 *
 * So assertion 4 was narrowed to what survives: a text block's own LEADING, keyed on the base token
 * and the drawn `x`. That is strictly correct and strictly smaller. This file carries the rest, as
 * assertions on the seed's own exported functions rather than on a render — weaker in kind (they
 * cannot see a literal that bypasses `tokens` altogether) and sharper in aim.
 *
 * THE MUTATIONS, in an rsync of the tree under `/tmp/w4c3mut/`, never in this working tree.
 * Baseline 4 pass / 0 fail. The second column is what the RENDER guard did with the same mutation
 * AFTER the narrowing, which is the whole reason this file exists.
 *
 *   HEADER_TO_PLOT back to a bare 34         RED 3/1   render guard GREEN — was its headline RED
 *   X_TICK_DROP back to a bare 24            RED 3/1   render guard GREEN, and provably so: it
 *                                                      cancels out of the layout arithmetic
 *   GAP_NOTE.fontSize back to a bare 12      RED 3/1   render guard GREEN
 *   SOURCE.lead back to a bare 18            RED 3/1   render guard RED 8/2
 *   `sp = (v) => v`                          RED 3/1   render guard GREEN — the whole drawing stays
 *                                                      at its 900x560 values on a bigger canvas,
 *                                                      which collides with nothing
 *   frameInsetFor frozen at a constant            RED 3/1   render guard GREEN
 *   frameInsetFor drops its 2x-type floor       RED 3/1
 *   yTickHintFor always 5                    RED 3/1   render guard GREEN
 *   xTickHintFor always 6                    RED 3/1   render guard GREEN
 *
 *   frameInsetFor rounds UP instead of down    GREEN      recorded rather than closed: the rounding
 *                                                      direction is not load-bearing, and pinning
 *                                                      it would calibrate the guard to a value
 *                                                      nobody measured.
 */
import { describe, it, expect } from "bun:test";
import { tokens, xTickHintFor, yTickHintFor } from "../assets/ChartSeed.tsx";
import { MARGIN_RATIO, SIZES, frameInsetFor, sizeFor } from "../scripts/sizes.mjs";

const SCALES = Object.values(SIZES).map(
  (r) => (r as { typeScale: number }).typeScale,
);

/** Every number `tokens()` hands back, flattened, so nothing can be added and left uncompared. */
function flatten(t: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(t)) {
    if (typeof value === "number") out[key] = value;
    else if (value && typeof value === "object")
      for (const [k, v] of Object.entries(value as Record<string, unknown>))
        if (typeof v === "number") out[`${key}.${k}`] = v;
  }
  return out;
}

describe("every number the seed draws with scales with its size", () => {
  it("should return the same multiple of the scale for every token, at every scale", () => {
    // The mechanism, asserted as a RATIO rather than as a value: a token that goes through `sp` is
    // `base * scale` rounded, so dividing by the scale returns the base at every scale. A literal
    // that stopped going through `sp` returns 34/2.2 = 15.5 at landscape and 34/3.0 = 11.3 at
    // portrait, and the comparison names the token.
    //
    // It also refuses a token ADDED to `tokens()` and left bare, because it walks what the function
    // returns instead of a written list — the discipline `video-helper-parity.test.ts` states after
    // its own hand-written list turned red for a correct change.
    const tables = SCALES.map((s) => ({ scale: s, flat: flatten(tokens(s)) }));
    // `fontWeight` is a WEIGHT, not a length: 700 stays 700 at every size and dividing it by a
    // scale is meaningless. Excluded by NAME rather than by "numbers that happen not to scale",
    // because the second form would quietly excuse the next frozen literal too.
    const keys = Object.keys(tables[0].flat).filter((k) => !k.endsWith("fontWeight"));
    expect(keys.length).toBeGreaterThan(10);
    const drifting: string[] = [];
    for (const key of keys) {
      const bases = tables.map((t) => t.flat[key] / t.scale);
      const spread = Math.max(...bases) - Math.min(...bases);
      // 0.5 is the rounding `sp` itself introduces at the smallest scale, and nothing more: a base
      // of 34 comes back as 34.09 at 2.2 and 34.00 at 3.0.
      if (spread > 0.5)
        drifting.push(
          `${key}: ${tables.map((t) => `${t.flat[key]}@${t.scale} -> base ${(t.flat[key] / t.scale).toFixed(2)}`).join(", ")}`,
        );
    }
    expect(drifting).toEqual([]);
  });

  it("should give the frame a margin proportional to the CANVAS, never to the type", () => {
    // The one literal that must NOT go through `sp`. At a 3.0 type scale a 40px margin becomes
    // 120px on a 1080 frame — a quarter of the width spent on air before a word is drawn.
    const landscape = frameInsetFor("landscape");
    const portrait = frameInsetFor("portrait");
    expect(landscape / 1920).toBeCloseTo(MARGIN_RATIO, 2);
    // …with the mobile-first wireframe's floor under it, which is the binding constraint at 1080:
    // Meta reserves 6% = 65px, and 2 x the smallest type is the next value up, "so the margin can
    // never be thinner than the smallest word is tall."
    expect(portrait).toBe(72);
    expect(portrait).toBeGreaterThanOrEqual(36 * 2);
    expect(portrait).toBeGreaterThan(Math.round(MARGIN_RATIO * 1080));
  });

  it("should thin the value axis exactly where the frame is read on a phone, and nowhere else", () => {
    // Ladder rung R2 — the only rung that gives budget back without removing anything vertical.
    // Measured on this seed at 1080x1080 before it fired: "650" and "600" 2.7px apart.
    expect(yTickHintFor("landscape")).toBe(5);
    expect(yTickHintFor("square")).toBe(3);
    expect(yTickHintFor("portrait")).toBe(3);
    // Keyed on the legibility floor, not on the size's NAME, so a fourth row lands with the right
    // density on the day it is added rather than on the day somebody remembers this line.
    for (const name of Object.keys(SIZES))
      expect([name, yTickHintFor(name) < 5]).toEqual([
        name,
        sizeFor(name).minTypePx >= 36,
      ]);
  });

  it("should thin the time axis on the same rule, for a different measured reason", () => {
    // Not symmetrical with the y axis and the difference is worth keeping: a y label goes because
    // five of them stack too close; an x label goes because six four-digit years at 39px are WIDER
    // than the plot they label — "2016"/"2018" overlapped by 52.9px, and every adjacent pair after.
    expect(xTickHintFor("landscape")).toBe(6);
    expect(xTickHintFor("square")).toBe(3);
    expect(xTickHintFor("portrait")).toBe(3);
  });
});
