import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sourceLabel } from "../src/core/locale";
import {
  ENGLISH_FURNITURE_BLOCKLIST,
  furnitureGateApplies,
  checkFurnitureI18n,
} from "../scripts/lib/furniture-i18n.mjs";

// The i18n furniture GATE (P5) for map-native, mirrored from chart-native's
// scripts/lib/furniture-i18n.mjs (per-skill duplication, same pattern as
// src/core/locale.ts). The map's FURNITURE (MapFrame title/description/source,
// the HTML legend, the filter bar) is DOM-reachable HTML; GL-internal canvas text
// (basemap place labels) is NOT and stays out of scope — consistent with the
// contrast-check asymmetry. Wired into snap-a11y.mjs (interactive) and
// snap-static.mjs (static), which already load the rendered page.

const FR_SOURCE = `${sourceLabel("fr")} Eurostat`; // exact bytes from the locale table

const okFr = {
  furnitureTexts: [
    "Le nord de l'Europe roule aux renouvelables",
    "Part de l'electricite renouvelable, 2024",
    FR_SOURCE,
    "21 %",
    "99 %",
  ],
  svgTexts: [],
};

describe("map-native furnitureGateApplies", () => {
  it("applies to fr, not to en / absent", () => {
    expect(furnitureGateApplies("fr")).toBe(true);
    expect(furnitureGateApplies("fr-CH")).toBe(true);
    expect(furnitureGateApplies("en")).toBe(false);
    expect(furnitureGateApplies(undefined)).toBe(false);
  });
});

describe("map-native checkFurnitureI18n", () => {
  it("passes correctly localized French map furniture", () => {
    expect(checkFurnitureI18n(okFr, "fr")).toEqual([]);
  });

  it("flags a missing localized source line", () => {
    const v = checkFurnitureI18n(
      {
        ...okFr,
        furnitureTexts: okFr.furnitureTexts.filter((t) => t !== FR_SOURCE),
      },
      "fr",
    );
    expect(v.join("\n")).toContain(sourceLabel("fr"));
  });

  it("flags the English source label on a French deliverable (blocklist)", () => {
    const v = checkFurnitureI18n(
      { ...okFr, furnitureTexts: [...okFr.furnitureTexts, "Source: Eurostat"] },
      "fr",
    );
    expect(v.join("\n")).toContain("Source:");
    expect(ENGLISH_FURNITURE_BLOCKLIST).toContain("Source:");
  });

  it("flags an unambiguous English-grouped legend number, exempts the ambiguous single group", () => {
    const bad = checkFurnitureI18n(
      { ...okFr, furnitureTexts: [...okFr.furnitureTexts, "1,234,567 hab."] },
      "fr",
    );
    expect(bad.join("\n")).toContain("1,234,567");
    const ambiguous = checkFurnitureI18n(
      { ...okFr, furnitureTexts: [...okFr.furnitureTexts, "3,456"] },
      "fr",
    );
    expect(ambiguous).toEqual([]);
  });

  it("returns no violations when the gate does not apply (English map)", () => {
    expect(
      checkFurnitureI18n(
        { furnitureTexts: ["A title", "Source: Eurostat"], svgTexts: [] },
        "en",
      ),
    ).toEqual([]);
  });
});

describe("structural — the gate is wired into both page-loading snaps", () => {
  for (const script of ["snap-a11y.mjs", "snap-static.mjs"]) {
    it(`${script} calls checkFurnitureI18n on the loaded page`, () => {
      const src = readFileSync(
        join(import.meta.dir, "..", "scripts", script),
        "utf8",
      );
      expect(src).toContain("checkFurnitureI18n");
      expect(src).toContain("collectFurnitureI18n");
      expect(src).toContain("furnitureGateApplies");
    });
  }
});
