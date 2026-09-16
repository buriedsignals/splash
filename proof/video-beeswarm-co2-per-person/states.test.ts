import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the axis, the average and the one world disc", () => {
    expect(establish).toEqual({
      title: 1,
      furniture: 0,
      split: 0,
      ring: 0,
      ghost: 0,
      gather: 0,
      share: 0,
      settle: 0,
      source: 0,
    });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should burst the disc into its countries at reveal, then ring, bring the outline back and gather the six at subject", () => {
    expect(reveal).toEqual({ ...reference, split: 1 });
    expect(subject).toEqual({
      ...reveal,
      ring: 1,
      ghost: 1,
      gather: 1,
      share: 1,
    });
  });

  it("should settle the copies back with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, settle: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
