/**
 * EUROSTAT DOES NOT USE ISO FOR TWO OF ITS OWN MEMBERS.
 *
 * It writes EL for Greece and UK for the United Kingdom, where ISO 3166-1 says GR and GB. A join
 * that assumes Eurostat's `geo` column is ISO loses both without saying so — the country simply
 * matches no shape and renders as "no data".
 *
 * Measured 2026-09-23 freezing `ilc_di12`, the EU's own inequality series, against this tree's
 * Europe geometry: Greece matched nothing and nothing anywhere said why. A European newsroom's
 * commonest single source is Eurostat, so the exceptions belong in the shared table rather than in
 * each beat that meets them — which is the same argument that put the ISO table here in the first
 * place, after three worked examples had each written their own partial copy.
 */
import { describe, expect, it } from "bun:test";
import { EUROSTAT_TO_ISO2, iso2OfEurostat, iso3OfEurostat } from "#shared/map-beat/iso-codes.mjs";

describe("Eurostat's geo codes", () => {
  it("carries the two that are not ISO, and only those two", () => {
    expect(EUROSTAT_TO_ISO2).toEqual({ EL: "GR", UK: "GB" });
  });

  it("turns Greece's EL into the code a map is actually drawn on", () => {
    expect(iso2OfEurostat("EL")).toBe("GR");
    expect(iso3OfEurostat("EL")).toBe("GRC");
  });

  it("turns the United Kingdom's UK into GB and GBR", () => {
    expect(iso2OfEurostat("UK")).toBe("GB");
    expect(iso3OfEurostat("UK")).toBe("GBR");
  });

  it("leaves every other code alone, because for every other code Eurostat IS ISO", () => {
    for (const code of ["DE", "BG", "SK", "FR", "PL"]) expect(iso2OfEurostat(code)).toBe(code);
    expect(iso3OfEurostat("BG")).toBe("BGR");
    expect(iso3OfEurostat("SK")).toBe("SVK");
  });

  it("refuses a code with no ISO alpha-3 by naming the three worth checking first", () => {
    // XK is Eurostat's own for Kosovo and has no ISO 3166-1 code at all.
    expect(() => iso3OfEurostat("XK")).toThrow(/EL for Greece and UK for the United Kingdom/);
    expect(() => iso3OfEurostat("XK")).toThrow(/XK for\s+Kosovo/);
  });

  it("maps every EU27 member onto a shape key, which is what a European beat actually needs", () => {
    const EU27 = "AT BE BG HR CY CZ DK EE FI FR DE EL HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" ");
    expect(EU27.map(iso3OfEurostat).filter(Boolean)).toHaveLength(27);
  });
});
