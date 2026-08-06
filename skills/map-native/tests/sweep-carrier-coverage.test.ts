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
// The SHAPES are pinned too, because the rule is one device, not one device per component:
//   • "beat-order" — the carrier ORDERS THE REVEAL BEATS (orderRevealBeatsBySweep) and the beat
//     timeline that already flies the camera is the only clock. Each subject's entrance is
//     triggered by its own beat, so the camera is always where the reveal is.
//   • "entrance" — the component already staged each mark's own entrance, so the carrier hands it
//     a trigger frame per mark (sweepTriggerFrames) and `stagedEntrance` runs unchanged. The
//     carrier decides WHEN, never HOW.
//   • "expression" — the component paints its marks in bulk, so each mark's `__stop` is baked
//     onto its feature and compared against the sweep's progress inside ONE data-driven
//     expression. A per-mark setPaintProperty loop would issue hundreds of style mutations per
//     frame on a renderer that re-parses on each one.
//
// ★ "entrance" AND "expression" BOTH RUN A SECOND CLOCK — `sweepFrameWindow`, which spans the
// whole composition and has never heard of a beat. On the choropleth that was measured, on
// Rémy's own render (2026-08-06), to produce three defects at once: the camera left a region
// mid-entrance; regions lit outside the frame; regions sat on screen unlit. The choropleth is
// fixed here, by moving it to "beat-order". THE OTHER FIVE STILL CARRY IT. They are left in the
// table with their old shape rather than quietly re-labelled, because that is what this table is
// for: the gap is written down, so somebody decides about it. Each one needs its own render to
// confirm the same three defects and its own proof that the move fixed them — not a blind sweep
// of five components on the strength of one.
//
// Not listed here because it is not a Story component: RouteReveal, which is where the device
// came from — the `route` carrier is its own arrival fraction, computed from the line at produce
// time.
// ---------------------------------------------------------------------------
const DIR = join(import.meta.dir, "..", "src", "components");
const STORIES = () => readdirSync(DIR).filter((f) => f.endsWith("Story.tsx"));

type Coverage =
  | {
      sweeps: true;
      shape: "beat-order" | "entrance" | "expression";
      marks: string;
    }
  | { sweeps: false; whyNot: string };

const COVERAGE: Record<string, Coverage> = {
  "ChoroplethStory.tsx": {
    sweeps: true,
    shape: "beat-order",
    marks: "its regions — one per data row, each with a value and a place",
  },
  "SymbolStory.tsx": {
    sweeps: true,
    shape: "entrance",
    marks:
      "its points — each with a value AND coordinates, so it drives every derived carrier",
  },
  "LocatorStory.tsx": {
    sweeps: true,
    shape: "entrance",
    marks:
      "its markers — coordinates and no values, so `space` and `order` are what its data drives",
  },
  "DotDensityStory.tsx": {
    sweeps: true,
    shape: "expression",
    marks:
      "its regions — a dot is a unit of the quantity, not a subject, so a region's dots all carry its stop",
  },
  "CartogramStory.tsx": {
    sweeps: true,
    shape: "expression",
    marks:
      "its cells — one per region, carrying the value the cell's area already encodes",
  },
  "HexGridStory.tsx": {
    sweeps: true,
    shape: "expression",
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

  it("each sweeping type uses the shape its own painting calls for", () => {
    const wrong: string[] = [];
    for (const [file, entry] of Object.entries(COVERAGE)) {
      if (!entry.sweeps) continue;
      const src = readFileSync(join(DIR, file), "utf8");
      if (
        entry.shape === "beat-order" &&
        !src.includes("orderRevealBeatsBySweep(")
      )
        wrong.push(
          `${file}: beat-ordered type that does not order its beats by the carrier`,
        );
      // …and, the half that matters more: it must not have kept the second clock. A component
      // that both orders its beats AND runs `sweepFrameWindow` is back to two clocks.
      if (entry.shape === "beat-order" && src.includes("sweepFrameWindow("))
        wrong.push(
          `${file}: beat-ordered type still running a sweep clock of its own`,
        );
      if (entry.shape === "entrance" && !src.includes("sweepTriggerFrames("))
        wrong.push(
          `${file}: staged-entrance type without a per-mark trigger frame`,
        );
      if (entry.shape === "expression" && !src.includes('["get", "__stop"]'))
        wrong.push(`${file}: bulk-painted type without the __stop expression`);
    }
    expect(wrong).toEqual([]);
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
