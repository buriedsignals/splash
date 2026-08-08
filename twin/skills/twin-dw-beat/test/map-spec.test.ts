import { describe, it, expect } from "bun:test";
import {
  buildChartPayload,
  buildTextAnnotation,
  buildRangeAnnotation,
} from "../scripts/map-spec.mjs";

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

  it("should honour an explicit style override", () => {
    const annotation = buildTextAnnotation(
      { x: 1, text: "t", align: "br", color: "#111111", dy: -6 },
      "id",
    );
    expect(annotation.align).toBe("br");
    expect(annotation.color).toBe("#111111");
    expect(annotation.dy).toBe(-6);
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

  it("should colour the value column with the house colour via custom-colors", () => {
    const payload = buildChartPayload(baseSpec());
    expect(payload.metadata.visualize["custom-colors"]).toEqual({
      co2Mt: "#0B7A75",
    });
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
