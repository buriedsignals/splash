import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DivergingBarChart,
  type DivergingBarConfig,
} from "../src/DivergingBarChart";

// diverging-bar.md rule 4: EVERY bar carries a direct SIGNED value label at its
// outer tip. That must hold through the reveal, not only at the p=1 hold — the
// video still is captured MID-BUILD (≈60% through). The old gate
// `labelOp = clamp01((grown - 0.65)/0.35)` tied the label to the LAST 35% of each
// bar's own (staggered) growth, so at the still the last-staggered bars rendered
// with opacity 0 — a ranking video shipped label-less bars. The fix fades the
// label in early (`labelReveal`) while it rides the bar's ANIMATED outer tip.
const config: DivergingBarConfig = {
  title: "Tech and health added jobs while retail and manufacturing shed them",
  source: {
    name: "Riverton labour market survey",
    url: "https://example.org/x",
  },
  unit: "net change in jobs (thousands)",
  catField: "sector",
  valField: "change",
  rows: [
    { sector: "Tech", change: 18 },
    { sector: "Health", change: 12 },
    { sector: "Construction", change: 5 },
    { sector: "Education", change: 2 },
    { sector: "Hospitality", change: -3 },
    { sector: "Retail", change: -9 },
    { sector: "Manufacturing", change: -14 },
  ],
};

// Signed value labels are the only weight-700 <text> whose content is numeric
// (category labels carry no weight). Read each one's opacity — an absent
// attribute means fully opaque.
function valueLabelOpacities(markup: string): number[] {
  const ops: number[] = [];
  for (const m of markup.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = m[1];
    const content = m[2].replace(/<[^>]+>/g, "").trim();
    if (!/font-weight="700"/.test(attrs)) continue;
    if (!/\d/.test(content) || (content.match(/[A-Za-z]/g)?.length ?? 0) > 1)
      continue;
    const o = / opacity="([^"]+)"/.exec(attrs);
    ops.push(o ? Number(o[1]) : 1);
  }
  return ops;
}

describe("DivergingBarChart — every bar keeps its signed value label through the reveal", () => {
  // mid-build still: the last-staggered bar is only partly grown, so the OLD
  // late gate rendered its label at opacity 0.
  const STILL = 0.64;

  it("labels EVERY bar at the mid-build video still (incl. the last-staggered)", () => {
    const markup = renderToStaticMarkup(
      <DivergingBarChart
        config={config}
        progress={STILL}
        width={1080}
        height={1920}
        scale={1.7}
      />,
    );
    const ops = valueLabelOpacities(markup);
    expect(ops.length).toBe(7);
    for (const o of ops) expect(o).toBeGreaterThan(0.9);
  });

  it("keeps every value label at the final hold (progress 1)", () => {
    const markup = renderToStaticMarkup(
      <DivergingBarChart config={config} progress={1} />,
    );
    const ops = valueLabelOpacities(markup);
    expect(ops.length).toBe(7);
    for (const o of ops) expect(o).toBe(1);
  });
});
