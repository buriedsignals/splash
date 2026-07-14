import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { contrastRatio, labelInkOnFill } from "../src/core/conformance";
import { COLORS, OKABE_ITO } from "../src/core/tokens";
import {
  MarimekkoChart,
  MK_COLORS,
  type MarimekkoConfig,
} from "../src/MarimekkoChart";
import { STREAM_COLORS } from "../src/StreamgraphChart";
import { BRANCH_COLORS } from "../src/SunburstChart";

const WHITE = "#FFFFFF";
const AA_NORMAL = 4.5; // WCAG SC 1.4.3, normal-size text

// labelInkOnFill is the SINGLE max-contrast rule for a value label printed directly ON
// a coloured mark (marimekko / streamgraph / sunburst / treemap / heatmap cells). It
// must return whichever of {white, ink} has the higher REAL contrast — never a fixed
// luminance-threshold guess, which mis-picks white on mid-luminance Okabe-Ito hues.
describe("labelInkOnFill — max-contrast ink for a label on a coloured fill", () => {
  it("flips to the dark ink token on Okabe-Ito green #009E73 (white 3.42:1 FAILS AA; ink clears it)", () => {
    const fill = OKABE_ITO.green; // #009E73 — the exact fill from w8-krankenhaus-wartezeit-de
    // ground the defect: white on this fill is the failing 3.42:1 pair
    expect(contrastRatio(fill, WHITE)).toBeCloseTo(3.42, 1);
    expect(contrastRatio(fill, WHITE)).toBeLessThan(AA_NORMAL);
    // the helper must therefore pick ink, which clears the AA normal-text threshold
    const chosen = labelInkOnFill(fill);
    expect(chosen).toBe(COLORS.ink);
    expect(contrastRatio(fill, chosen)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("keeps WHITE on a genuinely dark fill (#084594) — never regresses white-on-dark", () => {
    const fill = "#084594"; // ColorBrewer dark blue: white is the higher-contrast option
    const chosen = labelInkOnFill(fill);
    expect(chosen).toBe(WHITE);
    expect(contrastRatio(fill, WHITE)).toBeGreaterThan(
      contrastRatio(fill, COLORS.ink),
    );
    expect(contrastRatio(fill, chosen)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("always returns the higher-contrast of {white, ink} for every Okabe-Ito hue", () => {
    for (const fill of Object.values(OKABE_ITO)) {
      const chosen = labelInkOnFill(fill);
      const other = chosen === WHITE ? COLORS.ink : WHITE;
      expect(contrastRatio(fill, chosen)).toBeGreaterThanOrEqual(
        contrastRatio(fill, other),
      );
    }
  });

  it("every REAL in-fill palette hue (marimekko/streamgraph/sunburst) clears AA with its chosen ink", () => {
    // Bind the invariant to the ACTUAL painted palettes, so a future hue that clears
    // neither white nor ink fails the build — the drift guard these types lack at
    // produce-time (their conformance checks only validate structure, not in-fill
    // label contrast). All are categorical Okabe-Ito → WCAG-conformant by construction.
    const inFillPalettes = [...MK_COLORS, ...STREAM_COLORS, ...BRANCH_COLORS];
    for (const fill of inFillPalettes) {
      expect(contrastRatio(fill, labelInkOnFill(fill))).toBeGreaterThanOrEqual(
        AA_NORMAL,
      );
    }
  });
});

// Grounds the fix at the component level: the FIRST marimekko series maps to
// OKABE_ITO.green (#009E73), so its in-cell % label used to render WHITE (3.42:1).
// After the fix no in-cell value label is painted white on a mid-tone Okabe-Ito fill.
describe("MarimekkoChart — in-cell value labels never white on a mid-tone fill", () => {
  const config: MarimekkoConfig = {
    title: "Revenue mix by region",
    source: { name: "Company filings", url: "https://example.org/x" },
    unit: "share (%)",
    seriesFields: ["Subscriptions", "Ads"], // idx 0 -> green #009E73, idx 1 -> orange
    columns: [
      { label: "Europe", weight: 60, values: [80, 20] },
      { label: "US", weight: 40, values: [70, 30] },
    ],
  };

  function inCellPercentFills(markup: string): string[] {
    const fills: string[] = [];
    for (const m of markup.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
      const [, attrs, text] = m;
      if (!/^\d+%$/.test(text.trim())) continue; // the in-cell "NN%" labels only
      const f = /fill="([^"]+)"/.exec(attrs);
      if (f) fills.push(f[1].toLowerCase());
    }
    return fills;
  }

  it("paints its green/orange in-cell % labels in ink, never the failing white", () => {
    const markup = renderToStaticMarkup(
      <MarimekkoChart config={config} progress={1} width={700} height={460} />,
    );
    const fills = inCellPercentFills(markup);
    expect(fills.length).toBeGreaterThan(0); // labels actually rendered
    expect(fills).not.toContain("#ffffff");
    expect(fills).not.toContain("#fff");
    for (const f of fills) expect(f).toBe(COLORS.ink.toLowerCase());
  });
});
