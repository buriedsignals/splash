import { describe, expect, it } from "bun:test";
import {
  ISO3_TO_ISO2,
  MissingIso2CodesError,
  iso2CodesFor,
  iso2Of,
} from "#shared/map-beat/iso-codes.mjs";

describe("the canonical ISO A2 table", () => {
  it("should carry every country a shipped worked example's own local table needed", () => {
    // The union of the three worked examples' own hand-written ISO2 maps (cartogram, contour, hex-grid) plus
    // the ten codes the cold run had to add by hand — the exact gap this table exists to close.
    const usedElsewhere = [
      "ALB",
      "AUT",
      "BLR",
      "BEL",
      "BIH",
      "BGR",
      "HRV",
      "CYP",
      "CZE",
      "DNK",
      "EST",
      "FIN",
      "FRA",
      "DEU",
      "GRC",
      "HUN",
      "ISL",
      "IRL",
      "ITA",
      "LVA",
      "LTU",
      "LUX",
      "MLT",
      "MDA",
      "MNE",
      "NLD",
      "MKD",
      "NOR",
      "POL",
      "PRT",
      "ROU",
      "RUS",
      "SRB",
      "SVK",
      "SVN",
      "ESP",
      "SWE",
      "CHE",
      "TUR",
      "UKR",
      "GBR",
      "LIE",
    ];
    for (const code of usedElsewhere) expect(ISO3_TO_ISO2).toHaveProperty(code);
  });

  it("should return one country's own alpha-2 code", () => {
    expect(iso2Of("UKR")).toBe("UA");
  });

  it("should refuse an unrecognised code by name", () => {
    expect(() => iso2Of("ZZZ")).toThrow(MissingIso2CodesError);
    expect(() => iso2Of("ZZZ")).toThrow(/ZZZ/);
  });

  it("should validate a whole beat's country list in one call, returning every code in order", () => {
    expect(iso2CodesFor(["FRA", "DEU", "ITA"])).toEqual(["FR", "DE", "IT"]);
  });

  it("should report every missing code together, not one refusal at a time", () => {
    try {
      iso2CodesFor(["FRA", "ZZZ", "DEU", "YYY", "ITA"]);
      throw new Error("expected iso2CodesFor to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingIso2CodesError);
      expect(error.codes).toEqual(["ZZZ", "YYY"]);
      expect(error.message).toContain("ZZZ");
      expect(error.message).toContain("YYY");
    }
  });
});
