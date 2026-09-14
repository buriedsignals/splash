import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then land the cells and the key", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, count: 0, largest: 0, rate: 0, leader: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should class the cells by count and ring the largest at reveal, then re-class them per inhabitant and ring the leader at subject", () => {
    expect(reveal).toEqual({ ...reference, count: 1, largest: 1 });
    expect(subject).toEqual({ ...reveal, rate: 1, leader: 1 });
  });

  it("should set the credit at conclusion and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
