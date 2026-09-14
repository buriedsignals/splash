import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the empty calendar", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, fill: 0, filter: 0, trace: 0, unfilter: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should fill the year at reveal, then filter and trace the run at subject", () => {
    expect(reveal).toEqual({ ...reference, fill: 1 });
    expect(subject).toEqual({ ...reveal, filter: 1, trace: 1 });
  });

  it("should bring the colours back and set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, unfilter: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
