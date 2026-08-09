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
 *
 * THE MUTATIONS, run in a copy of the tree under /tmp, 2026-08-10 — and the greens are the
 * informative half, so they are written down rather than quietly dropped:
 *
 *   X_TICK_DROP back to a bare 24            RED — and it reproduces this seed's own recorded
 *                                                  defect verbatim: the source line struck through
 *                                                  "2016" and "2018", here by 58.2 x 1.9 px
 *   END_LABEL_GUTTER back to a bare 12       GREEN
 *   Y_TICK_INSET back to a bare 10           GREEN
 *   PAD stops scaling                        GREEN
 *   title wraps to a fixed 900 measure       GREEN
 *   GAP_NOTE.fontSize back to a bare 12      GREEN
 *
 * **The line this draws is the useful thing to know about this guard.** It sees a spacing literal
 * that is THE WHOLE of a gap — `X_TICK_DROP` is the entire distance between the plot floor and the
 * tick baseline, so freezing it at 24 while the type triples puts the labels into the source line.
 * It does NOT see a literal that is a small ADDEND to a measured quantity: the end-label gutter is
 * `PAD + END_LABEL_GUTTER + measureText(endLabel)`, and the measured term is so much the larger
 * that dropping 13px from the constant moves nothing outside the frame. That is not a hole to be
 * plugged — it is `static-discipline.md`'s "gutters are measured, never fixed" paying off, and a
 * frozen addend beside a measured gutter is genuinely not a defect at these sizes.
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
  left: number;
  right: number;
  top: number;
  bottom: number;
};

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
      left: x + box.x + shift,
      right: x + box.x + shift + box.width,
      top: y + box.y,
      bottom: y + box.y + box.height,
    });
  }
  return runs;
}

describe("the seed draws cleanly at every size the table offers", () => {
  for (const [size, row] of Object.entries(SIZES) as [
    string,
    { width: number; height: number },
  ][]) {
    const svg = renderToStaticMarkup(
      createElement(ChartSeed, { ...SEED, size }),
    );
    const runs = textRuns(svg);

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
});
