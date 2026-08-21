/**
 * WHAT A DELIVERED ARTEFACT IS ALLOWED TO SAY — round-four findings 11 and 15, walked over this
 * format's own committed deliveries.
 *
 * FINDING 11: all three of `stress-p-transport-ridership`'s delivered beats print "Source: city
 * network figures for 2025, compiled by Buried Signals". The frozen article names no source, and
 * `Buried Signals` is this tree's own `NEWSROOM.md` `name` — the newsroom that would PUBLISH the
 * graphic, recorded as the organisation that COMPILED the data.
 *
 * FINDING 15: `stress-q-safety-incidents` wrote `--` where an em dash belongs and it reached three
 * reader surfaces at once — the visible footnote, the `<desc>` a screen reader speaks, and the alt
 * text in `HANDOVER.md` a newsroom pastes by hand.
 *
 * Two things are walked, and the second is the one that matters. The unit cases prove each decision
 * can actually FAIL — a sweep that can only pass measures nothing. The sweep runs over this format's
 * own committed beats, real material, never a fixture.
 */
import { describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  creditTracesToRecord,
  doubleHyphenInDeliveredText,
  readerVisibleText,
  beatsCalling,
} from "../scripts/detect-delivered-text.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const SKILL = "map-web";

/** A throwaway story on disk: a frozen article, one beat, and one delivery made from it. */
function storyWith(
  article: string,
  delivered: Record<string, string>,
  { deliveredFrom = "one" } = {},
): string {
  const story = mkdtempSync(join(tmpdir(), "delivered-text-"));
  mkdirSync(join(story, "source"), { recursive: true });
  writeFileSync(join(story, "source", "article.md"), article);
  writeFileSync(join(story, "STORYBOARD.md"), "---\ntakeaway: something\n---\n");
  const beat = join(story, "beats", "one");
  mkdirSync(beat, { recursive: true });
  const delivery = join(story, "export", "one");
  mkdirSync(delivery, { recursive: true });
  writeFileSync(join(delivery, ".delivered-from"), `${deliveredFrom}\n`);
  for (const [name, text] of Object.entries(delivered)) writeFileSync(join(delivery, name), text);
  return beat;
}

const handoverWith = (credit: string, alt = "A chart.") =>
  ["# What you have", "", "## The alt text", "", `> ${alt}`, "", "## The credit line", "", `> ${credit}`, ""].join("\n");

describe("creditTracesToRecord decides, and can fail", () => {
  it("refuses a named organisation the frozen source never mentions", () => {
    const found = creditTracesToRecord(
      storyWith("Lisboa carried 214 million trips.", {
        "HANDOVER.md": handoverWith("Source: city network figures, compiled by Buried Signals"),
      }),
    );
    expect(found.applies).toBe(true);
    expect(found.traces).toBe(false);
    expect(found.unattested.join("\n")).toContain("Buried Signals");
  });

  it("accepts a name the article does attest, whatever case it is written in there", () => {
    const found = creditTracesToRecord(
      storyWith("Figures the education ministry released, for every region in Greece.", {
        "HANDOVER.md": handoverWith("Greek Ministry of Education, released on request"),
      }),
    );
    expect(found.traces).toBe(true);
  });

  // THE BOUNDARY, stated rather than discovered later. Attestation is ANY word of the name, not
  // every word: an article saying "in Greece" and a credit saying "Greek Ministry of Education"
  // must not be a refusal over a wording a desk is entitled to. What is refused is a name the
  // record has never heard a syllable of.
  it("does not refuse a name that shares a word with the record — it is not a copy-editor", () => {
    const found = creditTracesToRecord(
      storyWith("Figures the transport regulator released.", {
        "HANDOVER.md": handoverWith("Source: National Transport Regulator"),
      }),
    );
    expect(found.traces).toBe(true);
  });

  // A credit that DESCRIBES a table attributes nothing to anybody, and this rule has no opinion
  // about it. The harm it exists for is a real third party recorded as having compiled data it
  // never touched — not a missing name.
  it("has no opinion about a credit that names no organisation at all", () => {
    const found = creditTracesToRecord(
      storyWith("Centro recorded 412 incidents last year.", {
        "HANDOVER.md": handoverWith("Source: municipal safety incident report and population estimates"),
      }),
    );
    expect(found.traces).toBe(true);
  });

  it("accepts the honest empty answer, which names nobody and says so", () => {
    const found = creditTracesToRecord(
      storyWith("Lisboa carried 214 million trips.", {
        "HANDOVER.md": handoverWith("Source: not stated · as of 21 August 2026"),
      }),
    );
    expect(found.traces).toBe(true);
  });

  // A hand-over written in a language this decision has not been taught must READ AS A FAILURE, not
  // as a delivery with no credit. Silence that looks like cleanliness is the whole of round four.
  it("refuses a hand-over whose credit heading it cannot find", () => {
    const found = creditTracesToRecord(
      storyWith("Lisboa carried 214 million trips.", {
        "HANDOVER.md": "# Was Sie haben\n\n## Die Quellenangabe\n\n> Quelle: Buried Signals\n",
      }),
    );
    expect(found.traces).toBe(false);
    expect(found.unattested.join("\n")).toContain("names no credit heading");
  });

  it("never fires on a beat nothing was delivered from", () => {
    const found = creditTracesToRecord(
      storyWith("Lisboa carried 214 million trips.", { "HANDOVER.md": handoverWith("Source: x") }, { deliveredFrom: "another-beat" }),
    );
    expect(found.applies).toBe(false);
  });

  it("never fires on a beat with no frozen story above it — every worked example under proof/", () => {
    expect(creditTracesToRecord(join(ROOT, "proof")).applies).toBe(false);
  });
});

describe("doubleHyphenInDeliveredText decides, and can fail", () => {
  it("refuses two hyphens in the alt text a newsroom pastes by hand", () => {
    const found = doubleHyphenInDeliveredText(
      storyWith("Centro recorded 412 incidents.", {
        "HANDOVER.md": handoverWith("Source: the table", "Centro leads on raw count -- but not per resident."),
      }),
    );
    expect(found.applies).toBe(true);
    expect(found.clean).toBe(false);
    expect(found.hits.join("\n")).toContain("two hyphens where a dash belongs");
  });

  it("refuses them in the <desc> a screen reader speaks", () => {
    const found = doubleHyphenInDeliveredText(
      storyWith("Centro recorded 412 incidents.", {
        "HANDOVER.md": handoverWith("Source: the table"),
        "still.svg": '<svg><desc>Sul leads -- Centro does not.</desc><rect/></svg>',
      }),
    );
    expect(found.clean).toBe(false);
    expect(found.hits.join("\n")).toContain("still.svg");
  });

  // THE NARROWING THAT MAKES THE RULE USABLE. 21 of the 22 files in this tree carrying " -- " on
  // the day this landed carried it in a CSS or JS comment nobody reads.
  it("never fires on a code comment inside the delivered page", () => {
    const found = doubleHyphenInDeliveredText(
      storyWith("Centro recorded 412 incidents.", {
        "HANDOVER.md": handoverWith("Source: the table"),
        "page.html": "<style>/* the gutter -- measured once */</style><p>Clean text.</p>",
      }),
    );
    expect(found.clean).toBe(true);
  });

  it("never fires on an HTML comment, which is two hyphens by construction", () => {
    const found = doubleHyphenInDeliveredText(
      storyWith("Centro recorded 412 incidents.", {
        "HANDOVER.md": handoverWith("Source: the table"),
        "page.html": "<!-- a note -- for a maintainer --><p>Clean text.</p>",
      }),
    );
    expect(found.clean).toBe(true);
  });

  it("passes a delivery whose dashes are dashes", () => {
    const found = doubleHyphenInDeliveredText(
      storyWith("Centro recorded 412 incidents.", {
        "HANDOVER.md": handoverWith("Source: the table", "Centro leads on raw count — but not per resident."),
        "still.svg": "<svg><desc>Sul leads — Centro does not.</desc><rect/></svg>",
      }),
    );
    expect(found.clean).toBe(true);
  });
});

describe("readerVisibleText reads what a reader receives, not what the file contains", () => {
  it("keeps the attributes a screen reader speaks", () => {
    const runs = (() => {
      const dir = mkdtempSync(join(tmpdir(), "reader-visible-"));
      const path = join(dir, "page.html");
      writeFileSync(path, '<img alt="A slope -- rising"><p>Body</p>');
      return readerVisibleText(path);
    })();
    expect(runs.join("|")).toContain("A slope -- rising");
  });
});

describe(`every committed ${"map-web"} delivery says only what the record supports`, () => {
  const beats = beatsCalling(ROOT, SKILL);

  it("prints no credit naming an organisation the frozen source never mentions", () => {
    const invented = beats
      .map((beat) => ({ beat, found: creditTracesToRecord(join(ROOT, beat)) }))
      .filter(({ found }) => found.applies && !found.traces)
      .flatMap(({ beat, found }) => found.unattested.map((reason: string) => `${beat} — ${reason}`));
    expect(invented).toEqual([]);
  });

  it("carries no double hyphen into anything a reader reads", () => {
    const typed = beats
      .map((beat) => ({ beat, found: doubleHyphenInDeliveredText(join(ROOT, beat)) }))
      .filter(({ found }) => found.applies && !found.clean)
      .flatMap(({ beat, found }) => found.hits.map((hit: string) => `${beat} — ${hit}`));
    expect(typed).toEqual([]);
  });
});
