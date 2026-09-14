import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the year ticks", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, flow: 0, focus: 0, mark: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should flow the stream at reveal, then focus solar and mark 2016 at subject", () => {
    expect(reveal).toEqual({ ...reference, flow: 1 });
    expect(subject).toEqual({ ...reveal, focus: 1, mark: 1 });
  });

  it("should bring the others back with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, focus: 0, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
