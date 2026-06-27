import { describe, it, expect } from "bun:test";
import {
  specToNativeConfig,
  UnsupportedNativeType,
  type NativeSpec,
} from "../src/spec-to-config";

const base = {
  title: "Brazil runs on renewables while most big economies still lag",
  source: { name: "Ember 2025", url: "https://ourworldindata.org/x" },
  unit: "share of electricity from renewables, 2024 (%)",
};

describe("specToNativeConfig — bar", () => {
  const spec: NativeSpec = {
    ...base,
    nativeType: "bar",
    data: "country,share\nBrazil,87.3\nIndia,19.8\nCanada,64.3",
    sort: "desc",
    highlight: "Brazil",
  };
  it("maps CSV → catField/valField + parsed rows", () => {
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("bar");
    expect(config.catField).toBe("country");
    expect(config.valField).toBe("share");
    expect((config.rows as unknown[]).length).toBe(3);
    expect((config.rows as Record<string, unknown>[])[0].share).toBe(87.3);
  });
  it("resolves a highlight category to its index AFTER the sort", () => {
    const { config } = specToNativeConfig(spec);
    // sorted desc: Brazil(87.3), Canada(64.3), India(19.8) → Brazil is index 0
    expect(config.highlightIndex).toBe(0);
  });
  it("omits highlightIndex when no highlight is given", () => {
    const { config } = specToNativeConfig({ ...spec, highlight: undefined });
    expect(config.highlightIndex).toBeUndefined();
  });
});

describe("specToNativeConfig — line", () => {
  it("infers a temporal x axis from year-like first column", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "line",
      data: "year,rate\n2018,5.1\n2019,4.8\n2020,6.2",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("line");
    expect(config.xField).toBe("year");
    expect(config.yField).toBe("rate");
    expect(config.xType).toBe("time");
    expect(config.directLabel).toBe("rate");
  });
  it("uses a linear x axis for non-temporal first column", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "line",
      data: "dose,response\n10,2.1\n20,3.4\n30,5.0",
    };
    expect(specToNativeConfig(spec).config.xType).toBe("linear");
  });
});

describe("specToNativeConfig — scatter", () => {
  it("uses the two numeric columns for x/y and the category as label", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "scatter",
      data: "school,spend,score\nNorthgate,5200,72\nEastfield,3100,58",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("scatter");
    expect(config.xField).toBe("spend");
    expect(config.yField).toBe("score");
    expect(config.labelField).toBe("school");
  });
});

describe("specToNativeConfig — pie", () => {
  it("maps to labelField/valueField", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "pie",
      data: "source,gwh\nHydro,420\nWind,180\nSolar,90",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("pie");
    expect(config.labelField).toBe("source");
    expect(config.valueField).toBe("gwh");
  });
});

describe("specToNativeConfig — unsupported", () => {
  it("throws UnsupportedNativeType for a type the mapper doesn't cover", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "sankey",
      data: "a,b\n1,2",
    };
    expect(() => specToNativeConfig(spec)).toThrow(UnsupportedNativeType);
  });
});
