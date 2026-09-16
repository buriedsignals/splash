import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the row of 2000 bars cut into panels", () => {
    expect(establish).toEqual({
      title: 1,
      furniture: 0,
      level: 0,
      cut: 0,
      grow: 0,
      detach: 0,
      reorder: 0,
      back: 0,
      ring: 0,
      source: 0,
    });
    expect(reference).toEqual({
      ...establish,
      title: 0,
      furniture: 1,
      level: 1,
      cut: 1,
    });
  });

  it("should grow the 2024 bars at reveal, and detach and re-sort at subject", () => {
    expect(reveal).toEqual({ ...reference, grow: 1 });
    expect(subject).toEqual({ ...reveal, detach: 1, reorder: 1 });
  });

  it("should pull the gains back with the rings and the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, back: 1, ring: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
