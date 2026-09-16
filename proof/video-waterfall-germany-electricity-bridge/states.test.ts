import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then grow 2015 and carry it to 2024", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, level: 0, carry: 0, split: 0, morph: 0, seat: 0, detach: 0, close: 0, bracket: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1, level: 1, carry: 1 });
  });

  it("should split and morph at reveal, then seat the names and detach the parts at subject", () => {
    expect(reveal).toEqual({ ...reference, split: 1, morph: 1 });
    expect(subject).toEqual({ ...reveal, seat: 1, detach: 1 });
  });

  it("should close the seams, bracket and set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, close: 1, bracket: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
