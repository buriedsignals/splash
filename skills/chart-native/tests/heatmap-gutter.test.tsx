import { describe, it, expect } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HeatmapChart } from "../src/HeatmapChart";

// The heatmap's left row-label gutter is MEASURED to the widest row label (leftLabelGutterPx), not a
// fixed 52px offset. The fixed offset clipped long row names ("Vendredi", "Dimanche") off the frame's
// LEFT edge into the page background (a WCAG-guard fail that forced the source labels to be SHORTENED
// to fit). The gutter now grows to fit, so a reasonable long label renders IN FULL — the data is
// never shortened to fit the layout (the slope/dumbbell/dot-strip rule, extended to the heatmap).
const sample = {
  title: "ER median wait by day and time-band",
  unit: "minutes",
  source: { name: "Dispatch log", url: "https://example.org/x" },
  rowField: "day",
  colFields: ["00-06", "06-12", "12-18", "18-24"],
  rows: [
    { day: "Lundi", "00-06": 34, "06-12": 26, "12-18": 48, "18-24": 72 },
    { day: "Vendredi", "00-06": 44, "06-12": 32, "12-18": 58, "18-24": 88 },
    { day: "Dimanche", "00-06": 70, "06-12": 42, "12-18": 60, "18-24": 96 },
  ],
};

function render(rowLabels: string[]): string {
  const rows = sample.rows.map((r, i) => ({ ...r, day: rowLabels[i] }));
  return renderToStaticMarkup(
    createElement(HeatmapChart, {
      config: { ...sample, rows },
      progress: 1,
      width: 900,
      height: 480,
    }),
  );
}

describe("heatmap row-label gutter — measured to fit, never shortens the data", () => {
  it("renders long day names (Vendredi, Dimanche) IN FULL — no truncation, no overflow", () => {
    const markup = render(["Lundi", "Vendredi", "Dimanche"]);
    // the full labels appear (the gutter grew to fit) — NOT a truncated stub like "V…" / "Dim".
    expect(markup).toContain("Vendredi");
    expect(markup).toContain("Dimanche");
    expect(markup).not.toContain("V…");
    expect(markup).not.toContain("Dim…");
  });

  it("still renders short labels (no regression on the floored layout)", () => {
    const markup = render(["Lun", "Ven", "Dim"]);
    expect(markup).toContain(">Lun<");
    expect(markup).toContain(">Ven<");
  });

  it("truncates only a PATHOLOGICAL over-cap label (with an ellipsis), never silently drops it", () => {
    // a ~60-char row label exceeds the ~42% gutter cap → it is truncated at render WITH an ellipsis
    // (a visible, bounded degradation), rather than overflowing off the frame edge.
    const long =
      "Vendredi soir aux urgences du centre hospitalier régional universitaire";
    const markup = render(["Lundi", long, "Dimanche"]);
    expect(markup).toContain("…"); // truncated visibly, not overflowed
  });
});
