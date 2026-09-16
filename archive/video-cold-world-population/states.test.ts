import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the furniture", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, fill: 0, tint: 0, unit: 0, stack: 0, level: 0, zoom: 0, named: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should fill the surface at reveal, then make the unit, stack it, run the level, close in and ring the crossing at subject", () => {
    expect(reveal).toEqual({ ...reference, fill: 1 });
    expect(subject).toEqual({ ...reveal, tint: 1, unit: 1, stack: 1, level: 1, zoom: 1, named: 1 });
  });

  it("should pull back to the whole surface with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, tint: 0, zoom: 0, named: 0, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
