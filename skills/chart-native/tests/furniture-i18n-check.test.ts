import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sourceLabel } from "../src/core/locale";
import {
  ENGLISH_FURNITURE_BLOCKLIST,
  furnitureGateApplies,
  checkFurnitureI18n,
} from "../scripts/lib/furniture-i18n.mjs";

// The i18n furniture GATE (P5) — the pure checker behind the render-time snap check
// (wired into snap-contrast.mjs and snap-interactive-contrast.mjs, which already load
// the rendered page). It verifies the FURNITURE was localized: a whole FR chart
// rendering English furniture ("Source:", English-grouped numbers) used to pass every
// gate. Data labels are exempt (an English category NAME from the data is legitimate
// on a French chart).

const FR_SOURCE = `${sourceLabel("fr")} INSEE`; // exact bytes from the locale table

const okFr = {
  furnitureTexts: ["Le Nord domine la production", "part (%)", FR_SOURCE],
  svgTexts: ["Nord", "Sud", "19,3", "8,7", "1 900", "2020"],
};

describe("furnitureGateApplies — only non-English rows of the locale table", () => {
  it("applies to fr / de / it (incl. regional tags)", () => {
    expect(furnitureGateApplies("fr")).toBe(true);
    expect(furnitureGateApplies("fr-CH")).toBe(true);
    expect(furnitureGateApplies("de")).toBe(true);
    expect(furnitureGateApplies("it")).toBe(true);
  });
  it("does not apply to en / absent / unknown (English-furniture fallback)", () => {
    expect(furnitureGateApplies("en")).toBe(false);
    expect(furnitureGateApplies(undefined)).toBe(false);
    expect(furnitureGateApplies("es")).toBe(false);
  });
});

describe("checkFurnitureI18n — source label", () => {
  it("passes correctly localized French furniture", () => {
    expect(checkFurnitureI18n(okFr, "fr")).toEqual([]);
  });

  it("flags a missing localized source line", () => {
    const v = checkFurnitureI18n(
      { ...okFr, furnitureTexts: ["Le Nord domine", "INSEE"] },
      "fr",
    );
    expect(v.length).toBeGreaterThan(0);
    expect(v.join("\n")).toContain(sourceLabel("fr"));
  });

  it("flags the English source label rendered on a French deliverable", () => {
    const v = checkFurnitureI18n(
      { ...okFr, furnitureTexts: ["Le Nord domine", "Source: INSEE"] },
      "fr",
    );
    // both the blocklist hit AND the missing localized line
    expect(v.join("\n")).toContain("Source:");
  });

  it("returns no violations when the gate does not apply (English)", () => {
    const en = {
      furnitureTexts: ["A title", "Source: ONS"],
      svgTexts: ["1,900"],
    };
    expect(checkFurnitureI18n(en, "en")).toEqual([]);
    expect(checkFurnitureI18n(en, undefined)).toEqual([]);
  });
});

describe("checkFurnitureI18n — English-furniture blocklist", () => {
  it("exports the blocklist as a named constant", () => {
    expect(ENGLISH_FURNITURE_BLOCKLIST).toContain("Source:");
    expect(ENGLISH_FURNITURE_BLOCKLIST).toContain("Created with");
  });

  it("flags a blocklisted English caption in the furniture", () => {
    const v = checkFurnitureI18n(
      {
        ...okFr,
        furnitureTexts: [...okFr.furnitureTexts, "Created with Datawrapper"],
      },
      "fr",
    );
    expect(v.join("\n")).toContain("Created with");
  });

  it("does NOT flag blocklist matches inside data labels (svg) — data is exempt", () => {
    const v = checkFurnitureI18n(
      { ...okFr, svgTexts: [...okFr.svgTexts, "Chart: A (band name)"] },
      "fr",
    );
    expect(v).toEqual([]);
  });
});

describe("checkFurnitureI18n — number grouping spot check (conservative)", () => {
  it("flags an unambiguous English multi-group number in the rendered text", () => {
    const v = checkFurnitureI18n(
      { ...okFr, svgTexts: [...okFr.svgTexts, "1,234,567"] },
      "fr",
    );
    expect(v.join("\n")).toContain("1,234,567");
  });

  it("flags an unambiguous comma-group + dot-decimal number", () => {
    const v = checkFurnitureI18n(
      {
        ...okFr,
        furnitureTexts: [...okFr.furnitureTexts, "PIB : 1,234.5 Mds"],
      },
      "fr",
    );
    expect(v.join("\n")).toContain("1,234.5");
  });

  it("does NOT flag a single comma-group (ambiguous with a 3-decimal French value)", () => {
    // formatLocaleNumber(3.456, "fr") legitimately renders "3,456" — indistinguishable
    // from English-grouped 3456, so the conservative check must let it pass.
    const v = checkFurnitureI18n(
      { ...okFr, svgTexts: [...okFr.svgTexts, "3,456"] },
      "fr",
    );
    expect(v).toEqual([]);
  });

  it("does NOT flag correctly grouped French numbers", () => {
    const v = checkFurnitureI18n(
      { ...okFr, svgTexts: [...okFr.svgTexts, "17 600", "1 234 567"] },
      "fr",
    );
    expect(v).toEqual([]);
  });
});

describe("structural — the gate is wired into both page-loading snaps", () => {
  // Matches the snap-interactive-contrast.test.ts convention: a strip-free source
  // check that the two snaps which already load the rendered page really call the
  // shared gate (render-proven RED/GREEN in the branch's produce runs).
  for (const script of ["snap-contrast.mjs", "snap-interactive-contrast.mjs"]) {
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
