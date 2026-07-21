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
