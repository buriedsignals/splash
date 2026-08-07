import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// ★ WHICH MAP TYPES SWEEP — and, for any that does not, WHY NOT.
//
// The device this pins is one device: a continuous scalar advances and each mark lights up when
// it is reached (sweep-carrier.ts). It arrived carrying ONE carrier — a river drawing on — and so
// it reached exactly one map type. Rémy, 2026-08-06: « si on n'a pas de route ça ne marche plus,
// et nous on doit pouvoir adapter nos outils à tous les sujets. »
//
// A capability that reaches five of six types and says nothing about the sixth is the same defect
// in a smaller form: the gap is invisible, so nobody decides about it. This table is the decision,
// written down. Every `*Story.tsx` on disk must appear in it, and a seventh cannot be added
// without someone filling a line in — the same guard `story-authored-caption.test.ts` puts on the
// authored caption.
//
// The SHAPE is pinned too, because the rule is one device, not one device per component:
//   • "beat-order" — the carrier ORDERS THE REVEAL BEATS (orderRevealBeatsBySweep) and the beat
//     timeline that already flies the camera is the only clock. Each subject's entrance is
//     triggered by its own beat, so the camera is always where the reveal is.
//
// ★ AND IT IS THE ONLY SHAPE, NOW. There used to be two more — "entrance" (a trigger frame per
// mark, from `sweepTriggerFrames`) and "expression" (each mark's `__stop` baked onto its feature
// and compared against `sweptFraction` in one data-driven expression). Both ran a SECOND CLOCK,
// `sweepFrameWindow`, which spanned the whole composition and had never heard of a beat. On the
// choropleth that was measured, on Rémy's own render (2026-08-06), to produce three defects at
// once: the camera left a region mid-entrance; regions lit outside the frame; regions sat on
// screen unlit. The choropleth moved to "beat-order" first; the other five followed, each with
// its own render checking those same three defects by name (see
// docs/splash/proofs/2026-08-06-sweep-order-all/). `sweep-schedule.ts` was deleted with its last
// caller, so the second clock cannot come back by import — only by someone writing it again.
//
// Not listed here because it is not a Story component: RouteReveal, which is where the device
// came from — the `route` carrier is its own arrival fraction, computed from the line at produce
// time.
// ---------------------------------------------------------------------------
const DIR = join(import.meta.dir, "..", "src", "components");
const STORIES = () => readdirSync(DIR).filter((f) => f.endsWith("Story.tsx"));

type Coverage =
  | { sweeps: true; shape: "beat-order"; marks: string }
  | { sweeps: false; whyNot: string };

const COVERAGE: Record<string, Coverage> = {
  "ChoroplethStory.tsx": {
    sweeps: true,
    shape: "beat-order",
    marks: "its regions — one per data row, each with a value and a place",
  },
  "SymbolStory.tsx": {
    sweeps: true,
    shape: "beat-order",
    marks:
      "its points — each with a value AND coordinates, so it drives every derived carrier",
  },
  "LocatorStory.tsx": {
    sweeps: true,
    shape: "beat-order",
    marks:
      "its markers — coordinates and no values, so `space` and `order` are what its data drives",
  },
  "DotDensityStory.tsx": {
    sweeps: true,
    shape: "beat-order",
    marks:
      "its regions — a dot is a unit of the quantity, not a subject, so a region is what the walk visits",
  },
  "CartogramStory.tsx": {
    sweeps: true,
    shape: "beat-order",
    marks:
      "its cells — one per region, carrying the value the cell's area already encodes",
  },
  "HexGridStory.tsx": {
    sweeps: true,
    shape: "beat-order",
    marks:
      "its cells — anonymous bins, ordered by their own aggregate or by where they sit",
  },
};

describe("the sweep reaches every map type, or says why not", () => {
  it("names every Story component on disk, and no phantom", () => {
    expect(STORIES().sort()).toEqual(Object.keys(COVERAGE).sort());
    // Pinned so a seventh Story arrives here as a decision, not as a silent omission.
    expect(STORIES().length).toBe(6);
  });

  it("every type that claims to sweep reads the SHARED carrier, not a device of its own", () => {
    const failing: string[] = [];
    for (const [file, entry] of Object.entries(COVERAGE)) {
      if (!entry.sweeps) continue;
      const src = readFileSync(join(DIR, file), "utf8");
      // The config knob is offered…
      if (!src.includes("config.sweepCarrier"))
        failing.push(`${file}: no config.sweepCarrier`);
      // …and WHERE each mark sits comes from sweep-carrier.ts, never from a second computation
      // grown inside the component. This is the line that keeps five carriers one device.
      if (!src.includes("sweepStops("))
        failing.push(`${file}: does not call sweepStops`);
    }
    expect(failing).toEqual([]);
  });

  it("every sweeping type ORDERS ITS BEATS, and none of them runs a clock of its own", () => {
    const wrong: string[] = [];
    // Anything that would put a second clock back: the deleted schedule module's exports, and a
    // per-frame fraction or per-mark stop compared inside a paint expression. Names, not
    // behaviour — a grep is what keeps a component from quietly re-growing the shape that was
    // measured wrong, and the render proofs are what check the behaviour.
    const SECOND_CLOCK = [
      "sweep-schedule",
      "sweepFrameWindow(",
      "sweepTriggerFrames(",
      "sweptFraction(",
      '["get", "__stop"]',
    ];
    for (const [file, entry] of Object.entries(COVERAGE)) {
      if (!entry.sweeps) continue;
      const src = readFileSync(join(DIR, file), "utf8");
      if (!src.includes("orderRevealBeatsBySweep("))
        wrong.push(
          `${file}: sweeping type that does not order its beats by the carrier`,
        );
      for (const token of SECOND_CLOCK)
        if (src.includes(token))
          wrong.push(`${file}: back to two clocks — carries \`${token}\``);
    }
    expect(wrong).toEqual([]);
  });

  it("an explainer waits for the camera to LAND before the subject animates in", () => {
    // Defect (a): the camera left a region before its entrance had finished. The fix is one
    // opt-in on the trigger, and it is only correct if every sweeping type takes it.
    const missing = Object.entries(COVERAGE)
      .filter(([, e]) => e.sweeps)
      .filter(
        ([file]) =>
          !/atHoldStart:\s*!!config\.sweepCarrier/.test(
            readFileSync(join(DIR, file), "utf8"),
          ),
      )
      .map(([file]) => file);
    expect(missing).toEqual([]);
  });

  it("a type that does NOT sweep states why, and its code agrees", () => {
    for (const [file, entry] of Object.entries(COVERAGE)) {
      if (entry.sweeps) continue;
      // A refusal must be a sentence a journalist could read, not the word "unsupported"…
      expect({ file, why: entry.whyNot.length > 20 }).toEqual({
        file,
        why: true,
      });
      // …and it must be TRUE: a file that quietly grew the knob is no longer a refusal.
      const src = readFileSync(join(DIR, file), "utf8");
      expect({ file, wired: src.includes("config.sweepCarrier") }).toEqual({
        file,
        wired: false,
      });
    }
  });
});
