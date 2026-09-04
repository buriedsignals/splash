/**
 * THE TYPEFACE IS PROPOSED, NOT MET AT THE RENDER — issue #57.
 *
 * Measured on a real run for Heidi.news: the charter recorded `Sang Bleu Kingdom, Roboto`, neither
 * resolved on the machine, and the first anybody heard of it was `useTypeface` refusing. These
 * tests pin the two halves: when the first recorded face is present there is nothing to decide and
 * the answer is derived; when it is absent the journalist is asked, shown what is present and what
 * is not, and never handed a silent substitute.
 */
import { describe, it, expect } from "bun:test";
import {
  typefaceDecision,
  proposeTypeface,
  formatTypeface,
  formatTypefaceProposal,
  newsroomTypefaces,
  DEFAULT_STACK,
} from "../scripts/typeface.mjs";

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
    expect(decision.reason).toContain('it does have "Roboto"');
    expect(decision.reason).toContain("refuse");
  });

  it("should ask when none resolves, and offer the default stack as a stated choice", () => {
    const decision = typefaceDecision({ newsroom: HEIDI, resolves: () => false });
    expect(decision.ask).toBe(true);
    expect(decision.reason).toContain("none of the newsroom's recorded faces resolve");
    const ids = decision.proposal.options.map((o: any) => o.id);
    expect(ids).toEqual(["newsroom-1", "newsroom-2", "default"]);
    expect(decision.proposal.recommended).toBe("default");
    const text = formatTypefaceProposal(decision);
    expect(text).toContain("ABSENT on this machine");
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
