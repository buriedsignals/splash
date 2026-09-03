import { describe, it, expect } from "bun:test";
import {
  buildChartPayload,
  buildTextAnnotation,
  buildRangeAnnotation,
  resolveSeriesLabel,
  humanizeColumnName,
  renameValueColumn,
  isBarEncoded,
  computeYRange,
} from "../scripts/map-spec.mjs";
import { validateChartSpec } from "../scripts/validate-spec.mjs";

const DATA = [
  { year: 1950, co2Mt: 10.25 },
  { year: 1967, co2Mt: 32.53 },
  { year: 2024, co2Mt: 32.07 },
];

function baseSpec(overrides = {}) {
  return {
    takeaway: "Emissions fell",
    limits: "Territorial emissions only.",
    credit: "Global Carbon Budget",
    effectiveDate: "2024 data",
    language: "fr-FR",
    color: "#0B7A75",
    chartType: "d3-lines",
    format: "static",
    data: DATA,
    ...overrides,
  };
}

describe("buildTextAnnotation", () => {
  it("should carry the id, text and position through", () => {
    const annotation = buildTextAnnotation(
      { x: 1990, y: 20, text: "A note" },
      "label-0",
    );
    expect(annotation.id).toBe("label-0");
    expect(annotation.text).toBe("A note");
    expect(annotation.position).toEqual({ x: 1990, y: 20 });
  });

  it("should default align to top-left and colour to false (inherit theme)", () => {
    const annotation = buildTextAnnotation({ x: 1, text: "t" }, "id");
    expect(annotation.align).toBe("tl");
    expect(annotation.color).toBe(false);
  });

  it("should honour position, and only position", () => {
    // Issue #47. An annotation's own fields are where it sits and what it says; how it LOOKS is one
    // house convention, decided once, not six knobs per annotation. `color` here is ignored — and
    // `validateChartSpec` refuses it outright before a spec ever reaches this function.
    const annotation = buildTextAnnotation(
      { x: 1, text: "t", align: "br", dy: -6 },
      "id",
    );
    expect(annotation.align).toBe("br");
    expect(annotation.dy).toBe(-6);
    expect(annotation.color).toBe(false);
    expect(annotation.bold).toBe(false);
    expect(annotation.size).toBe(14);
  });

  it("should refuse a spec that tries to style one annotation differently", () => {
    const spec = {
      takeaway: "t", limits: "l", credit: "c", effectiveDate: "2026-01-01", language: "en",
      color: "#d5121e", chartType: "d3-lines", format: "web",
      data: [["year", "value"], ["2020", "1"]],
      textAnnotations: [{ x: 1, y: 1, text: "t", bold: true, size: 22 }],
    };
    expect(() => validateChartSpec(spec)).toThrow(/unknown field\(s\) bold, size/);
  });

  it("should always carry a disabled connectorLine object — Datawrapper's own type requires it present", () => {
    const annotation = buildTextAnnotation({ x: 1, text: "t" }, "id");
    expect(annotation.connectorLine.enabled).toBe(false);
  });

  it("should omit x/y from position when not given, rather than writing undefined", () => {
    const annotation = buildTextAnnotation(
      { text: "t", column: undefined },
      "id",
    );
    expect(annotation.position).toEqual({});
  });
});

describe("buildRangeAnnotation", () => {
  it("should span the rule across the data's own x-domain for a y-axis (horizontal) rule", () => {
    const { rule } = buildRangeAnnotation(
      { value: 32.5, label: "1967 level" },
      0,
      DATA,
      "#0B7A75",
    );
    expect(rule.type).toBe("y");
    expect(rule.display).toBe("line");
    expect(rule.position).toEqual({ x0: 1950, x1: 2024, y0: 32.5, y1: 32.5 });
  });

  it("should default the rule's colour to the house colour", () => {
    const { rule } = buildRangeAnnotation(
      { value: 32.5, label: "x" },
      0,
      DATA,
      "#0B7A75",
    );
    expect(rule.color).toBe("#0B7A75");
  });

  it("should honour an explicit rule colour over the house colour", () => {
    const { rule } = buildRangeAnnotation(
      { value: 32.5, label: "x", color: "#FF0000" },
      0,
      DATA,
      "#0B7A75",
    );
    expect(rule.color).toBe("#FF0000");
  });

  it("should span the data's own y-domain for an x-axis (vertical) rule", () => {
    const { rule } = buildRangeAnnotation(
      { value: 1967, label: "x", axis: "x" },
      0,
      DATA,
      "#0B7A75",
    );
    expect(rule.type).toBe("x");
    expect(rule.position).toEqual({ x0: 1967, x1: 1967, y0: 10.25, y1: 32.53 });
  });

  it("should switch display to range and lower opacity when 'to' is given", () => {
    const { rule } = buildRangeAnnotation(
      { value: 30, to: 35, label: "band" },
      0,
      DATA,
      "#0B7A75",
    );
    expect(rule.display).toBe("range");
    expect(rule.opacity).toBe(20);
    expect(rule.position.y1).toBe(35);
  });

  it("should never carry text on the rule itself — Datawrapper's RangeAnnotation type has no text field", () => {
    const { rule } = buildRangeAnnotation(
      { value: 32.5, label: "1967 level" },
      0,
      DATA,
      "#0B7A75",
    );
    expect(rule.text).toBeUndefined();
    expect(rule.label).toBeUndefined();
  });

  it("should pair the rule with a text-annotation carrying the label, at the rule's far edge", () => {
    const { rule, label } = buildRangeAnnotation(
      { value: 32.5, label: "1967 level" },
      0,
      DATA,
      "#0B7A75",
    );
    expect(label.text).toBe("1967 level");
    expect(label.position).toEqual({ x: rule.position.x1, y: 32.5 });
    expect(label.align).toBe("br");
  });

  it("should give each rule a deterministic id from its index, not a random one", () => {
    const first = buildRangeAnnotation(
      { value: 1, label: "a" },
      0,
      DATA,
      "#000000",
    );
    const second = buildRangeAnnotation(
      { value: 1, label: "a" },
      0,
      DATA,
      "#000000",
    );
    expect(first.rule.id).toBe(second.rule.id);
    expect(first.rule.id).toBe("range-0");
  });
});

describe("buildChartPayload", () => {
  it("should map the confirmed takeaway to the chart title, verbatim", () => {
    const payload = buildChartPayload(baseSpec());
    expect(payload.title).toBe("Emissions fell");
  });

  it("should pass the chart type through unchanged — no per-type branching", () => {
    const payload = buildChartPayload(baseSpec({ chartType: "d3-bars" }));
    expect(payload.type).toBe("d3-bars");
  });

  it("should map limits to describe.intro and credit+effectiveDate to describe['source-name']", () => {
    const payload = buildChartPayload(baseSpec());
    expect(payload.metadata.describe.intro).toBe("Territorial emissions only.");
    expect(payload.metadata.describe["source-name"]).toBe(
      "Global Carbon Budget, 2024 data",
    );
  });

  it("should colour the value column with the house colour via custom-colors, keyed by a humanised label, never the raw column name", () => {
    const payload = buildChartPayload(baseSpec());
    const keys = Object.keys(payload.metadata.visualize["custom-colors"]);
    expect(keys).toEqual(["Co2 Mt"]);
    expect(keys).not.toContain("co2Mt");
    expect(payload.metadata.visualize["custom-colors"]["Co2 Mt"]).toBe(
      "#0B7A75",
    );
  });

  it("should use an explicit seriesLabel over the humanised fallback", () => {
    const payload = buildChartPayload(baseSpec({ seriesLabel: "CO₂ (Mt)" }));
    expect(Object.keys(payload.metadata.visualize["custom-colors"])).toEqual([
      "CO₂ (Mt)",
    ]);
  });

  it("should always disable forced Datawrapper attribution", () => {
    const payload = buildChartPayload(baseSpec());
    expect(payload.metadata.publish).toEqual({ "force-attribution": false });
  });

  it("should fit the y-axis to the data for a line chart, not anchor it at zero", () => {
    const payload = buildChartPayload(baseSpec());
    const range = payload.metadata.visualize["custom-range-y"].map(Number);
    expect(range[0]).toBeGreaterThan(0);
    expect(range[0]).toBeLessThan(10.25);
    expect(range[1]).toBeGreaterThan(32.53);
  });

  it("should widen the fitted y-axis to keep a range annotation's value inside the plot", () => {
    const payload = buildChartPayload(
      baseSpec({
        rangeAnnotations: [{ value: 100, label: "far above the data" }],
      }),
    );
    const range = payload.metadata.visualize["custom-range-y"].map(Number);
    expect(range[1]).toBeGreaterThan(100);
  });

  it("should NOT fit the y-axis for a bar/column chart — zero must stay in view", () => {
    const payload = buildChartPayload(baseSpec({ chartType: "d3-bars" }));
    expect(payload.metadata.visualize["custom-range-y"]).toBeUndefined();
  });

  it("should emit an empty range-annotations and text-annotations array when none are given", () => {
    const payload = buildChartPayload(baseSpec());
    expect(payload.metadata.visualize["range-annotations"]).toEqual([]);
    expect(payload.metadata.visualize["text-annotations"]).toEqual([]);
  });

  it("should emit one range-annotations entry and one paired text-annotations entry per rangeAnnotations input", () => {
    const payload = buildChartPayload(
      baseSpec({ rangeAnnotations: [{ value: 32.5, label: "1967 level" }] }),
    );
    expect(payload.metadata.visualize["range-annotations"]).toHaveLength(1);
    expect(payload.metadata.visualize["text-annotations"]).toHaveLength(1);
    expect(payload.metadata.visualize["text-annotations"][0].text).toBe(
      "1967 level",
    );
  });

  it("should carry direct textAnnotations through alongside any range-annotation labels", () => {
    const payload = buildChartPayload(
      baseSpec({
        textAnnotations: [{ x: 1990, y: 20, text: "A note" }],
        rangeAnnotations: [{ value: 32.5, label: "1967 level" }],
      }),
    );
    expect(payload.metadata.visualize["text-annotations"]).toHaveLength(2);
    const texts = payload.metadata.visualize["text-annotations"].map(
      (a) => a.text,
    );
    expect(texts).toContain("A note");
    expect(texts).toContain("1967 level");
  });
});

describe("humanizeColumnName", () => {
  it("should split a camelCase column into title-cased words", () => {
    expect(humanizeColumnName("co2Mt")).toBe("Co2 Mt");
  });

  it("should split snake_case and kebab-case columns into words", () => {
    expect(humanizeColumnName("annual_co2")).toBe("Annual Co2");
    expect(humanizeColumnName("annual-co2")).toBe("Annual Co2");
  });

  it("should title-case a plain lowercase column", () => {
    expect(humanizeColumnName("value")).toBe("Value");
  });
});

describe("resolveSeriesLabel", () => {
  it("should never return the raw column name — a caller-supplied seriesLabel wins", () => {
    const label = resolveSeriesLabel(
      baseSpec({ seriesLabel: "CO₂ emissions (Mt)" }),
    );
    expect(label).toBe("CO₂ emissions (Mt)");
  });

  it("should fall back to a humanised label, never the bare identifier, when none is given", () => {
    const label = resolveSeriesLabel(baseSpec());
    expect(label).not.toBe("co2Mt");
    expect(label).toBe("Co2 Mt");
  });
});

describe("renameValueColumn", () => {
  it("should rename the value column to the resolved series label, leaving the x column alone", () => {
    const renamed = renameValueColumn(DATA, "Co2 Mt");
    expect(Object.keys(renamed[0])).toEqual(["year", "Co2 Mt"]);
    expect(renamed[0]["Co2 Mt"]).toBe(10.25);
  });

  it("should be a no-op when the series label already matches the column name", () => {
    const renamed = renameValueColumn(DATA, "co2Mt");
    expect(renamed).toBe(DATA);
  });

  it("should preserve every comparison series when it renames the first one", () => {
    const slope = [
      { year: 2021, Norway: 54, Sweden: 52, UK: 5 },
      { year: 2025, Norway: 64, Sweden: 62, UK: 9 },
    ];
    const renamed = renameValueColumn(slope, "Norway adoption");
    expect(renamed).toEqual([
      { year: 2021, "Norway adoption": 54, Sweden: 52, UK: 5 },
      { year: 2025, "Norway adoption": 64, Sweden: 62, UK: 9 },
    ]);
  });

  it("should reject a label that would overwrite another series", () => {
    expect(() =>
      renameValueColumn([{ year: 2021, Norway: 54, Sweden: 52 }], "Sweden"),
    ).toThrow(/collides with another data column/);
  });
});

describe("isBarEncoded", () => {
  it("should recognise Datawrapper's bar and column type ids", () => {
    expect(isBarEncoded("d3-bars")).toBe(true);
    expect(isBarEncoded("column-chart")).toBe(true);
    expect(isBarEncoded("grouped-column-chart")).toBe(true);
    expect(isBarEncoded("stacked-column-chart")).toBe(true);
  });

  it("should not flag line/area/scatter types as bar-encoded", () => {
    expect(isBarEncoded("d3-lines")).toBe(false);
    expect(isBarEncoded("d3-area")).toBe(false);
    expect(isBarEncoded("d3-scatter-plot")).toBe(false);
  });
});

describe("computeYRange", () => {
  it("should pad beyond the data's own min and max, on both sides", () => {
    const [min, max] = computeYRange(baseSpec());
    expect(min).toBeLessThan(10.25);
    expect(max).toBeGreaterThan(32.53);
  });

  it("should widen the range to include a y-axis range annotation's value", () => {
    const [min, max] = computeYRange(
      baseSpec({ rangeAnnotations: [{ value: -50, label: "x" }] }),
    );
    expect(min).toBeLessThan(-50);
  });

  it("should ignore an x-axis range annotation's value — it does not live on the y domain", () => {
    const withXRange = computeYRange(
      baseSpec({ rangeAnnotations: [{ value: 9999, label: "x", axis: "x" }] }),
    );
    const withoutIt = computeYRange(baseSpec());
    expect(withXRange).toEqual(withoutIt);
  });

  it("should span every series in the heat-pump slope instead of clipping the low countries", () => {
    const [min, max] = computeYRange(
      baseSpec({
        data: [
          { year: 2021, Norway: 54, Sweden: 52, UK: 5 },
          { year: 2025, Norway: 64, Sweden: 62, UK: 9 },
        ],
      }),
    );
    expect(min).toBeLessThan(5);
    expect(max).toBeGreaterThan(64);
  });
});

/**
 * MARK SIZE — issue #47. A scatter published with r = 2.5px marks, near-invisible at reading size,
 * and nothing in the spec could change it, while six fields governed whether a caption was
 * underlined. The journalist's own note was "label positions are bad, marker sizes are too small".
 * That was the wrong trade: mark size decides whether the data can be read at all.
 */
describe("markSize is the parameter the styling made room for", () => {
  const BASE = {
    takeaway: "t", limits: "l", credit: "c", effectiveDate: "2026-01-01", language: "en",
    color: "#d5121e", chartType: "d3-lines", format: "web",
    data: [["year", "value"], ["2020", "1"]],
  };

  it("should be optional, and send nothing when a beat did not ask", () => {
    // Sending Datawrapper's own default back to it is noise in the metadata and a second place for
    // the default to drift from theirs.
    expect(() => validateChartSpec(BASE)).not.toThrow();
    const payload = buildChartPayload({ ...BASE, data: [{ year: 2020, value: 1 }] });
    expect("size" in payload.metadata.visualize).toBe(false);
  });

  it("should reach the payload when a beat does ask", () => {
    const payload = buildChartPayload({ ...BASE, data: [{ year: 2020, value: 1 }], markSize: 8 });
    expect(payload.metadata.visualize.size).toBe(8);
  });

  it("should refuse the size that produced the defect", () => {
    // A spec may go bigger; it may not reproduce 2.5px.
    expect(() => validateChartSpec({ ...BASE, markSize: 2.5 })).toThrow(/under the 4px floor/);
    expect(() => validateChartSpec({ ...BASE, markSize: 0 })).toThrow(/positive number/);
    expect(() => validateChartSpec({ ...BASE, markSize: "big" })).toThrow(/positive number/);
  });
});
