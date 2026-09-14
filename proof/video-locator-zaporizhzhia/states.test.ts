import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then show Europe with Ukraine named", () => {
    expect(establish).toEqual({ title: 1, country: 0, zoom: 0, regions: 0, names: 0, subject: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, country: 1 });
  });

  it("should zoom in, draw the regions and name the places at reveal, then name the station and count its capacity at subject", () => {
    expect(reveal).toEqual({ ...reference, zoom: 1, regions: 1, names: 1 });
    expect(subject).toEqual({ ...reveal, subject: 1 });
  });

  it("should set the credit at conclusion and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
