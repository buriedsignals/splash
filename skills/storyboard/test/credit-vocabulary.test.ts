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

// ROUND-FIVE, THE TASK-F BULLET: `proposeCredit` recommended `unattributed` on an article that
// names its source. Measured over all 27 frozen stories, the cue list matched 2 of them; five
// sentences in five other stories attribute in a form it had never been taught, all of them the
// same one — a data noun, then "come(s)/came from":
//
//   stress-x-tunisian-water   "The figures come from the national water utility …"
//   stress-t-europe-recycling "The figures come from the national environment agencies …"
//   stress-b-piped-water      "The figures below come from a national-statistics compilation …"
//   stress-f-housing-pressure "Malta's figure comes from a different survey …"
//   stress-w-quay-photographs "The middle photograph came from the archive without a caption …"
//
// The last is the reason the form is BOUND to a data noun rather than matched bare: a photograph
// that came from an archive with no caption is the story's own statement that nobody can be
// credited, and reading it as an attribution would recommend a rambling sentence over the honest
// `none` on the one story in the tree that most needs `none`.
describe("the attributing sentences a corpus actually contains", () => {
  const namesItsSource = (article: string) =>
    proposeCredit({ newsroom: { name: "Buried Signals" }, article }).recommended;

  it("reads a data noun followed by come/comes/came from as an attribution", () => {
    expect(
      namesItsSource("The figures come from the national water utility and cover 2025."),
    ).toBe("article-1");
    expect(
      namesItsSource("The figures below come from a national-statistics compilation."),
    ).toBe("article-1");
    expect(namesItsSource("Malta's figure comes from a different survey.")).toBe("article-1");
  });

  it("does not read a photograph that came from an archive as a source being named", () => {
    expect(
      namesItsSource(
        "The middle photograph came from the archive without a caption or a photographer's name, and nobody at the paper can now say who took it.",
      ),
    ).toBe("none");
  });

  it("reads the same shape in French, the tree's other article language", () => {
    expect(
      namesItsSource("Les chiffres proviennent de l'office fédéral de la statistique."),
    ).toBe("article-1");
  });

  // FIXTURES, NOT FROZEN MATERIAL, and said out loud because this repository holds no article that
  // exercises them: `stories/stress-x-tunisian-water` is the tree's one Arabic story and its own
  // attributing sentence is written in the English paragraph beside the Arabic one. The corpus that
  // would reach these is an article whose attribution is in its own script — which is exactly the
  // article this round said the tree has started receiving. A cue this list misses costs the
  // journalist one correction; the reason to widen it before the corpus demands it is that the cost
  // of missing is silent (`none` recommended over the journalist's own words) and the cost of
  // widening is not.
  it("reads a Greek attribution", () => {
    expect(
      namesItsSource("Ο αριθμός των σχολείων μειώθηκε, σύμφωνα με το υπουργείο Παιδείας."),
    ).toBe("article-1");
  });

  it("reads an Arabic attribution", () => {
    expect(namesItsSource("تستهلك محافظة تونس 142 مليون متر مكعب، وفقاً للشركة الوطنية للمياه.")).toBe(
      "article-1",
    );
  });
});

// ROUND SEVEN, D10 ON `stories/real-ember-renewables-share`. The article MARKS its source line —
//
//     Source line, verbatim from the file's metadata: *Ember (2026) and other sources – with major
//     processing by Our World in Data.*
//
// — and the proposal recommended instead "Source: We have Ember's renewables share of electricity
// generation, as published by Our World in Data, covering 246 entities from 1900 to 2025", a
// narrative sentence with a newline in the middle of it, which is what would have printed under
// the chart. The line the journalist marked as the credit was not among the options at all.
//
// TWO MECHANISMS WERE MISSING, and the second is why the first went unnoticed for six rounds.
//
//   1. `\b(…|source[s]?\s*:|…)\b` COULD NOT FIRE. The alternation is wrapped in word boundaries,
//      and a `\b` after a colon needs a word character next — so `Source: Eurostat` never matched
//      and `Source:Eurostat` did. The single most explicit way an article names its source, and
//      the only one in the list that ends in punctuation, was dead on arrival. Measured on
//      `stories/real-gwis-wildfire-counts`, whose last paragraph is literally
//      `Source: Global Wildfire Information System (2026), with minor processing by Our World in
//      Data.`: `attributionsIn` returned that sentence not at all, and offered the desk's aside
//      "…the desk will ask where every number came from" instead.
//
//   2. A MARKED LINE'S VALUE IS WHAT FOLLOWS THE LABEL, not the sentence carrying it. The label is
//      the journalist saying "this part is the credit"; keeping it in the value prints
//      "Source: Source: …" under the graphic, and keeping the whole sentence prints the prose they
//      wrapped it in.
describe("a source line the article marked as one", () => {
  const proposalFor = (article: string) => proposeCredit({ newsroom: { name: "Buried Signals" }, article });

  it("reads a bare `Source:` line, which the cue list could not match at all", () => {
    expect(
      attributionsIn("Source: Global Wildfire Information System (2026), with minor processing by Our World in Data."),
    ).toHaveLength(1);
  });

  it("proposes what follows the label, not the label with it", () => {
    const proposal = proposalFor(
      "Source: Global Wildfire Information System (2026), with minor processing by Our World in Data.",
    );
    expect(proposal.recommended).toBe("article-1");
    const first = proposal.options.find((option) => option.id === "article-1");
    expect(first?.value).toBe(
      "Source: Global Wildfire Information System (2026), with minor processing by Our World in Data",
    );
    expect(first?.value).not.toContain("Source: Source:");
  });

  it("reads a label that qualifies itself before the colon — the ember article's own line", () => {
    const proposal = proposalFor(
      "We have Ember's renewables share of electricity generation, as published by Our World in Data,\ncovering 246 entities from 1900 to 2025.\n\nSource line, verbatim from the file's metadata: *Ember (2026) and other sources – with major\nprocessing by Our World in Data.*",
    );
    const recommended = proposal.options.find((option) => option.id === proposal.recommended);
    expect(recommended?.value).toBe(
      "Source: Ember (2026) and other sources – with major processing by Our World in Data",
    );
  });

  it("prefers the marked line over a narrative sentence that merely carries a cue", () => {
    const proposal = proposalFor(
      "The figures come from the national water utility.\n\nSource: Office national de l'assainissement.",
    );
    const recommended = proposal.options.find((option) => option.id === proposal.recommended);
    expect(recommended?.provenance).toMatch(/marked/i);
    expect(recommended?.value).toContain("Office national");
  });

  it("never proposes a credit with a line break in it — a credit line prints on one line", () => {
    const proposal = proposalFor(
      "We have Ember's renewables share of electricity generation, as published by Our World in Data,\ncovering 246 entities from 1900 to 2025.",
    );
    for (const option of proposal.options) {
      expect(option.value).not.toContain("\n");
      expect(option.prints).not.toContain("\n");
    }
  });

  // The repaired cue and the marked-line reader are NOT the same mechanism, and this is the
  // sentence that tells them apart: a colon marker that is not at the head of its own line. The
  // marked-line reader requires the label to OPEN the sentence, so only the cue list can see this
  // one — and inside `\b(…)\b` it could not.
  it("reads a colon marker that sits inside a sentence rather than opening one", () => {
    expect(
      attributionsIn("The series is reproduced in the appendix, sources: Eurostat and Ember."),
    ).toHaveLength(1);
  });

  it("does not read a colon in ordinary prose as a marked source line", () => {
    expect(
      attributionsIn("The dataset's own description is plain about what the number is: a percentage."),
    ).toEqual([]);
  });
});
