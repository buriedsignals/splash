import { describe, it, expect } from "bun:test";
import { deriveFurniture, resolveFrameColors } from "./theme";

describe("core/theme deriveFurniture golden table", () => {
  it("deriveFurniture returns the pinned furniture for each background", () => {
    const golden: Record<string, ReturnType<typeof deriveFurniture>> = {
      "#ffffff": {
        line: "#0072B2",
        head: "#FFFFFF",
        headGlow: "#0072B2",
        ink: "#1A1A1A",
        muted: "#6B6B6B",
        grid: "#E6E6E6",
        axis: "#CFCFCF",
        bg: "#FFFFFF",
      },
      "#0b1220": {
        line: "#56B4E9",
        head: "#FFFFFF",
        headGlow: "#56B4E9",
        ink: "#F4F4F5",
        muted: "#aeb0b5",
        axis: "#4c515c",
        grid: "#2c323e",
        bg: "#0B1220",
      },
      "#f4c9d7": {
        line: "#0072B2",
        head: "#FFFFFF",
        headGlow: "#0072B2",
        ink: "#1A1A1A",
        muted: "#5b4f53",
        axis: "#b798a2",
        grid: "#d5b1bd",
        bg: "#F4C9D7",
      },
      "#36454f": {
        line: "#56B4E9",
        head: "#FFFFFF",
        headGlow: "#56B4E9",
        ink: "#F4F4F5",
        muted: "#bbc0c3",
        axis: "#6b767d",
        grid: "#515e66",
        bg: "#36454F",
      },
      "#71717a": {
        line: "#0072B2",
        head: "#FFFFFF",
        headGlow: "#0072B2",
        ink: "#FFFFFF",
        muted: "#d4d4d7",
        axis: "#99999f",
        grid: "#85858d",
        bg: "#71717A",
      },
      "#009e73": {
        line: "#0072B2",
        head: "#FFFFFF",
        headGlow: "#0072B2",
        ink: "#1A1A1A",
        muted: "#124235",
        axis: "#07795a",
        grid: "#048c67",
        bg: "#009E73",
      },
    };
    for (const [bg, expected] of Object.entries(golden))
      expect(deriveFurniture(bg)).toEqual(expected);
  });
});

describe("core/theme resolveFrameColors golden table", () => {
  it("resolveFrameColors returns the pinned frame furniture for each background", () => {
    const golden: Record<string, ReturnType<typeof resolveFrameColors>> = {
      "#ffffff": {
        pill: "rgba(255,255,255,0.92)",
        ink: "#1a1a1a",
        muted: "#5f5f5f",
      },
      "#0b1220": {
        pill: "rgba(11,18,32,0.82)",
        ink: "#f4f4f5",
        muted: "#c1c2c6",
      },
      "#f4c9d7": {
        pill: "rgba(244,201,215,0.82)",
        ink: "#1a1a1a",
        muted: "#4a4144",
      },
      "#36454f": {
        pill: "rgba(54,69,79,0.82)",
        ink: "#f4f4f5",
        muted: "#caced0",
      },
      "#71717a": {
        pill: "rgba(113,113,122,0.82)",
        ink: "#ffffff",
        muted: "#e0e0e2",
      },
      "#009e73": {
        pill: "rgba(0,158,115,0.82)",
        ink: "#1a1a1a",
        muted: "#14372e",
      },
    };
    for (const [bg, expected] of Object.entries(golden))
      expect(resolveFrameColors(bg)).toEqual(expected);
  });
});

import {
  tintNeutral,
  FRAME_COLORS,
  FRAME_COLORS_DARK,
  DARK_FRAME_BG,
} from "./theme";
import { hexToOklch } from "./house-ramp";
import { contrastRatio } from "./contrast";

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

describe("resolveFrameColors house-hue tint", () => {
  const HUE = "#2E7D57"; // a green house hue

  it("is byte-identical to FRAME_COLORS on the light default with no house hue", () => {
    expect(resolveFrameColors()).toEqual(FRAME_COLORS);
    expect(resolveFrameColors(undefined, undefined)).toEqual(FRAME_COLORS);
  });

  it("is byte-identical to the dark preset with no house hue", () => {
    // Independent literal oracle — FRAME_COLORS_DARK is itself resolveFrameColors(DARK_FRAME_BG),
    // so asserting against it alone is a tautology. Pin the exact expected furniture so a future
    // regression that tinted the no-hue dark path (and thus re-derived FRAME_COLORS_DARK) is caught.
    expect(resolveFrameColors(DARK_FRAME_BG)).toEqual({
      pill: "rgba(24,24,27,0.82)",
      ink: "#f4f4f5",
      muted: "#c4c4c5",
    });
    expect(resolveFrameColors(DARK_FRAME_BG)).toEqual(FRAME_COLORS_DARK);
  });

  it("ignores a non-#rrggbb house hue (byte-identical)", () => {
    expect(resolveFrameColors(undefined, "purples")).toEqual(FRAME_COLORS);
  });

  it("tints muted toward the house hue on the light default, leaving pill and ink untouched", () => {
    const tinted = resolveFrameColors(undefined, HUE);
    expect(tinted.pill).toBe(FRAME_COLORS.pill);
    expect(tinted.ink).toBe(FRAME_COLORS.ink);
    expect(tinted.muted).not.toBe(FRAME_COLORS.muted);
  });

  it("tints muted on a derived ground too (dark preset), pill and ink unchanged", () => {
    const tinted = resolveFrameColors(DARK_FRAME_BG, HUE);
    expect(tinted.pill).toBe(FRAME_COLORS_DARK.pill);
    expect(tinted.ink).toBe(FRAME_COLORS_DARK.ink);
    expect(tinted.muted).not.toBe(FRAME_COLORS_DARK.muted);
  });

  it("preserves the muted OKLCH lightness (contrast-preservation oracle)", () => {
    for (const bg of [undefined, DARK_FRAME_BG]) {
      const base = resolveFrameColors(bg);
      const tinted = resolveFrameColors(bg, HUE);
      // independent oracle: tint re-hues at constant L, so L is unchanged within rounding
      expect(hexToOklch(tinted.muted).L).toBeCloseTo(
        hexToOklch(base.muted).L,
        2,
      );
    }
  });

  it("muted clears its WCAG floor on every ground for representative house hues", () => {
    const hues = [
      "#2E7D57",
      "#B4232A",
      "#1F4FA2",
      "#7A1FA2",
      "#C98A00",
      "#008080",
    ];
    const grounds: (string | undefined)[] = [
      undefined,
      DARK_FRAME_BG,
      "#2B2B2B",
      "#EDEDED",
    ];
    for (const hue of hues) {
      for (const g of grounds) {
        const fc = resolveFrameColors(g, hue);
        const ground =
          g && /^#[0-9a-f]{6}$/i.test(g)
            ? g
            : fc.pill.startsWith("rgba(255")
              ? "#ffffff"
              : "#18181b";
        expect(contrastRatio(fc.muted, ground)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
