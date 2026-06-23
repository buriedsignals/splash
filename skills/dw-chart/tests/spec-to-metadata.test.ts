import { describe, it, expect } from "bun:test";
import { specToMetadata } from "../src/spec-to-metadata";
import type { ChartSpec } from "../src/chart-spec";

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
  it("applies the base colour and direct labels", () => {
    const p = specToMetadata(spec);
    expect(p.metadata.visualize["base-color"]).toBe("#0072B2");
    expect(p.metadata.visualize["value-labels"]).toEqual({ show: true });
  });
  it("omits optional fields when absent", () => {
    const p = specToMetadata({
      type: "column-chart",
      title: "T",
      data: "a,b\n1,2",
      altInsight: "x",
    });
    expect(p.metadata.visualize["base-color"]).toBeUndefined();
    expect(p.metadata.describe["number-format"]).toBeUndefined();
  });
});
