import { describe, it, expect } from "bun:test";
import { legendTheme } from "../src/theme/legend-theme";

describe("legendTheme", () => {
  it("returns the canonical light-mode values (Hex/Cartogram/DotDensity source of truth)", () => {
    expect(legendTheme(false)).toEqual({
      ink: "#444",
      sub: "#555",
      bg: "rgba(255,255,255,0.92)",
      stroke: "rgba(0,0,0,.15)",
    });
  });

  it("returns the canonical dark-mode values", () => {
    expect(legendTheme(true)).toEqual({
      ink: "#f4f4f5",
      sub: "#c8c8cf",
      bg: "rgba(24,24,27,0.88)",
      stroke: "rgba(0,0,0,.15)",
    });
  });

  it("stroke is theme-invariant (matches the swatch ring used everywhere pre-refactor)", () => {
    expect(legendTheme(false).stroke).toBe(legendTheme(true).stroke);
  });

  it("light and dark ink are distinct", () => {
    expect(legendTheme(false).ink).not.toBe(legendTheme(true).ink);
  });
});
