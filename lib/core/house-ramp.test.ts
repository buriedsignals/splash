import { describe, it, expect } from "bun:test";
import * as core from "./house-ramp";
// The pre-move canonical home (now a thin re-export shim, see its own header) — parity
// check that the move changed nothing observable: same function identity, same outputs.
// Function bodies were diffed byte-identical against the pre-move file at move time
// (git show HEAD~:skills/map-native/src/theme/house-ramp.ts vs this file, past the
// header comment + the relativeLuminance import line); this test locks the behavioural
// side of that claim into the suite so a future edit to either copy can't silently drift.
import * as shim from "../../skills/map-native/src/theme/house-ramp";

const HEX = /^#[0-9a-f]{6}$/;
const HOUSE_HUES = ["#0A5C36", "#C8102E", "#E4A400", "#4B2E83", "#111111"];

describe("core/house-ramp parity with the map-native shim (post-move)", () => {
  it("the shim re-exports the SAME function objects (no fork)", () => {
    expect(shim.houseRamp).toBe(core.houseRamp);
    expect(shim.isMonotonicLuminanceRamp).toBe(core.isMonotonicLuminanceRamp);
    expect(shim.contrastOk).toBe(core.contrastOk);
    expect(shim.houseFill).toBe(core.houseFill);
    expect(shim.houseRouteAccent).toBe(core.houseRouteAccent);
    expect(shim.DEFAULT_MAP_FILL).toBe(core.DEFAULT_MAP_FILL);
  });

  it("houseRamp: 5 valid #rrggbb stops, light -> dark, deterministic, for several house hues", () => {
    for (const hue of HOUSE_HUES) {
      const ramp = core.houseRamp(hue);
      expect(ramp.length).toBe(5);
      for (const c of ramp) expect(c).toMatch(HEX);
      expect(core.isMonotonicLuminanceRamp(ramp)).toBe(true);
      expect(core.houseRamp(hue)).toEqual(ramp); // deterministic
    }
  });

  it("isMonotonicLuminanceRamp: accepts increasing/decreasing, rejects a peak or a flat step", () => {
    expect(
      core.isMonotonicLuminanceRamp(["#eeeeee", "#999999", "#333333"]),
    ).toBe(true);
    expect(
      core.isMonotonicLuminanceRamp(["#333333", "#999999", "#eeeeee"]),
    ).toBe(true);
    expect(
      core.isMonotonicLuminanceRamp(["#333333", "#eeeeee", "#666666"]),
    ).toBe(false);
    expect(
      core.isMonotonicLuminanceRamp(["#eeeeee", "#eeeeee", "#333333"]),
    ).toBe(false);
  });

  it("contrastOk: WCAG 1.4.11 3:1 vs the light/dark basemap", () => {
    expect(core.contrastOk("#0a5c36", false)).toBe(true);
    expect(core.contrastOk("#f2f2f2", false)).toBe(false);
    expect(core.contrastOk("#9be3b8", true)).toBe(true);
    expect(core.contrastOk("#0a1a10", true)).toBe(false);
  });

  it("houseFill: house hue wins, else the ONE default", () => {
    expect(core.houseFill("#c81e1e")).toBe("#c81e1e");
    expect(core.houseFill(undefined)).toBe(core.DEFAULT_MAP_FILL);
    expect(core.DEFAULT_MAP_FILL).toBe("#2171b5");
  });

  it("houseRouteAccent: line is the house hue itself, glow/head/headGlow are valid hexes, light vs dark differ", () => {
    for (const hue of HOUSE_HUES) {
      const light = core.houseRouteAccent(hue, false);
      const dark = core.houseRouteAccent(hue, true);
      expect(light.line).toBe(hue);
      expect(dark.line).toBe(hue);
      for (const accent of [light, dark]) {
        expect(accent.glow).toMatch(HEX);
        expect(accent.head).toMatch(HEX);
        expect(accent.headGlow).toMatch(HEX);
      }
      expect(light).not.toEqual(dark);
    }
  });
});

describe("core/house-ramp hueRampOklch (perceptual sequential ramp)", () => {
  const HUES = ["#0072B2", "#0A5C36", "#C8102E", "#4B2E83"];
  const LIGHT = "#ffffff";
  const DARK = "#0b1220";
  const okL = (hex: string) => {
    // OKLCH L via the same round-trip the engine uses — asserted through outputs, not re-exported.
    const [r, g, b] = [1, 3, 5].map(
      (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
    );
    const lin = (c: number) =>
      c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    const R = lin(r),
      G = lin(g),
      B = lin(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  };

  it("light ground: 7 stops, pale→deep, monotonic OKLCH L decreasing, span ≥ 0.60", () => {
    for (const hue of HUES) {
      const ramp = core.hueRampOklch(hue, 7, LIGHT);
      expect(ramp.length).toBe(7);
      for (const c of ramp) expect(c).toMatch(HEX);
      const Ls = ramp.map(okL);
      for (let i = 1; i < Ls.length; i++)
        expect(Ls[i]!).toBeLessThan(Ls[i - 1]!); // decreasing
      expect(Math.abs(Ls[0]! - Ls[Ls.length - 1]!)).toBeGreaterThanOrEqual(0.6);
    }
  });

  // Independent WCAG-contrast oracle (not the engine's own helper): the chart heatmap sits on the
  // chart's themeBg (#0b1220), NOT on the MapTiler dark basemap that `contrastOk(_, true)` assumes
  // (luminance 0.1) — so the dark-floor check must use the real ground, exactly as checkHeatmapConformance does.
  const wcagLum = (hex: string) => {
    const lin = (c: number) =>
      c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
  };
  const contrast = (a: string, b: string) => {
    const [la, lb] = [wcagLum(a), wcagLum(b)].sort((x, y) => y - x);
    return (la! + 0.05) / (lb! + 0.05);
  };

  it("dark ground: monotonic OKLCH L increasing (mid→bright), span ≥ 0.40, every stop clears 3:1 vs #0b1220, no collapse", () => {
    for (const hue of HUES) {
      const ramp = core.hueRampOklch(hue, 7, DARK);
      const Ls = ramp.map(okL);
      for (let i = 1; i < Ls.length; i++)
        expect(Ls[i]!).toBeGreaterThan(Ls[i - 1]!); // increasing
      // theme-aware span floor: the near-black a11y 3:1 floor caps the achievable L range below the
      // light-ground 0.60, but a collapsed ramp (identical tints, e.g. clamped reds) must still fail.
      expect(Math.abs(Ls[0]! - Ls[Ls.length - 1]!)).toBeGreaterThanOrEqual(0.4);
      for (const c of ramp) expect(contrast(c, DARK)).toBeGreaterThanOrEqual(3); // ≥3:1 vs the real dark ground
    }
  });

  it("is deterministic", () => {
    expect(core.hueRampOklch("#0072B2", 7, LIGHT)).toEqual(
      core.hueRampOklch("#0072B2", 7, LIGHT),
    );
  });
});

describe("core/house-ramp rampUniformityIssues", () => {
  it("accepts an even OKLCH ramp (no issues)", () => {
    expect(
      core.rampUniformityIssues(core.hueRampOklch("#0072B2", 7, "#ffffff")),
    ).toEqual([]);
  });
  it("rejects a too-short span (< 0.60) with a span reason", () => {
    // three near-identical light greys — L span far below 0.60
    const issues = core.rampUniformityIssues(["#eeeeee", "#e4e4e4", "#dadada"]);
    expect(issues.some((r) => /span/i.test(r))).toBe(true);
  });
  it("rejects a kinked ramp (one giant L-step) with a step reason", () => {
    // pale, pale, then a cliff to near-black — one huge step, the rest tiny
    const issues = core.rampUniformityIssues(["#f2f2f2", "#ededed", "#111111"]);
    expect(issues.some((r) => /step|kink/i.test(r))).toBe(true);
  });
});

describe("core/house-ramp hueRampOklch is gate-safe for vivid house hues", () => {
  const VIVID = [
    "#ff0000",
    "#ff00ff",
    "#00ffff",
    "#00c000",
    "#0000ff",
    "#ff7a00",
    "#c8102e",
    "#e4a400",
  ];
  it("every vivid hue's derived ramp passes rampUniformityIssues on a light ground (minSpan 0.60)", () => {
    for (const hue of VIVID)
      expect(
        core.rampUniformityIssues(core.hueRampOklch(hue, 7, "#ffffff"), {
          minSpan: 0.6,
        }),
      ).toEqual([]);
  });
  it("every vivid hue's derived ramp passes on a dark ground (minSpan 0.40)", () => {
    for (const hue of VIVID)
      expect(
        core.rampUniformityIssues(core.hueRampOklch(hue, 7, "#0b1220"), {
          minSpan: 0.4,
        }),
      ).toEqual([]);
  });
});
