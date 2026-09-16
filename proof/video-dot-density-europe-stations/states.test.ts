import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then bring the stations in fuel by fuel", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, arrive: 0, focus: 0, named: 0, weight: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1, arrive: 1 });
  });

  it("should step the others back and name the 72 at reveal, then grow every dot to its weight at subject", () => {
    expect(reveal).toEqual({ ...reference, focus: 1, named: 1 });
    expect(subject).toEqual({ ...reveal, focus: 0, weight: 1 });
  });

  it("should set the credit at conclusion and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
