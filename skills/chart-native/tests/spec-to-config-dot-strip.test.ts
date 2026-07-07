import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";

const base = {
  title: "Wait times vary far more between clinics than within them",
  source: { name: "NHS 2025", url: "https://nhs.uk/x" },
  unit: "wait (days)",
};

describe("specToNativeConfig — dot-strip (single, raw observations)", () => {
  it("maps category + value and passes rows RAW (repeated categories preserved)", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "dot-strip",
      data: "clinic,days\nA,5\nA,9\nA,12\nB,3\nB,20\nB,7",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("dot-strip");
    expect(config.categoryField).toBe("clinic");
    expect(config.valueField).toBe("days");
    expect(Array.isArray(config.rows)).toBe(true);
    expect((config.rows as unknown[]).length).toBe(6); // NOT aggregated
  });
});
