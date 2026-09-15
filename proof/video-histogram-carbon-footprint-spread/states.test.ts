import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then trace every country along the axis", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, rug: 0, counts: 0, fall: 0, rule: 0, stack: 0, tailLabel: 0, tenths: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1, rug: 1 });
  });

  it("should drop the countries into their bins at reveal, then cut, stack the tail and cut tenths at subject", () => {
    expect(reveal).toEqual({ ...reference, counts: 1, fall: 1 });
    expect(subject).toEqual({ ...reveal, rule: 1, stack: 1, tailLabel: 1, tenths: 1 });
  });

  it("should close the tenths, send the tail back and set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, stack: 0, tailLabel: 0, tenths: 0, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
