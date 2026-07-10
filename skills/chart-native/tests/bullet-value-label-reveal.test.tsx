import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BulletChart, type BulletConfig } from "../src/BulletChart";

// bullet.md rule (label each row's value): EVERY measure carries a value label at
// its bar end. That must hold through the reveal, not only at the p=1 hold — the
// video still is captured MID-BUILD. The old gate `clamp01((rp - 0.6)/0.4)` hid the
// last-staggered rows' labels until ~60% of their own growth. The fix fades the
// label in early (`labelReveal`) while it rides the measure bar's ANIMATED end.
// The KPI labels are also weight-700 but non-numeric, so numeric content isolates
// the value labels.
const config: BulletConfig = {
  title: "The council hit only one of its four service targets in 2024",
  source: {
    name: "Riverton council performance report",
    url: "https://example.org/x",
  },
  unit: "measure vs 2024 target",
  rows: [
    {
      label: "Recycling rate",
      unit: "% of waste",
      value: 47,
      target: 50,
      max: 65,
      bands: [35, 50],
    },
    {
      label: "Bus punctuality",
      unit: "% on time",
      value: 88,
      target: 90,
      max: 100,
      bands: [80, 90],
    },
    {
      label: "Pothole repairs",
      unit: "% within 28 days",
      value: 72,
      target: 70,
      max: 100,
      bands: [55, 70],
    },
    {
      label: "Library visits",
      unit: "per resident",
      value: 6.2,
      target: 7,
      max: 10,
      bands: [4, 7],
    },
  ],
};

// The measure value labels are the weight-700 <text> whose content is numeric (the
// KPI labels share the weight but are names).
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

describe("BulletChart — every measure keeps its value label through the reveal", () => {
  const STILL = 0.64;

  it("labels EVERY measure at the mid-build video still (incl. the last-staggered)", () => {
    const markup = renderToStaticMarkup(
      <BulletChart
        config={config}
        progress={STILL}
        width={1080}
        height={1920}
        scale={1.7}
      />,
    );
    const ops = valueLabelOpacities(markup);
    expect(ops.length).toBe(4);
    for (const o of ops) expect(o).toBeGreaterThan(0.9);
  });

  it("keeps every value label at the final hold (progress 1)", () => {
    const markup = renderToStaticMarkup(
      <BulletChart config={config} progress={1} />,
    );
    const ops = valueLabelOpacities(markup);
    expect(ops.length).toBe(4);
    for (const o of ops) expect(o).toBe(1);
  });
});
