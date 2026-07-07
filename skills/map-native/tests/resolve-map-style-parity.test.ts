// Parity guard (feedback→système, Task 8, extended by the dark-video lot Task 3): every
// STATIC/INTERACTIVE *and* VIDEO/SCROLLY map renderer that accepts `config.mapStyle` MUST
// resolve it through the single-sourced `resolveMapStyle` (src/route-geo.ts) — never
// re-derive dark/light locally or hardcode a light basemap. This mechanically catches the
// #1/#4 class the render-quality lot fixed (ChoroplethMap/SymbolMap silently dropping
// mapStyle:dark) for ALL static/interactive renderers, and now the same class for video —
// ChoroplethStory/Reveal/Scrolly and SymbolStory/Scrolly/Reveal hardcoded a light basemap
// until the dark-video lot (Tasks 1-2) fixed them.
//
// Scope: the 7 `*Map.tsx` components (static/interactive) — unchanged — PLUS every
// `*Story`/`*Reveal`/`*Scrolly` component under `src/components/` that renders a basemap
// off `config.mapStyle`. As of this lot, that is ALL of them: Choropleth/Symbol (fixed by
// this lot), DotDensity (already wired before this lot), and Route/Locator/HexGrid/
// Cartogram (built with resolveMapStyle from the start, verified genuinely consuming it
// here). Route has no `*Story` component (only Reveal/Scrolly) — that's a real gap in the
// video surface, not a dark-mode gap, so it is simply absent from the list below.
//
// Known follow-up (not a false-fail risk, just unverified-at-render by THIS lot): the
// Route/Locator/HexGrid/Cartogram video/scrolly components pass this mechanical
// source-scan (they do call resolveMapStyle), but — unlike the 9 Choropleth/Symbol/
// DotDensity components — they were not render-verified dark+light at a still by this
// lot's controller. If a future change to one of them silently hardcodes light, this test
// still catches it (that's the point of a source-scan guard); a render re-verification is
// a separate, lower-priority follow-up.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(import.meta.dir, "..", "src");
const COMPONENTS_DIR = join(SRC_DIR, "components");

const STATIC_INTERACTIVE_RENDERERS: Record<string, string> = {
  ChoroplethMap: join(SRC_DIR, "ChoroplethMap.tsx"),
  SymbolMap: join(SRC_DIR, "SymbolMap.tsx"),
  RouteMap: join(SRC_DIR, "RouteMap.tsx"),
  LocatorMap: join(SRC_DIR, "LocatorMap.tsx"),
  DotDensityMap: join(SRC_DIR, "DotDensityMap.tsx"),
  HexGridMap: join(SRC_DIR, "HexGridMap.tsx"),
  CartogramMap: join(SRC_DIR, "CartogramMap.tsx"),
};

// Video/scrolly renderers under src/components/. Fixed by this lot (Choropleth/Symbol),
// already wired before it (DotDensity), or independently verified to consume
// resolveMapStyle genuinely (Route/Locator/HexGrid/Cartogram) — see scope note above.
const VIDEO_SCROLLY_RENDERERS: Record<string, string> = {
  ChoroplethStory: join(COMPONENTS_DIR, "ChoroplethStory.tsx"),
  ChoroplethReveal: join(COMPONENTS_DIR, "ChoroplethReveal.tsx"),
  ChoroplethScrolly: join(COMPONENTS_DIR, "ChoroplethScrolly.tsx"),
  SymbolStory: join(COMPONENTS_DIR, "SymbolStory.tsx"),
  SymbolReveal: join(COMPONENTS_DIR, "SymbolReveal.tsx"),
  SymbolScrolly: join(COMPONENTS_DIR, "SymbolScrolly.tsx"),
  DotDensityStory: join(COMPONENTS_DIR, "DotDensityStory.tsx"),
  DotDensityReveal: join(COMPONENTS_DIR, "DotDensityReveal.tsx"),
  DotDensityScrolly: join(COMPONENTS_DIR, "DotDensityScrolly.tsx"),
  RouteReveal: join(COMPONENTS_DIR, "RouteReveal.tsx"),
  RouteScrolly: join(COMPONENTS_DIR, "RouteScrolly.tsx"),
  LocatorStory: join(COMPONENTS_DIR, "LocatorStory.tsx"),
  LocatorReveal: join(COMPONENTS_DIR, "LocatorReveal.tsx"),
  LocatorScrolly: join(COMPONENTS_DIR, "LocatorScrolly.tsx"),
  HexGridStory: join(COMPONENTS_DIR, "HexGridStory.tsx"),
  HexGridReveal: join(COMPONENTS_DIR, "HexGridReveal.tsx"),
  HexGridScrolly: join(COMPONENTS_DIR, "HexGridScrolly.tsx"),
  CartogramStory: join(COMPONENTS_DIR, "CartogramStory.tsx"),
  CartogramReveal: join(COMPONENTS_DIR, "CartogramReveal.tsx"),
  CartogramScrolly: join(COMPONENTS_DIR, "CartogramScrolly.tsx"),
};

// A genuine consumption: imports resolveMapStyle from the single source AND actually
// calls it (not just an unused import) to derive dark/light. The import path differs by
// depth (`./route-geo` for src/*.tsx, `../route-geo` for src/components/*.tsx) — accept
// either so one check covers both renderer groups.
function consumesResolveMapStyle(source: string): boolean {
  return (
    /import\s*\{[^}]*\bresolveMapStyle\b[^}]*\}\s*from\s*["']\.{1,2}\/route-geo["']/.test(
      source,
    ) && /resolveMapStyle\(\s*config\.mapStyle\s*\)/.test(source)
  );
}

describe("resolveMapStyle-consumption parity: every static/interactive map renderer honors mapStyle via the single source", () => {
  for (const [name, path] of Object.entries(STATIC_INTERACTIVE_RENDERERS)) {
    it(`${name} imports and calls resolveMapStyle(config.mapStyle)`, () => {
      const source = readFileSync(path, "utf-8");
      expect(consumesResolveMapStyle(source)).toBe(true);
    });
  }

  // Non-vacuity: prove the assertion actually discriminates. Simulate a renderer that
  // dropped resolveMapStyle (the exact pre-fix shape of ChoroplethMap/SymbolMap before
  // Tasks 2-3 of the render-quality lot — see .superpowers/sdd/progress.md) by stripping
  // the import and the call from a real, currently-passing source file.
  it("is non-vacuous: fails when a renderer drops the resolveMapStyle import or call", () => {
    const source = readFileSync(
      STATIC_INTERACTIVE_RENDERERS.ChoroplethMap,
      "utf-8",
    );
    expect(consumesResolveMapStyle(source)).toBe(true); // sanity: real source passes

    const importStripped = source.replace(
      /import\s*\{[^}]*\bresolveMapStyle\b[^}]*\}\s*from\s*["']\.\/route-geo["'];?\n?/,
      "",
    );
    expect(consumesResolveMapStyle(importStripped)).toBe(false);

    const callHardcodedLight = source.replace(
      /resolveMapStyle\(\s*config\.mapStyle\s*\)\s*===\s*"dataviz-dark"/,
      "false /* hardcoded light — resolveMapStyle dropped */",
    );
    expect(consumesResolveMapStyle(callHardcodedLight)).toBe(false);
  });
});

describe("resolveMapStyle-consumption parity: every video/scrolly map renderer honors mapStyle via the single source", () => {
  for (const [name, path] of Object.entries(VIDEO_SCROLLY_RENDERERS)) {
    it(`${name} imports and calls resolveMapStyle(config.mapStyle)`, () => {
      const source = readFileSync(path, "utf-8");
      expect(consumesResolveMapStyle(source)).toBe(true);
    });
  }

  // Non-vacuity: same proof as the static/interactive group, applied to a video renderer
  // (the exact pre-fix shape of ChoroplethStory/SymbolStory before this lot's Tasks 1-2 —
  // a hardcoded light basemap with no resolveMapStyle import or call at all).
  it("is non-vacuous: fails when a video/scrolly renderer drops the resolveMapStyle import or call", () => {
    const source = readFileSync(
      VIDEO_SCROLLY_RENDERERS.ChoroplethStory,
      "utf-8",
    );
    expect(consumesResolveMapStyle(source)).toBe(true); // sanity: real source passes

    const importStripped = source.replace(
      /import\s*\{[^}]*\bresolveMapStyle\b[^}]*\}\s*from\s*["']\.\.\/route-geo["'];?\n?/,
      "",
    );
    expect(consumesResolveMapStyle(importStripped)).toBe(false);

    const callHardcodedLight = source.replace(
      /resolveMapStyle\(\s*config\.mapStyle\s*\)\s*===\s*"dataviz-dark"/,
      "false /* hardcoded light — resolveMapStyle dropped */",
    );
    expect(consumesResolveMapStyle(callHardcodedLight)).toBe(false);
  });
});
