import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table (median 132 km, last 688 km). */

const [establish, reference, reveal, subject, conclusion, hold] = statesFor({ MEDIAN: 132, LAST: 688 });

describe("statesFor", () => {
  it("should open on the title card alone, then the land and the key", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, level: 0, tint: 0, median: 0, summit: 0, source: 0 });
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1 });
  });

  it("should sweep to the median and land its number at reveal, then on to the last point and mark it at subject", () => {
    expect(reveal).toEqual({ ...reference, level: 132, tint: 1, median: 1 });
    expect(subject).toEqual({ ...reveal, level: 688, summit: 1 });
  });

  it("should withdraw the fill and set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, tint: 0, source: 1 });
    expect(hold).toEqual(conclusion);
  });
});
