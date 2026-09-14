import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the world as one bar", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, world: 0, drop: 0, camera: 0, stack: 0, tenth: 0, back: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1, world: 1 });
  });

  it("should drop the ten and close the scale at reveal, and line the next five up at subject", () => {
    expect(reveal).toEqual({ ...reference, drop: 1, camera: 1 });
    expect(subject).toEqual({ ...reveal, stack: 1 });
  });

  it("should slide the tenth into the gap, then return to the whole ranking with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, tenth: 1, back: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
