import { describe, expect, it } from "bun:test";
import { outputCap } from "../src/sessions.ts";

// Osaurus storyboard runs 4 and 5 (2026-11-11): the 12B looped on "<|channel>thought" in a talk turn. The harness
// cut it at 90 s, but Osaurus kept generating to the 16,384-token cap and the next turn queued behind it: about
// ten minutes lost per loop, and both runs reached their cap. Talk turns had written 695 tokens at most.
describe("outputCap", () => {
  it("should bound a storyboard turn far below the model's cap", () => {
    expect(outputCap("skill:storyboard", 16_384)).toBe(2_048);
  });

  it("should bound a persona turn the same way", () => {
    expect(outputCap("persona:editor", 16_384)).toBe(2_048);
  });

  it("should leave a craft session the model's cap, since it writes whole files", () => {
    expect(outputCap("skill:chart-beat", 16_384)).toBe(16_384);
  });

  it("should never raise a model cap that is already lower", () => {
    expect(outputCap("skill:deliver", 1_024)).toBe(1_024);
  });
});
