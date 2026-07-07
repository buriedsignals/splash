import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";
import { ShapeMismatchError } from "../src/shape-validation";

const base = {
  title: "Urban wages pulled ahead of rural pay across every region",
  source: { name: "INSEE 2025", url: "https://insee.fr/x" },
  unit: "median monthly wage (€)",
};

describe("specToNativeConfig — grouped (wide CSV convention)", () => {
  it("maps every numeric column after the category into seriesFields", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "grouped",
      data: "region,urban,rural\nNorth,2400,1900\nSouth,2200,1800",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("grouped");
    expect(config.catField).toBe("region");
    expect(config.seriesFields).toEqual(["urban", "rural"]);
    expect((config.rows as unknown[]).length).toBe(2);
  });
  it("keeps a numeric first column as the category (not a series)", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "grouped",
      data: "year,urban,rural\n2019,2400,1900\n2020,2450,1950",
    };
    expect(specToNativeConfig(spec).config.seriesFields).toEqual([
      "urban",
      "rural",
    ]);
  });
  it("rejects a single-series CSV via the shape gate", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "grouped",
      data: "region,urban\nNorth,2400",
    };
    expect(() => specToNativeConfig(spec)).toThrow(ShapeMismatchError);
  });
});
