import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";

const base = {
  title: "Most trips finish in under 20 minutes",
  source: { name: "TfL 2025", url: "https://tfl.gov.uk/x" },
  unit: "trip duration (minutes)",
};

describe("specToNativeConfig — histogram (distribution)", () => {
  it("maps the single numeric column to valueField and passes rows through raw", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "histogram",
      data: "minutes\n8\n12\n15\n19\n22\n31",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("histogram");
    expect(config.valueField).toBe("minutes");
    expect((config.rows as unknown[]).length).toBe(6);
    expect(config.binWidth).toBeUndefined();
    expect(config.baseColor).toBeUndefined();
  });
  it("prefers valueUnit for the inline unit when present", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "histogram",
      valueUnit: "min",
      data: "minutes\n8\n12\n15",
    };
    expect(specToNativeConfig(spec).config.unit).toBe("min");
  });
});
