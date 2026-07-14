import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveMapStyle } from "../../map-native/src/route-geo";

// ScrollyMap (choropleth) and ScrollySymbolMap hardcoded MapStyle.DATAVIZ.LIGHT, ignoring
// config.mapStyle — the OTHER 4 scrolly map renderers (Locator/Hex/DotDensity/Cartogram)
// already resolve it correctly via `resolveMapStyle`. maptilersdk.Map requires a real WebGL
// context these components can't get under bun:test/jsdom, so — mirroring the established
// pattern in map-native/tests/resolve-map-style-parity.test.ts for the exact same class of
// un-renderable-in-bun:test map component — this is a source-scan: it mechanically proves the
// component WIRES UP the (already pure-tested) resolveMapStyle to select DARK vs LIGHT and
// flips its dark-basemap-safe ink, rather than re-testing resolveMapStyle's own logic.
const SRC_DIR = join(import.meta.dir, "..", "src");

const RENDERERS = {
  ScrollyMap: join(SRC_DIR, "ScrollyMap.tsx"),
  ScrollySymbolMap: join(SRC_DIR, "ScrollySymbolMap.tsx"),
} as const;

function consumesResolveMapStyle(source: string): boolean {
  return (
    /import\s*\{[^}]*\bresolveMapStyle\b[^}]*\}\s*from\s*["']\.\.\/\.\.\/map-native\/src\/route-geo["']/.test(
      source,
    ) && /resolveMapStyle\(\s*config\.mapStyle\s*\)/.test(source)
  );
}

function selectsDarkStyle(source: string): boolean {
  return /dark\s*\?\s*maptilersdk\.MapStyle\.DATAVIZ\.DARK\s*:\s*maptilersdk\.MapStyle\.DATAVIZ\.LIGHT/.test(
    source,
  );
}

describe("scrolly map renderers honour config.mapStyle (dark-mode bug fix)", () => {
  for (const [name, path] of Object.entries(RENDERERS)) {
    it(`${name} imports resolveMapStyle from map-native's single source and calls it on config.mapStyle`, () => {
      const source = readFileSync(path, "utf-8");
      expect(consumesResolveMapStyle(source)).toBe(true);
    });

    it(`${name} SELECTS DATAVIZ.DARK when resolveMapStyle resolves dark (not just an unused import)`, () => {
      const source = readFileSync(path, "utf-8");
      expect(selectsDarkStyle(source)).toBe(true);
    });
  }

  // Non-vacuity: prove the assertions actually discriminate, using the EXACT pre-fix shape
  // (`style: maptilersdk.MapStyle.DATAVIZ.LIGHT` hardcoded, no resolveMapStyle at all).
  it("is non-vacuous: fails on the pre-fix hardcoded-light shape (no resolveMapStyle, no dark branch)", () => {
    const source = readFileSync(RENDERERS.ScrollyMap, "utf-8");
    expect(consumesResolveMapStyle(source)).toBe(true); // sanity: real source passes
    expect(selectsDarkStyle(source)).toBe(true);

    const importStripped = source.replace(
      /import\s*\{\s*resolveMapStyle\s*\}\s*from\s*["']\.\.\/\.\.\/map-native\/src\/route-geo["'];?\n?/,
      "",
    );
    expect(consumesResolveMapStyle(importStripped)).toBe(false);

    const hardcodedLight = source
      .replace(
        /const dark = resolveMapStyle\(config\.mapStyle\) === "dataviz-dark";\n\n\s*/,
        "",
      )
      .replace(
        /const style = dark\s*\?\s*maptilersdk\.MapStyle\.DATAVIZ\.DARK\s*:\s*maptilersdk\.MapStyle\.DATAVIZ\.LIGHT;/,
        "const style = maptilersdk.MapStyle.DATAVIZ.LIGHT;",
      );
    expect(selectsDarkStyle(hardcodedLight)).toBe(false);
  });

  it("resolveMapStyle itself resolves 'dataviz-dark' (the token these renderers now honour)", () => {
    expect(resolveMapStyle("dataviz-dark")).toBe("dataviz-dark");
    expect(resolveMapStyle(undefined)).toBe("dataviz-light");
    expect(resolveMapStyle("not-a-real-style")).toBe("dataviz-light");
  });

  it("ScrollyMap flips its choropleth stroke + highlight-stroke ink for dark (mirrors ChoroplethMap/ChoroplethScrolly)", () => {
    const source = readFileSync(RENDERERS.ScrollyMap, "utf-8");
    expect(
      /"line-color":\s*dark\s*\?\s*"#1c1c1f"\s*:\s*"#ffffff"/.test(source),
    ).toBe(true);
    expect(
      /"line-color":\s*dark\s*\?\s*"#f4f4f5"\s*:\s*"#1a1a1a"/.test(source),
    ).toBe(true);
  });

  it("ScrollySymbolMap flips its label text-color + halo for dark (mirrors SymbolMap/SymbolScrolly)", () => {
    const source = readFileSync(RENDERERS.ScrollySymbolMap, "utf-8");
    expect(
      /"text-color":\s*dark\s*\?\s*"#f4f4f5"\s*:\s*"#1a1a1a"/.test(source),
    ).toBe(true);
    expect(
      /"text-halo-color":\s*dark\s*\?\s*"rgba\(0,0,0,0\.85\)"\s*:\s*"#ffffff"/.test(
        source,
      ),
    ).toBe(true);
  });
});

// House colour: the symbol scrolly's circle fill was a hardcoded SYMBOL_FILL constant,
// deaf to the newsroom's brandHue. Same source-scan rationale as above.
describe("ScrollySymbolMap honours brandHue for the circle fill (house colour)", () => {
  it("derives fillColor from config.brandHue, falling back to the neutral SYMBOL_FILL default", () => {
    const source = readFileSync(RENDERERS.ScrollySymbolMap, "utf-8");
    expect(
      /const fillColor = config\.brandHue \?\? SYMBOL_FILL;/.test(source),
    ).toBe(true);
    expect(/"circle-color":\s*fillColor/.test(source)).toBe(true);
  });

  it("is non-vacuous: the pre-fix shape painted the hardcoded constant directly", () => {
    const source = readFileSync(RENDERERS.ScrollySymbolMap, "utf-8");
    // The old defect: "circle-color": SYMBOL_FILL literal, never reading config at all.
    expect(/"circle-color":\s*SYMBOL_FILL,/.test(source)).toBe(false);
  });

  it("ScrollySymbolConfig types brandHue/brandPalette/mapStyle so the profile merge type-checks", () => {
    const source = readFileSync(RENDERERS.ScrollySymbolMap, "utf-8");
    expect(/brandHue\?:\s*string;/.test(source)).toBe(true);
    expect(/brandPalette\?:\s*string\[\];/.test(source)).toBe(true);
    expect(/mapStyle\?:\s*string;/.test(source)).toBe(true);
  });
});

// Choropleth house colour: ScrollyMapConfig extends map-native's ChoroplethData, which already
// carries `brandHue` and feeds it straight into computeChoropleth (choropleth-geo.ts) to derive
// the house luminance ramp. Verified here (rather than "add nothing" silently) so a future change
// that strips the extends or the pass-through call is caught mechanically.
describe("ScrollyMap (choropleth) already flows brandHue through to computeChoropleth", () => {
  it("ScrollyMapConfig extends ChoroplethData (the type that declares brandHue)", () => {
    const source = readFileSync(RENDERERS.ScrollyMap, "utf-8");
    expect(
      /export interface ScrollyMapConfig extends ChoroplethData/.test(source),
    ).toBe(true);
  });

  it("passes the whole config (carrying brandHue) into computeChoropleth, not a stripped-down object", () => {
    const source = readFileSync(RENDERERS.ScrollyMap, "utf-8");
    expect(/computeChoropleth\(\s*config,\s*world,/.test(source)).toBe(true);
  });

  it("ScrollyMapConfig types brandPalette + mapStyle for the profile merge", () => {
    const source = readFileSync(RENDERERS.ScrollyMap, "utf-8");
    expect(/brandPalette\?:\s*string\[\];/.test(source)).toBe(true);
    expect(/mapStyle\?:\s*string;/.test(source)).toBe(true);
  });
});
