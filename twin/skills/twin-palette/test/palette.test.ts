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
  // SUBJECT FIRST, house second — the owner's ruling (twin/FEEDBACK-2026-08-10.md, A8). A
  // convention the reader already holds is doing work the legend would otherwise have to do, for
  // THIS chart; looking like the rest of the masthead is what leads when there is no convention.
  it("should offer the subject option first and the house option second, each with provenance and a measured ratio", () => {
    const p = proposePalette({
      newsroom: HEIDI,
      subject: "la part du solaire",
    });
    expect(p.options.map((o) => o.id)).toEqual(["subject", "house"]);
    for (const o of p.options) {
      expect(o.provenance).toBeTruthy();
      expect(o.reasoning).toBeTruthy();
      expect(o.contrast.ratio).toBeGreaterThan(1);
      expect(o.contrast.min).toBe(NON_TEXT_CONTRAST_MIN);
    }
  });

  it("should recommend the subject option when a convention matches and it passes", () => {
    const p = proposePalette({
      newsroom: HEIDI,
      subject: "la part du solaire",
    });
    expect(p.recommended).toBe("subject");
    // And nothing is left unexplained: a convention DID match, so there is nothing to explain.
    expect(p.noConventionReason).toBeNull();
  });

  // The common case, and the one the run hit: four conventions ship, so most subjects match none.
  // One option with no explanation of why there is only one reads as a tool with nothing to say.
  it("should say WHY the newsroom leads when no convention applies, rather than silently showing one option", () => {
    const p = proposePalette({
      newsroom: HEIDI,
      subject: "les glaciers et les sponsors des JO",
    });
    expect(p.options.map((o) => o.id)).toEqual(["house"]);
    expect(p.recommended).toBe("house");
    expect(p.noConventionReason).toBeTruthy();
    expect(p.noConventionReason).toContain("newsroom");
  });

  it("should say so too when there was no subject to look a convention up by", () => {
    const p = proposePalette({ newsroom: HEIDI });
    expect(p.noConventionReason).toContain("No subject was given");
  });

  it("should keep the subject option's ground from NEWSROOM.md, and say so when there is none", () => {
    const withHouse = proposePalette({ newsroom: HEIDI, subject: "solar" });
    expect(withHouse.options[0].ground).toBe("#FFFFFF");
    const without = proposePalette({ subject: "solar" });
    expect(without.options[0].provenance).toMatch(/default white/);
  });

  it("should show a failing house colour AS FAILING, with a remedy beside it — never swapped in", () => {
    const p = proposePalette({
      newsroom: { brandColor: "#F2C744", ground: "#FFFFFF" },
      subject: "logement",
    });
    const house = p.options.find((o) => o.id === "house")!;
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
    expect(p.options.find((o) => o.id === "house")!.contrast.passes).toBe(
      false,
    );
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

/**
 * A NEWSROOM WITH MORE THAN ONE ACCENT — and the property that must survive it: a longer recorded
 * palette is not a way past the 3:1 floor. Every accent is scored exactly like the primary, a
 * failing one is shown failing with its remedy, and `recommended` only ever names a measured pass.
 *
 * MUTATION 1: score only the primary (`accents.slice(0, 1)` in `proposePalette`). Run in
 * /tmp/twin-mut:
 *   (fail) a newsroom with several accents > should score every recorded accent, not only the
 *          primary
 *   error: expect(received).toEqual(expected)
 *      "house",
 *   -  "house-2",
 *   -  "house-3",
 *
 * MUTATION 2: let `recommended` fall back to the first house option whatever its contrast
 * (`options.find((o) => o.origin === "newsroom")?.id` as the last clause). Run in /tmp/twin-mut —
 * and it reddens the standing guard next to it as well, which is the guard working:
 *   (fail) proposePalette > should recommend NOTHING when the only option fails
 *   error: expect(received).toBeNull() · Received: "house"
 *   (fail) a newsroom with several accents > should never recommend an accent that misses the floor
 *   error: expect(received).toBe(expected) · Expected: "house-2" · Received: "house"
 *
 * The PARITY test at the end is the twin's own answer to duplication: `houseAccents` here and
 * `newsroomAccents` in splash-twin are the same rule written twice, on purpose (a skill stays
 * copy-pasteable), so they are held in step behaviourally over a table of profiles rather than by
 * eye. MUTATION 3: drop the de-duplication from `houseAccents`.
 *   (fail) a newsroom with several accents > should read the same accents splash-twin's own reader
 *          reads
 *   error: expect(received).toEqual(expected)
 *      "#0B7A75",
 *   +  "#0B7A75",
 *      "#C1440E",
 */
describe("a newsroom with several accents", () => {
  const RICH = { ...HEIDI, accents: "#C1440E, #1F6FB2" };

  it("should score every recorded accent, not only the primary", () => {
    const p = proposePalette({ newsroom: RICH });
    expect(p.options.map((o) => o.id)).toEqual(["house", "house-2", "house-3"]);
    for (const option of p.options) {
      expect(option.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(option.contrast.min).toBe(NON_TEXT_CONTRAST_MIN);
      expect(option.origin).toBe("newsroom");
    }
    expect(p.options.map((o) => o.accent)).toEqual([
      "#0B7A75",
      "#C1440E",
      "#1F6FB2",
    ]);
  });

  it("should never recommend an accent that misses the floor", () => {
    // A primary that fails on white (1.6:1) and a second accent that clears it comfortably.
    const p = proposePalette({
      newsroom: { ...HEIDI, brandColor: "#FFD400", accents: "#1F6FB2" },
    });
    expect(p.options[0].contrast.passes).toBe(false);
    expect(p.options[0].remedy).toBeTruthy();
    expect(p.recommended).toBe("house-2");
  });

  it("should recommend nothing at all when no recorded accent clears the floor", () => {
    const p = proposePalette({
      newsroom: { ...HEIDI, brandColor: "#FFD400", accents: "#FFF2A0" },
    });
    expect(p.options.every((o) => !o.contrast.passes)).toBe(true);
    expect(p.recommended).toBeNull();
  });

  it("should refuse a malformed accent by name rather than dropping it", () => {
    expect(() =>
      proposePalette({ newsroom: { ...HEIDI, accents: "#C1440E, rouge" } }),
    ).toThrow('newsroom.accents must each be #rrggbb, got "rouge"');
  });

  it("should read the same accents splash-twin's own reader reads", async () => {
    const { newsroomAccents } =
      await import("../../splash-twin/scripts/newsroom.mjs");
    const profiles = [
      { ...HEIDI },
      { ...HEIDI, accents: "" },
      { ...HEIDI, accents: "#C1440E" },
      { ...HEIDI, accents: " #C1440E ,#1F6FB2 " },
      { ...HEIDI, accents: "#0B7A75, #C1440E" }, // the primary named again
    ];
    for (const profile of profiles) {
      const fromPalette = proposePalette({ newsroom: profile }).options.map(
        (o) => o.accent,
      );
      expect(fromPalette).toEqual(newsroomAccents(profile));
    }
  });
});

describe("parsePalette", () => {
  const good = `---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: newsroom\n---\n`;

  it("should read the recorded fields, with the primary accent leading the accent list", () => {
    expect(parsePalette(good)).toEqual({
      ground: "#FFFFFF",
      accent: "#0B7A75",
      accents: ["#0B7A75"],
      origin: "newsroom",
      source: "PALETTE.md",
    });
  });

  it("should read FURTHER accents, primary first, so a multi-series beat is not one colour", () => {
    // A newsroom's identity is rarely one colour — `NEWSROOM.md` has recorded `accents` all along,
    // `proposePalette` scores every one of them, and until now `PALETTE.md` could record exactly
    // one. Measured before this landed: a three-series stacked bar drew `[accent, muted, muted]`.
    expect(
      parsePalette(
        `---\nground: "#FFFFFF"\naccent: "#0B7A75"\naccents: "#C1440E, #1F6FB2"\norigin: newsroom\n---\n`,
      ).accents,
    ).toEqual(["#0B7A75", "#C1440E", "#1F6FB2"]);
  });

  it("should de-duplicate an accent repeated in the further list", () => {
    expect(
      parsePalette(
        `---\nground: "#FFFFFF"\naccent: "#0B7A75"\naccents: "#0B7A75, #C1440E"\norigin: newsroom\n---\n`,
      ).accents,
    ).toEqual(["#0B7A75", "#C1440E"]);
  });

  it("should reject a malformed entry in accents by name, rather than drop it", () => {
    expect(() =>
      parsePalette(
        `---\nground: "#FFFFFF"\naccent: "#0B7A75"\naccents: "#C1440E, teal"\norigin: newsroom\n---\n`,
      ),
    ).toThrow(/accents must be #rrggbb.*"teal"/s);
  });

  it("should REFUSE an accent a reader cannot see, naming the ratio, the floor and the remedy", () => {
    // The measured defect this closes: `#FFFF00` on white is 1.07:1 and rendered a clean PNG with
    // no warning at all — the beat's whole number set in yellow on white
    // (`AUDIT-W2-palette-credits.md` H2, opened at the pixel). The floor lived only inside the
    // proposal, and a PALETTE.md can be written by hand or copied from another story.
    let thrown = "";
    try {
      parsePalette(
        `---\nground: "#FFFFFF"\naccent: "#FFFF00"\norigin: journalist\n---\n`,
      );
    } catch (error) {
      thrown = String((error as Error).message);
    }
    expect(thrown).toContain("#FFFF00 on #FFFFFF measures 1.07:1");
    expect(thrown).toContain("3:1");
    expect(thrown).toContain("SC 1.4.11 Non-text Contrast");
    // The remedy is NAMED, never swapped in — one edit away, and still the journalist's edit.
    expect(thrown).toMatch(
      /nearest variant that clears the floor is #[0-9a-f]{6}/,
    );
  });

  it("should measure EVERY recorded accent, so a longer list is not a way past the floor", () => {
    expect(() =>
      parsePalette(
        `---\nground: "#FFFFFF"\naccent: "#0B7A75"\naccents: "#FFFF00"\norigin: newsroom\n---\n`,
      ),
    ).toThrow(/#FFFF00 on #FFFFFF/);
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
