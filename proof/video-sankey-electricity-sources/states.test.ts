import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the whole bar", () => {
    expect(establish).toEqual({
      title: 1,
      whole: 0,
      split: 0,
      pour: 0,
      filter: 0,
      trace: 0,
      slide: 0,
      back: 0,
      mark: 0,
      source: 0,
    });
    expect(reference).toEqual({ ...establish, title: 0, whole: 1 });
  });

  it("should split and pour at reveal, then filter, trace and slide at subject", () => {
    expect(reveal).toEqual({ ...reference, split: 1, pour: 1 });
    expect(subject).toEqual({ ...reveal, filter: 1, trace: 1, slide: 1 });
  });

  it("should send the copy home with the mark and the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, back: 1, mark: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
