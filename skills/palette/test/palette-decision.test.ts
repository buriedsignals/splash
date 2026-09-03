/**
 * THE QUESTION THAT USUALLY HAD ONE ANSWER — issue #41.
 *
 * The palette was proposed at every story, and on most of them the journalist had nothing to
 * decide: no subject convention applied, and the newsroom's own recorded pair cleared the floor. A
 * journalist met it and said *"I dont know what this is about. we have the newsroom.md no?"*
 *
 * `paletteDecision` answers whether there is a decision at all. These tests pin the two cases where
 * there IS one, and — more importantly — pin that the common case is derived rather than asked.
 *
 * WHAT MUST NOT BE LOST, and is asserted below: the floor and the provenance. This skill exists
 * because `brandColor`/`ground` were once collected at preflight and never reached a render, and
 * because a `PALETTE.md` recording `#FFFF00` on white once rendered a clean PNG. A derived default
 * is measured on write, so a house pair that fails surfaces as a question instead of a silent file.
 */
import { describe, it, expect } from "bun:test";
import {
  NON_TEXT_CONTRAST_MIN,
  formatPalette,
  paletteDecision,
  parsePalette,
} from "../scripts/palette.mjs";

// Heidi.news's real measured values, the newsroom the reported run was for.
const HOUSE = { ground: "#faf8f5", brandColor: "#d5121e", accents: ["#e8685e", "#a70b15"] };

describe("the palette is derived when there is nothing to decide", () => {
  it("should not ask when no convention applies and the house pair clears the floor", () => {
    const decision = paletteDecision({ newsroom: HOUSE, subject: "hospital beds" });
    expect(decision.ask).toBe(false);
    expect(decision.palette).toMatchObject({
      ground: "#faf8f5",
      accent: "#d5121e",
      origin: "newsroom",
    });
  });

  it("should carry the further house accents in their recorded order", () => {
    // Multi-series beats reach for these through `seriesInks`; dropping them would quietly reduce a
    // newsroom's identity to one colour.
    const { palette } = paletteDecision({ newsroom: HOUSE, subject: "hospital beds" });
    expect(palette.accents).toEqual(["#d5121e", "#e8685e", "#a70b15"]);
  });

  it("should write a PALETTE.md that reads back through the ordinary reader", () => {
    // The derived file is not a special case downstream: `parsePalette` measures it on read exactly
    // as it measures a hand-written one, and it must survive that unchanged.
    const { palette } = paletteDecision({ newsroom: HOUSE, subject: "hospital beds" });
    const read = parsePalette(formatPalette(palette), "PALETTE.md");
    expect(read).toMatchObject({ ground: "#faf8f5", accent: "#d5121e", origin: "newsroom" });
  });

  it("should say plainly, in the file, that nobody was asked", () => {
    // Provenance is half of what this skill is for. `origin: newsroom` is the machine-readable
    // half; a journalist opening the file should also be able to see why no question reached them.
    const { palette } = paletteDecision({ newsroom: HOUSE, subject: "hospital beds" });
    const text = formatPalette(palette);
    expect(text).toContain("origin: newsroom");
    expect(text).toContain("nothing here to decide");
  });
});

describe("it still asks in the two cases where the journalist decides", () => {
  it("should ask when a subject convention competes with the house colour", () => {
    // Blue for water is doing work the legend would otherwise have to do, and that beats looking
    // like the rest of the masthead — a judgement, not a default.
    const decision = paletteDecision({ newsroom: HOUSE, subject: "drinking water supply" });
    expect(decision.ask).toBe(true);
    expect(decision.reason).toContain("competes");
    expect(decision.proposal.options.some((o: { origin: string }) => o.origin === "subject")).toBe(true);
  });

  it("should ask when the newsroom's own pair fails the floor, naming the measurement", () => {
    const decision = paletteDecision({
      newsroom: { ground: "#ffffff", brandColor: "#ffff00" },
      subject: "hospital beds",
    });
    expect(decision.ask).toBe(true);
    expect(decision.reason).toContain("1.07:1");
    expect(decision.reason).toContain(`${NON_TEXT_CONTRAST_MIN}:1 floor`);
    // And it offers the remedy rather than only the refusal.
    expect(decision.reason).toMatch(/nearest colour that clears it is #[0-9a-f]{6}/i);
  });

  it("should ask rather than invent when NEWSROOM.md records no pair", () => {
    const decision = paletteDecision({ newsroom: null, subject: "hospital beds" });
    expect(decision.ask).toBe(true);
    expect(decision.reason).toContain("preflight");
  });
});

describe("the floor survives the shortcut", () => {
  it("should refuse to format a palette whose accent a reader cannot see", () => {
    // The whole risk of deriving instead of asking is that a bad pair gets written silently. It
    // cannot: `formatPalette` measures before it writes, so such a newsroom reaches the question
    // above instead of a file.
    expect(() =>
      formatPalette({ ground: "#ffffff", accent: "#ffff00", accents: [], origin: "newsroom" }),
    ).toThrow();
  });

  it("should refuse a further accent that fails, not only the primary", () => {
    expect(() =>
      formatPalette({
        ground: "#ffffff",
        accent: "#d5121e",
        accents: ["#d5121e", "#ffff00"],
        origin: "newsroom",
      }),
    ).toThrow();
  });
});
