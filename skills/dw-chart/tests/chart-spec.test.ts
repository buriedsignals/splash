import { describe, it, expect } from "bun:test";
import { validateChartSpec, OKABE_ITO } from "../src/chart-spec";

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
      ...base,
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
  it("rejects a non-boolean transpose", () => {
    const r = validateChartSpec({ ...base, transpose: "yes" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/transpose/);
  });
  it("accepts all 24 chart types", () => {
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
});
