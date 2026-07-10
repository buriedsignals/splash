import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart, type BarConfig } from "../src/BarChart";

// bar.md rule 4: EVERY bar carries a direct value label. That invariant must hold not
// only at the final hold (progress 1) but through the reveal — the video still is
// captured MID-BUILD (frame 140/240 → BarReveal interpolates progress ≈ 0.64). The old
// gate `labelOp = clamp01((grown - 0.65)/0.35)` tied the label to the LAST 35% of each
// bar's own (staggered) growth, so at the still frame the two smallest, last-staggered
// bars (GER 2, NGR 1) rendered with opacity 0 — a ranking video shipped label-less bars.
const config: BarConfig = {
  title: "The United States led the medal table by a wide margin",
  source: { name: "Olympic committee", url: "https://example.org/medals" },
  unit: "gold medals",
  catField: "country",
  valField: "medals",
  orientation: "vertical",
  sort: "desc",
  rows: [
    { country: "USA", medals: 52 },
    { country: "JAM", medals: 22 },
    { country: "GBR", medals: 14 },
    { country: "CAN", medals: 9 },
    { country: "TTO", medals: 7 },
    { country: "FRA", medals: 5 },
    { country: "GER", medals: 2 },
    { country: "NGR", medals: 1 },
  ],
};

// Value labels are the only <text> at font-weight 600 (category + axis labels have no
// weight). Read each one's opacity — absent attribute means fully opaque.
function valueLabelOpacities(markup: string): number[] {
  const ops: number[] = [];
  for (const m of markup.matchAll(/<text\b[^>]*>/g)) {
    const tag = m[0];
    if (!/font-weight="600"/.test(tag)) continue;
    const o = /opacity="([^"]+)"/.exec(tag);
    ops.push(o ? Number(o[1]) : 1);
  }
  return ops;
}

describe("BarChart — every bar keeps its direct value label through the reveal", () => {
  // BarReveal: t = 140/239 ≈ 0.586 → interpolate([0.02, 0.9], [0, 1]) ≈ 0.643.
  const STILL = 0.643;

  it("labels EVERY bar at the mid-build video still frame — incl. the two smallest (portrait 9:16)", () => {
    const markup = renderToStaticMarkup(
      <BarChart
        config={config}
        progress={STILL}
        width={1080}
        height={1920}
        scale={1.7}
      />,
    );
    const ops = valueLabelOpacities(markup);
    expect(ops.length).toBe(8); // one value label per bar
    // every bar — including GER and NGR, which grow last — is fully labelled
    for (const o of ops) expect(o).toBeGreaterThan(0.9);
  });

  it("keeps every value label at the final hold (progress 1)", () => {
    const markup = renderToStaticMarkup(
      <BarChart config={config} progress={1} />,
    );
    const ops = valueLabelOpacities(markup);
    expect(ops.length).toBe(8);
    for (const o of ops) expect(o).toBe(1);
  });
});
