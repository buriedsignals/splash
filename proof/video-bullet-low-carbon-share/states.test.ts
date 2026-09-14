import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the six empty tracks", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, before: 0, after: 0, reorder: 0, half: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should draw both years at reveal and re-sort by gain at subject", () => {
    expect(reveal).toEqual({ ...reference, before: 1, after: 1 });
    expect(subject).toEqual({ ...reveal, reorder: 1 });
  });

  it("should drop the half line with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, half: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
