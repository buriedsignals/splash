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
