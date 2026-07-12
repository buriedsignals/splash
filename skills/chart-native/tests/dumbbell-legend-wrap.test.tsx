import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DumbbellChart, type DumbbellConfig } from "../src/DumbbellChart";

// The below-plot legend WRAPS on a narrow embed (layoutLegend), but basePad.bottom
// used to reserve exactly ONE legend row — the wrapped second row painted past the
// card ("Men" bottom-clipped by 11.16px at a 360px viewport, caught render-side by
// snap-label-fit). The fix pre-reserves a row per wrapped line via the shared
// legendRowCount (same pattern as DotStripChart / ArcChart). This locks the layout
// math at the component level: at a width where the legend wraps, every legend row
// must still sit inside the canvas.
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
  ],
};

// Text box extent below a dy="0.32em"-centred 13px legend label — the em box
// reaches ~0.68em under the anchor; 9px over-covers it at TYPE.axis=13.
const LABEL_DESCENT_PX = 9;

function legendTextYs(markup: string): { ys: number[]; translateY: number } {
  const tr = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(markup);
  if (!tr) throw new Error("no plot translate found");
  const legend = /<g class="chart-legend"[\s\S]*?<\/g>\s*<\/g>/.exec(markup);
  if (!legend) throw new Error("no legend group found");
  const ys: number[] = [];
  for (const m of legend[0].matchAll(/<text\b[^>]*\by="([\d.-]+)"/g)) {
    ys.push(Number(m[1]));
  }
  return { ys, translateY: Number(tr[2]) };
}

describe("DumbbellChart — wrapped legend rows stay inside the canvas", () => {
  it("should keep every legend row above the bottom edge when the legend wraps at minWidth (280px)", () => {
    const height = 480;
    // 280 = the interactive minWidth floor: innerWidth is 96px, "Women" + "Men"
    // cannot share a row → layoutLegend wraps to 2 rows.
    const markup = renderToStaticMarkup(
      <DumbbellChart
        config={config}
        progress={1}
        width={280}
        height={height}
        interactive
        responsive
      />,
    );
    const { ys, translateY } = legendTextYs(markup);
    expect(ys.length).toBe(2);
    // the scenario must actually exercise the wrap (two distinct rows)
    expect(new Set(ys).size).toBe(2);
    for (const y of ys) {
      expect(translateY + y + LABEL_DESCENT_PX).toBeLessThanOrEqual(height);
    }
  });

  it("should keep the single-row legend layout unchanged at a wide width", () => {
    const markup = renderToStaticMarkup(
      <DumbbellChart
        config={config}
        progress={1}
        width={840}
        height={480}
        interactive
        responsive
      />,
    );
    const { ys } = legendTextYs(markup);
    expect(ys.length).toBe(2);
    expect(new Set(ys).size).toBe(1); // one row — no reserve growth, no layout shift
  });
});
