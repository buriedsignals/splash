import { describe, it, expect } from "bun:test";
import { buildAdm1Index } from "./index-build";

function feature(props: Record<string, string | undefined>): GeoJSON.Feature {
  return {
    type: "Feature",
    properties: props,
    geometry: { type: "Point", coordinates: [0, 0] },
  };
}

describe("buildAdm1Index", () => {
  it("indexes iso_3166_2 under its own family, normalized to uppercase", () => {
    const idx = buildAdm1Index([
      feature({
        adm1_code: "CHE-159",
        adm0_a3: "CHE",
        iso_3166_2: "ch-ge",
        name: "Genève",
      }),
    ]);
    expect(idx["CH-GE"]).toEqual([
      { featureId: "CHE-159", family: "iso_3166_2" },
    ]);
  });

  it("indexes the accented French name and its unaccented form under the SAME normalized key — the fixture: 'Genève' vs 'Geneve'", () => {
    const idx = buildAdm1Index([
      feature({ adm1_code: "CHE-159", adm0_a3: "CHE", name: "Genève" }),
    ]);
    // NFD-decompose + strip diacritics + uppercase: "Genève" -> "GENEVE".
    expect(idx["GENEVE"]).toBeDefined();
    expect(idx["GENEVE"]!.some((m) => m.featureId === "CHE-159")).toBe(true);
  });

  it("keeps BOTH features under a colliding key — the fixture: two 'Buenos Aires' (spec D6, measured)", () => {
    const idx = buildAdm1Index([
      feature({
        adm1_code: "ARG-buenosaires-prov",
        adm0_a3: "ARG",
        name: "Buenos Aires",
      }),
      feature({ adm1_code: "ARG-caba", adm0_a3: "ARG", name: "Buenos Aires" }),
    ]);
    expect(idx["BUENOS AIRES"]).toHaveLength(2);
    const ids = idx["BUENOS AIRES"]!.map((m) => m.featureId).sort();
    expect(ids).toEqual(["ARG-buenosaires-prov", "ARG-caba"]);
  });

  it("falls back to a synthetic id when adm1_code is blank, rather than dropping the feature", () => {
    const idx = buildAdm1Index([
      feature({ adm0_a3: "XYZ", adm1_code: "", name: "Somewhere" }),
    ]);
    expect(idx["SOMEWHERE"]![0]!.featureId).toBe("XYZ-0");
  });
});
