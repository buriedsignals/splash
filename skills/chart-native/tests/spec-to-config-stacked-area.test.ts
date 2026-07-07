// Wide-CSV mapper for `stacked-area` — same wide-CSV shape as stacked/grouped's
// mapper, but with `xField` (not `catField`): col0 → xField, every following
// numeric column → seriesFields (stack order, bottom → top).
import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";

const base = {
  title: "Renewables now supply the biggest slice of the grid",
  source: { name: "Ember 2025", url: "https://ember.org/x" },
  unit: "TWh",
};

describe("specToNativeConfig — stacked-area (wide)", () => {
  it("maps col0 to xField and every following numeric column to seriesFields (stack order)", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "stacked-area",
      data: "year,gas,coal,renewables\n2015,80,120,30\n2020,60,90,80\n2024,45,55,150",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("stacked-area");
    expect(config.xField).toBe("year");
    expect(config.seriesFields).toEqual(["gas", "coal", "renewables"]);
    expect((config.rows as unknown[]).length).toBe(3);
  });
});
