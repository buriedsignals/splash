import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the whole block", () => {
    expect(establish).toEqual({
      title: 1,
      whole: 0,
      split: 0,
      fill: 0,
      flood: 0,
      gather: 0,
      back: 0,
      ring: 0,
      source: 0,
    });
    expect(reference).toEqual({ ...establish, title: 0, whole: 1 });
  });

  it("should split the whole at reveal, and fill, flood and gather at subject", () => {
    expect(reveal).toEqual({ ...reference, split: 1 });
    expect(subject).toEqual({ ...reveal, fill: 1, flood: 1, gather: 1 });
  });

  it("should send the gathered cells home with the ring and the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, back: 1, ring: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
