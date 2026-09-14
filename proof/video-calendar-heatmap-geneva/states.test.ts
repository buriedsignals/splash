import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the year as a temperature curve", () => {
    expect(establish).toEqual({ title: 1, curve: 0, drop: 0, grid: 0, filter: 0, trace: 0, unfilter: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, curve: 1 });
  });

  it("should drop the days into the calendar at reveal, then filter and trace the run at subject", () => {
    expect(reveal).toEqual({ ...reference, drop: 1, grid: 1 });
    expect(subject).toEqual({ ...reveal, filter: 1, trace: 1 });
  });

  it("should bring the colours back and set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, unfilter: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
