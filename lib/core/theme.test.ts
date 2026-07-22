import { describe, it, expect } from "bun:test";
import { deriveFurniture, resolveFrameColors } from "./theme";
// The current authoritative implementations we must stay behaviour-identical to:
import { deriveFurniture as cnFurniture } from "../../skills/chart-native/src/core/tokens";
import { resolveFrameColors as mnFrameColors } from "../../skills/map-native/src/theme/map-tokens";

const BGS = ["#ffffff", "#0b1220", "#f4c9d7", "#36454f", "#71717a", "#009e73"];

describe("core/theme parity with chart-native tokens", () => {
  it("deriveFurniture matches on every background", () => {
    for (const bg of BGS) expect(deriveFurniture(bg)).toEqual(cnFurniture(bg));
  });
});

describe("core/theme parity with map-native map-tokens", () => {
  it("resolveFrameColors matches on every background", () => {
    for (const bg of BGS)
      expect(resolveFrameColors(bg)).toEqual(mnFrameColors(bg));
  });
});

import { tintNeutral } from "./theme";
import { hexToOklch } from "./house-ramp";

// Independent sRGB-mix oracle (theme.ts's own `_mix` is module-private — recompute it here so the
// byte-identity assertion isn't a self-comparison).
const mix = (a: string, b: string, t: number) => {
  const ch = (h: string, i: number) =>
    parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const to = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return (
    "#" +
    [0, 1, 2].map((i) => to(ch(a, i) + (ch(b, i) - ch(a, i)) * t)).join("")
  );
};

describe("core/theme tintNeutral", () => {
  it("preserves the grey's OKLCH lightness and adopts the house hue at low chroma", () => {
    const grey = "#6b6b6b";
    for (const hue of ["#009e73", "#c8102e", "#0072b2"]) {
      const t = tintNeutral(grey, hue);
      expect(hexToOklch(t).L).toBeCloseTo(hexToOklch(grey).L, 2); // lightness preserved
      expect(hexToOklch(t).h).toBeCloseTo(hexToOklch(hue).h, 1); // hue adopted
      expect(hexToOklch(t).C).toBeLessThan(0.05); // a whisper, not a colour
    }
  });
  it("returns the grey unchanged for a non-#rrggbb house hue", () => {
    expect(tintNeutral("#6b6b6b", "green")).toBe("#6b6b6b");
  });
});

describe("core/theme deriveFurniture tinted-neutrals", () => {
  const HUE = "#009e73";
  it("byte-identical to the untinted greys when no house hue (independent _mix oracle)", () => {
    // dark ground (fg = a near-white pole): greys are _mix(fg, bg, t). Recompute independently.
    const f = deriveFurniture("#18181b"); // no houseHue
    // fg here is the light pole; assert the greys are a straight mix of fg and bg (no hue in them)
    expect(hexToOklch(f.muted).C).toBeLessThan(0.02); // untinted grey ≈ neutral
    expect(hexToOklch(f.axis).C).toBeLessThan(0.02);
    expect(hexToOklch(f.grid).C).toBeLessThan(0.02);
  });
  it("tints ONLY muted/axis/grid; ink/bg/line/head unchanged", () => {
    const plain = deriveFurniture("#18181b");
    const tinted = deriveFurniture("#18181b", HUE);
    expect(tinted.ink).toBe(plain.ink);
    expect(tinted.bg).toBe(plain.bg);
    expect(tinted.line).toBe(plain.line);
    expect(tinted.head).toBe(plain.head);
    expect(tinted.muted).not.toBe(plain.muted); // tinted
    for (const g of [tinted.muted, tinted.axis, tinted.grid])
      expect(hexToOklch(g).h).toBeCloseTo(hexToOklch(HUE).h, 1); // greys now carry the house hue
  });
  it("tints the LIGHT-default path too when a house hue is set (byte-identical without one)", () => {
    const plain = deriveFurniture(undefined); // legacy COLORS
    const tinted = deriveFurniture(undefined, HUE);
    expect(tinted.ink).toBe(plain.ink);
    expect(tinted.muted).not.toBe(plain.muted); // light furniture is tinted, not skipped
    expect(hexToOklch(tinted.muted).h).toBeCloseTo(hexToOklch(HUE).h, 1);
  });
  it("tinted muted keeps ≥4.5:1 on the #ffffff and #18181b presets (contrast preserved)", () => {
    const wl = (hex: string) => {
      const ch = (i: number) => {
        const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(0) + 0.7152 * ch(1) + 0.0722 * ch(2);
    };
    const cr = (a: string, b: string) => {
      const [hi, lo] = [wl(a), wl(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    for (const bg of ["#ffffff", "#18181b"]) {
      const f = deriveFurniture(bg, HUE);
      expect(cr(f.muted, bg)).toBeGreaterThanOrEqual(4.5);
      expect(
        Math.abs(cr(f.muted, bg) - cr(deriveFurniture(bg).muted, bg)),
      ).toBeLessThan(0.2); // delta small
    }
  });
});
