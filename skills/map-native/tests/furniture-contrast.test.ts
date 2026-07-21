import { describe, it, expect } from "bun:test";
import {
  rgbToHex,
  parseCssColorToHex,
  isBoldFontWeight,
  computeSamplePoints,
} from "../scripts/lib/furniture-contrast.mjs";

describe("rgbToHex", () => {
  it("converts 0-255 channels to #rrggbb", () => {
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
    expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
    expect(rgbToHex(26, 26, 26)).toBe("#1a1a1a");
  });
  it("rounds fractional channels (anti-aliased screenshot pixels)", () => {
    expect(rgbToHex(24.6, 24.4, 27.5)).toBe("#19181c");
  });
  it("clamps out-of-range channels", () => {
    expect(rgbToHex(-10, 300, 128)).toBe("#00ff80");
  });
});

describe("parseCssColorToHex", () => {
  it("parses rgb() computed-style strings", () => {
    expect(parseCssColorToHex("rgb(26, 26, 26)")).toBe("#1a1a1a");
  });
  it("parses rgba() and ignores the alpha channel when opaque", () => {
    expect(parseCssColorToHex("rgba(255, 255, 255, 0.92)")).toBe("#ffffff");
  });
  it("returns null for fully transparent (alpha 0) — not a real colour", () => {
    expect(parseCssColorToHex("rgba(0, 0, 0, 0)")).toBeNull();
  });
  it("returns null for an unparseable string", () => {
    expect(parseCssColorToHex("")).toBeNull();
    expect(parseCssColorToHex(undefined)).toBeNull();
  });
});

describe("isBoldFontWeight", () => {
  it("treats the 'bold' keyword as bold", () => {
    expect(isBoldFontWeight("bold")).toBe(true);
  });
  it("treats numeric weight >= 700 as bold", () => {
    expect(isBoldFontWeight("700")).toBe(true);
    expect(isBoldFontWeight("900")).toBe(true);
  });
  it("treats normal/light weight as not bold", () => {
    expect(isBoldFontWeight("400")).toBe(false);
    expect(isBoldFontWeight("normal")).toBe(false);
    expect(isBoldFontWeight("300")).toBe(false);
  });
});

describe("computeSamplePoints", () => {
  const rect = { left: 10, top: 20, width: 100, height: 10 };

  it("returns 3 points (left/mid/right) at the vertical centre by default", () => {
    const pts = computeSamplePoints(rect, 1, 1);
    expect(pts).toEqual([
      { x: 30, y: 25 },
      { x: 60, y: 25 },
      { x: 90, y: 25 },
    ]);
  });

  it("scales into image space (deviceScaleFactor 2)", () => {
    const pts = computeSamplePoints(rect, 2, 2);
    expect(pts).toEqual([
      { x: 60, y: 50 },
      { x: 120, y: 50 },
      { x: 180, y: 50 },
    ]);
  });

  it("honours independent X/Y scale factors", () => {
    const pts = computeSamplePoints(rect, 1, 3);
    expect(pts.every((p) => p.y === 75)).toBe(true);
  });

  it("honours custom fractions", () => {
    const pts = computeSamplePoints(rect, 1, 1, [0.5]);
    expect(pts).toEqual([{ x: 60, y: 25 }]);
  });
});
