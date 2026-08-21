/**
 * THE SUBJECT CONVENTIONS STOP BEING ENGLISH AND FRENCH — round five, finding X1.
 *
 * `stress-x-tunisian-water` is a story about `استهلاك المياه` — water consumption — and blue for
 * water is the single strongest entry in this skill's own table. `proposePalette` never offered it:
 * `SUBJECT_CONVENTIONS`' `match` regexes hold English and French words behind `\b` boundaries, which
 * is ASCII-only, so the recorded subject reached the newsroom branch as though the story carried no
 * convention at all. The journalist recorded `#1F6FB2` — this table's own hex — through the
 * proposal's "something else" escape.
 *
 * TWO HALVES, and the second is the one the story actually needed:
 *   1. the vocabularies gain Greek and Arabic, the languages this tree has frozen a story in, and
 *      the word boundaries stop being ASCII-only;
 *   2. the convention is looked up in what the story SAYS IT IS ABOUT, not only in the subject line.
 *      `stress-x`'s subject is `محافظة تونس` — Tunis governorate — which names the entity, not the
 *      topic. No vocabulary in any language can find water in it, because there is none there.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { matchConvention, proposePalette, CONVENTION_LANGUAGES } from "../scripts/palette.mjs";

const HOUSE = {
  name: "Buried Signals",
  brandColor: "#D4A853",
  ground: "#16191B",
  accents: "#5B8A8A",
};

describe("a convention is found in every language this tree has shipped a story in", () => {
  it("reads the Arabic word for water", () => {
    expect(matchConvention("استهلاك المياه في المحافظات")?.id).toBe("water");
  });

  it("reads the Greek word for water", () => {
    expect(matchConvention("η κατανάλωση νερού")?.id).toBe("water");
  });

  it("reads Arabic and Greek for the other three conventions", () => {
    expect(matchConvention("الطاقة المتجددة")?.id).toBe("renewables");
    expect(matchConvention("ανανεώσιμες πηγές")?.id).toBe("renewables");
    expect(matchConvention("استهلاك الفحم")?.id).toBe("fossil");
    expect(matchConvention("λιγνίτης")?.id).toBe("fossil");
    expect(matchConvention("موجة حرارة")?.id).toBe("heat");
    expect(matchConvention("ο καύσωνας")?.id).toBe("heat");
  });

  it("still returns null for a subject no convention covers, in any script", () => {
    expect(matchConvention("le prix du logement à Genève")).toBeNull();
    expect(matchConvention("أسعار المساكن")).toBeNull();
  });

  it("declares the languages it reads", () => {
    expect(CONVENTION_LANGUAGES).toEqual(["English", "French", "Greek", "Arabic"]);
  });
});

describe("the convention is looked up in what the story is about, not only in its subject line", () => {
  // stress-x-tunisian-water's own STORYBOARD.md, verbatim.
  const SUBJECT = "محافظة تونس";
  const TAKEAWAY = "تستهلك محافظة تونس أكثر من غيرها من المياه، بواقع 142 مليون متر مكعب في السنة.";

  it("offers blue for water on the frozen story that could not reach it", () => {
    const proposal = proposePalette({ newsroom: HOUSE, subject: SUBJECT, about: TAKEAWAY });
    const offered = proposal.options.find((o) => o.id === "subject");
    expect(offered).toBeDefined();
    expect(offered!.accent).toBe("#1F6FB2");
    expect(proposal.recommended).toBe("subject");
  });

  it("says where it read the convention, so the journalist can disagree with the reading", () => {
    const proposal = proposePalette({ newsroom: HOUSE, subject: SUBJECT, about: TAKEAWAY });
    expect(proposal.options.find((o) => o.id === "subject")!.provenance).toContain("the takeaway");
  });

  it("offers nothing extra when the subject line already carries the convention", () => {
    const proposal = proposePalette({ newsroom: HOUSE, subject: "rainfall", about: "rainfall fell" });
    expect(proposal.options.find((o) => o.id === "subject")!.provenance).not.toContain("the takeaway");
  });

  // THE STATED MISS. Four entries can never cover every subject; what they may not do is answer
  // "no convention" without saying whether they were in a position to read the words at all.
  it("names a script it has no convention vocabulary for", () => {
    const proposal = proposePalette({ newsroom: HOUSE, subject: "Потребление воды" });
    expect(proposal.noConventionReason).toContain("Cyrillic");
  });

  it("names no script when the subject is written in one it reads", () => {
    const proposal = proposePalette({ newsroom: HOUSE, subject: "housing costs" });
    expect(proposal.noConventionReason).not.toContain("Cyrillic");
  });
});

describe("the frozen story is the witness", () => {
  it("records the exact accent this table would now have offered it", () => {
    const palette = readFileSync(
      `${import.meta.dir}/../../../stories/stress-x-tunisian-water/PALETTE.md`,
      "utf8",
    );
    expect(palette).toContain('accent: "#1F6FB2"');
  });
});
