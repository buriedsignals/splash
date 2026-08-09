import { describe, it, expect } from "bun:test";
import { GENRE_CATALOG, genreGap } from "../scripts/genre-catalog.mjs";

describe("genreGap", () => {
  it("should return null for every genre this toolchain can both produce and deliver", () => {
    for (const genre of Object.keys(GENRE_CATALOG)) {
      expect(genreGap(genre)).toBeNull();
    }
  });

  it("should name the genre when it is not in the catalog at all", () => {
    const gap = genreGap("print");
    expect(gap).toContain('"print"');
    expect(gap).toContain("not one this toolchain can produce or deliver yet");
  });

  it("should say the genre is missing when given no genre at all", () => {
    expect(genreGap(undefined)).toContain("genre is missing");
    expect(genreGap("")).toContain("genre is missing");
  });

  // Direct coverage of the `delivered: false` branch — every real row in GENRE_CATALOG today is
  // fully delivered, so this pins the branch by inserting a fixture row into the real catalog for
  // the duration of the test, rather than leaving the branch unverified until the day a producer
  // genuinely ships ahead of delivery again.
  it("should name the missing delivery path for a genre whose producer exists but isn't delivered", () => {
    GENRE_CATALOG.fixture = {
      producerSkill: "twin-chart-fixture",
      delivered: false,
    };
    try {
      expect(genreGap("fixture")).toBe(
        'genre "fixture" has a producer (twin-chart-fixture) but no delivery path yet',
      );
    } finally {
      delete GENRE_CATALOG.fixture;
    }
  });
});
