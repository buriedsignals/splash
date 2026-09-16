import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the 2000 stems", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, rise: 0, focus: 0, stack: 0, travel: 0, release: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1, rise: 1 });
  });

  it("should stack China's copies beside the American stem at reveal, and travel to 2023 at subject", () => {
    expect(reveal).toEqual({ ...reference, focus: 1, stack: 1 });
    expect(subject).toEqual({ ...reveal, travel: 1 });
  });

  it("should bring the whole chart back with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, release: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
