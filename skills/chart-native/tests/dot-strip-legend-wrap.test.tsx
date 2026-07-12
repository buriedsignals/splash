import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DotStripChart, type DotStripConfig } from "../src/DotStripChart";

// The dot-strip legend is hand-laid (mean TICK + sample DOT markers) on one row;
// the bottom reserve used to be computed from a chip-grid wrap the render never
// performed — at a 360px embed "Individual pupil" overran the svg's right edge
// by 18.72px (caught render-side by snap-label-fit). The fix decides the wrap
// ONCE (legendWrapsAt), from the same x-positions the legend renders at, and
// uses it for BOTH the bottom-pad reserve and the rendered row placement.
const config: DotStripConfig = {
  title: "Some schools spread their pupils far wider than others",
  source: { name: "Riverton schools attainment return", url: "https://example.org/x" },
  unit: "pupil exam score, %",
  categoryField: "school",
  valueField: "score",
  summaryLabel: "School mean",
  rows: [
    { school: "Eastgate", score: 31 },
    { school: "Eastgate", score: 55 },
    { school: "Westview", score: 48 },
    { school: "Westview", score: 62 },
  ],
};

function legendYs(markup: string): number[] {
  const legend = /<g class="chart-legend"[\s\S]*?<\/g>/.exec(markup);
  if (!legend) throw new Error("no legend group found");
  const ys: number[] = [];
  for (const m of legend[0].matchAll(/<text\b[^>]*\by="([\d.-]+)"/g)) {
    ys.push(Number(m[1]));
  }
  return ys;
}

describe("DotStripChart — narrow embeds wrap the legend's second item onto its own row", () => {
  it("should place 'Individual pupil' on a second legend row at a narrow width (312px)", () => {
    // 312 = what a 360px phone leaves after the page's 24px body insets.
    const markup = renderToStaticMarkup(
      <DotStripChart config={config} progress={1} width={312} height={480} interactive responsive />,
    );
    const ys = legendYs(markup);
    expect(ys.length).toBe(2);
    expect(new Set(ys).size).toBe(2); // wrapped: two distinct rows
  });

  it("should keep the one-row legend at a wide width (840px)", () => {
    const markup = renderToStaticMarkup(
      <DotStripChart config={config} progress={1} width={840} height={480} interactive responsive />,
    );
    const ys = legendYs(markup);
    expect(ys.length).toBe(2);
    expect(new Set(ys).size).toBe(1); // unchanged single row — no layout shift
  });
});
