import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the rails and the 2000 values", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, travel: 0, france: 0, check: 0, release: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should draw the lines at reveal, then test every line against France at subject", () => {
    expect(reveal).toEqual({ ...reference, travel: 1 });
    expect(subject).toEqual({ ...reveal, france: 1, check: 1 });
  });

  it("should bring the whole chart back with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, release: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
