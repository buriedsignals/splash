import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveMapStyle } from "../../map-native/src/route-geo";
import {
  houseFill,
  DEFAULT_MAP_FILL,
} from "../../map-native/src/theme/house-ramp";
import { locatorGeometry } from "../../map-native/src/locator-geo";
import {
  univariateAccent,
  UNIVARIATE_ACCENT,
} from "../../map-native/src/dot-density-geo";

// ScrollyMap (choropleth) and ScrollySymbolMap hardcoded MapStyle.DATAVIZ.LIGHT, ignoring
// config.mapStyle — the OTHER 4 scrolly map renderers (Locator/Hex/DotDensity/Cartogram)
// already resolve it correctly via `resolveMapStyle`. maptilersdk.Map requires a real WebGL
// context these components can't get under bun:test/jsdom, so — mirroring the established
// pattern in map-native/tests/resolve-map-style-parity.test.ts for the exact same class of
// un-renderable-in-bun:test map component — the WIRING is checked by source-scan; the underlying
// pure colour helpers (houseFill / locatorGeometry / univariateAccent) are tested GENUINELY so
// the assertions aren't merely re-testing resolveMapStyle's own logic.
const SRC_DIR = join(import.meta.dir, "..", "src");

// Full path registry (used by every describe block for source-scans).
const RENDERERS = {
  ScrollyMap: join(SRC_DIR, "ScrollyMap.tsx"),
  ScrollySymbolMap: join(SRC_DIR, "ScrollySymbolMap.tsx"),
  ScrollyLocatorMap: join(SRC_DIR, "ScrollyLocatorMap.tsx"),
  ScrollyDotDensityMap: join(SRC_DIR, "ScrollyDotDensityMap.tsx"),
} as const;

// The two renderers this session FIXED for dark mode — they assign `const dark = …` then pick
// `dark ? DARK : LIGHT`. (Locator/DotDensity were never the dark-mode-broken pair; they already
// resolved mapStyle correctly, but inline the resolveMapStyle call inside the ternary, a
// different code shape — so they are deliberately NOT swept into this shape-specific loop.)
const DARK_FIXED = {
  ScrollyMap: RENDERERS.ScrollyMap,
  ScrollySymbolMap: RENDERERS.ScrollySymbolMap,
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
  for (const [name, path] of Object.entries(DARK_FIXED)) {
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

// House colour: the symbol scrolly's circle fill was a hardcoded SYMBOL_FILL = "#2171b5"
// constant, deaf to the newsroom's brandHue. Now it resolves via houseFill(config.brandHue),
// which single-sources the default from house-ramp's DEFAULT_MAP_FILL so the hex can't drift.
describe("ScrollySymbolMap honours brandHue for the circle fill (house colour)", () => {
  it("derives fillColor via houseFill(config.brandHue) — not a re-declared local hex", () => {
    const source = readFileSync(RENDERERS.ScrollySymbolMap, "utf-8");
    expect(
      /const fillColor = houseFill\(config\.brandHue\);/.test(source),
    ).toBe(true);
    expect(/"circle-color":\s*fillColor/.test(source)).toBe(true);
    expect(
      /import\s*\{\s*houseFill\s*\}\s*from\s*["']\.\.\/\.\.\/map-native\/src\/theme\/house-ramp["']/.test(
        source,
      ),
    ).toBe(true);
  });

  it("is non-vacuous: the #2171b5 literal is no longer re-declared in the file (single-sourced)", () => {
    const source = readFileSync(RENDERERS.ScrollySymbolMap, "utf-8");
    // The old defect: a local `const SYMBOL_FILL = "#2171b5"` (or the raw hex) re-declared here,
    // free to drift from house-ramp's DEFAULT_MAP_FILL.
    expect(/#2171b5/i.test(source)).toBe(false);
    expect(/const SYMBOL_FILL\b/.test(source)).toBe(false);
  });

  it("houseFill genuinely resolves brandHue over the shared default (pure, non-source-scan)", () => {
    expect(houseFill("#c81e1e")).toBe("#c81e1e"); // house hue wins
    expect(houseFill(undefined)).toBe(DEFAULT_MAP_FILL); // falls back to the ONE default
    expect(DEFAULT_MAP_FILL).toBe("#2171b5"); // the literal now lives only here
  });

  it("ScrollySymbolConfig types brandHue/brandPalette/mapStyle so the profile merge type-checks", () => {
    const source = readFileSync(RENDERERS.ScrollySymbolMap, "utf-8");
    expect(/brandHue\?:\s*string;/.test(source)).toBe(true);
    expect(/brandPalette\?:\s*string\[\];/.test(source)).toBe(true);
    expect(/mapStyle\?:\s*string;/.test(source)).toBe(true);
  });
});

// Fix 1 (adversarial review): ScrollyLocatorMap dropped config.brandPalette on the
// locatorGeometry call, so a map-scrolly locator under a newsroom profile rendered Okabe-Ito
// instead of the house palette. The four map-native locator renderers all pass it through.
describe("ScrollyLocatorMap threads brandPalette into locatorGeometry (house palette)", () => {
  it("passes brandPalette: config.brandPalette into the locatorGeometry call", () => {
    const source = readFileSync(RENDERERS.ScrollyLocatorMap, "utf-8");
    expect(
      /locatorGeometry\(\{[\s\S]*?brandPalette:\s*config\.brandPalette[\s\S]*?\}\)/.test(
        source,
      ),
    ).toBe(true);
  });

  it("ScrollyLocatorConfig declares brandHue?/brandPalette? for the profile merge", () => {
    const source = readFileSync(RENDERERS.ScrollyLocatorMap, "utf-8");
    expect(/brandHue\?:\s*string;/.test(source)).toBe(true);
    expect(/brandPalette\?:\s*string\[\];/.test(source)).toBe(true);
  });

  it("locatorGeometry genuinely colours categories from brandPalette, not Okabe-Ito (pure)", () => {
    const markers = [
      { lon: 6.1, lat: 46.2, label: "A", category: "cat-1" },
      { lon: 7.4, lat: 46.9, label: "B", category: "cat-2" },
    ];
    const house = ["#c81e1e", "#1e5ac8"];
    const withHouse = locatorGeometry({ markers, brandPalette: house });
    // Categories are sorted deterministically → cat-1 gets house[0], cat-2 gets house[1].
    expect(withHouse.legend.map((l) => l.color)).toEqual(house);

    // Non-vacuity: WITHOUT brandPalette the same markers get the Okabe-Ito qualitative palette,
    // so the house colours are a genuine, observable difference — not a no-op.
    const withoutHouse = locatorGeometry({ markers });
    expect(withoutHouse.legend.map((l) => l.color)).not.toEqual(house);
  });
});

// Fix 2 (adversarial review): ScrollyDotDensityMap's "1 dot = N" legend swatch hardcoded
// `dark ? "#e8e8ec" : "#2171b5"`, so the key stayed default blue while the DOTS correctly
// rendered config.brandHue (via computeDotDensity). Now the swatch mirrors univariateAccent's
// resolution — brandHue wins, else the CVD-safe default.
describe("ScrollyDotDensityMap legend swatch honours brandHue (matches the dots)", () => {
  it("resolves the swatch colour from config.brandHue ?? (dark ? #e8e8ec : UNIVARIATE_ACCENT.light)", () => {
    const source = readFileSync(RENDERERS.ScrollyDotDensityMap, "utf-8");
    expect(
      /config\.brandHue \?\? \(dark \? "#e8e8ec" : UNIVARIATE_ACCENT\.light\)/.test(
        source,
      ),
    ).toBe(true);
    expect(
      /import\s*\{[\s\S]*?UNIVARIATE_ACCENT[\s\S]*?\}\s*from\s*["']\.\.\/\.\.\/map-native\/src\/dot-density-geo["']/.test(
        source,
      ),
    ).toBe(true);
  });

  it("is non-vacuous: the swatch no longer hardcodes the light-mode #2171b5", () => {
    const source = readFileSync(RENDERERS.ScrollyDotDensityMap, "utf-8");
    // The old defect: `background:${dark ? "#e8e8ec" : "#2171b5"}` on the swatch span.
    expect(/dark \? "#e8e8ec" : "#2171b5"/.test(source)).toBe(false);
  });

  it("univariateAccent (the resolution the swatch mirrors) genuinely prefers brandHue (pure)", () => {
    expect(univariateAccent(false, "#c81e1e")).toBe("#c81e1e"); // house hue wins (light)
    expect(univariateAccent(true, "#c81e1e")).toBe("#c81e1e"); // house hue wins (dark)
    expect(univariateAccent(false, undefined)).toBe(UNIVARIATE_ACCENT.light); // default light
    expect(univariateAccent(true, undefined)).toBe(UNIVARIATE_ACCENT.dark); // default dark
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
