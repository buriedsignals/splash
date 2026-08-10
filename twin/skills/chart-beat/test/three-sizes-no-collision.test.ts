/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * It exists because of a mutation run that came back GREEN. When the seed learned to draw at three
 * sizes, four mutations were run against it: two reddened (the seed keeping its own `FRAME`
 * constant; `sizeFor` defaulting instead of throwing) and two did not — **un-scaling the end-label
 * gutter, and un-scaling the y-tick inset**. Those are precisely the class of defect the Task 0
 * probe found by rendering (`proof/static-carbon-footprint-spread/probe/VERDICT.md`): a bare
 * spacing literal that stayed at its 900×560 value while the type around it grew 2.1×, and
 * collided the title into the subtitle by 1634 × 4.5 px. Nothing in the existing suite could see
 * it, because every other assertion is about ONE size and about a single element's own coordinates.
 *
 * So this file does what the probe did, as a test: it renders the seed at all three sizes, measures
 * **the real ink box of every drawn `<text>` run** with the same rasteriser that will draw it, and
 * refuses any run that crosses the frame edge or overlaps another run.
 *
 * WHY REAL INK BOXES AND NOT AN ESTIMATE. `measureText` returns a width only, so a clipping test
 * needs the height and the bearings too — this asks resvg for the whole box at the run's own drawn
 * `font-size`/`font-weight`, read OFF THE RENDERED MARKUP rather than passed in. A test that typed
 * the font size would pass by measuring the wrong string the moment a scale changed, which is the
 * bug it is here to catch. It is the same discipline `static-discipline.md`'s "Gutters are measured,
 * never fixed" states for the component: the original engine's four clipped labels were all found
 * by eye, none by a test, because the tests were written against the constant.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. **Whether the chart is any GOOD at that size.** This is the important one and it is not a
 *    limitation that can be engineered away. The probe measured a portrait histogram at zero
 *    clipped runs, zero collisions and 84% plot fill — and the plot's aspect had gone from 2.35:1
 *    to 0.54:1, turning a right-skewed distribution into one column beside nine slivers. Every
 *    number here would have been green for it. A distribution's argument is a shape, a line's
 *    argument is a slope, and both are aspect ratios no counter reads. **The render is opened.**
 * 2. **Overlap that is deliberate.** Nothing in this seed draws text over text on purpose. A beat
 *    that does — a value inside its own bar — needs a different rule, and copying this file into it
 *    unchanged would be wrong rather than strict.
 * 3. **Anything not a `<text>` run.** A mark drawn outside the frame, a path clipped by the
 *    viewBox, a legend swatch — none of it is measured here.
 * 4. **The gap between "fits" and "reads".** A 9px label inside the frame passes. Legibility floors
 *    are the type scale's job, and the type scale's evidence is the probe.
 * 5. **A gap that tightens by the same proportion at every size.** Assertion 4 compares the sizes
 *    against each other, so a change that crowds all three equally is invisible to it. That is a
 *    deliberate change of leading, not a frozen literal, and it is the render's job to judge it.
 *
 * THE MUTATIONS, re-run in a copy of the tree under /tmp, 2026-08-11 — and the greens are the
 * informative half, so they are written down rather than quietly dropped:
 *
 *   HEADER_TO_PLOT back to a bare 34         RED — assertion 4, pasted verbatim:
 *
 *       error: expect(received).toEqual(expected)
 *       - []
 *       + [
 *       +   "a different pair of words is the closest pair at different sizes — something between
 *       +    them is not scaling with the type",
 *       +   "landscape: 0.417x the type (11.3px) between "years" / "950 mm"",
 *       +   "square: 0.560x the type (17.4px) between "Rainfall over Annemasse-…-sur-Arve fell by a
 *       +    third in ten" / "years"",
 *       +   "portrait: 0.560x the type (17.4px) between "Rainfall over Annemasse-…-sur-Arve fell by a
 *       +    third in ten" / "years"",
 *       +   "the tightest moment drifts by 0.143x across the sizes, tolerance 0.10 — a gap is being
 *       +    held in pixels while the type around it is scaled",
 *       +   … the same three lines again
 *       + ]
 *       (fail) … should reach its tightest moment at the same pair of words, and by the same
 *              proportion, at every size
 *        9 pass · 1 fail
 *
 *     And the render was opened: at 1920x1080 the mutated landscape puts `950 mm` 11px under a 55px
 *     title, so the y-axis top label reads as a second deck of the headline.
 *   TITLE.fontSize x 3                       RED — clipping and overlap, all three sizes
 *   PAD frozen at 0                          RED — clipping, all three sizes
 *   X_TICK_DROP back to a bare 24            GREEN — and it CANNOT be red. See the arithmetic below.
 *   X_AXIS_TO_SOURCE_GAP back to a bare 8    GREEN — the gap tightens from 0.89x to 0.56x the type
 *                                                    at landscape, which is tighter than intended
 *                                                    and still clear air; assertion 4's tightest
 *                                                    moment is the title's own leading at 0.53x
 *   END_LABEL_GUTTER back to a bare 12       GREEN
 *   Y_TICK_INSET back to a bare 10           GREEN
 *   PAD stops scaling (`PAD: BASE.PAD`)      GREEN — `sourceBaseline` is `height - PAD` and
 *                                                    `padding.bottom` is `height - sourceBaseline`
 *                                                    + …, so the whole bottom band slides down
 *                                                    together and no gap changes
 *   `sp = (v) => v`                          GREEN — and this is NOT "spacing stops scaling": `sp`
 *                                                    is applied to the FONT SIZES too, so the whole
 *                                                    drawing stays at its 900x560 values on a bigger
 *                                                    canvas. Small type, no collision. That is
 *                                                    blind spot 4, not a defect this can measure.
 *   title wraps to a fixed 900 measure       GREEN
 *   GAP_NOTE.fontSize back to a bare 12      GREEN
 *
 * ── THE 2026-08-11 NARROWING, and what it cost ───────────────────────────────────────────────
 *
 * Assertion 4 above used to compare the layout's single tightest moment across the three sizes and
 * require the SAME PAIR OF WORDS at the same proportion. It no longer can, and the reason is a
 * design change rather than a weakening: once portrait and square type for a PHONE (a 36px floor,
 * `sizes.mjs`) instead of for an article column, the title wraps to a different number of lines,
 * the credit wraps at two sizes and not the third, and ladder rung R2 drops the labelled gridlines
 * from five to three — so the closest pair legitimately differs and the topmost tick is no longer
 * a comparable landmark. On top of that `PAD` deliberately STOPPED scaling with the type: it is the
 * frame's margin and it scales with the canvas, which is the exact shape of the defect this
 * assertion hunts, now intentional.
 *
 * So it was narrowed to what survives: a text BLOCK'S OWN LEADING — two adjacent runs carrying the
 * same base token, both `start`-anchored, at the same drawn `x`. Everything else vertically
 * adjacent is separated by the plot, whose height and tick count are per-size decisions.
 *
 * **The cost is real and is not hidden: `HEADER_TO_PLOT` back to a bare 34 is now GREEN here.**
 * Re-run 2026-08-11, 10 pass / 0 fail. It is covered instead by
 * `seed-scales-with-its-size.test.ts`, which asserts every token `tokens()` returns is the same
 * multiple of the scale at every scale — RED 3/1 on that mutation, and RED on five more this file
 * was already green for (`sp = v => v`, `X_TICK_DROP`, `GAP_NOTE.fontSize`, the two tick hints,
 * and `frameInset` frozen). That file is weaker in KIND — it cannot see a literal that bypasses
 * `tokens` altogether — and this file's ink measurement is what still catches those.
 *
 * ── the older finding, unchanged ──────────────────────────────────────────────────────────────
 *
 * **`X_TICK_DROP` CANNOT REDDEN THIS GUARD, and an earlier version of this header claimed it did.**
 * The claim was false when it was typed — `git log ee55c95a..` on `ChartSeed.tsx` is empty, so the
 * seed never changed under it. The arithmetic: `padding.bottom` is
 * `height − sourceBaseline + SOURCE.fontSize + X_TICK_DROP + X_AXIS_TO_SOURCE_GAP` (`:351-356`),
 * the plot floor is `height − padding.bottom` (`:193`), and the tick baseline is
 * `plot.bottom + X_TICK_DROP` (`:422`). Substitute and the tick baseline is
 * `sourceBaseline − SOURCE.fontSize − X_AXIS_TO_SOURCE_GAP`: **`X_TICK_DROP` cancels out of it
 * entirely.** Freezing it moves the plot's floor and moves no drawn word at all. The rendered defect
 * the old row described is real history — it is what made the two places agree in the first place —
 * but the arithmetic that fixed it is also what puts it permanently out of this guard's reach.
 *
 * **The line this draws is the useful thing to know about this guard.** It sees a spacing literal
 * that is THE WHOLE of a gap BETWEEN TWO DRAWN WORDS — `HEADER_TO_PLOT` is the entire distance from
 * the last header line to the plot's ceiling, and the topmost y-tick label hangs off that ceiling,
 * so freezing it at 34 while the type doubles puts `950 mm` 11px under a 55px title. It does NOT see
 * a literal that is a small ADDEND to a measured quantity (`END_LABEL_GUTTER` sits beside
 * `measureText(endLabel)`), nor one that cancels out of every baseline it touches (`X_TICK_DROP`),
 * nor one that moves a whole band without changing a gap inside it (`PAD`). The first of those is
 * `static-discipline.md`'s "gutters are measured, never fixed" paying off; the other two are
 * arithmetic, and no assertion can reach them.
 *
 * `GAP_NOTE` is the other kind of green and it is the one to keep in mind: un-scaling it IS a real
 * defect, found by opening the landscape render, where a 12px note under a 55px title read like a
 * caption printed by mistake. It collides with nothing and is clipped by nothing. A guard that
 * caught it would have to hold an opinion about relative type size, which is a design judgement
 * and not a measurement — so this one does not, and the render is opened instead.
 */
import { describe, it, expect } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import { FONT_FAMILY } from "../scripts/render-still.mjs";
import { SIZES } from "../scripts/sizes.mjs";
import { ChartSeed } from "../assets/ChartSeed.tsx";
import rainfall from "../assets/sample-data/rainfall.json";

const SEED = {
  data: rainfall,
  // The longest realistic subject this skill has on record — the name that produced the original
  // engine's clipped end label, so the gutter is exercised rather than merely present.
  subject: "Annemasse-les-Voirons-sur-Arve",
  title:
    "Rainfall over Annemasse-les-Voirons-sur-Arve fell by a third in ten years",
  source:
    "MeteoSwiss, as of 31 May 2026 — station record, not a basin-wide measurement",
  alt: "A line falling from 912 mm in 2015 to 604 mm in 2025.",
  ground: "#FFFFFF",
  accent: "#0B7A75",
};

// Drawn at a known baseline and translated back, so `y` comes out relative to it — negative above.
const BASELINE = 400;
const cache = new Map<
  string,
  { x: number; y: number; width: number; height: number }
>();
function inkBox(text: string, fontSize: number, fontWeight: number) {
  const key = `${fontSize}|${fontWeight}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const probe =
    `<svg xmlns="http://www.w3.org/2000/svg" width="12000" height="900">` +
    `<text x="0" y="${BASELINE}" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="${fontWeight}">${escaped}</text>` +
    `</svg>`;
  const b = new Resvg(probe, { font: { loadSystemFonts: true } }).getBBox();
  const box = b
    ? { x: b.x, y: b.y - BASELINE, width: b.width, height: b.height }
    : { x: 0, y: 0, width: 0, height: 0 };
  cache.set(key, box);
  return box;
}

function attr(tag: string, name: string) {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
}

type Run = {
  text: string;
  /** The size it is DRAWN at, read off the markup — assertion 4 divides by it. */
  fontSize: number;
  /** Read off the markup too. Assertion 4 uses it to tell a flowed text block from an axis. */
  anchor: string;
  /** The DRAWN x, not the ink's left edge — two lines of one block share the first and not the
   *  second, because a glyph's left side bearing differs per string. */
  x: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/**
 * The tightest moment in a layout: over every pair of runs whose horizontal extents overlap and
 * which do not overlap vertically, the smallest vertical clear air EXPRESSED IN MULTIPLES OF THE
 * SMALLER OF THE TWO TYPE SIZES. In multiples, because that is the only form in which the three
 * frames are comparable — 24px of air under a 27px label and 14px under a 16px label are the same
 * picture, and the raw pixel counts say they are not.
 */
function tightestMoment(runs: Run[], typeScale: number) {
  const byRole = new Map<string, { pair: string; ratio: number; gap: number }>();
  let worst: { pair: string; ratio: number; gap: number } | null = null;
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const a = runs[i];
      const b = runs[j];
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) <= 0) continue;
      const [upper, lower] =
        a.bottom <= b.top ? [a, b] : b.bottom <= a.top ? [b, a] : [null, null];
      if (!upper || !lower) continue;
      const gap = lower.top - upper.bottom;
      // ADJACENT ONLY. A pair with a third run between them is not a GAP, it is a distance — the
      // title and the credit are 743px apart at landscape and 450 at square, and both are correct,
      // because what sits between them is the plot and the plot's height is the size's own
      // decision. Before this filter, comparing them across sizes read the plot's aspect as drift.
      // The global tightest moment used to exclude these implicitly, by being the minimum; now that
      // every role is compared, the exclusion has to be stated.
      const between = runs.some(
        (r) =>
          r !== upper &&
          r !== lower &&
          Math.min(r.right, Math.min(upper.right, lower.right)) -
            Math.max(r.left, Math.max(upper.left, lower.left)) >
            0 &&
          r.top >= upper.bottom &&
          r.bottom <= lower.top,
      );
      if (between) continue;
      const ratio = gap / Math.min(upper.fontSize, lower.fontSize);
      const moment = {
        pair: `${JSON.stringify(upper.text)} / ${JSON.stringify(lower.text)}`,
        ratio,
        gap,
      };
      if (!worst || ratio < worst.ratio) worst = moment;
      // The ROLE of a gap, which is what makes it comparable across sizes: the two runs' BASE
      // tokens, recovered by dividing the drawn size by the size's own scale. A title-to-title gap
      // is `26/26` at every size even when the title wraps to a different number of lines; a
      // header-to-plot gap is `26/13`. See the assertion's own comment for why the pair's TEXT
      // stopped being usable as the key.
      // A TEXT BLOCK'S OWN LEADING, and nothing else. Two runs belong to the same block when they
      // carry the same BASE token (the drawn size divided by the size's own scale) and share a DRAWN
      // x — the ink's left edge is not it, because a glyph's left side bearing differs per string
      // and two lines of the same title come back 3px apart. Everything else that is vertically adjacent — a title over the topmost gridline
      // label, one y tick over the next — is separated by the PLOT, whose height and whose tick
      // COUNT are per-size decisions (ladder rung R2 drops five labelled gridlines to three on a
      // phone frame). Comparing those across sizes reads a deliberate decision as drift, which is
      // what the first version of this revision did.
      // `textAnchor="start"` is what a FLOWED block has. A y-tick label is `end`-anchored and an
      // x-tick label is `middle`-anchored, and two y ticks of equal width share a left edge without
      // being a block at all — their spacing is the gridline spacing, which is the plot's business.
      const sameBlock =
        upper.anchor === "start" &&
        lower.anchor === "start" &&
        Math.round(upper.fontSize / typeScale) === Math.round(lower.fontSize / typeScale) &&
        upper.x === lower.x;
      if (!sameBlock) continue;
      const role = String(Math.round(upper.fontSize / typeScale));
      const held = byRole.get(role);
      if (!held || ratio < held.ratio) byRole.set(role, moment);
    }
  }
  return worst ? { ...worst, byRole } : null;
}

function textRuns(svg: string): Run[] {
  const runs: Run[] = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const content = m[2]
      .replace(/<[^>]+>/g, "")
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, "&");
    if (!content.trim()) continue;
    const x = Number(attr(m[1], "x"));
    const y = Number(attr(m[1], "y"));
    // Read off the markup, never typed — see this file's header.
    const fontSize = Number(attr(m[1], "font-size"));
    const fontWeight = Number(attr(m[1], "font-weight") ?? 400);
    const anchor = attr(m[1], "text-anchor") ?? "start";
    const box = inkBox(content, fontSize, fontWeight);
    const shift =
      anchor === "middle" ? -box.width / 2 : anchor === "end" ? -box.width : 0;
    runs.push({
      text: content,
      fontSize,
      anchor,
      x,
      left: x + box.x + shift,
      right: x + box.x + shift + box.width,
      top: y + box.y,
      bottom: y + box.y + box.height,
    });
  }
  return runs;
}

const drawn = new Map<string, Run[]>(
  Object.keys(SIZES).map((size) => [
    size,
    textRuns(renderToStaticMarkup(createElement(ChartSeed, { ...SEED, size }))),
  ]),
);

describe("the seed draws cleanly at every size the table offers", () => {
  for (const [size, row] of Object.entries(SIZES) as [
    string,
    { width: number; height: number },
  ][]) {
    const runs = drawn.get(size)!;

    it(`should draw at least the title, the source, the end label and the axes at ${size}`, () => {
      // The premise, pinned rather than assumed: with no runs, both assertions below go vacuously
      // green. This is `render-still-parity.test.ts:152-163`'s discipline on a different axis.
      expect([size, runs.length > 8]).toEqual([size, true]);
    });

    it(`should keep every drawn word inside the frame at ${size}`, () => {
      const clipped = runs
        .filter(
          (r) =>
            r.left < 0 ||
            r.right > row.width ||
            r.top < 0 ||
            r.bottom > row.height,
        )
        .map(
          (r) =>
            `${JSON.stringify(r.text)} at [${r.left.toFixed(0)}..${r.right.toFixed(0)}] x [${r.top.toFixed(0)}..${r.bottom.toFixed(0)}] in ${row.width}x${row.height}`,
        );
      expect([size, clipped]).toEqual([size, []]);
    });

    it(`should let no two drawn words overlap at ${size}`, () => {
      const collisions: string[] = [];
      for (let i = 0; i < runs.length; i++) {
        for (let j = i + 1; j < runs.length; j++) {
          const a = runs[i];
          const b = runs[j];
          const overlapX =
            Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY =
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapX > 0 && overlapY > 0)
            collisions.push(
              `${JSON.stringify(a.text)} / ${JSON.stringify(b.text)} by ${overlapX.toFixed(1)}x${overlapY.toFixed(1)}px`,
            );
        }
      }
      expect([size, collisions]).toEqual([size, []]);
    });
  }

  /**
   * ASSERTION 4 — the one that reaches the frozen literal.
   *
   * Assertions 1-3 only see a gap once it has closed to zero, and a frozen spacing literal almost
   * never gets that far: it makes a gap TIGHTER AT THE LARGER SIZE while everything around it grows.
   * `HEADER_TO_PLOT` frozen at 34 leaves 11px of air under a 55px title at 1920x1080 — crowded, and
   * not a collision, so nothing above it fires.
   *
   * What is invariant when every number goes through `sp` is the layout's TIGHTEST MOMENT, measured
   * in multiples of its own type: the same pair of words is the closest pair at every size, and by
   * the same proportion. `tokens()` rounds to integers, so the three do not agree exactly; the
   * measured spread across this seed's three sizes is 0.032, and the tolerance below is 0.10.
   *
   * Deliberately NOT a floor on the ratio itself. A floor would be a number picked to sit between
   * this seed's healthy 0.53 and one mutation's 0.42 — calibrated to the mutation rather than to
   * anything about reading, and wrong for the next beat's leading.
   */
  it("should reach its tightest moment at the same pair of words, and by the same proportion, at every size", () => {
    const moments = Object.keys(SIZES).map((size) => {
      const worst = tightestMoment(
        drawn.get(size)!,
        (SIZES as Record<string, { typeScale: number }>)[size].typeScale,
      );
      if (!worst) throw new Error(`no measurable clear air at ${size}`);
      return { size, ...worst };
    });
    // The premise, pinned: with nothing measurable the checks below go vacuously green.
    expect(moments.length).toBe(Object.keys(SIZES).length);

    // Every gap ROLE that exists at all three sizes. A role that exists at only some of them is
    // excluded rather than compared, and that exclusion is the whole of the 2026-08-11 revision:
    // once portrait and square type for a PHONE instead of for an article column, the same title
    // wraps to a different number of lines and the credit wraps at two sizes and not at the third.
    // The closest pair by TEXT then legitimately differs between sizes — 0.425x of the title's own
    // leading at landscape against 0.352x of the CREDIT's leading at portrait, with both blocks
    // perfectly proportional — and the old form read that as drift. Comparing role to role
    // compares like with like and still reaches the frozen literal: a frozen `HEADER_TO_PLOT` is
    // the `26/13` role and exists everywhere.
    const roles = [...moments[0].byRole.keys()].filter((role) =>
      moments.every((m) => m.byRole.has(role)),
    );
    // Pinned, so a rendering change that left no shared role at all cannot pass by having nothing
    // to compare. Three is the count the seed draws today; the assertion is "several", not "three".
    expect([roles.length >= 1, roles.length]).toEqual([true, roles.length]);

    const problems: string[] = [];
    for (const role of roles) {
      const per = moments.map((m) => ({ size: m.size, ...m.byRole.get(role)! }));
      const ratios = per.map((p) => p.ratio);
      const spread = Math.max(...ratios) - Math.min(...ratios);
      if (spread > 0.1)
        problems.push(
          `the ${role}px block's leading drifts by ${spread.toFixed(3)}x across the sizes, tolerance 0.10 — a gap is being held in pixels while the type around it is scaled`,
          ...per.map(
            (p) =>
              `  ${p.size}: ${p.ratio.toFixed(3)}x the type (${p.gap.toFixed(1)}px) between ${p.pair}`,
          ),
        );
    }
    expect(problems).toEqual([]);
  });
});
