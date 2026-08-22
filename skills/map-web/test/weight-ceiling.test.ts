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
  ceilingFromPopulation,
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

/**
 * THE TWO CONSTANTS ARE DERIVED FROM THE POPULATION THEY CLAIM TO DESCRIBE, AND THIS IS WHERE THAT
 * IS ENFORCED.
 *
 * `MEASURED_MAX_BYTES` and `MARGIN_BYTES` are typed literals — deliberately, so a reader of the
 * script sees the numbers and a bump is a decision somebody made — but they are DESCRIPTIONS of a
 * population that moves under them every time a beat is re-rendered, and until 2026-08-22 nothing
 * checked that they still described it. They did not: `MEASURED_MAX_BYTES` stood at 1 809 942
 * (`mapgen-dot-web`) while `stories/real-owid-life-expectancy`'s 241-region world choropleth had
 * been sitting in the same discovered population at 2 015 174 bytes — 205 232 bytes HEAVIER than
 * the maximum the ceiling was said to be measured from. The ceiling still held, by luck, because
 * the margin happened to be wider than the drift; the sentence justifying it did not.
 *
 * That is this codebase's second-commonest defect shape — a population TYPED rather than DERIVED —
 * and the fix is the one the camera census and the frame ratchet already use: derive both numbers
 * from the population at test time and assert equality in BOTH directions. A page that grows, a
 * beat that is added, a plate that is re-baked lighter — each turns this red and forces a deliberate
 * re-record, rather than leaving a constant quietly describing a corpus that no longer exists.
 */
describe("the ceiling still describes the population it was measured from", () => {
  it("is exactly the heaviest page on disk, and the largest step already taken between two of them", () => {
    const sizes = discoverMapWebPages().map((page) => statSync(page.abs).size);
    const derived = ceilingFromPopulation(sizes);
    expect({
      measuredMax: MEASURED_MAX_BYTES,
      margin: MARGIN_BYTES,
      ceiling: CEILING_BYTES,
    }).toEqual(derived);
  });

  it("refuses a population it cannot measure a step in", () => {
    // One page is a population with no step between two pages, and a margin invented for it would
    // be exactly the round number this whole mechanism exists to refuse.
    expect(() => ceilingFromPopulation([1000])).toThrow(/at least two/);
    expect(() => ceilingFromPopulation([])).toThrow(/at least two/);
  });

  it("reads the step as the largest gap between ADJACENT sizes, not as max minus min", () => {
    // 100 200 210 400: the adjacent steps are 100, 10 and 190 — the largest is 190, not 300.
    expect(ceilingFromPopulation([400, 100, 210, 200])).toEqual({
      measuredMax: 400,
      margin: 190,
      ceiling: 590,
    });
  });
});
