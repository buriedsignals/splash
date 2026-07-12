import { describe, it, expect } from "bun:test";
import {
  validateChartSpec,
  normalizeNumberFormat,
  isPercentScaleMismatch,
  numericValuesOf,
  OKABE_ITO,
  DEFAULT_BASE_COLOR,
} from "../src/chart-spec";

describe("normalizeNumberFormat", () => {
  it("passes a valid Datawrapper token through unchanged", () => {
    for (const t of ["0.0", "0.00", "0,0", "0%", "$0,0", "0.[00]", "0a"])
      expect(normalizeNumberFormat(t)).toBe(t);
  });
  it("translates printf/Python float tokens (the .1f bug that shipped '.40')", () => {
    expect(normalizeNumberFormat(".1f")).toBe("0.0");
    expect(normalizeNumberFormat(".2f")).toBe("0.00");
    expect(normalizeNumberFormat(".0f")).toBe("0");
    expect(normalizeNumberFormat(",.2f")).toBe("0,0.00");
    expect(normalizeNumberFormat("d")).toBe("0");
  });
  it("passes valid exotic tokens through (duration, currency-abbrev)", () => {
    expect(normalizeNumberFormat("00:00:00")).toBe("00:00:00");
    expect(normalizeNumberFormat("$0,0a")).toBe("$0,0a");
  });
  it("throws (fails loud) on a clear printf leftover it cannot map", () => {
    expect(() => normalizeNumberFormat("%s")).toThrow(/invalid numberFormat/i);
    expect(() => normalizeNumberFormat(".3e")).toThrow(/invalid numberFormat/i);
  });
});

describe("validateChartSpec — numberFormat token", () => {
  const barBase = {
    type: "d3-bars",
    title: "North East rents rose fastest",
    data: "region,pct\nNorth East,8.4\nLondon,2.8",
    altInsight: "North East rents rose 8.4% vs London 2.8%",
  };
  it("warns (not errors) when a printf token is auto-corrected", () => {
    const r = validateChartSpec({ ...barBase, numberFormat: ".1f" });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.warnings.some((w) => w.includes('normalised to "0.0"'))).toBe(
        true,
      );
  });
  it("errors on an un-mappable printf leftover number token", () => {
    const r = validateChartSpec({ ...barBase, numberFormat: "%s" });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.some((e) => /invalid numberFormat/i.test(e))).toBe(true);
  });
});

const base = {
  type: "d3-lines",
  title: "Unemployment is at a five-year low",
  data: "year,value\n2018,5.1\n2023,3.7",
  altInsight: "Unemployment fell from 5.1% in 2018 to 3.7% in 2023",
};

describe("validateChartSpec", () => {
  it("accepts a well-formed spec", () => {
    const r = validateChartSpec({ ...base, baseColor: "#0072B2" });
    expect(r.ok).toBe(true);
  });
  it("fails when a subject is declared but baseColor stays the default blue", () => {
    const r = validateChartSpec({ ...base, subject: "solar energy" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/subject-fit|default blue/i);
  });
  it("passes when a subject gets a subject-fit non-default baseColor", () => {
    const r = validateChartSpec({
      ...base,
      subject: "solar energy",
      baseColor: "#E69F00",
    });
    expect(r.ok).toBe(true);
  });
  it("allows the default blue for a water subject (blue IS subject-fit)", () => {
    const r = validateChartSpec({ ...base, subject: "river water levels" });
    expect(r.ok).toBe(true);
  });
  it("rejects a missing insight title", () => {
    const r = validateChartSpec({ ...base, title: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/title/);
  });
  it("rejects a non Okabe-Ito colour", () => {
    const r = validateChartSpec({ ...base, baseColor: "#ff00ff" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/Okabe-Ito/);
  });
  it("rejects a missing altInsight (WCAG)", () => {
    const { altInsight, ...noAlt } = base;
    const r = validateChartSpec(noAlt);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/altInsight/);
  });
  it("exposes the Okabe-Ito palette", () => {
    expect(OKABE_ITO).toContain("#0072B2");
    expect(OKABE_ITO.length).toBe(8);
  });
  it("accepts a spec with valid Okabe-Ito seriesColors and transpose:true", () => {
    const r = validateChartSpec({
      type: "stacked-column-chart",
      title: "Energy by source",
      data: "year,Coal,Gas,Renewables\n2018,100,80,20\n2023,50,70,120",
      altInsight: "Coal declined while renewables grew",
      seriesColors: { Coal: "#0072B2", Gas: "#E69F00", Renewables: "#009E73" },
      transpose: true,
    });
    expect(r.ok).toBe(true);
  });
  it("rejects seriesColors containing a non-Okabe hex", () => {
    const r = validateChartSpec({
      ...base,
      seriesColors: { Coal: "#0072B2", Gas: "#deadff" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/Okabe-Ito/);
  });
  it("warns when an annotation x does not match a data row label", () => {
    const r = validateChartSpec({
      ...base,
      type: "d3-bars",
      data: "region,sales\nChina,8.1\nEurope,3.2",
      annotations: [{ text: "outlier", x: "Chyna", y: 8.1 }],
    });
    expect(r.ok).toBe(true);
    expect(
      r.ok && r.warnings.some((w) => /annotation x .*does not match/i.test(w)),
    ).toBe(true);
  });
  it("does not warn when an annotation x matches a data row label", () => {
    const r = validateChartSpec({
      ...base,
      type: "d3-bars",
      data: "region,sales\nChina,8.1\nEurope,3.2",
      annotations: [{ text: "outlier", x: "China", y: 8.1 }],
    });
    expect(r.ok && r.warnings.some((w) => /annotation x/i.test(w))).toBe(false);
  });
  it("warns (never silently drops) when annotations are set on a pie chart — DW has no text-annotation layer there", () => {
    const r = validateChartSpec({
      ...base,
      type: "d3-pies",
      data: "region,sales\nChina,8.1\nEurope,3.2",
      annotations: [{ text: "biggest slice", x: "China", y: 8.1 }],
    });
    expect(r.ok).toBe(true);
    expect(
      r.ok &&
        r.warnings.some((w) =>
          /annotations are not supported on d3-pies/i.test(w),
        ),
    ).toBe(true);
  });
  it("warns when annotations are set on a table (no plot to anchor to)", () => {
    const r = validateChartSpec({
      ...base,
      type: "tables",
      data: "region,sales\nChina,8.1\nEurope,3.2",
      annotations: [{ text: "note", x: "China", y: 8.1 }],
    });
    expect(r.ok).toBe(true);
    expect(
      r.ok &&
        r.warnings.some((w) =>
          /annotations are not supported on tables/i.test(w),
        ),
    ).toBe(true);
  });
  it("does not warn about annotation support on a chart type that does support them (line)", () => {
    const r = validateChartSpec({
      ...base,
      annotations: [{ text: "Peak", x: "2018", y: 5.1 }],
    });
    expect(
      r.ok && r.warnings.some((w) => /annotations are not supported/i.test(w)),
    ).toBe(false);
  });
  it("rejects a non-boolean transpose", () => {
    const r = validateChartSpec({ ...base, transpose: "yes" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/transpose/);
  });
  it("accepts all 22 supported chart types", () => {
    const { CHART_TYPES } = require("../src/chart-spec");
    for (const t of CHART_TYPES) {
      const data = "a,b,c\n1,2,3"; // 3 cols satisfies single + multi minimums
      const r = validateChartSpec({
        type: t,
        title: "An insight",
        data,
        altInsight: "x",
      });
      expect(r.ok).toBe(true);
    }
  });
  it("rejects a multi-series type with only one value column", () => {
    const r = validateChartSpec({
      type: "stacked-column-chart",
      title: "T",
      data: "year,value\n2018,5",
      altInsight: "x",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/at least 3 columns/);
  });
  it("rejects a pie with more than 5 slices (data-to-viz caveat)", () => {
    const data = "cat,v\nA,1\nB,2\nC,3\nD,4\nE,5\nF,6";
    const r = validateChartSpec({
      type: "d3-pies",
      title: "T",
      data,
      altInsight: "x",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/slices/);
  });
  it("rejects more than 8 series colours", () => {
    const sc: Record<string, string> = {};
    [
      "#0072B2",
      "#E69F00",
      "#009E73",
      "#D55E00",
      "#CC79A7",
      "#56B4E9",
      "#F0E442",
      "#000000",
      "#0072B2",
    ].forEach((c, i) => (sc["s" + i] = c));
    const r = validateChartSpec({
      type: "stacked-column-chart",
      title: "T",
      data: "a,b,c\n1,2,3",
      altInsight: "x",
      seriesColors: sc,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/at most 8/);
  });
  it("rejects >2 series colours on a single-series chart", () => {
    const r = validateChartSpec({
      type: "d3-lines",
      title: "T",
      data: "a,b\n1,2",
      altInsight: "x",
      seriesColors: { x: "#0072B2", y: "#E69F00", z: "#009E73" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/single-series/);
  });
  it("accepts 3 distinct Okabe-Ito seriesColors on a 3-series d3-lines chart (not the default-blue ramp)", () => {
    // d3-lines is NOT in MULTI_SERIES_TYPES (that set is for DW's transpose-based
    // types), but 3 value columns make this genuinely multi-series data — the
    // cap must key off the real shape, not type membership, or the caller drops
    // seriesColors and every series renders the same default blue.
    const seriesColors = {
      Coal: "#0072B2",
      Gas: "#E69F00",
      Renewables: "#009E73",
    };
    const r = validateChartSpec({
      type: "d3-lines",
      title: "Renewables overtake coal",
      data: "year,Coal,Gas,Renewables\n2018,100,80,20\n2023,50,70,120",
      altInsight: "Renewables rose from 20 to 120 while coal fell",
      seriesColors,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const colours = Object.values(r.spec.seriesColors ?? {});
      expect(colours).toEqual(Object.values(seriesColors));
      expect(new Set(colours).size).toBe(3); // distinct, not collapsed to one blue
      expect(colours).not.toEqual([
        DEFAULT_BASE_COLOR,
        DEFAULT_BASE_COLOR,
        DEFAULT_BASE_COLOR,
      ]);
    }
  });
  it("degrades gracefully (documented error, not a crash) for a >8-series d3-lines chart", () => {
    const seriesColors: Record<string, string> = {};
    const cols = ["year"];
    for (let i = 0; i < 9; i++) {
      seriesColors[`s${i}`] = OKABE_ITO[i % OKABE_ITO.length];
      cols.push(`s${i}`);
    }
    const data = `${cols.join(",")}\n2023,${cols
      .slice(1)
      .map(() => 1)
      .join(",")}`;
    expect(() =>
      validateChartSpec({
        type: "d3-lines",
        title: "T",
        data,
        altInsight: "x",
        seriesColors,
      }),
    ).not.toThrow();
    const r = validateChartSpec({
      type: "d3-lines",
      title: "T",
      data,
      altInsight: "x",
      seriesColors,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/at most 8/);
  });
  it("warns when the title is a bare year range", () => {
    const r = validateChartSpec({
      type: "d3-lines",
      title: "2018-2023",
      data: "a,b\n1,2",
      altInsight: "x",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join()).toMatch(/insight/);
  });
});

describe("validateChartSpec — #5 valueLabels only on bar/column", () => {
  const base = {
    title: "Something clear about the data over time",
    data: "year,value\n2019,10\n2024,20",
    altInsight: "Something clear about the data over time.",
  };
  it("warns when valueLabels is set on a line chart (Datawrapper ignores it)", () => {
    const r = validateChartSpec({
      ...base,
      type: "d3-lines",
      valueLabels: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        r.warnings.some((w) => /valueLabels is only honoured/.test(w)),
      ).toBe(true);
  });
  it("does NOT emit the 'only honoured' warning for a bar chart (bars have value-label control)", () => {
    const r = validateChartSpec({
      ...base,
      type: "d3-bars",
      valueLabels: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        r.warnings.some((w) => /valueLabels is only honoured/.test(w)),
      ).toBe(false);
  });
});

describe("validateChartSpec — #4 valueLabels on horizontal bars is not a silent no-op", () => {
  const base = {
    title: "Something clear about the data",
    data: "region,value\nNorth,10\nSouth,11",
    altInsight: "Something clear about the data.",
  };
  it("warns that inside value labels can't be contrast-safe on d3-bars (axis shown instead)", () => {
    // The prior gap: hasValueLabelControl('d3-bars') is true, so the 'only honoured'
    // warning skipped it, yet applyValueLabels() turns the on-bar labels OFF → the
    // journalist asked for value labels and silently got none. This warning surfaces it.
    const r = validateChartSpec({
      ...base,
      type: "d3-bars",
      valueLabels: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        r.warnings.some((w) =>
          /can't render contrast-safe INSIDE horizontal bars/.test(w),
        ),
      ).toBe(true);
  });
  it("does NOT warn when valueLabels is not requested on a horizontal bar", () => {
    const r = validateChartSpec({ ...base, type: "d3-bars" });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.warnings.some((w) => /INSIDE horizontal bars/.test(w))).toBe(
        false,
      );
  });
  it("does NOT warn for valueLabels on a vertical column chart (outside labels render fine)", () => {
    const r = validateChartSpec({
      ...base,
      type: "column-chart",
      valueLabels: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.warnings.some((w) => /INSIDE horizontal bars/.test(w))).toBe(
        false,
      );
  });
});

describe("isPercentScaleMismatch (#1c — DW '%' appends, never multiplies)", () => {
  it("flags a '%' token on 0–1 fractional data (renders '0%' — precision lost)", () => {
    expect(isPercentScaleMismatch("0%", [0.29, 0.22, 0.15])).toBe(true);
    expect(isPercentScaleMismatch("0.0%", [0.5, 1])).toBe(true);
  });
  it("does NOT flag a '%' token on data already in percentage points (0–100)", () => {
    // 29 with "0%" renders "29%" — CORRECT. Verified against a real rendered export.
    expect(isPercentScaleMismatch("0%", [29, 22, 15])).toBe(false);
  });
  it("does NOT flag a non-percent token, or an absent format", () => {
    expect(isPercentScaleMismatch("0,0", [0.29])).toBe(false);
    expect(isPercentScaleMismatch(undefined, [0.29])).toBe(false);
  });
  it("does NOT flag all-zero data (nothing to misread)", () => {
    expect(isPercentScaleMismatch("0%", [0, 0])).toBe(false);
  });
  it("normalises a printf percent token before checking", () => {
    expect(isPercentScaleMismatch(".1f%", [0.29])).toBe(true); // ".1f%" → "0.0%"
  });
});

describe("numericValuesOf", () => {
  it("pulls the numeric cells of the named columns", () => {
    const csv = "region,a,b\nNorth,1,2\nSouth,3,x";
    expect(numericValuesOf(csv, ["a", "b"])).toEqual([1, 2, 3]);
  });
  it("ignores unknown columns and non-numeric cells", () => {
    expect(numericValuesOf("region,v\nX,10", ["nope"])).toEqual([]);
  });
});

describe("validateChartSpec — #1c percent-scale mismatch (HARD error)", () => {
  // Elevated from a warning to a hard error: EMPIRICALLY VERIFIED against real
  // rendered PNG exports (probe charts, deleted after inspection) — 41/63/70 with
  // "0%" render "41%"/"63%"/"70%" (CORRECT, no ×100), while 0.41/0.63/0.70 with "0%"
  // render "0%"/"1%"/"1%" (precision destroyed). A warning is advisory only —
  // produceChart's guard (`if (!v.ok) throw`) never inspects `warnings` — so this
  // defect could still publish. A hard error blocks it at the same boundary as the
  // un-mappable-token check above.
  it("rejects a '%' numberFormat applied to 0–1 fractional data", () => {
    const r = validateChartSpec({
      type: "column-chart",
      title: "Renewable share climbed across the board",
      data: "region,share\nNorth,0.29\nSouth,0.22",
      numberFormat: "0%",
      altInsight: "Renewable share is highest in the North.",
    });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(
        r.errors.some((e) => /appends "%" WITHOUT multiplying/.test(e)),
      ).toBe(true);
  });
  it("does NOT reject when the '%' data is already percentage points", () => {
    const r = validateChartSpec({
      type: "column-chart",
      title: "Renewable share climbed across the board",
      data: "region,share\nNorth,29\nSouth,22",
      numberFormat: "0%",
      altInsight: "Renewable share is highest in the North.",
    });
    expect(r.ok).toBe(true);
  });
  // The axis token (`valueFormat`) falls back into the SAME field in spec-to-metadata
  // (`axisFormat = valueFormat ?? numberFormat` → `y-grid-format`) — a fractional-data
  // chart that sets `valueFormat:"0%"` (axis only, no numberFormat) hits the identical
  // "0%" bug on the axis ticks. The original guard only ever read `s.numberFormat`, so
  // this path shipped unflagged; now checked too.
  it("rejects a '%' valueFormat (axis token) applied to 0–1 fractional data", () => {
    const r = validateChartSpec({
      type: "column-chart",
      title: "Renewable share climbed across the board",
      data: "region,share\nNorth,0.29\nSouth,0.22",
      valueFormat: "0%",
      altInsight: "Renewable share is highest in the North.",
    });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(
        r.errors.some((e) => /appends "%" WITHOUT multiplying/.test(e)),
      ).toBe(true);
  });
  it("does NOT reject a '%' valueFormat when the data is already percentage points", () => {
    const r = validateChartSpec({
      type: "column-chart",
      title: "Renewable share climbed across the board",
      data: "region,share\nNorth,29\nSouth,22",
      valueFormat: "0%",
      altInsight: "Renewable share is highest in the North.",
    });
    expect(r.ok).toBe(true);
  });
});

describe("validateChartSpec — #5 annotations dropped on horizontal value-x/category-y charts", () => {
  const annBase = {
    title: "North East rents rose fastest",
    data: "region,rent\nNorth East,8.4\nLondon,2.8",
    altInsight: "North East rents rose 8.4 vs London 2.8",
    annotations: [{ text: "outlier", x: "North East", y: 8.4 }],
  };
  it("warns that annotations are dropped on d3-bars (coordinate model mismatch)", () => {
    const r = validateChartSpec({ ...annBase, type: "d3-bars" });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        r.warnings.some((w) =>
          /value-x\/category-y chart\) are dropped/.test(w),
        ),
      ).toBe(true);
  });
  it("does NOT warn for annotations on a vertical column chart (they place correctly)", () => {
    const r = validateChartSpec({ ...annBase, type: "column-chart" });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        r.warnings.some((w) => /are dropped by this pipeline/.test(w)),
      ).toBe(false);
  });
  // d3-arrow-plot: REPRODUCED live — validateChartSpec previously returned ok:true with
  // 0 warnings for this exact spec, then produceChart's responsive label-safety guardrail
  // threw at EVERY viewport width (340/600/1200px, all "clipped" on the value axis ticks).
  // d3-arrow-plot shares the row-count-driven HORIZONTAL layout (category-y, value-x) that
  // ROW_DRIVEN_TYPES (export-aspect.ts) already documents for the d3-bars family — the
  // same coordinate-model mismatch this guard exists for.
  it("warns that annotations are dropped on d3-arrow-plot (value-x/category-y, like d3-bars)", () => {
    const r = validateChartSpec({ ...annBase, type: "d3-arrow-plot" });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        r.warnings.some((w) =>
          /value-x\/category-y chart\) are dropped/.test(w),
        ),
      ).toBe(true);
  });
  // d3-dot-plot and d3-range-plot are the other two ROW_DRIVEN_TYPES horizontal chart
  // types (besides the d3-bars family + d3-bars-bullet, already covered) — same
  // category-y/value-x orientation, same unmappable annotation.
  it("warns that annotations are dropped on d3-dot-plot (value-x/category-y)", () => {
    const r = validateChartSpec({ ...annBase, type: "d3-dot-plot" });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        r.warnings.some((w) =>
          /value-x\/category-y chart\) are dropped/.test(w),
        ),
      ).toBe(true);
  });
  it("warns that annotations are dropped on d3-range-plot (value-x/category-y)", () => {
    const r = validateChartSpec({ ...annBase, type: "d3-range-plot" });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        r.warnings.some((w) =>
          /value-x\/category-y chart\) are dropped/.test(w),
        ),
      ).toBe(true);
  });
});

// STRICT TOP-LEVEL FIELDS — the QA Wave 8 German-hospital regression class: the
// orchestrator emitted `highlight`/`highlightColor` on a ChartSpec, the validator
// silently ignored the unknown fields, and the chart shipped UNhighlighted (only
// manual pixel inspection caught it). Unknown top-level fields must fail LOUD.
describe("validateChartSpec — strict top-level fields (fail-closed)", () => {
  const rankedBar = {
    type: "d3-bars",
    title: "Basel has the most hospital beds per capita",
    data: "city,beds\nBasel,812\nZurich,745\nBern,431",
    altInsight: "Basel tops the ranking with 812 beds per 100k residents",
    baseColor: "#E69F00",
    sort: "desc",
  };

  it("rejects the hallucinated `highlightColor` field, naming it and suggesting `highlight` (the QA Wave 8 case)", () => {
    const r = validateChartSpec({
      ...rankedBar,
      highlight: "Basel",
      highlightColor: "#E69F00",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const msg = r.errors.join(" | ");
      expect(msg).toContain('"highlightColor"');
      expect(msg).toMatch(/did you mean "highlight"/);
    }
  });

  it("lists the valid fields in the unknown-field error", () => {
    const r = validateChartSpec({ ...rankedBar, frobnicate: true });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const msg = r.errors.join(" | ");
      expect(msg).toContain('"frobnicate"');
      // spot-check the list names real fields, not prose
      expect(msg).toContain("baseColor");
      expect(msg).toContain("altInsight");
      expect(msg).toContain("annotations");
    }
  });

  it("suggests the closest field for a small typo (titel → title)", () => {
    const r = validateChartSpec({ ...rankedBar, titel: "a typo" });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.join(" | ")).toMatch(/did you mean "title"/);
  });

  it("offers no suggestion for a field nothing is close to", () => {
    const r = validateChartSpec({ ...rankedBar, frobnicate: true });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const err = r.errors.find((e) => e.includes('"frobnicate"'));
      expect(err).toBeDefined();
      expect(err).not.toMatch(/did you mean/);
    }
  });

  it("tolerates the routing-envelope fields real flows carry on the same object (producer, format)", () => {
    const r = validateChartSpec({
      ...rankedBar,
      producer: "dw-chart",
      format: "static",
    });
    expect(r.ok).toBe(true);
  });
});

// REAL HIGHLIGHT — the journalist need behind the Wave 8 bug was legitimate
// (accent Basel in a ranked bar). `highlight` names the CATEGORY VALUE to accent
// on the single-series bar family; every other type rejects it loudly.
describe("validateChartSpec — highlight (bar-family category accent)", () => {
  const rankedBar = {
    type: "d3-bars",
    title: "Basel has the most hospital beds per capita",
    data: "city,beds\nBasel,812\nZurich,745\nBern,431",
    altInsight: "Basel tops the ranking with 812 beds per 100k residents",
    baseColor: "#E69F00",
    sort: "desc",
  };

  it("accepts a highlight naming a data category on d3-bars", () => {
    const r = validateChartSpec({ ...rankedBar, highlight: "Basel" });
    expect(r.ok).toBe(true);
  });

  it("accepts a highlight on column-chart (the other verified category-keyed engine)", () => {
    const r = validateChartSpec({
      ...rankedBar,
      type: "column-chart",
      highlight: "Zurich",
    });
    expect(r.ok).toBe(true);
  });

  it("rejects a highlight on a non-bar type (d3-lines) with a clear message", () => {
    const r = validateChartSpec({
      type: "d3-lines",
      title: "Unemployment is at a five-year low",
      data: "year,value\n2018,5.1\n2023,3.7",
      altInsight: "Unemployment fell from 5.1% to 3.7%",
      highlight: "2023",
    });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.join(" | ")).toMatch(/highlight.*(d3-bars|column-chart)/);
  });

  it("rejects a highlight that names no data category (it would die silently in Datawrapper)", () => {
    const r = validateChartSpec({ ...rankedBar, highlight: "Lausanne" });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.join(" | ")).toMatch(/Lausanne.*does not match any/i);
  });

  it("rejects highlight combined with seriesColors (both write custom-colors)", () => {
    const r = validateChartSpec({
      ...rankedBar,
      highlight: "Basel",
      seriesColors: { beds: "#009E73" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.join(" | ")).toMatch(/highlight.*seriesColors/);
  });

  it("rejects a non-string highlight (an index breaks on re-sort — the value is the contract)", () => {
    const r = validateChartSpec({ ...rankedBar, highlight: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.join(" | ")).toMatch(/highlight must be/);
  });
});
