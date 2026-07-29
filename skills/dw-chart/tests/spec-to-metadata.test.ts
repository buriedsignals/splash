import { describe, it, expect } from "bun:test";
import {
  specToMetadata,
  resolveData,
  placeAnnotation,
  HIGHLIGHT_MUTED_GREY,
  SCATTER_AXIS_TITLE_CLEARANCE_FRAC,
} from "../src/spec-to-metadata";
import { DEFAULT_BASE_COLOR, type ChartSpec } from "../src/chart-spec";

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

// SOURCE-LABEL i18n — mirrors map-dw (skills/map-dw/src/spec-to-map-metadata.ts +
// its spec-to-map-metadata.test.ts source cases): DW's own auto-rendered "Source:"
// caption prefix does NOT localize via the chart `language`, so a non-English
// deliverable must build its OWN "Source : X" line via `annotate.notes` and blank
// the native describe fields (else the footer shows BOTH captions).
describe("specToMetadata — source i18n", () => {
  it("routes the source through annotate.notes with a localized prefix when lang is non-English", () => {
    const p = specToMetadata({ ...spec, lang: "fr" });
    const d = p.metadata.describe as Record<string, unknown>;
    // The native caption can't be relocalized — suppress it so "Source:" never ships in
    // English on a French chart (else the footer would show BOTH captions).
    expect(d["source-name"]).toBe("");
    expect(d["source-url"]).toBe("");
    const a = p.metadata.annotate as Record<string, unknown>;
    // narrow space before the colon (French typography); the URL rides along in plain
    // text after an em dash, since describe.source-url is blanked on this path.
    expect(a.notes).toBe("Source : ONS — https://ons.gov.uk");
  });

  it("keeps the native source-name/source-url (with its working hyperlink) for English/absent lang", () => {
    const p = specToMetadata(spec);
    const d = p.metadata.describe as Record<string, unknown>;
    // English is DW's own default — its native "Source:" caption already reads correctly,
    // so keep the native field (preserves the clickable hyperlink in the interactive embed).
    expect(d["source-name"]).toBe("ONS");
    expect(d["source-url"]).toBe("https://ons.gov.uk");
    const a = p.metadata.annotate as Record<string, unknown>;
    expect(a.notes).toBe("");

    const en = specToMetadata({ ...spec, lang: "en" });
    expect(en.metadata.describe["source-name"]).toBe("ONS");
    expect((en.metadata.annotate as Record<string, unknown>).notes).toBe("");
  });

  it("localizes the source prefix for German and Italian too (Quelle: / Fonte:)", () => {
    const de = specToMetadata({
      ...spec,
      lang: "de",
      source: { name: "Destatis" },
    }).metadata.annotate as Record<string, unknown>;
    expect(de.notes).toBe("Quelle: Destatis");

    const it_ = specToMetadata({
      ...spec,
      lang: "it",
      source: { name: "Istat" },
    }).metadata.annotate as Record<string, unknown>;
    expect(it_.notes).toBe("Fonte: Istat");
  });

  it("resolves a regional tag to its base language (fr-CH → French label)", () => {
    const p = specToMetadata({ ...spec, lang: "fr-CH" });
    expect(p.metadata.describe["source-name"]).toBe("");
    expect((p.metadata.annotate as Record<string, unknown>).notes).toBe(
      "Source : ONS — https://ons.gov.uk",
    );
  });

  it("no source ⇒ empty notes, regardless of lang", () => {
    const { source, ...noSource } = spec;
    const p = specToMetadata({ ...noSource, lang: "fr" });
    expect((p.metadata.annotate as Record<string, unknown>).notes).toBe("");
    expect(p.metadata.describe["source-name"]).toBe("");
  });

  it("keeps the source URL on a non-English chart instead of dropping it", () => {
    // Deterministic loss, measured: for fr/de/it the native caption is blanked and the
    // self-built annotate.notes line was composed NAME-ONLY, so the URL the journalist gave
    // reached no reader at all.
    const patch = specToMetadata({
      type: "d3-bars",
      title: "T",
      altInsight: "A",
      lang: "fr",
      data: "a,b\n1,2\n",
      source: { name: "OFS", url: "https://www.bfs.admin.ch/x" },
    } as never);
    const notes =
      (patch.metadata as { annotate?: { notes?: string } }).annotate?.notes ??
      "";
    expect(notes).toContain("OFS");
    expect(notes).toContain("https://www.bfs.admin.ch/x");
  });

  it("still says the name alone when there is no URL", () => {
    const patch = specToMetadata({
      type: "d3-bars",
      title: "T",
      altInsight: "A",
      lang: "de",
      data: "a,b\n1,2\n",
      source: { name: "Destatis" },
    } as never);
    const notes =
      (patch.metadata as { annotate?: { notes?: string } }).annotate?.notes ??
      "";
    expect(notes).toBe("Quelle: Destatis");
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

  it("derives annotation y at a quoted, comma-containing x label (RFC 4180 end-to-end)", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: 'period,price\n"Q1, 2020",322600\n"Q4, 2022",442600',
      altInsight: "x",
      annotations: [{ text: "Peak", x: "Q4, 2022" }],
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

describe("specToMetadata — scatter annotations (x and y are DIFFERENT columns)", () => {
  // esperance-vie: x = GDP per capita (col 1), y = life expectancy (col 2), country in
  // col 0 as the point label. A scatter's y is the SECOND numeric column, not "the first
  // value column" the category-x/value-y model reads.
  const SCATTER =
    "country,gdp_per_capita,life_expectancy\n" +
    "Japan,40000,85\n" +
    "Qatar,114000,80\n" +
    "Nigeria,2200,55\n" +
    "France,38000,83\n" +
    "India,2100,70";

  it("derives a scatter annotation's y from the Y column (life expectancy), not the X column (GDP)", () => {
    const p = specToMetadata({
      type: "d3-scatter-plot",
      title: "T",
      data: SCATTER,
      altInsight: "x",
      annotations: [
        { text: "Japon", x: "Japan" },
        { text: "Qatar", x: "Qatar" },
        { text: "Nigeria", x: "Nigeria" },
      ],
    } as any);
    const anns = p.metadata.visualize["text-annotations"] as any[];
    // BUG was: y came back as the GDP values 40000 / 114000 / 2200 (the x column).
    expect(anns.map((a) => a.y)).toEqual(["85", "80", "55"]);
  });

  it("resolves every scatter annotation y INSIDE the y-axis (life-expectancy) domain, never the GDP domain", () => {
    const p = specToMetadata({
      type: "d3-scatter-plot",
      title: "T",
      data: SCATTER,
      altInsight: "x",
      annotations: [
        { text: "Japon", x: "Japan" },
        { text: "Qatar", x: "Qatar" },
        { text: "Nigeria", x: "Nigeria" },
      ],
    } as any);
    const anns = p.metadata.visualize["text-annotations"] as any[];
    for (const a of anns) {
      const y = Number(a.y);
      expect(y).toBeGreaterThanOrEqual(55); // life-expectancy min
      expect(y).toBeLessThanOrEqual(85); // life-expectancy max
    }
  });

  it("writes the numeric X-column value (GDP) so Datawrapper can position a label pinned by name", () => {
    const p = specToMetadata({
      type: "d3-scatter-plot",
      title: "T",
      data: SCATTER,
      altInsight: "x",
      annotations: [
        { text: "Japon", x: "Japan" },
        { text: "Qatar", x: "Qatar" },
        { text: "Nigeria", x: "Nigeria" },
      ],
    } as any);
    const anns = p.metadata.visualize["text-annotations"] as any[];
    // A country name is not a plottable x — the mapper must resolve it to the GDP value.
    expect(anns.map((a) => a.x)).toEqual(["40000", "114000", "2200"]);
  });

  it("pins custom-range-y to the y-column (life-expectancy) domain, not the mixed x+y domain", () => {
    const p = specToMetadata({
      type: "d3-scatter-plot",
      title: "T",
      data: SCATTER,
      altInsight: "x",
      annotations: [{ text: "Japon", x: "Japan", y: 85 }],
    } as any);
    const range = p.metadata.visualize["custom-range-y"] as string[];
    // BUG was [-6782, 120837] — the GDP column polluting the y domain. Correct domain is
    // life-expectancy ~[55, 85] plus a small pad; it must never reach into the GDP range.
    expect(Number(range[0])).toBeGreaterThan(40);
    expect(Number(range[1])).toBeLessThan(120);
  });

  it("honours an explicit numeric x/y and keeps the y in-domain", () => {
    const p = specToMetadata({
      type: "d3-scatter-plot",
      title: "T",
      data: SCATTER,
      altInsight: "x",
      annotations: [{ text: "Japon", x: 40000, y: 85 }],
    } as any);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.x).toBe("40000");
    expect(ann.y).toBe("85");
  });

  it("resolves a scatter with no label column (x = col 0, y = col 1) from the x-value", () => {
    const p = specToMetadata({
      type: "d3-scatter-plot",
      title: "T",
      data: "gdp,life\n40000,85\n2200,55",
      altInsight: "x",
      annotations: [{ text: "rich", x: 40000 }],
    } as any);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.x).toBe("40000");
    expect(ann.y).toBe("85"); // life (col 1), not gdp
  });

  it("THROWS when a scatter annotation derives its y from a non-y column (wrong-column tripwire)", () => {
    // Pinning `column` at the GDP (x) column asks the mapper to read y from GDP — the
    // exact class of bug. The derived y (40000) lands outside the 55–85 axis, so the
    // mechanical domain guard must fail hard rather than ship an off-canvas annotation.
    expect(() =>
      specToMetadata({
        type: "d3-scatter-plot",
        title: "T",
        data: SCATTER,
        altInsight: "x",
        annotations: [{ text: "Japon", x: "Japan", column: "gdp_per_capita" }],
      } as any),
    ).toThrow(/outside the y-axis domain|wrong column/i);
  });

  it("does not regress a single-value column chart annotation (category-x / value-y)", () => {
    const p = specToMetadata({
      type: "column-chart",
      title: "T",
      data: "region,sales\nChina,8.1\nEurope,3.2",
      altInsight: "x",
      annotations: [{ text: "biggest", x: "China" }],
    } as any);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.y).toBe("8.1"); // the single value column, as before
  });
});

describe("specToMetadata — scatter axis-title clearance (QA Wave 11: the Copenhagen occlusion)", () => {
  // Datawrapper's d3-scatter-plot draws the x/y axis titles INLINE at the plot corners
  // (x-title bottom-right, y-title top-left) — a corner-clustered mark ends up HIDDEN behind
  // the title. The one lever the scatter renderer honours is the axis DOMAIN
  // (visualize.y-axis.range, NUMERIC): extending the Y domain past the data on both ends
  // pushes every mark out of the top/bottom corner title bands, for any horizontal
  // distribution. This is the metadata-shape assertion (the standing guard); the live render was
  // manually occlusion-verified (Copenhagen 4.8/0.9 clears the x-title after the fix).
  const CYCLE =
    "city,Cycle lanes per capita,Daily bike trips (m)\n" +
    "Copenhagen,4.8,0.9\nAmsterdam,4.5,1.2\nUtrecht,4.2,1.5\n" +
    "Malmo,3.0,4.0\nBerlin,1.5,7.0\nParis,0.8,10.0\nLondon,0.3,12.9";

  it("pins a NUMERIC y-axis.range that extends the y-column domain on BOTH ends (clears the inline corner titles)", () => {
    const p = specToMetadata({
      type: "d3-scatter-plot",
      title: "Copenhagen leads on cycle lanes",
      data: CYCLE,
      altInsight: "x",
    } as any);
    const yAxis = p.metadata.visualize["y-axis"] as { range: [number, number] };
    expect(yAxis).toBeDefined();
    expect(yAxis.range).toHaveLength(2);
    // NUMERIC, not strings — calculateDomain() reads the bounds via Number.isFinite, so
    // string bounds are silently ignored by the scatter renderer (verified live).
    expect(typeof yAxis.range[0]).toBe("number");
    expect(typeof yAxis.range[1]).toBe("number");
    // y-column (trips) domain is 0.9..12.9 (span 12); the range must extend BELOW 0.9 (to
    // clear the bottom-right x-title) and ABOVE 12.9 (to clear the top-left y-title), by at
    // least the clearance fraction each side.
    const k = SCATTER_AXIS_TITLE_CLEARANCE_FRAC;
    expect(yAxis.range[0]).toBeLessThanOrEqual(0.9 - k * 12 + 1e-6);
    expect(yAxis.range[1]).toBeGreaterThanOrEqual(12.9 + k * 12 - 1e-6);
  });

  it("does NOT read the x-column (cycle lanes) into the y-axis range — the domain is the Y column alone", () => {
    const p = specToMetadata({
      type: "d3-scatter-plot",
      title: "T",
      data: CYCLE,
      altInsight: "x",
    } as any);
    const yAxis = p.metadata.visualize["y-axis"] as { range: [number, number] };
    // x-column (cycle lanes) tops out at 4.8; the y-range must be about the trips column
    // (0.9..12.9 padded), never collapsed onto the x column.
    expect(yAxis.range[1]).toBeGreaterThan(12.9);
  });

  it("sets no y-axis.range on a non-scatter type (the clearance is scatter-specific)", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2020,5\n2023,7",
      altInsight: "x",
    } as any);
    expect(p.metadata.visualize["y-axis"]).toBeUndefined();
  });

  it("preserves a tiny-valued y axis without collapsing it to integers", () => {
    const p = specToMetadata({
      type: "d3-scatter-plot",
      title: "T",
      data: "pt,x,y\nA,1,0.01\nB,2,0.05\nC,3,0.09",
      altInsight: "x",
    } as any);
    const yAxis = p.metadata.visualize["y-axis"] as { range: [number, number] };
    // A 0.01..0.09 axis must NOT round to [0,0]; the padded range stays sub-unit.
    expect(yAxis.range[0]).toBeLessThan(0.01);
    expect(yAxis.range[1]).toBeGreaterThan(0.09);
    expect(yAxis.range[1]).toBeLessThan(1);
  });
});

describe("specToMetadata — highlight → category-keyed custom-colors", () => {
  const rankedBar: ChartSpec = {
    type: "d3-bars",
    title: "Basel has the most hospital beds per capita",
    data: "city,beds\nBern,431\nBasel,812\nZurich,745",
    altInsight: "Basel tops the ranking with 812 beds per 100k residents",
    baseColor: "#E69F00",
    highlight: "Basel",
  };

  it("keys the accent by the CATEGORY VALUE and mutes every other bar to the DW palette grey", () => {
    const patch = specToMetadata(rankedBar);
    expect(patch.metadata.visualize["custom-colors"]).toEqual({
      Basel: "#E69F00",
    });
    expect(patch.metadata.visualize["base-color"]).toBe(HIGHLIGHT_MUTED_GREY);
  });

  it("falls back to the library default accent when no baseColor is set", () => {
    const { baseColor, ...noBase } = rankedBar;
    void baseColor;
    const patch = specToMetadata(noBase);
    expect(patch.metadata.visualize["custom-colors"]).toEqual({
      Basel: DEFAULT_BASE_COLOR,
    });
  });

  it("survives a ranking re-sort — the key is the value, not a row index", () => {
    // sort:"desc" re-orders the rows before upload; a row-index key would now point
    // at a different bar, the category value still points at Basel.
    const patch = specToMetadata({ ...rankedBar, sort: "desc" });
    expect(patch.metadata.visualize["custom-colors"]).toEqual({
      Basel: "#E69F00",
    });
    expect(
      resolveData({ ...rankedBar, sort: "desc" }).split("\n")[1],
    ).toContain("Basel");
  });

  it("keys an RFC4180-quoted, comma-containing category by the exact UNQUOTED value", () => {
    // Datawrapper parses the uploaded CSV, so its category value is the unquoted
    // interior (comma intact) — the custom-colors key must be that exact string, never
    // a quoted/torn fragment, or the accent silently paints nothing.
    const ministry =
      "Ministère de l'Économie, des Finances et de la Souveraineté industrielle et numérique";
    const patch = specToMetadata({
      type: "d3-bars",
      title: "Bercy dwarfs the other ministries' budgets",
      data: `ministère,budget\n"${ministry}",320\nMinistère des Armées,47`,
      altInsight: "Bercy's 320bn budget dwarfs every other ministry's",
      baseColor: "#E69F00",
      highlight: ministry,
    });
    expect(patch.metadata.visualize["custom-colors"]).toEqual({
      [ministry]: "#E69F00",
    });
    expect(patch.metadata.visualize["base-color"]).toBe(HIGHLIGHT_MUTED_GREY);
  });
});
