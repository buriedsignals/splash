import { describe, it, expect } from "bun:test";
import { geometryMayBeInlined, assertGeoCreditPresent } from "./policy";

describe("geometryMayBeInlined", () => {
  it("returns true for every format today — Decision 1 (2026-07-28) written in code", () => {
    // The fixture element carrying the claim: an ODbL-declared geometry (French communes) at
    // the format the reserve in spec R1 is about — interactive. Decision 1 says TRUE here;
    // the day the OSMF answers in writing that a self-contained HTML conveys a derived
    // database, THIS is the line that flips to false for interactive/scrolly.
    expect(
      geometryMayBeInlined(
        { licence: "ODbL 1.0 (OpenStreetMap contributors)" },
        "interactive",
      ),
    ).toBe(true);
    expect(
      geometryMayBeInlined(
        { licence: "ODbL 1.0 (OpenStreetMap contributors)" },
        "scrolly",
      ),
    ).toBe(true);
    expect(
      geometryMayBeInlined(
        { licence: "ODbL 1.0 (OpenStreetMap contributors)" },
        "static",
      ),
    ).toBe(true);
    expect(
      geometryMayBeInlined(
        { licence: "ODbL 1.0 (OpenStreetMap contributors)" },
        "video",
      ),
    ).toBe(true);
  });
});

describe("assertGeoCreditPresent", () => {
  it("throws when geometry is declared and geoCredit is missing — the fixture: an OSM-sourced file with no credit threaded", () => {
    expect(() =>
      assertGeoCreditPresent(
        { licence: "ODbL 1.0 (OpenStreetMap contributors)" },
        undefined,
      ),
    ).toThrow(/credit/i);
  });

  it("throws when geoCredit.name is blank", () => {
    expect(() =>
      assertGeoCreditPresent({ licence: "ODbL 1.0" }, { name: "   " }),
    ).toThrow(/credit/i);
  });

  it("does not throw when geometry is declared and geoCredit is present", () => {
    expect(() =>
      assertGeoCreditPresent(
        { licence: "ODbL 1.0" },
        {
          name: "© OpenStreetMap contributors",
          url: "https://www.openstreetmap.org/copyright",
        },
      ),
    ).not.toThrow();
  });

  it("does not throw when no geometry was declared at all (a shipped basemap)", () => {
    expect(() => assertGeoCreditPresent(undefined, undefined)).not.toThrow();
  });
});
