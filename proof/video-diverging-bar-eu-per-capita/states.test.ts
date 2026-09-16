import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the 1990 levels", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, level: 0, shrink: 0, flip: 0, zoom: 0, back: 0, focus: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1, level: 1 });
  });

  it("should shrink to 2024 at reveal, then flip into the changes and close onto the zero line at subject", () => {
    expect(reveal).toEqual({ ...reference, shrink: 1 });
    expect(subject).toEqual({ ...reveal, flip: 1, zoom: 1 });
  });

  it("should pull back, focus and set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, back: 1, focus: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
