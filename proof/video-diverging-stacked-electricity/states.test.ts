import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then grow the whole bars", () => {
    expect(establish).toEqual({
      title: 1,
      furniture: 0,
      grow: 0,
      slide: 0,
      focus: 0,
      split: 0,
      carry: 0,
      sum: 0,
      ring: 0,
      source: 0,
    });
    expect(reference).toEqual({
      ...establish,
      title: 0,
      furniture: 1,
      grow: 1,
    });
  });

  it("should re-anchor at reveal, then step back, part and compare France at subject", () => {
    expect(reveal).toEqual({ ...reference, slide: 1 });
    expect(subject).toEqual({
      ...reveal,
      focus: 1,
      split: 1,
      carry: 1,
      sum: 1,
    });
  });

  it("should close France's bar, ring its nuclear and set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...reveal, ring: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
