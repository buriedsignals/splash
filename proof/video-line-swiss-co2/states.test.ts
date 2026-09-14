import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the furniture and the 1967 rule", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, trace: 0, subject: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should trace the line at reveal and name 2024 at subject", () => {
    expect(reveal).toEqual({ ...reference, trace: 1 });
    expect(subject).toEqual({ ...reveal, subject: 1 });
  });

  it("should set the credit at conclusion and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
