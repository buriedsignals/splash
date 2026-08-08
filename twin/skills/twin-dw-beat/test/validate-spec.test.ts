import { describe, it, expect } from "bun:test";
import { validateChartSpec } from "../scripts/validate-spec.mjs";

function baseSpec(overrides = {}) {
  return {
    takeaway: "Emissions fell",
    limits: "Territorial emissions only.",
    credit: "Global Carbon Budget",
    effectiveDate: "2024 data",
    language: "en-US",
    color: "#0B7A75",
    chartType: "d3-lines",
    format: "static",
    data: [
      { year: 1950, co2: 10.2 },
      { year: 2024, co2: 32.0 },
    ],
    ...overrides,
  };
}

describe("validateChartSpec", () => {
  it("should accept a fully-formed spec unchanged", () => {
    const spec = baseSpec();
    expect(validateChartSpec(spec)).toBe(spec);
  });

  it("should throw on an unknown top-level field rather than silently ignore it", () => {
    const spec = baseSpec({ subtitle: "not a real field" });
    expect(() => validateChartSpec(spec)).toThrow(/unknown field/);
  });

  it("should throw naming every missing required field, not just the first", () => {
    let caught;
    try {
      validateChartSpec({ data: baseSpec().data });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
    for (const field of [
      "takeaway",
      "limits",
      "credit",
      "effectiveDate",
      "language",
      "color",
      "chartType",
      "format",
    ]) {
      expect(caught.message).toContain(`${field} is required`);
    }
  });

  it("should reject a format that is not static or interactive", () => {
    const spec = baseSpec({ format: "video" });
    expect(() => validateChartSpec(spec)).toThrow(/format must be/);
  });

  it("should reject a colour that is not a 6-digit hex string", () => {
    const spec = baseSpec({ color: "teal" });
    expect(() => validateChartSpec(spec)).toThrow(/hex/);
  });

  it("should reject data with fewer than two columns", () => {
    const spec = baseSpec({ data: [{ year: 1950 }] });
    expect(() => validateChartSpec(spec)).toThrow(/two columns/);
  });

  it("should reject an empty data array", () => {
    const spec = baseSpec({ data: [] });
    expect(() => validateChartSpec(spec)).toThrow(/non-empty array/);
  });

  it("should accept a spec carrying textAnnotations and rangeAnnotations", () => {
    const spec = baseSpec({
      textAnnotations: [{ x: 1990, y: 20, text: "A note" }],
      rangeAnnotations: [{ value: 32.5, label: "1967 level" }],
    });
    expect(() => validateChartSpec(spec)).not.toThrow();
  });

  it("should throw on an unknown field inside a textAnnotations entry", () => {
    const spec = baseSpec({
      textAnnotations: [{ x: 1990, text: "A note", fontWeight: "bold" }],
    });
    expect(() => validateChartSpec(spec)).toThrow(
      /textAnnotations\[0\]: unknown field/,
    );
  });

  it("should throw when a textAnnotations entry has no text", () => {
    const spec = baseSpec({ textAnnotations: [{ x: 1990 }] });
    expect(() => validateChartSpec(spec)).toThrow(/text is required/);
  });

  it("should throw when a textAnnotations entry has neither x nor y", () => {
    const spec = baseSpec({ textAnnotations: [{ text: "floating" }] });
    expect(() => validateChartSpec(spec)).toThrow(/at least one of x or y/);
  });

  it("should throw on an unknown field inside a rangeAnnotations entry", () => {
    const spec = baseSpec({
      rangeAnnotations: [{ value: 1, label: "x", thickness: 5 }],
    });
    expect(() => validateChartSpec(spec)).toThrow(
      /rangeAnnotations\[0\]: unknown field/,
    );
  });

  it("should throw when a rangeAnnotations entry has no label — an unlabelled rule is not readable", () => {
    const spec = baseSpec({ rangeAnnotations: [{ value: 32.5 }] });
    expect(() => validateChartSpec(spec)).toThrow(/label is required/);
  });

  it("should throw when a rangeAnnotations entry has no numeric value", () => {
    const spec = baseSpec({ rangeAnnotations: [{ label: "1967 level" }] });
    expect(() => validateChartSpec(spec)).toThrow(/value is required/);
  });

  it("should throw on an invalid axis", () => {
    const spec = baseSpec({
      rangeAnnotations: [{ value: 1, label: "x", axis: "z" }],
    });
    expect(() => validateChartSpec(spec)).toThrow(/axis must be/);
  });

  it("should throw on an invalid display", () => {
    const spec = baseSpec({
      rangeAnnotations: [{ value: 1, label: "x", display: "glow" }],
    });
    expect(() => validateChartSpec(spec)).toThrow(/display must be/);
  });

  it("should throw on an invalid strokeWidth", () => {
    const spec = baseSpec({
      rangeAnnotations: [{ value: 1, label: "x", strokeWidth: 5 }],
    });
    expect(() => validateChartSpec(spec)).toThrow(/strokeWidth must be/);
  });
});
