import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LollipopChart, type LollipopConfig } from "../src/LollipopChart";

// lollipop.md rule 4: EVERY dot carries a direct value label at its outer side.
// That must hold through the reveal, not only at the p=1 hold — the video still is
// captured MID-BUILD. The old gate `clamp01((rp - 0.6)/0.4)` hid the last-staggered
// rows' labels until ~60% of their own growth. The fix fades the label in early
// (`labelReveal`) while it rides the stem's ANIMATED head (right of the dot).
// No highlight → every category label is weight-400, so weight-700 isolates the
// value labels cleanly.
const config: LollipopConfig = {
  title:
    "Library loans per resident vary three-fold across Riverton's branches",
  source: { name: "Riverton library service", url: "https://example.org/x" },
  unit: "loans per resident",
  catField: "branch",
  valField: "loans",
  rows: [
    { branch: "Riverside", loans: 14.2 },
    { branch: "Northgate", loans: 11.8 },
    { branch: "Old Town", loans: 10.5 },
    { branch: "Westhill", loans: 9.1 },
    { branch: "Harbour", loans: 7.3 },
    { branch: "Eastgate", loans: 6.0 },
    { branch: "Fields", loans: 4.4 },
  ],
};

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

describe("LollipopChart — every dot keeps its value label through the reveal", () => {
  const STILL = 0.64;

  it("labels EVERY dot at the mid-build video still (incl. the last-staggered)", () => {
    const markup = renderToStaticMarkup(
      <LollipopChart
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
      <LollipopChart config={config} progress={1} />,
    );
    const ops = valueLabelOpacities(markup);
    expect(ops.length).toBe(7);
    for (const o of ops) expect(o).toBe(1);
  });
});
