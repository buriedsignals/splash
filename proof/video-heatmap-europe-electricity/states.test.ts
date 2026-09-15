import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then grow the bars over the floor line", () => {
    expect(establish).toEqual({
      title: 1,
      grow: 0,
      floor: 0,
      split: 0,
      grid: 0,
      filter: 0,
      swap: 0,
      part: 0,
      routes: 0,
      source: 0,
    });
    expect(reference).toEqual({ ...establish, title: 0, grow: 1, floor: 1 });
  });

  it("should split the bars into the matrix at reveal, then filter, reorder and part the seven into routes at subject", () => {
    expect(reveal).toEqual({ ...reference, floor: 0, split: 1, grid: 1 });
    expect(subject).toEqual({
      ...reveal,
      filter: 1,
      swap: 1,
      part: 1,
      routes: 1,
    });
  });

  it("should bring the whole matrix back and set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...reveal, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
