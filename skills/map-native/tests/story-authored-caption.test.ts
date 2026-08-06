import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { applyMapArc } from "../src/map-story";

// ---------------------------------------------------------------------------
// ★ A GUIDED TOUR SHOWS THE SENTENCES IT DEMANDED — and for months it did not.
//
// Measured on Rémy's own run, 2026-08-06: he chose « visite guidée », confirmed a nine-step
// storyboard, and the video displayed none of it. The camera toured in his order and each place
// wrote its NAME on the map; his nine sentences appeared nowhere.
//
// The cause was one condition repeated in all six Story components: the caption card was drawn
// for every beat EXCEPT a `reveal`. Right for a DERIVED reveal, whose copy restates the name and
// value the map already writes on itself — and wrong for an AUTHORED one, whose copy is the
// journalist's own claim. `applyMapArc` has flagged the difference since it was written
// (`authored: true`, documented at length in map-story.ts) and not one component read it.
//
// This is the same failure the walk guard exists to prevent, on the far side of the guard: a walk
// was demanded, validated, and dropped at the render.
// ---------------------------------------------------------------------------
const DIR = join(import.meta.dir, "..", "src", "components");
const STORIES = () =>
  readdirSync(DIR).filter((f) => f.endsWith("Story.tsx"));

describe("the confirmed walk is marked, and the Story components honour the mark", () => {
  it("applyMapArc marks every beat it builds as authored", () => {
    const beats = applyMapArc(
      [
        { region: "A", role: "establish", text: "A ouvre." },
        { region: "B", role: "payoff", text: "B ferme." },
      ],
      (region) => ({
        camera: [0, 0, 1, 1],
        highlight: [region],
        name: region,
        value: "",
      }),
    );
    expect(beats.map((b) => b.authored)).toEqual([true, true]);
    // …and the copy IS the journalist's claim, not a derived "name — value".
    expect(beats.map((b) => b.copy)).toEqual(["A ouvre.", "B ferme."]);
  });

  it("every Story composition draws the caption for an AUTHORED reveal", () => {
    const without = STORIES().filter(
      (f) =>
        !readFileSync(join(DIR, f), "utf8").includes(
          'beat?.kind !== "reveal" || beat?.authored',
        ),
    );
    expect(without).toEqual([]);
    // Pinned so a seventh Story arrives here as a decision, not as a silent omission.
    expect(STORIES().length).toBe(6);
  });

  it("…and still suppresses it for a DERIVED reveal, which would only repeat the map", () => {
    for (const f of STORIES()) {
      const src = readFileSync(join(DIR, f), "utf8");
      // The exclusion is still there — widened, not deleted.
      expect({ f, keeps: src.includes('beat?.kind !== "title"') }).toEqual({
        f,
        keeps: true,
      });
    }
  });
});
