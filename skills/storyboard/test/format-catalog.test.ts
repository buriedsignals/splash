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
  // THE POPULATION IS THE CATALOGUE'S, NOT A LIST WRITTEN HERE. This used to assert
  // `chart` reaches exactly static/video/web, because issue #39 had withdrawn `chart/scrolly`: it
  // was advertised with the promise "an opaque prose card advances a fixed chart through explicit
  // steps", the one thing the scrolly skill says it does not do. The owner restored it on
  // 2026-09-16 with a promise the skill keeps, 40 scrolly beats shipped, and this test went on
  // measuring the withdrawn world. A frozen list cannot tell a regression from a decision; the
  // rows can, so the expectation is grouped out of `FORMAT_CATALOG` by a reading independent of
  // the `startsWith`/`slice` one `formatsFor` uses, and the deliberate absences are asserted as
  // absences rather than as the shape of what remains.
  const byMedium = new Map<string, string[]>();
  for (const pair of Object.keys(FORMAT_CATALOG)) {
    const [medium, format] = pair.split("/");
    byMedium.set(medium, [...(byMedium.get(medium) ?? []), format]);
  }

  it("should list every format the catalogue reaches for a medium", () => {
    expect(byMedium.size).toBeGreaterThan(1);
    for (const [medium, formats] of byMedium)
      expect([medium, formatsFor(medium).sort()]).toEqual([
        medium,
        [...formats].sort(),
      ]);
  });

  it("should never report a format reachable only for another medium", () => {
    const everyFormat = new Set([...byMedium.values()].flat());
    for (const [medium, formats] of byMedium) {
      const foreign = [...everyFormat].filter((f) => !formats.includes(f));
      expect([
        medium,
        formatsFor(medium).filter((f) => foreign.includes(f)),
      ]).toEqual([medium, []]);
    }
  });

  // image/web and image/video have no producer, and an ABSENT row is the point: the journalist is
  // told so AT THE FORMAT GATE rather than at the last phase. Held as the absence itself, so
  // adding a fourth image format does not fail this while adding an image producer still does.
  it("should not reach a format for image that no producer draws", () => {
    expect(formatsFor("image")).not.toContain("web");
    expect(formatsFor("image")).not.toContain("video");
  });

  it("should reach nothing at all for a medium the catalogue does not carry", () => {
    expect(formatsFor("hologram")).toEqual([]);
  });
});

// THE CATALOGUE AND THE GATE AGREE ON WHO TAKES A SIZE — issue #58. The catalogue used to say
// `image/static` requires a size while `sizeGap` refused any size for an image beat, and
// `proposeSizes` offered three sizes the gate then refused. Now `proposeSizes` reads the catalogue's
// `sizeRule`, and this holds that rule to `sizeGap`, pair by pair, in both directions.
describe("the catalogue's sizeRule and the gate's sizeGap are one rule", () => {
  it("should require a size exactly where the gate refuses a missing one, for every pair", async () => {
    const { sizeGap } = await import("../scripts/storyboard.mjs");
    const { proposeSizes } = await import("../scripts/propose.mjs");
    for (const [pair, row] of Object.entries(
      FORMAT_CATALOG as Record<string, any>,
    )) {
      const [medium, format] = pair.split("/");
      const gateWantsOne = sizeGap(medium, format, undefined, 1) !== null;
      expect([pair, "takes a size", row.sizeRule.kind === "required"]).toEqual([
        pair,
        "takes a size",
        gateWantsOne,
      ]);
      for (const size of proposeSizes(medium, format)) {
        expect([pair, size, sizeGap(medium, format, size, 1)]).toEqual([
          pair,
          size,
          null,
        ]);
      }
    }
  });
});
