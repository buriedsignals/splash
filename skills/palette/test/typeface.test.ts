/**
 * THE TYPEFACE IS PROPOSED, NOT MET AT THE RENDER — issue #57.
 *
 * Measured on a real run for Heidi.news: the charter recorded `Sang Bleu Kingdom, Roboto`, neither
 * resolved, and the first anybody heard of it was `useTypeface` refusing. These tests pin the two
 * halves: when the first recorded face is one a render can set there is nothing to decide and the
 * answer is derived; when it is not, the journalist is asked, shown what is available and what is
 * not, and never handed a silent substitute.
 *
 * WHAT "RESOLVES" MEANS HERE IS THE RENDER'S OWN QUESTION — is there a font FILE — since every
 * render draws with `loadSystemFonts: false`. The machine's font library decides nothing, so the
 * proposal must not talk about it, and these tests hold that wording as well as the branching.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  typefaceDecision,
  proposeTypeface,
  formatTypeface,
  formatTypefaceProposal,
  newsroomTypefaces,
  DEFAULT_STACK,
} from "../scripts/typeface.mjs";
import { SERVED_BY_MAPTILER } from "../scripts/typefaces.mjs";

const HEIDI = { typefaces: "Sang Bleu Kingdom, Roboto" };
const resolvesOnly = (...present: string[]) => (family: string) => present.includes(family);

describe("the typeface is derived when there is nothing to decide", () => {
  it("should not ask when the newsroom's first face resolves", () => {
    const decision = typefaceDecision({ newsroom: HEIDI, resolves: resolvesOnly("Sang Bleu Kingdom") });
    expect(decision.ask).toBe(false);
    expect(decision.typeface).toEqual({ family: "Sang Bleu Kingdom", origin: "newsroom" });
  });

  it("should write a TYPEFACE.md in the shape every render-still reads, saying nobody was asked", () => {
    const { typeface } = typefaceDecision({ newsroom: HEIDI, resolves: resolvesOnly("Sang Bleu Kingdom") });
    const text = formatTypeface(typeface!);
    expect(text).toContain('family: "Sang Bleu Kingdom"');
    expect(text).toContain("origin: newsroom");
    expect(text).toContain("nothing here to decide");
  });
});

describe("the typeface is asked when the recorded faces do not resolve", () => {
  it("should ask, naming what is absent and what is present", () => {
    const decision = typefaceDecision({ newsroom: HEIDI, resolves: resolvesOnly("Roboto") });
    expect(decision.ask).toBe(true);
    expect(decision.reason).toContain('"Sang Bleu Kingdom"');
    expect(decision.reason).toContain('there is one for "Roboto"');
    expect(decision.reason).toContain("refuse");
    // The old sentence sent the reader to install the face. Installing one is now a no-op, so the
    // proposal must not recommend it — this is the wording guard, not a spelling preference.
    expect(decision.reason).toContain("would not change it");
  });

  it("should ask when none resolves, and offer the default stack as a stated choice", () => {
    const decision = typefaceDecision({ newsroom: HEIDI, resolves: () => false });
    expect(decision.ask).toBe(true);
    expect(decision.reason).toContain("none of the newsroom's recorded faces resolve");
    const ids = decision.proposal.options.map((o: any) => o.id);
    expect(ids).toEqual(["newsroom-1", "newsroom-2", "default"]);
    expect(decision.proposal.recommended).toBe("default");
    const text = formatTypefaceProposal(decision);
    expect(text).toContain("UNAVAILABLE — there is no font file for it");
    expect(text).toContain("INSTALLING A FACE DOES NOT HELP");
    expect(text).toContain(DEFAULT_STACK);
  });

  it("should ask when NEWSROOM.md records no typefaces at all, and invent none", () => {
    const decision = typefaceDecision({ newsroom: {}, resolves: () => true });
    expect(decision.ask).toBe(true);
    expect(decision.reason).toContain("records no typefaces");
    expect(newsroomTypefaces({})).toEqual([]);
  });

  it("should measure every recorded face, in the newsroom's order", () => {
    const proposal = proposeTypeface({ newsroom: HEIDI, resolves: resolvesOnly("Roboto") });
    expect(proposal.options.map((o: any) => [o.family, o.present])).toEqual([
      ["Sang Bleu Kingdom", false],
      ["Roboto", true],
      [DEFAULT_STACK, true],
    ]);
    expect(proposal.recommended).toBe("newsroom-2");
  });
});

/**
 * THE DEFECT THIS HOLDS SHUT. `DEFAULT_STACK` here and `DEFAULT_FONT_FAMILY` in the trunk's
 * `render-still.mjs` are ONE value written in two files that cannot import each other — a skill
 * never imports out of itself. They drifted: the trunk moved to `Open Sans, …` when system fonts
 * were switched off and this stayed on `Helvetica, …`, so a journalist who accepted the documented
 * default wrote a TYPEFACE.md whose first family has no fetchable file. `useTypeface` exempts
 * `origin: default` from its own check, so nothing refused — and then `measureText` threw on the
 * first gutter it measured. Read out of the trunk's source rather than imported, because importing
 * it would drag `@resvg` into this skill.
 */
describe("the substrate's default stack is the trunk's, to the character", () => {
  const TWIN = join(import.meta.dirname, "..", "..", "..");
  const trunk = readFileSync(join(TWIN, "skills", "chart-beat", "scripts", "render-still.mjs"), "utf8");

  it("should equal render-still's DEFAULT_FONT_FAMILY", () => {
    const declared = /^const DEFAULT_FONT_FAMILY = "([^"]+)";$/m.exec(trunk);
    expect(["render-still.mjs declares DEFAULT_FONT_FAMILY", Boolean(declared)]).toEqual([
      "render-still.mjs declares DEFAULT_FONT_FAMILY",
      true,
    ]);
    expect(DEFAULT_STACK).toBe(declared![1]);
  });

  it("should lead with a family the ladder can fetch, since origin: default skips the file check", () => {
    // `useTypeface` never asks whether the default stack resolves; `measureText` does, on the first
    // gutter. So the FIRST family has to be one the catalogue carries.
    const first = DEFAULT_STACK.split(",")[0].replace(/^["']|["']$/g, "").trim();
    expect(SERVED_BY_MAPTILER).toContain(first);
  });
});

describe("the recorded answer refuses a value nobody chose", () => {
  it("should refuse an origin outside newsroom, journalist, default", () => {
    expect(() => formatTypeface({ family: "Roboto", origin: "vibes" })).toThrow(/origin must be/);
  });

  it("should refuse an empty family", () => {
    expect(() => formatTypeface({ family: "", origin: "default" })).toThrow(/font stack/);
  });

  it("should record the default stack as a choice with the gap named", () => {
    const text = formatTypeface({ family: DEFAULT_STACK, origin: "default" });
    expect(text).toContain("origin: default");
    expect(text).toContain("honest word");
  });
});
