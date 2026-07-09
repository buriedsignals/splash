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
  it("threads baseColor onto a SINGLE-HUE swarm (subject-fit colour) + outlier highlights", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "beeswarm",
      baseColor: "#E69F00", // amber — housing subject-fit
      highlights: ["Cologny", "Genthod"],
      // >5 distinct communes → high-cardinality → single-hue swarm (a dispersion, not
      // a per-category comparison), so the subject-fit baseColor applies.
      data: "commune,rent\nCologny,4200\nGenthod,3900\nVernier,1600\nOnex,1500\nCarouge,1900\nMeyrin,1700",
      unit: "monthly rent (CHF)",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.categories).toBeUndefined(); // commune is high-cardinality → single hue
    expect(config.baseColor).toBe("#E69F00");
    expect(config.highlight).toEqual(["Cologny", "Genthod"]);
  });

  it("does NOT thread baseColor onto a CATEGORISED swarm (palette drives colour there)", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "beeswarm",
      baseColor: "#E69F00",
      data: "level,salary\nJunior,80\nJunior,95\nSenior,180\nSenior,210",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.categories).toEqual(["Junior", "Senior"]);
    expect(config.baseColor).toBeUndefined();
  });

  it("falls back to the single `highlight` when `highlights` is absent", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "beeswarm",
      highlight: "Cologny",
      data: "commune,rent\nCologny,4200\nVernier,1600\nOnex,1500",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.highlight).toEqual(["Cologny"]);
  });

  it("omits categories and uses the column as a per-point label when the only text column exceeds 5 distinct", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "beeswarm",
      data: "company,revenue\nAcme,80\nBolt,95\nCog,110\nDyne,120\nEcho,130\nFizz,140\nGlyph,150",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.categories).toBeUndefined();
    const p0 = (config.points as { label?: string; category?: string }[])[0];
    expect(p0.label).toBe("Acme");
    expect(p0.category).toBeUndefined();
  });
});
