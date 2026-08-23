/**
 * THE DELIVERED FILE'S OWN WEIGHT, AGAINST WHAT THIS FORMAT'S BEATS ACTUALLY WEIGH TODAY.
 *
 * `image-beat`'s `checkWeight` refuses a beat about to embed more than 20 MB of raw photograph
 * bytes — a limit on what goes IN. Nothing has ever measured what comes OUT: the delivered file
 * itself, once every asset it inlines is already inside it. `weightAgainstCeiling` is that
 * measurement, and `CEILING_BYTES` (`../scripts/detect-weight-has-a-ceiling.mjs`) is this format's
 * own ceiling, set at the heaviest of the 18 delivered `chart-web` pages measured 2026-08-20.
 */
import { describe, expect, it } from "bun:test";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import { deliveredPages } from "../scripts/delivered-pages.mjs";
import { RECORDED_PAGES, pagesThatLeftTheWalk } from "./delivered-pages-ratchet.ts";
import {
  weightAgainstCeiling,
  CEILING_BYTES,
  MEASURED_MAX_BYTES,
  MARGIN_BYTES,
} from "../scripts/detect-weight-has-a-ceiling.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");

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
    expect(weightAgainstCeiling(MEASURED_MAX_BYTES + 1, CEILING_BYTES).over).toBe(false);
  });
});

/** Every delivered `chart-web` page on disk — the same discovery `test/keyboard-reach.test.ts` uses. */
/** Every delivered `chart-web` page on disk, from EVERY root a beat can live in — not only
 *  `proof/`.
 *
 *  This walk used to start at `PROOF` and go no further, so the population it measured was the
 *  beats the SKILL wrote for itself and never a beat a journalist made. Six chart-web beats live
 *  under `stories/` today and not one of them had ever been put to any of these four capabilities.
 *  The very first run of the widened walk found one: a delivered page with no accessible table at
 *  all, 10 marks and 10 missing, which `proof/` could not see by construction.
 *
 *  `deliveredPages` (`scripts/delivered-pages.mjs`) is the derivation, shared by all four walks so
 *  a fifth cannot disagree with them about what a chart-web beat is. */
function chartWebArtifacts(): string[] {
  return deliveredPages(TWIN);
}

describe("every chart-web page on disk", () => {
  it("weighs at or under this format's own measured ceiling", () => {
    const files = chartWebArtifacts();
    // A RATCHET OVER NAMES, NOT A COUNT. This walk once silently dropped a page (`web-co2-ranking`,
    // until the parent-directory lookup `deliveredPages` replaced), so a page LEAVING it must fail
    // loudly — but the `toBe(24)` this replaced could only say the total moved, stayed green on
    // one-in-one-out, and charged every shipped story a five-file edit indistinguishable from the
    // edit that papers the drop over. `RECORDED_PAGES` names the population instead: a page joins
    // freely and is measured by this loop from its first run, and one that leaves is named here.
    // Argued in full in `test/delivered-pages-ratchet.ts`.
    expect(pagesThatLeftTheWalk(RECORDED_PAGES, files, TWIN)).toEqual([]);
    const offenders: string[] = [];
    for (const file of files) {
      const bytes = statSync(file).size;
      const found = weightAgainstCeiling(bytes, CEILING_BYTES);
      if (found.over) offenders.push(`${file.slice(TWIN.length + 1)}: ${JSON.stringify(found)}`);
    }
    expect(offenders).toEqual([]);
  });
});
