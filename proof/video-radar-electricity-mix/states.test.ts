import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then grow the two bars on one TWh scale", () => {
    expect(establish).toEqual({
      title: 1,
      bars: 0,
      stretch: 0,
      cut: 0,
      grid: 0,
      fly: 0,
      close: 0,
      ring: 0,
      source: 0,
    });
    expect(reference).toEqual({ ...establish, title: 0, bars: 1 });
  });

  it("should stretch and cut the bars at reveal, then carry them onto the wheel at subject", () => {
    expect(reveal).toEqual({ ...reference, stretch: 1, cut: 1 });
    expect(subject).toEqual({ ...reveal, grid: 1, fly: 1 });
  });

  it("should close the outlines, ring nuclear and credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, close: 1, ring: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
