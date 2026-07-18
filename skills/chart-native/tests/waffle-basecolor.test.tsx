import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WaffleChart, type WaffleConfig } from "../src/WaffleChart";
import { OKABE_ITO, WAFFLE_CATEGORY_COLORS } from "../src/core/tokens";

// The PRIMARY (first) category is the chart subject. A declared subject-fit hue must
// PAINT on the subject's cells, not silently fall back to the default palette blue.
// Before the fix, WaffleChart's colorOf hardcoded WAFFLE_CATEGORY_COLORS and the
// config had no baseColor field.
const base: WaffleConfig = {
  title: "Affected households make up a large share",
  source: { name: "Test 2025", url: "https://example.org/x" },
  unit: "share of households (each square = 1%)",
  items: [
    { label: "Affected", value: 42 },
    { label: "Other", value: 58 },
  ],
};

describe("WaffleChart — baseColor (primary category subject fit)", () => {
  it("paints the subject-fit hue on the primary category, not the default blue", () => {
    const svg = renderToStaticMarkup(
      <WaffleChart
        config={{ ...base, baseColor: OKABE_ITO.purple }}
        responsive={false}
      />,
    );
    expect(svg).toContain(OKABE_ITO.purple);
    // the second (remainder) category keeps the palette
    expect(svg).toContain(WAFFLE_CATEGORY_COLORS[1]);
  });

  it("falls back to the default palette when no baseColor is given", () => {
    const svg = renderToStaticMarkup(
      <WaffleChart config={base} responsive={false} />,
    );
    expect(svg).toContain(WAFFLE_CATEGORY_COLORS[0]);
  });
});
