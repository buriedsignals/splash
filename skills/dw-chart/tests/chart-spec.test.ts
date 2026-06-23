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
});
