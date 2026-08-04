// Parity guard (feedback→système): every INTERACTION-TRIGGERED camera animation in this
// engine's browser renderers must be disableable by the reader's OS setting — WCAG 2.3.3
// (Animation from Interactions). The reader still gets the information (the destination
// camera), just without the tween getting there.
//
// WHY A SOURCE SCAN, and not a mounted map: MapTiler needs a real WebGL context, and the
// behaviour under test is a BRANCH taken at click time on a live map instance. The same
// reason symbol-labels-parity.test.ts scans source.
//
// WHAT THIS CAUGHT (registry E3, the §5-§8 audit of interactive-map-best-practices.md):
// `lib/core/motion.ts`'s own header listed "map-native's interaction-triggered eases
// (LocatorMap.tsx cluster zoom)" among its clients — and LocatorMap.tsx did not import it.
// The engine's §7 checklist claimed reduced-motion as enforceable; chart-native and scrolly
// each implement it WITH a snap test, map-native had neither. A prose claim naming a client
// that does not exist is the exact drift this project pins mechanically instead of asserting.
//
// SCOPE — deliberately the browser renderers only. The Remotion video components ease and fly
// on purpose: that is baked motion the reader chose to play, exempt under 2.3.3's "essential"
// carve-out, and `prefersReducedMotion()` returns false in Node anyway (motion.ts:10-13).
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(import.meta.dir, "..", "src");

// The browser renderers: what a reader pans, zooms and clicks. `*Reveal/Story/Scrolly.tsx`
// (Remotion) are out of scope per the header.
const BROWSER_RENDERERS: Record<string, string> = {
  "LocatorMap (markers, clustering)": join(SRC_DIR, "LocatorMap.tsx"),
  "ChoroplethMap (regions)": join(SRC_DIR, "ChoroplethMap.tsx"),
  "SymbolMap (proportional symbols)": join(SRC_DIR, "SymbolMap.tsx"),
  "HexGridMap (spatial bins)": join(SRC_DIR, "HexGridMap.tsx"),
  "CartogramMap (value-scaled regions)": join(SRC_DIR, "CartogramMap.tsx"),
  "DotDensityMap (dots)": join(SRC_DIR, "DotDensityMap.tsx"),
  "RouteMap (path)": join(SRC_DIR, "RouteMap.tsx"),
};

// `flyTo` and `easeTo` tween the camera; `jumpTo` does not. Only the tweening pair needs a
// guard, and naming them here rather than "any camera call" keeps the guard honest about
// what it is asserting.
const TWEENING_CALLS = /\.(flyTo|easeTo)\s*\(/g;

function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("interaction-triggered camera motion honours prefers-reduced-motion", () => {
  for (const [label, path] of Object.entries(BROWSER_RENDERERS)) {
    it(`${label} — a tweening camera call implies the reduced-motion guard`, () => {
      const src = withoutComments(readFileSync(path, "utf8"));
      const tweens = src.match(TWEENING_CALLS) ?? [];
      if (tweens.length === 0) return; // nothing to guard — jumpTo-only or no camera call
      // The guard is the SHARED helper, never a locally re-rolled matchMedia call: one
      // definition of "this reader wants motion off" is what keeps the engines in step
      // (lib/core/motion.ts, cited by chart-native and scrolly for the same reason).
      // Asserted on the BOOLEAN, not on `src`: a failing `toContain` on a whole renderer
      // dumps the file into the report and buries the one sentence that matters.
      expect(
        src.includes("prefersReducedMotion"),
        `${label} tweens the camera (${tweens.join(", ")}) but never asks whether this reader wants motion`,
      ).toBe(true);
    });
  }

  it("scans renderers that actually exist, so a wrong path cannot pass as compliance", () => {
    for (const path of Object.values(BROWSER_RENDERERS))
      expect(() => readFileSync(path, "utf8")).not.toThrow();
  });

  it("at least one renderer really does tween, so the implication is not vacuous", () => {
    const tweening = Object.values(BROWSER_RENDERERS).filter(
      (p) =>
        (withoutComments(readFileSync(p, "utf8")).match(TWEENING_CALLS) ?? [])
          .length > 0,
    );
    expect(tweening.length).toBeGreaterThan(0);
  });
});
