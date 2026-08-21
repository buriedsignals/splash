/**
 * `credit` GETS AN HONEST WAY TO SAY THE JOURNALIST GAVE NONE.
 *
 * Round four's finding 11: `stress-p-transport-ridership`'s three delivered beats all print
 * "Source: city network figures for 2025, compiled by Buried Signals". Its frozen article names no
 * source at all —
 *
 *     grep -in "source\|according\|compiled\|buried" \
 *       stories/stress-p-transport-ridership/source/article.md   ->  nothing
 *
 * — and `Buried Signals` is this tree's own `NEWSROOM.md` `name`. `credit` is a REQUIRED scalar
 * with no honest empty value, so an unattended run filled it with the most plausible string in
 * reach: data attributed to a real named organisation that never touched it.
 *
 * The shape of the fix is the one `palette/scripts/typeface.mjs` used for the same class of defect
 * this morning — a required answer nobody was present to give. Propose, record who chose, and say
 * so out loud, rather than substitute silently. Here the third origin is `none`, its recorded value
 * is `unattributed`, and what a reader sees is `Source: not stated` — visible, on the artefact, in
 * the place a credit goes.
 */
import { describe, expect, it } from "bun:test";
import {
  UNATTRIBUTED_CREDIT,
  UNATTRIBUTED_CREDIT_LINE,
  CREDIT_ORIGINS,
  isUnattributedCredit,
  creditLine,
  attributionsIn,
  proposeCredit,
} from "../scripts/storyboard.mjs";

describe("the recorded credit has a value that means nobody gave one", () => {
  it("recognises the sentinel, whatever case it was recorded in", () => {
    expect(isUnattributedCredit(UNATTRIBUTED_CREDIT)).toBe(true);
    expect(isUnattributedCredit("Unattributed")).toBe(true);
    expect(isUnattributedCredit("  unattributed  ")).toBe(true);
  });

  it("does not mistake a real credit for it", () => {
    expect(isUnattributedCredit("Source: Eurostat")).toBe(false);
    expect(isUnattributedCredit("")).toBe(false);
    expect(isUnattributedCredit(null)).toBe(false);
  });

  it("names the three origins a credit can have, `none` among them", () => {
    expect(CREDIT_ORIGINS).toEqual(["journalist", "newsroom", "none"]);
  });
});

describe("the line a delivered artefact prints", () => {
  it("turns the sentinel into something a reader actually sees", () => {
    expect(creditLine(UNATTRIBUTED_CREDIT)).toBe(UNATTRIBUTED_CREDIT_LINE);
    expect(UNATTRIBUTED_CREDIT_LINE).toContain("not stated");
  });

  it("keeps whatever the story appends after it — the effective date, most often", () => {
    expect(creditLine("unattributed · as of 21 August 2026")).toBe(
      `${UNATTRIBUTED_CREDIT_LINE} · as of 21 August 2026`,
    );
  });

  it("leaves a real credit exactly as the journalist wrote it", () => {
    expect(creditLine("Source: Eurostat · as of 21 August 2026")).toBe(
      "Source: Eurostat · as of 21 August 2026",
    );
  });

  // A blank is not the honest empty answer: `unattributed` is. A credit line that renders as
  // nothing looks like a rendering fault, which is how an absent source stops being read as one.
  it("refuses to invent anything for a credit that is simply missing", () => {
    expect(creditLine("")).toBe("");
    expect(creditLine(undefined)).toBe("");
  });
});

describe("what the article itself attests", () => {
  const ARTICLE = [
    "# Ridership rose",
    "",
    "Lisboa carried 214 million trips, according to figures the transport regulator released",
    "in June. Porto's own network reported 96 million.",
  ].join("\n");

  it("hands back the article's own attributing sentence, verbatim, never a rewrite", () => {
    const found = attributionsIn(ARTICLE);
    expect(found.length).toBe(1);
    expect(found[0]).toContain("according to figures the transport regulator released");
  });

  it("finds nothing in an article that attributes nothing — stress-p's own case", () => {
    expect(attributionsIn("Lisboa carried 214 million trips. Porto's network carried 96.")).toEqual([]);
  });
});

describe("the proposal a journalist answers", () => {
  // OFFERED, never RECOMMENDED on its own. The house convention is a template with `{source}`
  // where the story's source goes, and filling that hole from nothing is how "compiled by Buried
  // Signals" happened — the newsroom's own `name` was the nearest string to hand.
  it("offers the newsroom's standing convention, and still recommends `none` behind it", () => {
    const proposal = proposeCredit({
      newsroom: { name: "Buried Signals", credit: "Source: {source}" },
      article: "Lisboa carried 214 million trips.",
    });
    expect(proposal.options.map((option) => option.origin)).toContain("newsroom");
    expect(proposal.recommended).toBe("none");
  });

  // THE ONE THAT MATTERS. With nothing in the article and no house convention, the recommendation
  // must be `none` — not the newsroom's own name, which is the string this defect reached for.
  it("recommends `none` when the article attests nothing and no convention is recorded", () => {
    const proposal = proposeCredit({
      newsroom: { name: "Buried Signals" },
      article: "Lisboa carried 214 million trips. Porto's network carried 96.",
    });
    expect(proposal.recommended).toBe("none");
    expect(proposal.recommendationReason).toContain("names no source");
    expect(JSON.stringify(proposal)).not.toContain("compiled by Buried Signals");
  });

  it("recommends the article's own words when the article does attribute", () => {
    const proposal = proposeCredit({
      newsroom: { name: "Buried Signals" },
      article: "Lisboa carried 214 million trips, according to the transport regulator.",
    });
    expect(proposal.recommended).toBe("article-1");
  });

  it("always carries the honest empty answer as an option, whatever else it found", () => {
    const proposal = proposeCredit({
      newsroom: { name: "Buried Signals", credit: "Source: {source}" },
      article: "Lisboa carried 214 million trips, according to the transport regulator.",
    });
    const none = proposal.options.find((option) => option.id === "none");
    expect(none?.value).toBe(UNATTRIBUTED_CREDIT);
    expect(none?.prints).toBe(UNATTRIBUTED_CREDIT_LINE);
  });
});
