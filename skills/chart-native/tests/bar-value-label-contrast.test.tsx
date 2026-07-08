import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart, type BarConfig } from "../src/BarChart";
import { COLORS, OKABE_ITO } from "../src/core/tokens";

// A highlighted bar's MARK is OKABE_ITO.orange (#E69F00 = 2.25:1 on white). Painting
// the value LABEL in that same colour is a WCAG failure the snap-contrast produce guard
// rejects (whole run exits 1 → the journalist gets nothing). The label must carry the
// value in ink; only the mark carries the hue. Emphasis stays on the bar fill + weight.
const config: BarConfig = {
  title: "Brazil leads big economies on renewable electricity",
  source: { name: "Ember 2025", url: "https://example.org/x" },
  unit: "share (%)",
  catField: "country",
  valField: "share",
  orientation: "horizontal",
  sort: "desc",
  highlightIndex: 0, // the top bar is accented (orange mark)
  rows: [
    { country: "Brazil", share: 87.3 },
    { country: "Canada", share: 64.3 },
    { country: "India", share: 19.8 },
  ],
};

// Value labels are the only <text> carrying font-weight 600 (category + axis labels
// have no weight) — collect their fills from the rendered SVG opening tags.
function valueLabelFills(markup: string): string[] {
  const fills: string[] = [];
  for (const m of markup.matchAll(/<text\b[^>]*>/g)) {
    const tag = m[0];
    if (!/font-weight="600"/.test(tag)) continue;
    const f = /fill="([^"]+)"/.exec(tag);
    if (f) fills.push(f[1].toLowerCase());
  }
  return fills;
}

describe("BarChart — value-label contrast", () => {
  it("renders every value label in ink even when a bar is highlighted (never the mark colour)", () => {
    const markup = renderToStaticMarkup(
      <BarChart config={config} progress={1} />,
    );
    const fills = valueLabelFills(markup);
    expect(fills.length).toBe(3); // one label per bar
    // the accented bar's mark hue must NOT bleed into a text fill
    expect(fills).not.toContain(OKABE_ITO.orange.toLowerCase());
    // every value label is ink (WCAG ≥ 4.5:1 on white)
    for (const f of fills) expect(f).toBe(COLORS.ink.toLowerCase());
  });

  it("keeps the highlighted bar's MARK orange (emphasis stays on the fill)", () => {
    const markup = renderToStaticMarkup(
      <BarChart config={config} progress={1} />,
    );
    // the <rect> bar fill still carries the accent hue
    expect(markup).toContain(`fill="${OKABE_ITO.orange}"`);
  });
});
