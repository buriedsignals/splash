import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then lay the readings out year by year", () => {
    expect(establish).toEqual({
      title: 1,
      furniture: 0,
      readings: 0,
      gather: 0,
      box: 0,
      lift: 0,
      walk: 0,
      release: 0,
      source: 0,
    });
    expect(reference).toEqual({
      ...establish,
      title: 0,
      furniture: 1,
      readings: 1,
    });
  });

  it("should gather the readings, draw the boxes out of them and lift them at reveal, then walk the medians at subject", () => {
    expect(reveal).toEqual({ ...reference, gather: 1, box: 1, lift: 1 });
    expect(subject).toEqual({ ...reveal, walk: 1 });
  });

  it("should release the walking median and set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, release: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
