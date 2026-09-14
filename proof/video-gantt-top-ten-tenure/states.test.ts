import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the rows and their names", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, clock: 0, focus: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should run the clock at reveal and focus at subject", () => {
    expect(reveal).toEqual({ ...reference, clock: 1 });
    expect(subject).toEqual({ ...reveal, focus: 1 });
  });

  it("should set the credit at conclusion and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
