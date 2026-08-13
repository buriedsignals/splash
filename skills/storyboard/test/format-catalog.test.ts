import { describe, it, expect } from "bun:test";
import {
  FORMAT_CATALOG,
  formatGap,
  formatsFor,
} from "../scripts/format-catalog.mjs";

describe("formatGap", () => {
  it("should return null for every medium/format pair this toolchain can both produce and deliver", () => {
    for (const pair of Object.keys(FORMAT_CATALOG)) {
      const [medium, format] = pair.split("/");
      expect(formatGap(medium, format)).toBeNull();
    }
  });

  it("should name the format when the pair is not in the catalog at all", () => {
    const gap = formatGap("chart", "print");
    expect(gap).toContain("print");
    expect(gap).toContain("not one this toolchain can produce or deliver yet");
  });

  // The whole reason the key became a pair. `web` is a format this toolchain reaches for charts and
  // for maps but NOT for images, and before the pair form nothing could say so: a `medium: image`
  // slot naming format `web` passed the gate by matching a row built for charts.
  it("should refuse a format that is reachable for another medium but not for this one", () => {
    expect(formatGap("chart", "web")).toBeNull();
    expect(formatGap("map", "web")).toBeNull();
    const gap = formatGap("image", "web");
    expect(gap).toContain("image");
    expect(gap).toContain("web");
    // And it says what IS reachable, at the gate, rather than leaving the journalist to guess.
    expect(gap).toContain("static");
    expect(gap).toContain("scrolly");
  });

  it("should say which half is missing when given no medium or no format", () => {
    expect(formatGap(undefined, "static")).toContain("medium is missing");
    expect(formatGap("chart", undefined)).toContain("format is missing");
    expect(formatGap("chart", "")).toContain("format is missing");
  });

  it("should refuse a medium it produces nothing at all for", () => {
    expect(formatGap("hologram", "static")).toContain(
      "is not a medium this toolchain produces at all",
    );
  });

  // Direct coverage of the `delivered: false` branch — every real row in FORMAT_CATALOG today is
  // fully delivered, so this pins the branch by inserting a fixture row into the real catalog for
  // the duration of the test, rather than leaving the branch unverified until the day a producer
  // genuinely ships ahead of delivery again.
  it("should name the missing delivery path for a pair whose producer exists but isn't delivered", () => {
    FORMAT_CATALOG["chart/fixture"] = {
      producerSkill: "twin-chart-fixture",
      delivered: false,
    };
    try {
      expect(formatGap("chart", "fixture")).toBe(
        "chart beats in the fixture format have a producer (twin-chart-fixture) but no delivery path yet",
      );
    } finally {
      delete FORMAT_CATALOG["chart/fixture"];
    }
  });
});

describe("formatsFor", () => {
  it("should list every format reachable for a medium, and nothing from another medium", () => {
    expect(formatsFor("chart").sort()).toEqual([
      "scrolly",
      "static",
      "video",
      "web",
    ]);
    // image/web and image/video are deliberately absent — no producer exists, and the journalist
    // is told so AT THE FORMAT GATE rather than at the last phase.
    expect(formatsFor("image").sort()).toEqual(["scrolly", "static"]);
    expect(formatsFor("hologram")).toEqual([]);
  });
});
