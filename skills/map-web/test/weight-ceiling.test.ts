/**
 * THE SAME MEASUREMENT AS `chart-web/test/weight-ceiling.test.ts`, ON THIS FORMAT'S OWN FILES.
 *
 * `weightAgainstCeiling` is generic; `CEILING_BYTES` (`../scripts/detect-weight-has-a-ceiling.mjs`)
 * is this format's own — set at the heaviest of the 6 delivered pages `discoverMapWebPages()`
 * (`../scripts/discover-pages.mjs`) finds, the same discovery every other sweep in this format uses.
 */
import { describe, expect, it } from "bun:test";
import { statSync } from "node:fs";
import {
  weightAgainstCeiling,
  CEILING_BYTES,
  MEASURED_MAX_BYTES,
  MARGIN_BYTES,
} from "../scripts/detect-weight-has-a-ceiling.mjs";
import { discoverMapWebPages, TWIN } from "../scripts/discover-pages.mjs";

describe("weightAgainstCeiling", () => {
  it("says a file under the ceiling is not over", () => {
    expect(weightAgainstCeiling(100, 200)).toEqual({
      bytes: 100,
      ceiling: 200,
      over: false,
    });
  });

  it("says a file over the ceiling is over", () => {
    expect(weightAgainstCeiling(300, 200)).toEqual({
      bytes: 300,
      ceiling: 200,
      over: true,
    });
  });

  it("does not count a file sitting exactly on the ceiling as over", () => {
    expect(weightAgainstCeiling(200, 200).over).toBe(false);
  });
});

describe("this format's ceiling carries a margin above today's measured maximum", () => {
  it("states both numbers, and the ceiling is exactly their sum", () => {
    expect(MARGIN_BYTES).toBeGreaterThan(0);
    expect(CEILING_BYTES).toBe(MEASURED_MAX_BYTES + MARGIN_BYTES);
  });

  // RULED 2026-08-20: a ceiling set at EXACTLY today's champion has no margin — the next delivered
  // beat one byte heavier than `MEASURED_MAX_BYTES` used to trip this guard on ordinary growth.
  it("does not trip on a file one byte heavier than today's measured maximum", () => {
    expect(
      weightAgainstCeiling(MEASURED_MAX_BYTES + 1, CEILING_BYTES).over,
    ).toBe(false);
  });
});

describe("every map-web page on disk", () => {
  it("weighs at or under this format's own measured ceiling", () => {
    // DISCOVERED, not listed — see `scripts/discover-pages.mjs`'s own header note: this used to
    // walk 4 hardcoded directories and silently skip 2 of the format's 6 delivered pages.
    //
    // NINE, not seven: `stress-ab-emigration-flows`'s `where-the-routes-lead` beat ships a
    // delivered page and its export copy, both genuinely new map-web pages (round six). The two
    // before them were `stress-f-housing-pressure`'s `housing-pressure-choropleth` (2026-08-20/21).
    // This count is an exact ratchet on purpose — the next beat is expected to redden it too,
    // bumped deliberately rather than widened into a floor.
    const files = discoverMapWebPages().map((page) => page.abs);
    expect(files.length).toBe(10);
    const offenders: string[] = [];
    for (const file of files) {
      const bytes = statSync(file).size;
      const found = weightAgainstCeiling(bytes, CEILING_BYTES);
      if (found.over)
        offenders.push(
          `${file.slice(TWIN.length + 1)}: ${JSON.stringify(found)}`,
        );
    }
    expect(offenders).toEqual([]);
  });
});
