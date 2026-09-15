import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor();

describe("statesFor", () => {
  it("should open on the title card alone, then grow the pyramid", () => {
    expect(establish).toEqual({
      title: 1,
      furniture: 0,
      grow: 0,
      fold: 0,
      common: 0,
      detach: 0,
      camera: 0,
      cross: 0,
      back: 0,
      rebuild: 0,
      source: 0,
    });
    expect(reference).toEqual({
      ...establish,
      title: 0,
      furniture: 1,
      grow: 1,
    });
  });

  it("should fold the halves and keep the difference at reveal, then magnify it and name the crossing at subject", () => {
    expect(reveal).toEqual({ ...reference, fold: 1, common: 1, detach: 1 });
    expect(subject).toEqual({ ...reveal, camera: 1, cross: 1 });
  });

  it("should pull back and rebuild the whole pyramid with the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, back: 1, rebuild: 1, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
