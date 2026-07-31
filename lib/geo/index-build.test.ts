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
      { featureId: "CHE-159", family: "iso_3166_2", country: "CHE" },
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

  // Task 15's own fixture: a cross-border name collision, the exact shape of the real "Jura"
  // (CH/FR) bug — each hit carries ITS OWN country, read straight off that feature's adm0_a3,
  // so a caller resolving a country scope (skills/map-native/src/geo-match.ts) can tell the two
  // apart without parsing featureId's own "ADM0-number" convention (unreliable — see the
  // top-of-file comment on this file's own Adm1IndexEntry type).
  it("carries each hit's own country under a name collision across a border — the 'Jura' (CH/FR) fixture", () => {
    const idx = buildAdm1Index([
      feature({ adm1_code: "CHE-160", adm0_a3: "CHE", name: "Jura" }),
      feature({ adm1_code: "FRA-5312", adm0_a3: "FRA", name: "Jura" }),
    ]);
    expect(idx["JURA"]).toHaveLength(2);
    const countries = idx["JURA"]!.map((m) => m.country).sort();
    expect(countries).toEqual(["CHE", "FRA"]);
  });
});
