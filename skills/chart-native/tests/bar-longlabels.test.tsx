import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart, type BarConfig } from "../src/BarChart";

// A horizontal bar's category labels live in the LEFT gutter. A fixed 124px gutter
// clipped long names ("Administration générale…", "Voirie et infrastructures…") with
// an ellipsis. The gutter must widen to fit the longest label so it renders in full.
const longLabels: BarConfig = {
  title: "La voirie pèse le plus dans le budget communal",
  source: { name: "Ville 2025", url: "https://example.org/x" },
  unit: "part du budget (%)",
  catField: "poste",
  valField: "part",
  orientation: "horizontal",
  sort: "desc",
  rows: [
    { poste: "Voirie et infrastructures", part: 28 },
    { poste: "Sécurité et prévention", part: 22 },
    { poste: "Administration générale et finances", part: 19 },
    { poste: "Culture et sports", part: 16 },
    { poste: "Action sociale", part: 15 },
  ],
};

describe("BarChart — long horizontal category labels are not clipped", () => {
  it("renders every long label in full (no ellipsis)", () => {
    const svg = renderToStaticMarkup(
      <BarChart
        config={longLabels}
        responsive={false}
        width={1200}
        height={600}
      />,
    );
    for (const r of longLabels.rows) {
      expect(svg).toContain(String(r.poste));
    }
    // the category labels must not be truncated with an ellipsis
    expect(svg).not.toContain("…");
  });

  it("keeps a short-label horizontal bar's layout unchanged (left gutter = 124)", () => {
    const short: BarConfig = {
      ...longLabels,
      rows: [
        { poste: "Nord", part: 28 },
        { poste: "Sud", part: 22 },
        { poste: "Est", part: 16 },
      ],
    };
    const svg = renderToStaticMarkup(
      <BarChart config={short} responsive={false} width={1200} height={600} />,
    );
    // the plot group is translated by padding.left; for short labels it stays 124
    expect(svg).toContain("translate(124,");
  });
});
