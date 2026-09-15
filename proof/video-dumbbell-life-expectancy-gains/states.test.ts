import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the axis, the names and the 2000 dots", () => {
    expect(establish).toEqual({
      title: 1,
      furniture: 0,
      travel: 0,
      reorder: 0,
      detach: 0,
      ring: 0,
      settle: 0,
      source: 0,
    });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should travel the dots at reveal, then re-rank, detach the gains and ring Poland at subject", () => {
    expect(reveal).toEqual({ ...reference, travel: 1 });
    expect(subject).toEqual({ ...reveal, reorder: 1, detach: 1, ring: 1 });
  });

  it("should settle the copies back with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, settle: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
