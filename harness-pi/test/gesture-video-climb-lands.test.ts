import { describe, expect, it } from "bun:test";
import { landedOf as lengthLanded } from "../craft/_shared/gesture-video.mjs";
import { landedOf as stackLanded } from "../craft/_shared/gesture-stack-video.mjs";
import { landedOf as pairedLanded } from "../craft/_shared/gesture-paired-video.mjs";

// gx-treemap video (12B, mvg68, 2026-11-18): a bracket over ten countries climbed 48.8, 57.4… 65.6 GW and the note
// took its place at progress 1, the one frame its tenth step would have landed: the true 65.8 GW was never on
// screen, and the last figure a viewer saw was false. The last step has to land while the climb is still showing.
const TEN = {
  steps: [48.8, 57.4, 59.9, 61.8, 63.5, 64.6, 65.1, 65.3, 65.6, 65.8],
};

describe.each([
  ["length, part and units video", lengthLanded],
  ["stack video", stackLanded],
  ["paired video", pairedLanded],
])("a climbing figure in the %s", (_, landedOf) => {
  it("should land its last step before the note takes over at progress 1", () => {
    expect(landedOf(TEN, 0.9)).toBe(TEN.steps.length);
  });

  it("should still show nothing before its first step lands", () => {
    expect(landedOf(TEN, 0)).toBe(0);
  });

  it("should land the steps in order on the way up", () => {
    expect(landedOf(TEN, 0.4)).toBeLessThan(landedOf(TEN, 0.7));
  });
});
