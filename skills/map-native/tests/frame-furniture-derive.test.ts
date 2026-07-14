// The map FURNITURE (frame pill/ink/muted + legend panel) is DERIVED from the newsroom house
// ground — "light", "dark", or ANY #rrggbb (grey, navy, pink…) — never a hand-authored per-theme
// set. This mirrors chart-native's deriveFurniture a11y suite. Honest scope: the BASEMAP tiles stay
// the light/dark MapTiler style already chosen by `mapStyle` (tiles can't take an arbitrary tint);
// only the furniture that OVERLAYS the basemap adapts to the branded ground. The merge snaps both
// off the same ground, so a branded-dark ground gets a dark basemap AND a branded-dark pill.
import { describe, it, expect } from "bun:test";
import {
  FRAME_COLORS,
  FRAME_COLORS_DARK,
  resolveFrameColors,
  frameBgIsDark,
  resolveThemeBg,
  DARK_FRAME_BG,
} from "../src/theme/map-tokens";
import { legendTheme } from "../src/theme/legend-theme";
import { contrastRatio } from "../src/conformance";

// The opaque ground a translucent pill visually reads as, for the WCAG check (contrastRatio needs a
// #rrggbb; the pill is an rgba(...) over the same-luminance basemap → the ground itself governs).
const NAVY = "#1B2A4A"; // a dark house ground that is NOT the #18181B preset
const PINK = "#F7E8EE"; // a light house ground that is NOT plain #FFFFFF
const MID = "#8A8A8A"; // a mid-luminance grey — the max-contrast-ink edge case

describe("map furniture derivation — light default is byte-identical", () => {
  it("undefined / #FFFFFF / 'light' all short-circuit to the legacy FRAME_COLORS", () => {
    expect(resolveFrameColors(undefined)).toEqual(FRAME_COLORS);
    expect(resolveFrameColors("#FFFFFF")).toEqual(FRAME_COLORS);
    expect(resolveFrameColors("light")).toEqual(FRAME_COLORS);
    expect(resolveThemeBg("light")).toBeNull();
    expect(frameBgIsDark(undefined)).toBe(false);
  });
});

describe("map furniture derivation — the dark preset reproduces the pre-generalization furniture", () => {
  it("resolveFrameColors('#18181B') === FRAME_COLORS_DARK (ink #f4f4f5, pill @0.82)", () => {
    const d = resolveFrameColors(DARK_FRAME_BG);
    expect(d).toEqual(FRAME_COLORS_DARK);
    expect(d.ink).toBe("#f4f4f5");
    expect(d.pill).toBe("rgba(24,24,27,0.82)");
    expect(resolveFrameColors("dark")).toEqual(FRAME_COLORS_DARK);
    expect(frameBgIsDark("dark")).toBe(true);
  });
});

describe("map furniture derivation — ARBITRARY grounds derive a legible, branded pill", () => {
  for (const [label, ground] of [
    ["navy", NAVY],
    ["pink", PINK],
  ] as const) {
    it(`${label} ${ground}: pill is the ground @0.82, ink is max-contrast, WCAG ≥ 4.5:1`, () => {
      const fc = resolveFrameColors(ground);
      // the pill IS the house ground (translucent) — the branding shows through.
      const [r, g, b] = [
        parseInt(ground.slice(1, 3), 16),
        parseInt(ground.slice(3, 5), 16),
        parseInt(ground.slice(5, 7), 16),
      ];
      expect(fc.pill).toBe(`rgba(${r},${g},${b},0.82)`);
      // ink + muted clear WCAG body text on the ground (the opaque backing the pill reads as).
      expect(contrastRatio(fc.ink, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(fc.muted, ground)).toBeGreaterThanOrEqual(4.5);
      // ink is one of the two max-contrast poles, and it is the BETTER of the two on this ground.
      expect([fc.ink]).toContainEqual(
        contrastRatio("#1a1a1a", ground) >= contrastRatio("#f4f4f5", ground)
          ? "#1a1a1a"
          : "#f4f4f5",
      );
    });
  }

  it("a MID-luminance grey picks the max-contrast ink (not a fixed <0.4 flip)", () => {
    // #8A8A8A sits below the 0.4 luminance line: a naive <0.4 flip would pick near-WHITE ink (which
    // reads worse here), but near-BLACK maximises contrast. resolveFrameColors must pick by contrast.
    const fc = resolveFrameColors(MID);
    expect(fc.ink).toBe("#1a1a1a");
    expect(contrastRatio(fc.ink, MID)).toBeGreaterThan(
      contrastRatio("#f4f4f5", MID),
    );
  });
});

describe("map legend panel — brands off the ground when themeBg set, binary otherwise", () => {
  it("no themeBg → the exact binary presets (byte-identical, untouched light/dark maps)", () => {
    expect(legendTheme(false).ink).toBe("#444");
    expect(legendTheme(true).ink).toBe("#f4f4f5");
    // light vs dark differ; the swatch stroke is theme-invariant.
    expect(legendTheme(false).ink).not.toBe(legendTheme(true).ink);
    expect(legendTheme(false).stroke).toBe(legendTheme(true).stroke);
  });

  it("themeBg set → the panel derives from the SAME ground as the frame furniture", () => {
    const fc = resolveFrameColors(NAVY);
    const lt = legendTheme(true, NAVY);
    expect(lt.ink).toBe(fc.ink);
    expect(lt.sub).toBe(fc.muted);
    expect(lt.bg).toBe(fc.pill);
    // the branded legend still clears WCAG on its own ground.
    expect(contrastRatio(lt.ink, NAVY)).toBeGreaterThanOrEqual(4.5);
  });
});
