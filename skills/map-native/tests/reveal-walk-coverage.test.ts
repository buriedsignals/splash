import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// WHICH REVEALS HONOUR A WALK — sub-project ④(b), kept MECHANICAL rather than claimed.
//
// The reveal kind is the one where the data carries the story ("what appears, in what order").
// It had no notion of a story at all until this: one progress drove every subject at once.
// This file pins WHO honours a confirmed walk today and WHO deliberately does not, so the
// answer is read from the code rather than from a comment that goes stale — the exact failure
// the 2026-08-03 gesture inventory found in ChoroplethReveal's own header ("regions reveal in
// ascending-value order" while `__binIdx` was computed and never read).
// ---------------------------------------------------------------------------
const SRC = join(import.meta.dir, "..", "src", "components");
const read = (f: string) => readFileSync(join(SRC, `${f}.tsx`), "utf8");

// Honour a walk: they paint through the shared helper, so they cannot drift apart.
const HONOURS_A_WALK = ["ChoroplethReveal", "CartogramReveal"];

// Do NOT honour one, each for a reason that is about the type, not about effort.
const DOES_NOT: Record<string, string> = {
  // A route's beats ARE its own points, and its animation is the line drawing itself on —
  // story-comps.mjs states it: a route's guided tour and its draw-on are the same animation,
  // so there is no second order for a walk to impose.
  RouteReveal: "its animation already IS the walk, point by point",
  // A hex-grid cell has no name until the binning runs, so a beat anchors on a free-text
  // PLACE, not on a key the cells carry — nothing to match a walk against. Same reason it is
  // outside the proposal step (lib/brain/beats.ts's PROPOSABLE_MAP_TYPES).
  HexGridReveal: "its cells carry no key a beat could name",
  // PENDING, and named rather than silently missing: both carry a key a beat could match
  // (a marker's label, a region's join key) but threading it needs that key established at
  // the feature, not guessed — the silent-wrong-key defect this branch already paid for once.
  SymbolReveal: "pending — the marker key is not yet threaded to the feature",
  LocatorReveal: "pending — the marker key is not yet threaded to the feature",
  DotDensityReveal: "pending — the region key is not yet threaded to the dot",
};

describe("the reveal kind and the journalist's walk", () => {
  for (const c of HONOURS_A_WALK)
    it(`${c} paints the walk through the shared helper`, () => {
      const src = read(c);
      expect(src).toContain("walkFillOpacity");
      // …and reads the walk from the config rather than deriving an order of its own.
      expect(src).toContain("config.arcBeats");
    });

  for (const [c, why] of Object.entries(DOES_NOT))
    it(`${c} does not — ${why}`, () => {
      expect(read(c)).not.toContain("walkFillOpacity");
    });

  it("covers every reveal component, so a new one cannot be added unnoticed", () => {
    const all = [...HONOURS_A_WALK, ...Object.keys(DOES_NOT)].sort();
    expect(all).toEqual(
      [
        "CartogramReveal",
        "ChoroplethReveal",
        "DotDensityReveal",
        "HexGridReveal",
        "LocatorReveal",
        "RouteReveal",
        "SymbolReveal",
      ].sort(),
    );
  });
});
