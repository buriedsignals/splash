import { describe, it, expect } from "bun:test";
import {
  specToMetadata,
  resolveData,
  placeAnnotation,
} from "../src/spec-to-metadata";
import type { ChartSpec } from "../src/chart-spec";

// case2 median-home-price series in fractional plot coords (y=0 top=max value).
// max 442600, min 275200, span 167400. Indices 0..7 over xFrac i/7.
const CASE2_POLY = [
  ["2014-Q1", 275200],
  ["2020-Q1", 322600],
  ["2021-Q1", 355000],
  ["2022-Q1", 433100],
  ["2022-Q4", 442600],
  ["2023-Q1", 429000],
  ["2024-Q1", 420800],
  ["2026-Q1", 403200],
].map(([, v], i, arr) => ({
  xFrac: i / (arr.length - 1),
  yFrac: (442600 - (v as number)) / 167400,
}));
const yFracOf = (v: number) => (442600 - v) / 167400;

const spec: ChartSpec = {
  type: "d3-lines",
  title: "Unemployment is at a five-year low",
  intro: "Rate fell steadily after 2021",
  data: "year,value\n2018,5.1\n2023,3.7",
  baseColor: "#0072B2",
  valueLabels: true,
  numberFormat: "0,0.[0]",
  source: { name: "ONS", url: "https://ons.gov.uk" },
  altInsight: "Unemployment fell from 5.1% in 2018 to 3.7% in 2023",
};

describe("specToMetadata — locale / language", () => {
  it("sets the DW chart language to fr-FR when spec.lang is 'fr' (DW localizes numbers + dates)", () => {
    const patch = specToMetadata({ ...spec, lang: "fr" });
    expect(patch.language).toBe("fr-FR");
  });
  it("passes a regional tag through unchanged", () => {
    const patch = specToMetadata({ ...spec, lang: "fr-CH" });
    expect(patch.language).toBe("fr-CH");
  });
  it("maps 'en' to en-US", () => {
    const patch = specToMetadata({ ...spec, lang: "en" });
    expect(patch.language).toBe("en-US");
  });
  it("omits language when spec.lang is absent (DW default locale)", () => {
    const patch = specToMetadata(spec);
    expect(patch.language).toBeUndefined();
  });
});

describe("placeAnnotation (width-invariant, data-space)", () => {
  it("places a PEAK label above the point and asks for top headroom (never on the curve)", () => {
    // 2022-Q4 is the max (yFrac 0). Only the 'up' quadrants clear the descending arms.
    const p = placeAnnotation(CASE2_POLY, 4 / 7, 0);
    expect(p.align[0]).toBe("b"); // DW anchor bottom => text ABOVE the point
    expect(p.headroomTopFrac).toBeGreaterThan(0); // needs whitespace above the max
    expect(p.headroomBottomFrac).toBe(0);
  });

  it("places the case2 pre-pandemic label so it clears the rising curve (extends over the calmer left side)", () => {
    // 2020-Q1 (idx1). To the RIGHT the curve rises above the point (would be on-line);
    // extending LEFT over the lower 2014→2020 segment is clear => anchor right ("_r").
    const p = placeAnnotation(CASE2_POLY, 1 / 7, yFracOf(322600));
    expect(p.align[1]).toBe("r");
  });

  it("never returns a placement whose box sits on the series line", () => {
    for (const [x, y] of [
      [1 / 7, yFracOf(322600)],
      [4 / 7, 0],
      [2 / 7, yFracOf(355000)],
    ] as const) {
      const p = placeAnnotation(CASE2_POLY, x, y);
      // Reconstruct the chosen box and assert the curve does not cross its interior.
      const up = p.align[0] === "b";
      const hFrac = 0.09;
      const span = 0.42;
      const from =
        p.align[1] === "r" ? -span : p.align[1] === "l" ? 0 : -span / 2;
      const box = {
        xL: x + from,
        xR: x + from + span,
        top: up ? y - hFrac : y,
        bottom: up ? y : y + hFrac,
      };
      const crosses = CASE2_POLY.some((_, i) => {
        if (i + 1 >= CASE2_POLY.length) return false;
        const a = CASE2_POLY[i];
        const b = CASE2_POLY[i + 1];
        for (let s = 0; s <= 24; s++) {
          const px = a.xFrac + ((b.xFrac - a.xFrac) * s) / 24;
          const py = a.yFrac + ((b.yFrac - a.yFrac) * s) / 24;
          if (
            px > box.xL + 0.01 &&
            px < box.xR - 0.01 &&
            py > box.top + 0.01 &&
            py < box.bottom - 0.01
          )
            return true;
        }
        return false;
      });
      expect(crosses).toBe(false);
    }
  });

  it("clears ALL series on a multi-series chart, not just the annotated one (F6)", () => {
    // Two lines: A rises, B falls, crossing in the middle. An annotation anchored on A
    // near the crossing must not be placed onto B either. Passing BOTH polylines, the
    // chosen box must clear both.
    const A = [
      { xFrac: 0, yFrac: 0.6 },
      { xFrac: 1, yFrac: 0.6 },
    ]; // annotated line (flat, mid-low)
    const B = [
      { xFrac: 0, yFrac: 0.53 },
      { xFrac: 1, yFrac: 0.53 },
    ]; // sibling line just ABOVE A (within one label-height) — the obstacle
    const anchor = { x: 0.5, y: 0.6 }; // a point on A
    // With A alone the label prefers UP; B sits in the up-box, so seeing BOTH lines it
    // must go DOWN. This is exactly the multi-series clearance F6 adds.
    const p = placeAnnotation([A, B], anchor.x, anchor.y);
    expect(p.align[0]).toBe("t"); // forced DOWN by the sibling line B
    // Reconstruct the chosen box and assert NEITHER line crosses its interior.
    const up = p.align[0] === "b";
    const hFrac = 0.09;
    const span = 0.42;
    const from =
      p.align[1] === "r" ? -span : p.align[1] === "l" ? 0 : -span / 2;
    const box = {
      xL: anchor.x + from,
      xR: anchor.x + from + span,
      top: up ? anchor.y - hFrac : anchor.y,
      bottom: up ? anchor.y : anchor.y + hFrac,
    };
    const crosses = (line: { xFrac: number; yFrac: number }[]) =>
      line.some((_, i) => {
        if (i + 1 >= line.length) return false;
        const a = line[i];
        const b = line[i + 1];
        for (let s = 0; s <= 24; s++) {
          const px = a.xFrac + ((b.xFrac - a.xFrac) * s) / 24;
          const py = a.yFrac + ((b.yFrac - a.yFrac) * s) / 24;
          if (
            px > box.xL + 0.01 &&
            px < box.xR - 0.01 &&
            py > box.top + 0.01 &&
            py < box.bottom - 0.01
          )
            return true;
        }
        return false;
      });
    expect(crosses(A)).toBe(false);
    expect(crosses(B)).toBe(false);
  });

  it("places a TROUGH label below the point and asks for bottom headroom", () => {
    // A V shape: high, low (trough at idx1), high. Only 'down' clears the arms.
    const vShape = [
      { xFrac: 0, yFrac: 0 },
      { xFrac: 0.5, yFrac: 1 },
      { xFrac: 1, yFrac: 0 },
    ];
    const p = placeAnnotation(vShape, 0.5, 1);
    expect(p.align[0]).toBe("t"); // DW anchor top => text BELOW the point
    expect(p.headroomBottomFrac).toBeGreaterThan(0);
    expect(p.headroomTopFrac).toBe(0);
  });
});

describe("specToMetadata", () => {
  it("maps title and type at the top level", () => {
    const p = specToMetadata(spec);
    expect(p.title).toBe(spec.title);
    expect(p.type).toBe("d3-lines");
  });
  it("puts the insight in describe.intro and alt in aria-description (WCAG)", () => {
    const p = specToMetadata(spec);
    expect(p.metadata.describe["intro"]).toBe("Rate fell steadily after 2021");
    expect(p.metadata.describe["aria-description"]).toBe(spec.altInsight);
  });
  it("cites the source and the number format", () => {
    const p = specToMetadata(spec);
    expect(p.metadata.describe["source-name"]).toBe("ONS");
    expect(p.metadata.describe["source-url"]).toBe("https://ons.gov.uk");
    expect(p.metadata.describe["number-format"]).toBe("0,0.[0]");
  });
  it("applies the base colour (a line chart keeps Datawrapper's own labelling)", () => {
    const p = specToMetadata(spec);
    expect(p.metadata.visualize["base-color"]).toBe("#0072B2");
    // Line charts are not routed through the bar/column value-label mapper, so the
    // old no-op `value-labels` field is gone (it was ignored by every DW engine).
    expect(p.metadata.visualize["value-labels"]).toBeUndefined();
    expect(p.metadata.visualize["valueLabels"]).toBeUndefined();
  });
  it("routes numberFormat to value-label-format (bar labels ignore describe.number-format)", () => {
    const p = specToMetadata({ ...spec, numberFormat: "0.[0]%" });
    expect(p.metadata.visualize["value-label-format"]).toBe("0.[0]%");
  });
  it("omits value-label-format when no numberFormat is given", () => {
    const { numberFormat, ...noFmt } = spec;
    const p = specToMetadata(noFmt);
    expect(p.metadata.visualize["value-label-format"]).toBeUndefined();
  });
  it("omits optional fields when absent", () => {
    const p = specToMetadata({
      type: "column-chart",
      title: "T",
      data: "a,b\n1,2",
      altInsight: "x",
    });
    expect(p.metadata.visualize["base-color"]).toBeUndefined();
    expect(p.metadata.describe["number-format"]).toBe("0,0.[00]");
    expect((p.metadata as any).data).toBeUndefined();
  });

  it("defaults number-format when absent", () => {
    const p = specToMetadata({
      type: "d3-bars",
      title: "T",
      data: "a,b\n1,2",
      altInsight: "x",
    } as any);
    expect(p.metadata.describe["number-format"]).toBe("0,0.[00]");
  });
  it("maps seriesColors to visualize['custom-colors']", () => {
    const p = specToMetadata({
      ...spec,
      seriesColors: { Coal: "#0072B2", Gas: "#E69F00", Renewables: "#009E73" },
    } as any);
    expect(p.metadata.visualize["custom-colors"]).toEqual({
      Coal: "#0072B2",
      Gas: "#E69F00",
      Renewables: "#009E73",
    });
  });
  it("re-keys seriesColors through seriesLabels so colours match the renamed series", () => {
    // FINDING 1: DW keys custom-colors by the series name in the UPLOADED data, and
    // resolveData renames headers via seriesLabels before upload. Colours keyed to the
    // ORIGINAL machine names must be re-keyed to the renamed labels, or DW drops the
    // whole map and falls back to its default all-blue ramp (referendum/recyclage/inflation).
    const p = specToMetadata({
      type: "multiple-lines",
      title: "Energy prices rose fastest in the 2022 shock",
      data: "year,cpi_food,cpi_energy,cpi_housing\n2020,100,100,100\n2022,111,140,108",
      seriesLabels: {
        cpi_food: "Food",
        cpi_energy: "Energy",
        cpi_housing: "Housing",
      },
      seriesColors: {
        cpi_food: "#E69F00",
        cpi_energy: "#D55E00",
        cpi_housing: "#0072B2",
      },
      altInsight: "Energy rose 40% by 2022 vs 11% for food",
    } as any);
    // Keys are the RENAMED series names (what DW sees in the data), values preserved.
    expect(p.metadata.visualize["custom-colors"]).toEqual({
      Food: "#E69F00",
      Energy: "#D55E00",
      Housing: "#0072B2",
    });
  });
  it("leaves already-display-named seriesColors keys untouched (partial / no rename)", () => {
    // A seriesColors key NOT present in seriesLabels is already a display name and must
    // pass through unchanged, so a mixed map still resolves fully.
    const p = specToMetadata({
      type: "multiple-lines",
      title: "T",
      data: "year,cpi_food,Housing\n2020,100,100\n2022,111,108",
      seriesLabels: { cpi_food: "Food" },
      seriesColors: { cpi_food: "#E69F00", Housing: "#0072B2" },
      altInsight: "x",
    } as any);
    expect(p.metadata.visualize["custom-colors"]).toEqual({
      Food: "#E69F00",
      Housing: "#0072B2",
    });
  });
  it("maps transpose:true to metadata.data.transpose === true", () => {
    const p = specToMetadata({ ...spec, transpose: true } as any);
    expect((p.metadata as any).data?.transpose).toBe(true);
  });
  it("omits metadata.data when transpose is not defined", () => {
    const p = specToMetadata(spec);
    expect((p.metadata as any).data).toBeUndefined();
  });
  it("maps annotations to visualize text-annotations", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2021,5",
      altInsight: "x",
      annotations: [{ text: "Peak", x: "2021", y: 5 }],
    } as any);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.text).toBe("Peak");
    expect(ann.x).toBe("2021");
    expect(String(ann.y)).toBe("5");
  });

  it("renames machine column headers to human labels (series direct label)", () => {
    const csv = resolveData({
      type: "d3-lines",
      title: "T",
      data: "period,median_home_price_usd\n2020-Q1,322600",
      altInsight: "x",
      seriesLabels: { median_home_price_usd: "Median home price" },
    } as any);
    expect(csv).toBe("period,Median home price\n2020-Q1,322600");
  });

  it("derives a missing annotation y from the data at x (DW drops y-less annotations)", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "period,price\n2020-Q1,322600\n2022-Q4,442600",
      altInsight: "x",
      annotations: [{ text: "Peak", x: "2022-Q4" }],
    } as any);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.y).toBe("442600");
  });

  it("derives annotation y against the RENAMED series column", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "period,median_home_price_usd\n2022-Q4,442600",
      altInsight: "x",
      seriesLabels: { median_home_price_usd: "Median home price" },
      annotations: [
        { text: "Peak", x: "2022-Q4", column: "median_home_price_usd" },
      ],
    } as any);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.y).toBe("442600");
  });

  it("places annotations in DATA space with zero pixel offsets (responsive-safe)", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2020,5000\n2026,7170",
      altInsight: "x",
      annotations: [{ text: "Sawe", x: "2026", y: 7170, align: "tr" }],
    } as any);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    // NO absolute pixel nudges — the whole responsive bug was baking px dx/dy that
    // clear the curve at one width and clip/collide at every other. Placement is the
    // data-space anchor (x,y) + a clear-side align + axis headroom instead.
    expect(ann.dx).toBe(0);
    expect(ann.dy).toBe(0);
    expect(ann.connectorLine.enabled).toBe(true);
    expect(typeof ann.align).toBe("string");
  });

  it("extends the y-axis (custom-range-y) so a peak label has whitespace above it", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "period,price\n2020-Q1,322600\n2022-Q1,433100\n2022-Q4,442600\n2026-Q1,403200",
      altInsight: "x",
      annotations: [{ text: "Peak: $442,600", x: "2022-Q4", y: 442600 }],
    } as any);
    const range = p.metadata.visualize["custom-range-y"] as string[];
    expect(range).toHaveLength(2);
    // The peak sits at the data max (442600) → the axis top must be extended ABOVE it
    // so the "above the peak" label lands in real whitespace (not clipped) at any width.
    expect(Number(range[1])).toBeGreaterThan(442600);
    expect(Number(range[0])).toBeLessThanOrEqual(322600);
  });

  it("adds no custom-range-y when there are no annotations", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2020,5\n2023,7",
      altInsight: "x",
    } as any);
    expect(p.metadata.visualize["custom-range-y"]).toBeUndefined();
  });

  it("does not map annotations onto a pie chart's metadata (DW has no text-annotation layer there — validateChartSpec warns instead)", () => {
    const p = specToMetadata({
      type: "d3-pies",
      title: "T",
      data: "region,sales\nChina,8.1\nEurope,3.2",
      altInsight: "x",
      annotations: [{ text: "biggest slice", x: "China", y: 8.1 }],
    } as any);
    expect(p.metadata.visualize["text-annotations"]).toBeUndefined();
    expect(p.metadata.visualize["custom-range-y"]).toBeUndefined();
  });

  it("does not map annotations onto a table's metadata (no plot to anchor to)", () => {
    const p = specToMetadata({
      type: "tables",
      title: "T",
      data: "region,sales\nChina,8.1\nEurope,3.2",
      altInsight: "x",
      annotations: [{ text: "note", x: "China", y: 8.1 }],
    } as any);
    expect(p.metadata.visualize["text-annotations"]).toBeUndefined();
  });

  it("still maps annotations for a chart type that supports them (vertical column)", () => {
    // A vertical column chart IS the category-x / numeric-y model the placement mapper is
    // built for, so annotations map (and place) correctly there.
    const p = specToMetadata({
      type: "column-chart",
      title: "T",
      data: "region,sales\nChina,8.1\nEurope,3.2",
      altInsight: "x",
      annotations: [{ text: "outlier", x: "China", y: 8.1 }],
    } as any);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.text).toBe("outlier");
  });

  it("does NOT map annotations onto a horizontal bar chart (#5 — coord model mismatch, dropped by DW)", () => {
    // d3-bars is horizontal (category-y, value-x); this mapper emits column/line coords
    // (category-x, value-y), which Datawrapper's bar annotation layer silently drops
    // (verified via a rendered export). Skip the dead mapping; validateChartSpec warns.
    const p = specToMetadata({
      type: "d3-bars",
      title: "T",
      data: "region,sales\nChina,8.1\nEurope,3.2",
      altInsight: "x",
      annotations: [{ text: "outlier", x: "China", y: 8.1 }],
    } as any);
    expect(p.metadata.visualize["text-annotations"]).toBeUndefined();
  });

  // d3-arrow-plot: LIVE-REPRODUCED bug — before this type was added to
  // ANNOTATION_UNMAPPED_BAR_TYPES, validateChartSpec passed this exact spec (ok:true, 0
  // warnings) and produceChart's responsive guardrail then threw at every viewport width
  // (340/600/1200px). Same category-y/value-x layout as d3-bars (ROW_DRIVEN_TYPES,
  // export-aspect.ts), so the mapping must be skipped the same way.
  it("does NOT map annotations onto a d3-arrow-plot (value-x/category-y, like d3-bars)", () => {
    const p = specToMetadata({
      type: "d3-arrow-plot",
      title: "T",
      data: "region,y2018,y2023\nNorth East,180,280\nLondon,420,470",
      altInsight: "x",
      annotations: [{ text: "outlier", x: "North East", y: 280 }],
    } as any);
    expect(p.metadata.visualize["text-annotations"]).toBeUndefined();
  });

  it("does NOT map annotations onto a d3-dot-plot (value-x/category-y)", () => {
    const p = specToMetadata({
      type: "d3-dot-plot",
      title: "T",
      data: "region,sales\nChina,8.1\nEurope,3.2",
      altInsight: "x",
      annotations: [{ text: "outlier", x: "China", y: 8.1 }],
    } as any);
    expect(p.metadata.visualize["text-annotations"]).toBeUndefined();
  });

  it("does NOT map annotations onto a d3-range-plot (value-x/category-y)", () => {
    const p = specToMetadata({
      type: "d3-range-plot",
      title: "T",
      data: "region,lo,hi\nChina,3.2,8.1\nEurope,1.1,4.4",
      altInsight: "x",
      annotations: [{ text: "outlier", x: "China", y: 8.1 }],
    } as any);
    expect(p.metadata.visualize["text-annotations"]).toBeUndefined();
  });

  it("routes valueFormat to the y-grid axis format (e.g. h:mm:ss)", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2026,7170",
      altInsight: "x",
      valueFormat: "00:00:00",
    } as any);
    expect(p.metadata.visualize["y-grid-format"]).toBe("00:00:00");
  });

  it("falls back to numberFormat for the axis when valueFormat is absent", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2026,7170",
      altInsight: "x",
      numberFormat: "$0,0",
    } as any);
    expect(p.metadata.visualize["y-grid-format"]).toBe("$0,0");
  });
});
