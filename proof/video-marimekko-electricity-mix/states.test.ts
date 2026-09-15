import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then split the whole into its columns", () => {
    expect(establish).toEqual({
      title: 1,
      furniture: 0,
      split: 0,
      fill: 0,
      key: 0,
      focus: 0,
      pour: 0,
      label: 0,
      ring: 0,
      source: 0,
    });
    expect(reference).toEqual({
      ...establish,
      title: 0,
      furniture: 1,
      split: 1,
    });
  });

  it("should fill the mixes at reveal, then step back and pour the coal at subject", () => {
    expect(reveal).toEqual({ ...reference, fill: 1, key: 1 });
    expect(subject).toEqual({ ...reveal, focus: 1, pour: 1, label: 1 });
  });

  it("should return the coal, ring it and set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...reveal, ring: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
