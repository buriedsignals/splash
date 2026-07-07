import { describe, it, expect } from "bun:test";
import {
  specToNativeConfig,
  MAPPERS,
  type NativeSpec,
} from "../src/spec-to-config";

const base = {
  title: "Brazil runs on renewables while most big economies still lag",
  source: { name: "Ember 2025", url: "https://ourworldindata.org/x" },
  unit: "share of electricity from renewables, 2024 (%)",
};

describe("MAPPERS table", () => {
  it("exposes exactly the four legacy mappers plus grouped and histogram", () => {
    expect(Object.keys(MAPPERS).sort()).toEqual([
      "bar",
      "grouped",
      "histogram",
      "line",
      "pie",
      "scatter",
    ]);
  });
  it("bar config is byte-identical to the pre-table output", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "bar",
      data: "country,share\nBrazil,87.3\nIndia,19.8\nCanada,64.3",
      sort: "desc",
      highlight: "Brazil",
    };
    expect(specToNativeConfig(spec)).toEqual({
      type: "bar",
      config: {
        title: base.title,
        source: { name: "Ember 2025", url: "https://ourworldindata.org/x" },
        unit: base.unit,
        catField: "country",
        valField: "share",
        orientation: "horizontal",
        sort: "desc",
        highlightIndex: 0,
        rows: [
          { country: "Brazil", share: 87.3 },
          { country: "India", share: 19.8 },
          { country: "Canada", share: 64.3 },
        ],
      },
    });
  });
  it("throws a shape error for a supported type given a malformed CSV", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "bar",
      data: "country\nBrazil",
    };
    expect(() => specToNativeConfig(spec)).toThrow(/single/);
  });
});
