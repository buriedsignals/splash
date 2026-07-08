import { describe, it, expect } from "bun:test";
import {
  channelToAspect,
  channelToExportSize,
  EXPORT_SIZES,
} from "../src/export-aspect";

describe("channelToExportSize (FINDING 2: static export aspect follows the CADRAGE channel)", () => {
  it("maps feed/square to a ~1:1 square box", () => {
    for (const ch of ["feed", "square", "Feed", " SQUARE "]) {
      const s = channelToExportSize(ch);
      expect(s).toEqual(EXPORT_SIZES.square);
      expect(s.width).toBe(s.height); // 1:1
    }
  });

  it("maps social/vertical/story to a 9:16 portrait box", () => {
    for (const ch of [
      "social",
      "social-vertical",
      "vertical",
      "story",
      "reel",
      "tiktok",
    ]) {
      const s = channelToExportSize(ch);
      expect(s).toEqual(EXPORT_SIZES.portrait);
      expect(s.height).toBeGreaterThan(s.width); // taller than wide
      expect(s.width / s.height).toBeCloseTo(9 / 16, 2);
    }
  });

  it("maps web/article to a 16:9 landscape box", () => {
    for (const ch of ["web", "article", "embed", "landscape"]) {
      const s = channelToExportSize(ch);
      expect(s).toEqual(EXPORT_SIZES.landscape);
      expect(s.width).toBeGreaterThan(s.height); // wider than tall
      expect(s.width / s.height).toBeCloseTo(16 / 9, 2);
    }
  });

  it("defaults an absent or unrecognized channel to the web/landscape aspect", () => {
    expect(channelToExportSize(undefined)).toEqual(EXPORT_SIZES.landscape);
    expect(channelToExportSize("")).toEqual(EXPORT_SIZES.landscape);
    expect(channelToExportSize("something-new")).toEqual(
      EXPORT_SIZES.landscape,
    );
    expect(channelToAspect(undefined)).toBe("landscape");
  });
});
