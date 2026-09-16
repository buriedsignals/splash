import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then trace the world's 2000 ring", () => {
    expect(establish).toEqual({
      title: 1,
      world: 0,
      grow: 0,
      relabel: 0,
      split: 0,
      ring: 0,
      source: 0,
    });
    expect(reference).toEqual({ ...establish, title: 0, world: 1 });
  });

  it("should grow the ring to 2023 and relabel it at reveal, then split it into six rings at subject", () => {
    expect(reveal).toEqual({ ...reference, grow: 1, relabel: 1 });
    expect(subject).toEqual({ ...reveal, split: 1 });
  });

  it("should ring China with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, ring: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
