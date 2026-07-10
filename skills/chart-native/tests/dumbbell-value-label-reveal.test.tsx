import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DumbbellChart, type DumbbellConfig } from "../src/DumbbellChart";

// dumbbell.md rule 4: BOTH endpoints carry a direct value label on the outer side.
// That must hold through the reveal, not only at the p=1 hold — the video still is
// captured MID-BUILD. The old gate `clamp01((rp - 0.6)/0.4)` hid the last-staggered
// rows' value labels (and second dot) until ~60% of their own growth. The fix fades
// them in early (`labelReveal`) while they ride the connector's ANIMATED head, so
// they stay anchored to visible geometry (byte-identical at p=1 where the head = the
// far dot). Value labels are weight-600 + numeric; the legend (weight-600) is names.
const config: DumbbellConfig = {
  title: "The gender pay gap is widest in finance",
  source: { name: "Riverton earnings survey", url: "https://example.org/x" },
  unit: "median hourly pay, £",
  labelField: "sector",
  leftField: "women",
  rightField: "men",
  leftLabel: "Women",
  rightLabel: "Men",
  rows: [
    { sector: "Finance", women: 28, men: 41 },
    { sector: "Tech", women: 30, men: 39 },
    { sector: "Health", women: 22, men: 27 },
    { sector: "Retail", women: 14, men: 17 },
    { sector: "Education", women: 26, men: 29 },
  ],
};

// Value labels are the weight-600 <text> whose content is numeric (the legend
// shares the weight but is series names).
function valueLabelOpacities(markup: string): number[] {
  const ops: number[] = [];
  for (const m of markup.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = m[1];
    const content = m[2].replace(/<[^>]+>/g, "").trim();
    if (!/font-weight="600"/.test(attrs)) continue;
    if (!/\d/.test(content) || (content.match(/[A-Za-z]/g)?.length ?? 0) > 1)
      continue;
    const o = / opacity="([^"]+)"/.exec(attrs);
    ops.push(o ? Number(o[1]) : 1);
  }
  return ops;
}

describe("DumbbellChart — both endpoints keep their value label through the reveal", () => {
  const STILL = 0.64;

  it("labels EVERY endpoint at the mid-build video still (incl. the last-staggered)", () => {
    const markup = renderToStaticMarkup(
      <DumbbellChart
        config={config}
        progress={STILL}
        width={1080}
        height={1920}
        scale={1.7}
      />,
    );
    const ops = valueLabelOpacities(markup);
    expect(ops.length).toBe(10); // two per row
    for (const o of ops) expect(o).toBeGreaterThan(0.9);
  });

  it("keeps every value label at the final hold (progress 1)", () => {
    const markup = renderToStaticMarkup(
      <DumbbellChart config={config} progress={1} />,
    );
    const ops = valueLabelOpacities(markup);
    expect(ops.length).toBe(10);
    for (const o of ops) expect(o).toBe(1);
  });
});
