import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the six names and the two series", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, wind: 0, solar: 0, focus: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should raise both series at reveal and keep the exception at subject", () => {
    expect(reveal).toEqual({ ...reference, wind: 1, solar: 1 });
    expect(subject).toEqual({ ...reveal, focus: 1 });
  });

  it("should set the credit at conclusion and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
