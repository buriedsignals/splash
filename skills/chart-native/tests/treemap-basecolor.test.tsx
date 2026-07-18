import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TreemapChart, type TreemapConfig } from "../src/TreemapChart";
import { OKABE_ITO } from "../src/core/tokens";

// A FLAT (ungrouped) treemap paints every cell one subject hue. A declared subject-fit
// colour must PAINT, not silently fall back to OKABE_ITO.blue. Before the fix, colorOf
// hardcoded OKABE_ITO.blue for the ungrouped case and the config had no baseColor field.
const base: TreemapConfig = {
  title: "Housing dominates the budget",
  source: { name: "Test 2025", url: "https://example.org/x" },
  unit: "spending (millions)",
  items: [
    { label: "Housing", value: 120 },
    { label: "Transport", value: 80 },
    { label: "Education", value: 60 },
  ],
};

describe("TreemapChart — baseColor (flat subject fit)", () => {
  it("paints the subject-fit hue on a flat treemap, not the default blue", () => {
    const svg = renderToStaticMarkup(
      <TreemapChart
        config={{ ...base, baseColor: OKABE_ITO.purple }}
        responsive={false}
      />,
    );
    expect(svg).toContain(OKABE_ITO.purple);
    expect(svg).not.toContain(OKABE_ITO.blue);
  });

  it("falls back to OKABE_ITO.blue when no baseColor is given", () => {
    const svg = renderToStaticMarkup(
      <TreemapChart config={base} responsive={false} />,
    );
    expect(svg).toContain(OKABE_ITO.blue);
  });
});
