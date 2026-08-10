import { describe, it, expect } from "bun:test";
import { fetchSwissCo2Since1950, buildCo2Spec } from "../scripts/prove-co2.mjs";
import { validateChartSpec } from "../scripts/validate-spec.mjs";

const FAKE_CSV = [
  "Entity,Code,Year,Annual CO₂ emissions",
  "Afghanistan,AFG,1949,14656",
  "Switzerland,CHE,1949,9000000",
  "Switzerland,CHE,1950,10251167",
  "Switzerland,CHE,1967,32527000",
  "Switzerland,CHE,2024,32071708",
].join("\n");

describe("fetchSwissCo2Since1950", () => {
  it("should keep only Switzerland rows from 1950 onward, converted to megatonnes", async () => {
    const fetchFn = async () => new Response(FAKE_CSV, { status: 200 });
    const rows = await fetchSwissCo2Since1950(fetchFn);
    expect(rows).toEqual([
      { year: 1950, co2Mt: 10.25 },
      { year: 1967, co2Mt: 32.53 },
      { year: 2024, co2Mt: 32.07 },
    ]);
  });

  it("should throw when the fetch fails, never fall back to fabricated data", async () => {
    const fetchFn = async () => new Response("nope", { status: 500 });
    await expect(fetchSwissCo2Since1950(fetchFn)).rejects.toThrow(
      /OWID fetch failed/,
    );
  });
});

describe("buildCo2Spec", () => {
  it("should build a spec that passes validation", () => {
    const spec = buildCo2Spec([{ year: 1950, co2Mt: 10.25 }]);
    expect(() => validateChartSpec(spec)).not.toThrow();
  });

  it("should pin the 1967 level as a labelled range annotation at 32.5", () => {
    const spec = buildCo2Spec([{ year: 1950, co2Mt: 10.25 }]);
    expect(spec.rangeAnnotations).toEqual([
      { value: 32.5, label: "Niveau de 1967 (32,5 Mt)" },
    ]);
  });

  it("should pin the confirmed takeaway, language and format from the brief", () => {
    const spec = buildCo2Spec([{ year: 1950, co2Mt: 10.25 }]);
    expect(spec.takeaway).toBe(
      "En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967.",
    );
    expect(spec.language).toBe("fr-FR");
    expect(spec.format).toBe("static");
    expect(spec.color).toBe("#0B7A75");
  });
});
