import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then the furniture", () => {
    expect(establish).toEqual({
      title: 1,
      furniture: 0,
      flow: 0,
      aside: 0,
      magnify: 0,
      lines: 0,
      race: 0,
      source: 0,
    });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should flow the stream at reveal, then set the giants aside, magnify, turn to lines and race at subject", () => {
    expect(reveal).toEqual({ ...reference, flow: 1 });
    expect(subject).toEqual({
      ...reveal,
      aside: 1,
      magnify: 1,
      lines: 1,
      race: 1,
    });
  });

  it("should give the whole stream back with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({
      ...subject,
      aside: 0,
      magnify: 0,
      lines: 0,
      source: 1,
    });
    expect(hold).toEqual(conclusion);
  });
});
