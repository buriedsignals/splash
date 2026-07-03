import { describe, it, expect } from "bun:test";
import { specToMetadata, resolveData } from "../src/spec-to-metadata";
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

  it("passes annotation align/dx/dy through so near-edge labels can anchor inward", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2026,7170",
      altInsight: "x",
      annotations: [
        { text: "Sawe", x: "2026", y: 7170, align: "tr", dx: -8, dy: -6 },
      ],
    } as any);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.align).toBe("tr");
    expect(ann.dx).toBe(-8);
    expect(ann.dy).toBe(-6);
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
