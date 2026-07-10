import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WaterfallChart, type WaterfallConfig } from "../src/WaterfallChart";

// waterfall.md rule 4: EVERY step carries a direct signed value label (absolute on
// the totals). That must hold through the reveal, not only at the p=1 hold — the
// video still is captured MID-BUILD. The old gate `clamp01((grown - 0.6)/0.4)` hid
// the last-staggered steps' labels until ~60% of their own growth, so a mid-build
// still shipped label-less steps. The fix fades the label in early (`labelReveal`)
// while it rides the bar's ANIMATED top (always above the bar → never clipped).
const config: WaterfallConfig = {
  title: "Salaries and upkeep swallowed the council's new income",
  source: { name: "Riverton council accounts", url: "https://example.org/x" },
  unit: "running balance (£000s)",
  rows: [
    { label: "Opening", value: 1200, total: true },
    { label: "Grants", value: 600 },
    { label: "Fees", value: 200 },
    { label: "Salaries", value: -900 },
    { label: "Upkeep", value: -350 },
    { label: "Closing", value: 750, total: true },
  ],
};

// Value labels are the only weight-700 <text> whose content is numeric (the count
// axis ticks carry no weight; category labels carry no weight).
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

describe("WaterfallChart — every step keeps its value label through the reveal", () => {
  const STILL = 0.64;

  it("labels EVERY step at the mid-build video still (incl. the last-staggered)", () => {
    const markup = renderToStaticMarkup(
      <WaterfallChart
        config={config}
        progress={STILL}
        width={1080}
        height={1920}
        scale={1.7}
      />,
    );
    const ops = valueLabelOpacities(markup);
    expect(ops.length).toBe(6);
    for (const o of ops) expect(o).toBeGreaterThan(0.9);
  });

  it("keeps every value label at the final hold (progress 1)", () => {
    const markup = renderToStaticMarkup(
      <WaterfallChart config={config} progress={1} />,
    );
    const ops = valueLabelOpacities(markup);
    expect(ops.length).toBe(6);
    for (const o of ops) expect(o).toBe(1);
  });
});
