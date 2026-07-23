import { describe, it, expect } from "bun:test";
import * as core from "./house-ramp";
// map-native/src/theme/house-ramp.ts (skills/map-native) is a thin re-export shim of these
// same primitives (see this module's own header) — its own in-engine importers keep using
// the local path unchanged, so the shim itself needs no dedicated behavioural test here:
// `shim.fn === core.fn` by construction (a plain re-export), so comparing shim outputs to
// core outputs can never fail and would only mask a real regression. What actually locks
// the math down is pinning core's own outputs to golden values below.

const HEX = /^#[0-9a-f]{6}$/;
const HOUSE_HUES = ["#0A5C36", "#C8102E", "#E4A400", "#4B2E83", "#111111"];

describe("core/house-ramp golden outputs", () => {
  it("houseRamp: exact golden hex ramp per house hue (locks the OKLCH light->dark math, not just its shape)", () => {
    expect(core.houseRamp("#0A5C36", 5)).toEqual([
      "#dff5e6",
      "#a4c5af",
      "#6b977b",
      "#326a4a",
      "#00401c",
    ]);
    expect(core.houseRamp("#C8102E", 5)).toEqual([
      "#ffe7e5",
      "#e8a9a6",
      "#c86b69",
      "#a5262f",
      "#7d0000",
    ]);
    expect(core.houseRamp("#E4A400", 5)).toEqual([
      "#f9edd9",
      "#d0b88f",
      "#a88444",
      "#815200",
      "#592000",
    ]);
    expect(core.houseRamp("#4B2E83", 5)).toEqual([
      "#efebff",
      "#bdb5dd",
      "#8e81b8",
      "#624e94",
      "#3b1a6f",
    ]);
    expect(core.houseRamp("#111111", 5)).toEqual([
      "#f6eed8",
      "#c1bbab",
      "#8e8a81",
      "#5e5d58",
      "#333333",
    ]);
  });

  it("houseRouteAccent: exact golden line/glow/head/headGlow hexes, light vs dark", () => {
    expect(core.houseRouteAccent("#0A5C36", false)).toEqual({
      line: "#0A5C36",
      glow: "#4b8a65",
      head: "#003512",
      headGlow: "#8ebe9f",
    });
    expect(core.houseRouteAccent("#0A5C36", true)).toEqual({
      line: "#0A5C36",
      glow: "#6aa17e",
      head: "#d8eade",
      headGlow: "#abceb7",
    });
    expect(core.houseRouteAccent("#C8102E", false)).toEqual({
      line: "#C8102E",
      glow: "#fa6164",
      head: "#960000",
      headGlow: "#ffaca8",
    });
    expect(core.houseRouteAccent("#C8102E", true)).toEqual({
      line: "#C8102E",
      glow: "#ff8483",
      head: "#fff2ef",
      headGlow: "#ffcdc8",
    });
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

import { hexToOklch, oklchToHex } from "./house-ramp";

describe("core/house-ramp OKLCH round-trip primitives are exported", () => {
  it("hexToOklch → oklchToHex round-trips a colour within 1 byte per channel", () => {
    for (const hex of ["#0072b2", "#c8102e", "#6b6b6b", "#ffffff", "#000000"]) {
      const back = oklchToHex(hexToOklch(hex));
      const chan = (h: string, i: number) =>
        parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
      for (let i = 0; i < 3; i++)
        expect(Math.abs(chan(back, i) - chan(hex, i))).toBeLessThanOrEqual(1);
    }
  });
});
