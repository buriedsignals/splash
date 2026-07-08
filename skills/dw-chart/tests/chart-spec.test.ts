import { describe, it, expect } from "bun:test";
import {
  validateChartSpec,
  normalizeNumberFormat,
  OKABE_ITO,
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
  it("does NOT warn for valueLabels on a bar chart", () => {
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
