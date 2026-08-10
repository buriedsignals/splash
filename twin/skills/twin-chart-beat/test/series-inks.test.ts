/**
 * A MULTI-SERIES BEAT DRAWS EVERY SERIES IN A COLOUR SOMEBODY CHOSE.
 *
 * Measured on 2026-08-10, before `seriesInks` existed: `vidx-stacked-bar-swiss-electricity`'s
 * three bands were built as `[accent, muted, muted]` — the house colour once and the FURNITURE
 * grey twice. `muted` is derived from the ground for axis labels and the source line; its whole
 * job is to recede. A newsroom could change its accent and two of the three bands would not move,
 * which is the owner's own report ("je n'ai pas vu de différence") in one line of code.
 */
import { describe, it, expect } from "bun:test";
import {
  seriesInks,
  parsePalette,
  deriveFurniture,
  contrast,
  assertLegible,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "../scripts/render-still.mjs";

const recorded = (accents: string, ground = "#FFFFFF") =>
  parsePalette(
    `---\nground: "${ground}"\naccent: "${accents.split(",")[0]!.trim()}"\n` +
      `accents: "${accents}"\norigin: newsroom\n---\n`,
  );

describe("seriesInks", () => {
  it("should hand back the recorded accents themselves, in the recorded order", () => {
    const palette = recorded("#0B7A75, #C1440E, #1F6FB2");
    expect(seriesInks(palette, 3)).toEqual(["#0B7A75", "#C1440E", "#1F6FB2"]);
  });

  it("should take only as many as the beat draws", () => {
    expect(seriesInks(recorded("#0B7A75, #C1440E, #1F6FB2"), 1)).toEqual([
      "#0B7A75",
    ]);
  });

  it("should derive further inks from the recorded accents when a beat needs more", () => {
    const palette = recorded("#0B7A75");
    const inks = seriesInks(palette, 3);
    expect(inks[0]).toBe("#0B7A75");
    expect(inks.length).toBe(3);
    expect(new Set(inks).size).toBe(3);
  });

  it("should never hand back the furniture grey — the defect this replaces", () => {
    const palette = recorded("#0B7A75");
    const { muted, grid } = deriveFurniture(palette.ground);
    for (const ink of seriesInks(palette, 3)) {
      expect([ink, ink === muted || ink === grid]).toEqual([ink, false]);
    }
  });

  it("should keep every derived ink above the 3:1 mark floor against the ground", () => {
    for (const ground of ["#FFFFFF", "#12161C", "#F4EFE7"]) {
      const palette = recorded("#0B7A75", ground);
      for (const ink of seriesInks(palette, 3)) {
        expect([
          ground,
          ink,
          contrast(ink, ground) >= NON_TEXT_CONTRAST_MIN,
        ]).toEqual([ground, ink, true]);
      }
    }
  });

  it("should separate every ink from every other, so two series never read as one", () => {
    // THREE is what ONE recorded accent reaches on white, measured rather than chosen: the accent
    // at 5.18:1 against white, then quarter-steps toward the ink at 7.83 and 12.08 — each 1.51 and
    // 1.54 apart from the one before. The next step lands at 17.25, only 1.43 from the one before
    // it, and is refused (below). Two recorded accents reach six.
    const inks = seriesInks(recorded("#0B7A75"), 3);
    expect(new Set(inks).size).toBe(inks.length);
    const pair = seriesInks(recorded("#0B7A75, #C1440E"), 6);
    expect(new Set(pair).size).toBe(6);
  });

  it("should MOVE when the recorded palette moves — the whole point", () => {
    const teal = seriesInks(recorded("#0B7A75"), 3);
    const rust = seriesInks(recorded("#B4451F"), 3);
    for (let i = 0; i < 3; i++) expect(teal[i]).not.toBe(rust[i]);
  });

  it("should THROW rather than default when it cannot separate enough inks", () => {
    // One accent on a mid-grey ground leaves very little room on either side. The refusal has to
    // say how many were recorded against how many were asked for, because "record a second accent"
    // is the answer and it is the newsroom's decision, not this function's.
    let thrown = "";
    try {
      seriesInks(recorded("#0B7A75"), 40);
    } catch (error) {
      thrown = String((error as Error).message);
    }
    expect(thrown).toContain("draws 40 series");
    expect(thrown).toContain("1 accent");
    expect(thrown).toContain("Record more accents");
  });

  it("should refuse a record that is not a parsed palette", () => {
    expect(() => seriesInks({ ground: "#FFFFFF" } as never, 2)).toThrow(
      /parsed PALETTE record/,
    );
    expect(() => seriesInks(recorded("#0B7A75"), 0)).toThrow(
      /positive series count/,
    );
  });
});

describe("assertLegible — the two floors stay apart", () => {
  it("should pass a mark at 3:1 that a text floor would reject", () => {
    // #767676 on white is 4.54:1; #949494 is 3.03:1 — a legible BAR, an illegible paragraph.
    const grey = "#949494";
    expect(contrast(grey, "#FFFFFF")).toBeGreaterThanOrEqual(
      NON_TEXT_CONTRAST_MIN,
    );
    expect(contrast(grey, "#FFFFFF")).toBeLessThan(TEXT_CONTRAST_MIN);
    expect(assertLegible(grey, "#FFFFFF", { role: "mark" })).toBeGreaterThan(3);
    expect(() => assertLegible(grey, "#FFFFFF", { role: "text" })).toThrow(
      /SC 1\.4\.3/,
    );
  });

  it("should let large text take the relaxation, and say which criterion it comes from", () => {
    const grey = "#949494";
    expect(
      assertLegible(grey, "#FFFFFF", { role: "largeText" }),
    ).toBeGreaterThan(3);
    let thrown = "";
    try {
      assertLegible("#EEEEEE", "#FFFFFF", { role: "largeText" });
    } catch (error) {
      thrown = String((error as Error).message);
    }
    expect(thrown).toContain("large-text relaxation");
    expect(thrown).toContain("24px");
  });

  it("should make the caller NAME the role rather than guess a number", () => {
    expect(() =>
      assertLegible("#000000", "#FFFFFF", { role: "graphic" as never }),
    ).toThrow(/role must be mark, text or largeText/);
  });

  it("should carry where it was measured into the refusal", () => {
    expect(() =>
      assertLegible("#FFFF00", "#FFFFFF", {
        role: "mark",
        where: "beats/3-solar/PALETTE.md: the accent #FFFF00",
      }),
    ).toThrow(/beats\/3-solar\/PALETTE\.md/);
  });
});
