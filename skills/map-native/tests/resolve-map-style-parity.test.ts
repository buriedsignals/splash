// Parity guard (feedback→système, Task 8): every STATIC/INTERACTIVE map renderer that
// accepts `config.mapStyle` MUST resolve it through the single-sourced `resolveMapStyle`
// (src/route-geo.ts) — never re-derive dark/light locally or hardcode a light basemap.
// This mechanically catches the #1/#4 class this lot fixed (ChoroplethMap/SymbolMap
// silently dropping mapStyle:dark) for ALL 7 static/interactive renderers, for good.
//
// Scope: ONLY the 7 `*Map.tsx` components (static/interactive). The video/scrolly
// components under `src/components/` (*Story/*Reveal/*Scrolly) are a KNOWN, SEPARATE,
// pre-existing gap — ChoroplethStory/Reveal/Scrolly and SymbolStory/Scrolly hardcode a
// light basemap and do not yet honor mapStyle:dark (see .superpowers/sdd/progress.md,
// "MAJOR follow-up" note after Tasks 4-5). That is out of THIS lot's scope (a dedicated
// dark-parity-for-video lot was recommended). Including them here would false-fail on a
// gap this lot never promised to close.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(import.meta.dir, "..", "src");

const STATIC_INTERACTIVE_RENDERERS: Record<string, string> = {
  ChoroplethMap: join(SRC_DIR, "ChoroplethMap.tsx"),
  SymbolMap: join(SRC_DIR, "SymbolMap.tsx"),
  RouteMap: join(SRC_DIR, "RouteMap.tsx"),
  LocatorMap: join(SRC_DIR, "LocatorMap.tsx"),
  DotDensityMap: join(SRC_DIR, "DotDensityMap.tsx"),
  HexGridMap: join(SRC_DIR, "HexGridMap.tsx"),
  CartogramMap: join(SRC_DIR, "CartogramMap.tsx"),
};

// A genuine consumption: imports resolveMapStyle from the single source AND actually
// calls it (not just an unused import) to derive dark/light.
function consumesResolveMapStyle(source: string): boolean {
  return (
    /import\s*\{[^}]*\bresolveMapStyle\b[^}]*\}\s*from\s*["']\.\/route-geo["']/.test(
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
  // Tasks 2-3 of this lot — see .superpowers/sdd/progress.md) by stripping the import
  // and the call from a real, currently-passing source file.
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
