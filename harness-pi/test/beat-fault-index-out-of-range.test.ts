import { describe, expect, it } from "bun:test";
import { explainFaults } from "../craft/_shared/guards.mjs";

// gx-flow-map web (Gemma 12B, mvg119, 2026-11-19): data.json carries no population, so the page divides by two
// measures and `leaders` holds two entries. The beat kept the worked example's `c.leaders[2].name`, and six renders
// refused "undefined is not an object (evaluating 'c.leaders[2].name')" plus the keys the function receives — the
// key was there, so the model kept reading it, until 45 turns ran out. The fault now says how many entries it holds.
function fault() {
  const beat = { claimNote: (c: { leaders: { code: string; name: string }[] }) => `au km² c'est ${c.leaders[2].name}` };
  explainFaults(beat);
  try {
    beat.claimNote({ leaders: [{ code: "DEU", name: "Allemagne" }, { code: "MLT", name: "Malte" }] });
  } catch (error) {
    return String((error as Error).message);
  }
  return "";
}

describe("a beat function that reads past the end of an array it receives", () => {
  it("should say how many entries the array holds on this data", () => {
    expect(fault()).toContain("c.leaders holds 2 entries");
  });

  it("should show the entries it does hold", () => {
    expect(fault()).toContain("Malte");
  });
});
