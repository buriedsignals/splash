import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then each country's whole mix", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, mix: 0, others: 0, split: 0, camera: 0, compare: 0, focus: 0, release: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1, mix: 1 });
  });

  it("should take wind and solar out of the mix and close the scale at reveal, then compare and keep the exception at subject", () => {
    expect(reveal).toEqual({ ...reference, others: 1, split: 1, camera: 1 });
    expect(subject).toEqual({ ...reveal, compare: 1, focus: 1 });
  });

  it("should bring the whole chart back with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, release: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
