import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then stand every country on the axis", () => {
    expect(establish).toEqual({
      title: 1,
      furniture: 0,
      sweep: 0,
      cuts: 0,
      split: 0,
      gather: 0,
      counts: 0,
      close: 0,
      ring: 0,
      source: 0,
    });
    expect(reference).toEqual({
      ...establish,
      title: 0,
      furniture: 1,
      sweep: 1,
    });
  });

  it("should cut and part the axis at reveal, then gather and count the blocks at subject", () => {
    expect(reveal).toEqual({ ...reference, cuts: 1, split: 1 });
    expect(subject).toEqual({ ...reveal, gather: 1, counts: 1 });
  });

  it("should close the parts into the pictogram, ring the middle's count and set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, close: 1, ring: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
