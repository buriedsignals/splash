import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then land the node and the scale", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, trace: 0, focus: 0, share: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should trace the bands at reveal, then step the others back and count the top two at subject", () => {
    expect(reveal).toEqual({ ...reference, trace: 1 });
    expect(subject).toEqual({ ...reveal, focus: 1, share: 1 });
  });

  it("should bring the others back and set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, focus: 0, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
