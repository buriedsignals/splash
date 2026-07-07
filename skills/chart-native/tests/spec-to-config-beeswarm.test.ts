import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";
const base = {
  title: "Salaries cluster low with a long tail",
  source: { name: "Levels 2025", url: "https://levels.fyi/x" },
  unit: "annual salary (k$)",
};
describe("specToNativeConfig — beeswarm (distribution)", () => {
  it("single numeric column → points only, no categories, valueLabel from unit", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "beeswarm",
      data: "salary\n80\n95\n110\n300",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("beeswarm");
    expect(config.valueLabel).toBe(base.unit);
    expect(config.categories).toBeUndefined();
    expect((config.points as unknown[]).length).toBe(4);
    expect((config.points as { value: number }[])[0].value).toBe(80);
  });
  it("category + value → low-cardinality text col becomes the grouping category", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "beeswarm",
      data: "level,salary\nJunior,80\nJunior,95\nSenior,180\nSenior,210",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.categories).toEqual(["Junior", "Senior"]);
    expect((config.points as { category?: string }[])[0].category).toBe(
      "Junior",
    );
  });
  it("picks the FEWER-distinct text column as category and the other as per-point label", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "beeswarm",
      data: "name,team,salary\nAda,A,80\nBob,B,95\nCy,A,110\nDee,B,130",
    };
    const { config } = specToNativeConfig(spec);
    // team has 2 distinct, name has 4 → team is the category
    expect(config.categories).toEqual(["A", "B"]);
    const p0 = (config.points as { label?: string; category?: string }[])[0];
    expect(p0.category).toBe("A");
    expect(p0.label).toBe("Ada");
  });
});
