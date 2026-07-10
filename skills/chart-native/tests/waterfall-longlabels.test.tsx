import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WaterfallChart, type WaterfallConfig } from "../src/WaterfallChart";
import { ROTATED_TICK_ANGLE_DEG } from "../src/core/text";

// A waterfall with narrow bars rotates its category labels −40°, END-anchored, so a
// long name descends DOWN-and-LEFT from the tick. Unbounded, the readable START ran
// off the left edge (clipped) and the foot collided with the "Source :" line — the
// reported bug, render-confirmed on French ministry names. The fix truncates each
// rotated label (ellipsis at END → readable START kept) to fit BOTH the per-tick
// horizontal budget (start stays on-canvas) and the reserved bottom margin (foot
// clears the source), the margin itself capped so the plot never collapses. This
// test locks all three invariants against the RENDERED geometry.
const MINISTRIES: WaterfallConfig = {
  title: "Les ministères qui gagnent et perdent le plus au budget 2025",
  source: { name: "PLF 2025", url: "https://www.budget.gouv.fr" },
  lang: "fr",
  unit: "variation en milliards d'euros",
  rows: [
    {
      label: "Ministère de l'Éducation nationale et de la Jeunesse",
      value: 2.4,
    },
    { label: "Ministère de l'Économie et des Finances", value: 1.1 },
    {
      label:
        "Ministère de la Transition écologique et de la Cohésion des territoires",
      value: 0.6,
    },
    { label: "Ministère de l'Intérieur et des Outre-mer", value: -0.5 },
    { label: "Ministère de la Justice", value: -0.4 },
  ],
};

// article-web renders the component at 600×338 (renderSize / deviceScaleFactor 2) —
// the tight landscape canvas where the bug bit.
const W = 600;
const H = 338;
const rad = (deg: number) => (deg * Math.PI) / 180;
// renderToStaticMarkup escapes the apostrophe as &#x27; — decode so length reflects
// the DISPLAYED glyph count.
const decode = (t: string) =>
  t
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
// same character-width model the truncation / reservation math uses
const estWidth = (text: string, font: number) => text.length * font * 0.6;

function renderMarkup() {
  return renderToStaticMarkup(
    <WaterfallChart
      config={MINISTRIES}
      responsive={false}
      width={W}
      height={H}
    />,
  );
}

/** The plot group's translate → [padding.left, padding.top]. */
function plotOrigin(svg: string): [number, number] {
  const m = svg.match(/translate\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\)/);
  if (!m) throw new Error("plot group translate not found");
  return [Number(m[1]), Number(m[2])];
}

/** Every −40° rotated category label: its pivot, font and (truncated) text. */
function rotatedLabels(svg: string) {
  const re = new RegExp(
    `<text[^>]*transform="rotate\\(-${ROTATED_TICK_ANGLE_DEG} ([\\d.]+) ([\\d.]+)\\)"[^>]*font-size="([\\d.]+)"[^>]*>([^<]*)</text>`,
    "g",
  );
  const out: { cx: number; cy: number; font: number; text: string }[] = [];
  for (const m of svg.matchAll(re)) {
    out.push({
      cx: Number(m[1]),
      cy: Number(m[2]),
      font: Number(m[3]),
      text: decode(m[4]),
    });
  }
  return out;
}

describe("WaterfallChart — long rotated category labels fit the frame", () => {
  it("rotates all five long ministry labels", () => {
    const labels = rotatedLabels(renderMarkup());
    expect(labels.length).toBe(5);
  });

  it("keeps every label's readable START (truncates the END with an ellipsis)", () => {
    const labels = rotatedLabels(renderMarkup());
    // the long names all begin "Ministère de l'…/la…" and must render start-first
    for (const l of labels)
      expect(l.text.startsWith("Ministère de l")).toBe(true);
    // at least one long name is bounded with a trailing ellipsis (never a mid-word
    // clip of the START, which was the bug)
    expect(labels.some((l) => l.text.endsWith("…"))).toBe(true);
  });

  it("shows enough of each name to tell the ministries apart", () => {
    const texts = rotatedLabels(renderMarkup()).map((l) => l.text);
    expect(new Set(texts).size).toBe(5); // not five identical "Ministère d…"
  });

  it("never runs a label's START off the left edge (start x ≥ 0)", () => {
    const svg = renderMarkup();
    const [padLeft] = plotOrigin(svg);
    for (const l of rotatedLabels(svg)) {
      // END-anchored + rotate(-θ): the far START end sits at cx − cosθ·width
      const startXAbs =
        padLeft +
        l.cx -
        Math.cos(rad(ROTATED_TICK_ANGLE_DEG)) * estWidth(l.text, l.font);
      expect(startXAbs).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps every label's foot clear of the source line at the bottom", () => {
    const svg = renderMarkup();
    const [, padTop] = plotOrigin(svg);
    // ChartFrame (static) paints the source at bottom:12 with a ~12px font → its top
    // sits ≈ H − 26. The rotated foot (cy + sinθ·width, in group coords) must stay
    // above it.
    const sourceTop = H - 24;
    for (const l of rotatedLabels(svg)) {
      const footYAbs =
        padTop +
        l.cy +
        Math.sin(rad(ROTATED_TICK_ANGLE_DEG)) * estWidth(l.text, l.font);
      expect(footYAbs).toBeLessThanOrEqual(sourceTop);
    }
  });

  it("does not collapse the plot — the rotated bottom margin stays a minority of the canvas", () => {
    const svg = renderMarkup();
    const [, padTop] = plotOrigin(svg);
    // the deepest rotated foot leaves room for a real plot above padTop
    let deepestFoot = 0;
    for (const l of rotatedLabels(svg)) {
      deepestFoot = Math.max(
        deepestFoot,
        padTop +
          l.cy +
          Math.sin(rad(ROTATED_TICK_ANGLE_DEG)) * estWidth(l.text, l.font),
      );
    }
    // labels + source occupy the bottom; the plot (padTop → tick baseline) keeps a
    // healthy share of the canvas so the count-axis ticks never crowd/overlap.
    const tickBaselineAbs = Math.min(
      ...rotatedLabels(svg).map((l) => padTop + l.cy),
    );
    expect(tickBaselineAbs - padTop).toBeGreaterThan(H * 0.2); // plot ≥ ~20% of H
    expect(deepestFoot).toBeLessThan(H); // nothing off the bottom
  });
});
