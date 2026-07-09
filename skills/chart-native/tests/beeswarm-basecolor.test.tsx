import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BeeswarmChart, type BeeswarmConfig } from "../src/BeeswarmChart";
import { OKABE_ITO } from "../src/core/tokens";

// A single-hue swarm must PAINT its subject-fit baseColor (a housing rent-dispersion
// story is amber, never the default blue). Before the fix, colorOf hardcoded blue for
// uncategorized points and BeeswarmConfig had no baseColor field.
const base: BeeswarmConfig = {
  title: "Les loyers se dispersent fortement entre communes",
  source: { name: "OCSTAT 2025", url: "https://example.org/x" },
  valueLabel: "loyer mensuel (CHF)",
  points: [
    { value: 1500, label: "Onex" },
    { value: 1700, label: "Meyrin" },
    { value: 1900, label: "Carouge" },
    { value: 2400, label: "Vernier" },
    { value: 3900, label: "Genthod" },
    { value: 4200, label: "Cologny" },
  ],
};

describe("BeeswarmChart — baseColor (single-hue subject fit)", () => {
  it("paints the amber baseColor, not the default blue", () => {
    const svg = renderToStaticMarkup(
      <BeeswarmChart
        config={{ ...base, baseColor: OKABE_ITO.orange }}
        responsive={false}
      />,
    );
    expect(svg).toContain(`fill="${OKABE_ITO.orange}"`);
    expect(svg).not.toContain(`fill="${OKABE_ITO.blue}"`);
  });

  it("falls back to the Okabe-Ito blue default when baseColor is absent", () => {
    const svg = renderToStaticMarkup(
      <BeeswarmChart config={base} responsive={false} />,
    );
    expect(svg).toContain(`fill="${OKABE_ITO.blue}"`);
  });

  it("emphasizes the named outliers with a direct ink name+value label", () => {
    const svg = renderToStaticMarkup(
      <BeeswarmChart
        config={{
          ...base,
          baseColor: OKABE_ITO.orange,
          highlight: ["Cologny", "Genthod"],
        }}
        responsive={false}
      />,
    );
    // the outlier label carries name + FULL localized value (rendered in ink, not the
    // hue). No lang → English grouping "4,200".
    expect(svg).toContain("Cologny 4,200");
    expect(svg).toContain("Genthod 3,900");
    // the ink fill (#1A1A1A) carries the value; the amber hue stays on the mark
    expect(svg).toContain('fill="#1A1A1A"');
  });
});
