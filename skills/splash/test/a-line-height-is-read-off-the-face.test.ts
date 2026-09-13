/**
 * A FACE DECLARES THE LINE IT SETS ON, AND THE RENDER READS IT OUT OF THE FILE IT DRAWS WITH.
 *
 * Three tables can hold that height and they disagree. Browsers read `OS/2` typo metrics when the
 * face sets USE_TYPO_METRICS and `hhea` otherwise, and never `win` — which is what CSS
 * `line-height: normal` produces, so a static and a web beat set on the same line. Measured on the
 * seventeen cached families on 2026-09-13: where the bit is set, typo equals hhea; where it is not,
 * they part — Roboto 1.050 against 1.172 — and that face is the guard.
 */
import { describe, it, expect } from "bun:test";
import { naturalLineHeightOf } from "#shared/design-base/vertical-metrics.mjs";

describe("a face's natural line height", () => {
  it("should read the typo metrics of a face that sets USE_TYPO_METRICS", () => {
    expect(naturalLineHeightOf("Merriweather", 400)).toBeCloseTo(1.257, 3);
  });

  it("should read hhea rather than typo on a face that does not set USE_TYPO_METRICS", () => {
    expect(naturalLineHeightOf("Roboto", 400)).toBeCloseTo(1.172, 3);
  });

  it("should read the italic file when the register is italic", () => {
    expect(
      naturalLineHeightOf("Merriweather", 400, { italic: true }),
    ).toBeCloseTo(1.257, 3);
  });

  it("should refuse a family it has no file for", () => {
    expect(() => naturalLineHeightOf("No Such Family Anywhere", 400)).toThrow();
  });
});
