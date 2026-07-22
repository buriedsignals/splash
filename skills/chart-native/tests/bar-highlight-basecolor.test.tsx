import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart, type BarConfig } from "../src/BarChart";
import { COLORS, OKABE_ITO } from "../src/core/tokens";

// A highlighted bar must PAINT the subject-fit colour the journalist approved in
// the spec (baseColor), like every other chart-native type (precedent: the bump
// fix in bar-basecolor's sibling tests/bump-basecolor.test.tsx). Before the fix,
// BarChart's barColor() discarded baseColor whenever highlightIndex was set and
// hardcoded OKABE_ITO.orange — a tourism story whose approved hue was #CC79A7
// (purple/pink) shipped an ORANGE bar (QA Wave 8). The rule: the highlighted bar
// keeps the PRIMARY (baseColor ?? default); the emphasis comes from MUTING the
// context bars, never from overriding the subject hue.

const rows = [
  { region: "Savoie", nights: 34.2 },
  { region: "Haute-Savoie", nights: 28.7 },
  { region: "Ain", nights: 9.1 },
];

function config(overrides: Partial<BarConfig> = {}): BarConfig {
  return {
    title: "Savoie draws a third of the region's tourist nights",
    source: { name: "Insee 2025", url: "https://example.org/x" },
    unit: "millions of nights",
    catField: "region",
    valField: "nights",
    orientation: "horizontal",
    sort: "desc",
    rows,
    ...overrides,
  };
}

/** All <rect class="bar"> fills from the rendered SVG, in DOM order. */
function barFills(markup: string): string[] {
  const fills: string[] = [];
  for (const m of markup.matchAll(/<rect\b[^>]*class="bar"[^>]*>/g)) {
    const f = /fill="([^"]+)"/.exec(m[0]);
    if (f) fills.push(f[1]);
  }
  return fills;
}

describe("BarChart — highlight honours baseColor", () => {
  it("paints the highlighted bar in the subject-fit baseColor, never the hardcoded orange", () => {
    const markup = renderToStaticMarkup(
      <BarChart
        config={config({ highlightIndex: 0, baseColor: OKABE_ITO.purple })}
        progress={1}
      />,
    );
    const fills = barFills(markup);
    expect(fills.length).toBe(3);
    expect(fills[0]).toBe(OKABE_ITO.purple);
    expect(fills).not.toContain(OKABE_ITO.orange);
  });

  it("mutes the context bars when a bar is highlighted (contrast comes from muting)", () => {
    const markup = renderToStaticMarkup(
      <BarChart
        config={config({ highlightIndex: 0, baseColor: OKABE_ITO.purple })}
        progress={1}
      />,
    );
    const fills = barFills(markup);
    // tinted neutral (S3): baseColor (purple) now threads into themeColors(), so the
    // context bars' muted grey is hue-tinted toward the subject colour, not the static
    // COLORS.muted. Value = themeColors(undefined, OKABE_ITO.purple).muted.
    expect(fills[1]).toBe("#79646f");
    expect(fills[2]).toBe("#79646f");
  });

  it("falls back to the default primary for the highlighted bar when no baseColor is set", () => {
    const markup = renderToStaticMarkup(
      <BarChart config={config({ highlightIndex: 1 })} progress={1} />,
    );
    const fills = barFills(markup);
    expect(fills[1]).toBe(COLORS.line);
    expect(fills[0]).toBe(COLORS.muted);
    expect(fills[2]).toBe(COLORS.muted);
    expect(fills).not.toContain(OKABE_ITO.orange);
  });

  it("keeps the whole series in the primary when nothing is highlighted (unchanged)", () => {
    const markup = renderToStaticMarkup(
      <BarChart config={config({ baseColor: OKABE_ITO.green })} progress={1} />,
    );
    const fills = barFills(markup);
    for (const f of fills) expect(f).toBe(OKABE_ITO.green);
  });
});
