// Wide-CSV mapper for `stacked` — byte-identical shape to grouped's mapper
// (spec-to-config-grouped.test.ts): col0 → catField, every following numeric
// column → seriesFields (stack order, bottom → top).
import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";

const base = {
  title: "Renewables now supply the biggest slice of the grid",
  source: { name: "Ember 2025", url: "https://ember.org/x" },
  unit: "TWh",
};

describe("specToNativeConfig — stacked (wide)", () => {
  it("maps col0 to catField and every following numeric column to seriesFields (stack order)", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "stacked",
      data: "year,hydro,wind,solar\n2020,120,60,20\n2024,130,110,90",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("stacked");
    expect(config.catField).toBe("year");
    expect(config.seriesFields).toEqual(["hydro", "wind", "solar"]);
    expect((config.rows as unknown[]).length).toBe(2);
  });
});
