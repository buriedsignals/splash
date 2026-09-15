import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the axes and the one column of countries", () => {
    expect(establish).toEqual({
      title: 1,
      furniture: 0,
      split: 0,
      rule: 0,
      fold: 0,
      bars: 0,
      stack: 0,
      times: 0,
      unfold: 0,
      source: 0,
    });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should unfold the column along income at reveal, then draw the break, fold, bar and stack at subject", () => {
    expect(reveal).toEqual({ ...reference, split: 1 });
    expect(subject).toEqual({
      ...reveal,
      rule: 1,
      fold: 1,
      bars: 1,
      stack: 1,
      times: 1,
    });
  });

  it("should unfold the cloud back with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, unfold: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
