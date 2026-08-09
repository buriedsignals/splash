import { describe, it, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  contrast,
  NON_TEXT_CONTRAST_MIN,
  adjustToContrast,
  SUBJECT_CONVENTIONS,
  matchConvention,
  proposePalette,
  readPalette,
  parsePalette,
} from "../scripts/palette.mjs";

const HEIDI = { name: "Heidi.news", brandColor: "#0B7A75", ground: "#FFFFFF" };

describe("contrast", () => {
  it("should return 21 for the two poles and 1 for a colour against itself", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrast("#0B7A75", "#0B7A75")).toBeCloseTo(1, 5);
  });

  it("should be symmetric, because a ratio has no direction", () => {
    expect(contrast("#0B7A75", "#FFFFFF")).toBeCloseTo(
      contrast("#FFFFFF", "#0B7A75"),
      10,
    );
  });
});

describe("the non-text floor", () => {
  it("should be 3, the SC 1.4.11 threshold for a graphical object — not the 4.5 that governs text", () => {
    expect(NON_TEXT_CONTRAST_MIN).toBe(3);
  });
});

describe("adjustToContrast", () => {
  it("should darken an accent that fails on a light ground until it clears the floor", () => {
    const remedy = adjustToContrast("#F2C744", "#FFFFFF");
    expect(remedy).not.toBeNull();
    expect(contrast(remedy!, "#FFFFFF")).toBeGreaterThanOrEqual(
      NON_TEXT_CONTRAST_MIN,
    );
  });

  it("should lighten, not darken, when the ground is dark", () => {
    const remedy = adjustToContrast("#1B3A2E", "#111111");
    expect(remedy).not.toBeNull();
    expect(contrast(remedy!, "#111111")).toBeGreaterThanOrEqual(
      NON_TEXT_CONTRAST_MIN,
    );
    // Moving toward white on a dark ground means every channel rises.
    expect(parseInt(remedy!.slice(1, 3), 16)).toBeGreaterThan(0x1b);
  });

  it("should stop at the FIRST passing step, so the remedy stays near the colour it came from", () => {
    const remedy = adjustToContrast("#F2C744", "#FFFFFF")!;
    const ratio = contrast(remedy, "#FFFFFF");
    // A first-passing step lands just over the floor; a lazy "walk all the way to black"
    // implementation would return something near 21:1 and no longer resemble the brand.
    expect(ratio).toBeGreaterThanOrEqual(NON_TEXT_CONTRAST_MIN);
    expect(ratio).toBeLessThan(NON_TEXT_CONTRAST_MIN + 1);
  });

  // MEASURED, against the earlier hand-written claim that a mid-grey ground defeats the default
  // floor. It does not. Swept over 4352 grounds (all 256 greys plus a 16-step RGB grid): zero
  // nulls at 3:1, zero at 4.5:1, first null at 5:1. `#747474` is the hardest ground found and
  // still lands at 3.0000809:1 — that margin is the whole reason this test names it.
  it("should ALWAYS find a passing variant at the default floor, on every grey including the tightest", () => {
    for (let v = 0; v < 256; v++) {
      const ground =
        "#" + [v, v, v].map((x) => x.toString(16).padStart(2, "0")).join("");
      const remedy = adjustToContrast("#808080", ground);
      expect([ground, remedy]).not.toEqual([ground, null]);
      expect(contrast(remedy!, ground)).toBeGreaterThanOrEqual(
        NON_TEXT_CONTRAST_MIN,
      );
    }
  });

  it("should land the tightest ground just over the floor, not comfortably above it", () => {
    expect(
      contrast(adjustToContrast("#808080", "#747474")!, "#747474"),
    ).toBeLessThan(3.001);
  });

  it("should return null when a CALLER raises the floor beyond what the ground allows — the branch's real reason to exist", () => {
    expect(adjustToContrast("#808080", "#747474", 5)).toBeNull();
  });

  it("should throw on a malformed hex rather than coerce it", () => {
    expect(() => adjustToContrast("0B7A75", "#FFFFFF")).toThrow(/#rrggbb/);
    expect(() => adjustToContrast("#0B7A75", "white")).toThrow(/#rrggbb/);
  });
});

describe("matchConvention", () => {
  it("should match a subject written in French as readily as one in English", () => {
    expect(matchConvention("part du solaire dans le mix")?.id).toBe(
      "renewables",
    );
    expect(matchConvention("Swiss solar generation")?.id).toBe("renewables");
  });

  it("should return null when SEVERAL conventions match — that is an editorial choice, not a table lookup", () => {
    expect(
      matchConvention("coal-fired power replacing river hydro"),
    ).toBeNull();
  });

  it("should return null for a subject no convention covers, leaving the house theme to win", () => {
    expect(matchConvention("le prix du logement à Genève")).toBeNull();
  });

  it("should return null for an empty or absent subject", () => {
    expect(matchConvention("")).toBeNull();
    expect(matchConvention(undefined as unknown as string)).toBeNull();
  });

  it("should ship every convention with a reasoning a journalist can read", () => {
    for (const c of SUBJECT_CONVENTIONS) {
      expect(c.reasoning.length).toBeGreaterThan(40);
      expect(c.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("proposePalette", () => {
  it("should offer the house option and the subject option, each with provenance and a measured ratio", () => {
    const p = proposePalette({
      newsroom: HEIDI,
      subject: "la part du solaire",
    });
    expect(p.options.map((o) => o.id)).toEqual(["house", "subject"]);
    for (const o of p.options) {
      expect(o.provenance).toBeTruthy();
      expect(o.reasoning).toBeTruthy();
      expect(o.contrast.ratio).toBeGreaterThan(1);
      expect(o.contrast.min).toBe(NON_TEXT_CONTRAST_MIN);
    }
  });

  it("should recommend the house option — a convention is a reason to depart, never an override", () => {
    const p = proposePalette({
      newsroom: HEIDI,
      subject: "la part du solaire",
    });
    expect(p.recommended).toBe("house");
  });

  it("should keep the subject option's ground from NEWSROOM.md, and say so when there is none", () => {
    const withHouse = proposePalette({ newsroom: HEIDI, subject: "solar" });
    expect(withHouse.options[1].ground).toBe("#FFFFFF");
    const without = proposePalette({ subject: "solar" });
    expect(without.options[0].provenance).toMatch(/default white/);
  });

  it("should show a failing house colour AS FAILING, with a remedy beside it — never swapped in", () => {
    const p = proposePalette({
      newsroom: { brandColor: "#F2C744", ground: "#FFFFFF" },
      subject: "logement",
    });
    const house = p.options[0];
    expect(house.accent).toBe("#F2C744"); // the brand survives, untouched
    expect(house.contrast.passes).toBe(false);
    expect(house.remedy?.accent).not.toBe("#F2C744");
    expect(house.remedy!.contrast).toBeGreaterThanOrEqual(
      NON_TEXT_CONTRAST_MIN,
    );
  });

  // Recommending a colour this skill has just measured as unreadable is the one outcome worse
  // than proposing nothing. An earlier draft fell back to `options[0]`, which handed back a
  // 1.61:1 brand marked "recommended" three lines under the words "FAILS the 3:1 floor".
  it("should recommend NOTHING when the only option fails", () => {
    const p = proposePalette({
      newsroom: { brandColor: "#F2C744", ground: "#FFFFFF" },
      subject: "logement",
    });
    expect(p.options).toHaveLength(1);
    expect(p.options[0].contrast.passes).toBe(false);
    expect(p.recommended).toBeNull();
  });

  it("should fall to the subject option when the house colour fails but the convention passes", () => {
    const p = proposePalette({
      newsroom: { brandColor: "#F2C744", ground: "#FFFFFF" },
      subject: "la part du solaire",
    });
    expect(p.options[0].contrast.passes).toBe(false);
    expect(p.recommended).toBe("subject");
  });

  it("should always carry the escape branch, including when nothing can be proposed", () => {
    expect(
      proposePalette({ newsroom: HEIDI, subject: "solar" }).escape,
    ).toBeTruthy();
    const empty = proposePalette({ subject: "le prix du logement" });
    expect(empty.options).toEqual([]);
    expect(empty.recommended).toBeNull();
    expect(empty.escape).toBeTruthy();
  });

  it("should throw on a malformed newsroom hex rather than propose a coerced colour", () => {
    expect(() =>
      proposePalette({ newsroom: { brandColor: "teal", ground: "#FFFFFF" } }),
    ).toThrow(/brandColor/);
    expect(() =>
      proposePalette({ newsroom: { brandColor: "#0B7A75", ground: "#FFF" } }),
    ).toThrow(/ground/);
  });

  it("should expose no write-shaped export — this skill proposes and never applies", async () => {
    const mod = await import("../scripts/palette.mjs");
    for (const name of Object.keys(mod)) {
      expect(name).not.toMatch(/^(write|save|apply|persist|set)/i);
    }
  });
});

describe("parsePalette", () => {
  const good = `---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: newsroom\n---\n`;

  it("should read the three recorded fields", () => {
    expect(parsePalette(good)).toEqual({
      ground: "#FFFFFF",
      accent: "#0B7A75",
      origin: "newsroom",
      source: "PALETTE.md",
    });
  });

  it("should reject a file with no front matter", () => {
    expect(() => parsePalette("just prose")).toThrow(/front matter/);
  });

  it("should reject a missing or malformed colour rather than fill it in", () => {
    expect(() =>
      parsePalette(`---\naccent: "#0B7A75"\norigin: newsroom\n---\n`),
    ).toThrow(/ground/);
    expect(() =>
      parsePalette(
        `---\nground: white\naccent: "#0B7A75"\norigin: newsroom\n---\n`,
      ),
    ).toThrow(/#rrggbb/);
  });

  it("should reject an origin outside the three that mean something", () => {
    expect(() =>
      parsePalette(
        `---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: default\n---\n`,
      ),
    ).toThrow(/origin/);
  });

  it("should accept journalist as an origin — two hex codes given directly is the proposal working", () => {
    expect(
      parsePalette(
        `---\nground: "#111111"\naccent: "#E6B800"\norigin: journalist\n---\n`,
      ).origin,
    ).toBe("journalist");
  });
});

describe("readPalette", () => {
  it("should find a PALETTE.md at the story root from a beat nested under it", () => {
    const root = mkdtempSync(join(tmpdir(), "twin-palette-"));
    try {
      writeFileSync(
        join(root, "PALETTE.md"),
        `---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: newsroom\n---\n`,
      );
      const beat = join(root, "beats", "1-solar");
      mkdirSync(beat, { recursive: true });
      expect(readPalette(beat, { stopAt: root }).accent).toBe("#0B7A75");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("should prefer a beat's own PALETTE.md over the story's", () => {
    const root = mkdtempSync(join(tmpdir(), "twin-palette-"));
    try {
      writeFileSync(
        join(root, "PALETTE.md"),
        `---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: newsroom\n---\n`,
      );
      const beat = join(root, "beats", "1-solar");
      mkdirSync(beat, { recursive: true });
      writeFileSync(
        join(beat, "PALETTE.md"),
        `---\nground: "#FFFFFF"\naccent: "#1B7F4B"\norigin: subject\n---\n`,
      );
      expect(readPalette(beat, { stopAt: root }).accent).toBe("#1B7F4B");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("should THROW naming every directory searched, rather than default to black on white", () => {
    const root = mkdtempSync(join(tmpdir(), "twin-palette-"));
    try {
      const beat = join(root, "beats", "1-solar");
      mkdirSync(beat, { recursive: true });
      let message = "";
      try {
        readPalette(beat, { stopAt: root });
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).toMatch(/No PALETTE\.md found/);
      expect(message).toContain(join(beat, "PALETTE.md"));
      expect(message).toContain(join(root, "PALETTE.md"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
