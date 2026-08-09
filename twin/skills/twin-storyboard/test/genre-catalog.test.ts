import { describe, it, expect } from "bun:test";
import {
  GENRE_CATALOG,
  genreGap,
  genresFor,
} from "../scripts/genre-catalog.mjs";

describe("genreGap", () => {
  it("should return null for every medium/genre pair this toolchain can both produce and deliver", () => {
    for (const pair of Object.keys(GENRE_CATALOG)) {
      const [medium, genre] = pair.split("/");
      expect(genreGap(medium, genre)).toBeNull();
    }
  });

  it("should name the genre when the pair is not in the catalog at all", () => {
    const gap = genreGap("chart", "print");
    expect(gap).toContain("print");
    expect(gap).toContain("not one this toolchain can produce or deliver yet");
  });

  // The whole reason the key became a pair. `web` is a genre this toolchain reaches for charts and
  // for maps but NOT for images, and before the pair form nothing could say so: a `medium: image`
  // slot naming genre `web` passed the gate by matching a row built for charts.
  it("should refuse a genre that is reachable for another medium but not for this one", () => {
    expect(genreGap("chart", "web")).toBeNull();
    expect(genreGap("map", "web")).toBeNull();
    const gap = genreGap("image", "web");
    expect(gap).toContain("image");
    expect(gap).toContain("web");
    // And it says what IS reachable, at the gate, rather than leaving the journalist to guess.
    expect(gap).toContain("static");
    expect(gap).toContain("scrolly");
  });

  it("should say which half is missing when given no medium or no genre", () => {
    expect(genreGap(undefined, "static")).toContain("medium is missing");
    expect(genreGap("chart", undefined)).toContain("genre is missing");
    expect(genreGap("chart", "")).toContain("genre is missing");
  });

  it("should refuse a medium it produces nothing at all for", () => {
    expect(genreGap("hologram", "static")).toContain(
      "is not a medium this toolchain produces at all",
    );
  });

  // Direct coverage of the `delivered: false` branch — every real row in GENRE_CATALOG today is
  // fully delivered, so this pins the branch by inserting a fixture row into the real catalog for
  // the duration of the test, rather than leaving the branch unverified until the day a producer
  // genuinely ships ahead of delivery again.
  it("should name the missing delivery path for a pair whose producer exists but isn't delivered", () => {
    GENRE_CATALOG["chart/fixture"] = {
      producerSkill: "twin-chart-fixture",
      delivered: false,
    };
    try {
      expect(genreGap("chart", "fixture")).toBe(
        "chart beats in the fixture genre have a producer (twin-chart-fixture) but no delivery path yet",
      );
    } finally {
      delete GENRE_CATALOG["chart/fixture"];
    }
  });
});

describe("genresFor", () => {
  it("should list every genre reachable for a medium, and nothing from another medium", () => {
    expect(genresFor("chart").sort()).toEqual([
      "scrolly",
      "static",
      "video",
      "web",
    ]);
    // image/web and image/video are deliberately absent — no producer exists, and the journalist
    // is told so AT THE GENRE GATE rather than at the last phase.
    expect(genresFor("image").sort()).toEqual(["scrolly", "static"]);
    expect(genresFor("hologram")).toEqual([]);
  });
});
