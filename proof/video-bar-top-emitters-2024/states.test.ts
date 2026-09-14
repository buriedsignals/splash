import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the ten names beside the empty axis", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, rise: 0, first: 0, stack: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should grow every bar at reveal and line the next five up at subject", () => {
    expect(reveal).toEqual({ ...reference, rise: 1, first: 1 });
    expect(subject).toEqual({ ...reveal, stack: 1 });
  });

  it("should set the credit at conclusion and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
