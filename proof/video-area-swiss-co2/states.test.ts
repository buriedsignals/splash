import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the furniture", () => {
    expect(establish).toEqual({
      title: 1,
      furniture: 0,
      fill: 0,
      gauge: 0,
      sweep: 0,
      flatten: 0,
      named: 0,
      source: 0,
    });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should fill the surface at reveal, then sweep for the half and flatten both halves at subject", () => {
    expect(reveal).toEqual({ ...reference, fill: 1 });
    expect(subject).toEqual({
      ...reveal,
      gauge: 1,
      sweep: 1,
      flatten: 1,
      named: 1,
    });
  });

  it("should give the curve back with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, flatten: 0, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
