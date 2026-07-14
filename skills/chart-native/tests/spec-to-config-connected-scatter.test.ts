import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";
const base = {
  title: "Unemployment and inflation traced a loop",
  source: { name: "BLS 2025", url: "https://bls.gov/x" },
  unit: "1980–2020",
};
describe("specToNativeConfig — connected-scatter (paired)", () => {
  it("uses col0 as the ordering label and the two measure columns as x/y (excluding col0)", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "connected-scatter",
      data: "year,unemployment,inflation\n1980,7.1,13.5\n1990,5.6,5.4\n2000,4.0,3.4",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("connected-scatter");
    expect(config.labelField).toBe("year");
    expect(config.xField).toBe("unemployment");
    expect(config.yField).toBe("inflation");
    expect(config.xLabel).toBe("unemployment");
    expect(config.yLabel).toBe("inflation");
  });
  it("does not treat a numeric year column as a measure axis", () => {
    const { config } = specToNativeConfig({
      ...base,
      nativeType: "connected-scatter",
      data: "year,x,y\n2000,1,2\n2001,3,4",
    });
    expect(config.xField).toBe("x");
    expect(config.yField).toBe("y");
  });
  it("humanizes raw snake_case measure headers into the axis titles", () => {
    const { config } = specToNativeConfig({
      ...base,
      nativeType: "connected-scatter",
      data: "year,unemployment_rate,inflation_rate\n1980,7.1,13.5\n1990,5.6,5.4",
    });
    expect(config.xLabel).toBe("Unemployment rate");
    expect(config.yLabel).toBe("Inflation rate");
  });
  it("passes an explicit spec.xLabel / spec.yLabel through unchanged", () => {
    const { config } = specToNativeConfig({
      ...base,
      nativeType: "connected-scatter",
      data: "year,unemployment_rate,inflation_rate\n1980,7.1,13.5\n1990,5.6,5.4",
      xLabel: "Unemployment (%)",
      yLabel: "Inflation (%)",
    });
    expect(config.xLabel).toBe("Unemployment (%)");
    expect(config.yLabel).toBe("Inflation (%)");
  });
});
