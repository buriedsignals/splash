import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();
const blank = {
  title: 0,
  bar: 0,
  split: 0,
  stand: 0,
  trace: 0,
  settle: 0,
  draw: 0,
  zoom: 0,
  nuclear: 0,
  wind: 0,
  pair: 0,
  back: 0,
  release: 0,
  source: 0,
};

describe("statesFor", () => {
  it("should open on the title card alone, then stand Finland's bar on the rails", () => {
    expect(establish).toEqual({ ...blank, title: 1 });
    expect(reference).toEqual({
      ...blank,
      bar: 1,
      split: 1,
      stand: 1,
      trace: 1,
      settle: 1,
    });
  });

  it("should draw the other lines at reveal, then magnify and sweep both floors at subject", () => {
    expect(reveal).toEqual({ ...reference, draw: 1 });
    expect(subject).toEqual({
      ...reveal,
      zoom: 1,
      nuclear: 1,
      wind: 1,
      pair: 1,
    });
  });

  it("should pull back to the whole chart with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, back: 1, release: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
