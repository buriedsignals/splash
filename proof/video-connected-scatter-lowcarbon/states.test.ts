import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the axes and the 2000 rings", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, travel: 0, zoom: 0, back: 0, lighter: 0, legs: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should travel at reveal and close onto the crowd at subject", () => {
    expect(reveal).toEqual({ ...reference, travel: 1 });
    expect(subject).toEqual({ ...reveal, zoom: 1 });
  });

  it("should pull back, pick out the five, split France's move and set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, back: 1, lighter: 1, legs: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
