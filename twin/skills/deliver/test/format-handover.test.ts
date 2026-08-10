import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatHandover,
  LIVE_TILES,
} from "../scripts/format-handover.mjs";

const VALID = {
  genre: "static",
  // The story's own language, read from STORYBOARD.md. This fixture asserts the English scaffold,
  // so it is an English story; the French one is driven below.
  language: "en",
  files: ["/tmp/story/export/still.svg", "/tmp/story/export/still.png"],
  placement: "after the paragraph that first states the divergence, full width",
  alt: "Three sponsors account for more of the melt than the Games themselves.",
  credit: "Source: SGR / New Weather Institute, Olympics Torched (2026)",
  caveat:
    "One report's figures; the third row is a subtraction, not a measurement.",
};

describe("formatHandover — what the journalist reads", () => {
  it("should name each file by basename and say what it is for", () => {
    const doc = formatHandover(VALID);
    expect(doc).toContain("`still.svg`");
    expect(doc).toContain("the one to give the CMS");
    expect(doc).toContain("`still.png`");
    // Never the absolute path of the machine that built it — that means nothing in a newsroom.
    expect(doc).not.toContain("/tmp/story/export");
  });

  it("should read back the placement, the alt, the credit and the caveat", () => {
    const doc = formatHandover(VALID);
    for (const value of [
      VALID.placement,
      VALID.alt,
      VALID.credit,
      VALID.caveat,
    ]) {
      expect(doc).toContain(value);
    }
  });

  it("should render without a caveat, since 'none' is a legitimate answer to the limits question", () => {
    const doc = formatHandover({ ...VALID, caveat: undefined });
    expect(doc).toContain(VALID.credit);
    expect(doc).not.toContain("does not show");
  });

  for (const field of ["placement", "alt", "credit"]) {
    it(`should refuse to render at all when ${field} is missing, rather than leave a blank where it goes`, () => {
      expect(() => formatHandover({ ...VALID, [field]: "" })).toThrow(field);
    });
  }

  it("should refuse to render before anything has been delivered", () => {
    expect(() => formatHandover({ ...VALID, files: [] })).toThrow(
      /before anything has been delivered/,
    );
  });
});

// The journalist never reads about us. The run's closing message was four fifths internals -- three
// paragraphs naming our own files and their defects, written to a journalist -- and at one point
// the journalist was asked to arbitrate an internal defect with options naming two of our modules.
// A prose rule is this project's softest surface, so the rule is a throw.
describe("formatHandover — a maintainer-facing sentence cannot pass through it", () => {
  it("should throw when a caveat names one of our modules", () => {
    expect(() =>
      formatHandover({
        ...VALID,
        caveat:
          "The grounding check in ground-claim.mjs could not place the total, so this was overridden.",
      }),
    ).toThrow(/never into a delivered/);
  });

  it("should throw when a placement names one of our paths", () => {
    expect(() =>
      formatHandover({
        ...VALID,
        placement: "wherever skills/chart-beat renders it",
      }),
    ).toThrow(/NOTES-FOR-MAINTAINER/);
  });

  it("should say where such a sentence belongs instead, so the refusal is actionable", () => {
    expect(() =>
      formatHandover({ ...VALID, alt: "see where.mjs for the phase" }),
    ).toThrow(/NOTES-FOR-MAINTAINER\.md/);
  });

  // THE PARAMETER SET IS THE FIRST HALF OF THE ANSWER, and nothing else guards it. The throw above
  // catches a maintainer-facing sentence arriving through a field that exists; it cannot catch
  // somebody ADDING a `notes` field and rendering whatever they like into it — which is the exact
  // change this design exists to prevent, and which stayed green until this case existed. So the
  // declared parameter list is pinned by name: widen it and this reddens, naming what appeared.
  it("should accept exactly these parameters and no free-text field", () => {
    const source = readFileSync(
      join(import.meta.dirname, "..", "scripts", "format-handover.mjs"),
      "utf8",
    );
    const signature = /export function formatHandover\(\{([^}]*)\}\)/.exec(
      source,
    );
    expect(signature).not.toBeNull();
    const declared = signature![1]
      .split(",")
      .map((name) => name.trim().split("=")[0]!.trim())
      .filter(Boolean)
      .sort();
    expect(declared).toEqual(
      [
        "alt",
        "caveat",
        "credit",
        "files",
        "genre",
        // `language` is the second parameter added on the same condition as `liveTiles`: it is a
        // recorded CODE, checked against a pattern and against a closed set of scaffolds — no
        // sentence a caller writes can be rendered through it, and nothing it carries reaches the
        // page as prose. It exists because the hand-over came out in English on a French story
        // (A25); ruling R4 makes the language a parameter precisely so it is never free text.
        "language",
        "placement",
        // `liveTiles` was added deliberately, and it is an ENUM, not a field: the test below proves
        // an unrecognised value throws, so nothing a caller writes can be rendered through it. That
        // is the condition on which this list may grow at all.
        "liveTiles",
      ].sort(),
    );
  });

  // WHY THE NEW PARAMETER IS NOT THE FREE-TEXT FIELD THIS FILE EXISTS TO PREVENT.
  //
  // The delivered page can carry a live map, and R1 says it carries the key with it. The journalist
  // has to be TOLD which key, and what it costs them — a recommendation nobody makes is what the
  // hard block in `substituteKeys` was standing in for. So the fact travels as one of four names and
  // the prose lives here; a caller cannot write a sentence into this document.
  //
  // MUTATION (copy under /tmp): delete the `hasOwnProperty` check in `formatHandover`, so an unknown
  // state renders nothing. This reddens.
  it("should refuse a live-tiles state it does not know, rather than silently say nothing", () => {
    expect(() =>
      formatHandover({ ...VALID, liveTiles: "probably fine" }),
    ).toThrow(/not a state this hand-over knows/);
  });

  it("should state the cost of a development key, in the journalist's own terms", () => {
    const doc = formatHandover({ ...VALID, liveTiles: "development" });
    expect(doc).toContain("100% of its spending limit");
    expect(doc).toMatch(/\bbilled\b/);
    expect(doc).not.toMatch(/\bskills\//);
    expect(doc).not.toMatch(/\.(mjs|mts|cjs|cts|tsx|jsx)\b/);
  });

  it("should let a clean hand-over through carrying no path and no module of ours", () => {
    const doc = formatHandover(VALID);
    expect(doc).not.toMatch(/\bskills\//);
    expect(doc).not.toMatch(/\.(mjs|mts|cjs|cts|tsx|jsx)\b/);
  });

  // The accepted cost, stated rather than discovered: a caveat naming a SOURCE MODULE is refused
  // even when it reads as editorial. No real caveat names one — a caveat is about the DATA — and
  // this pair of cases is where that line sits.
  it("should refuse a caveat that names a source module, even phrased editorially", () => {
    expect(() =>
      formatHandover({
        ...VALID,
        caveat:
          "The totals come from the derivation in totals.ts, not from the publisher.",
      }),
    ).toThrow();
  });

  it("should let a caveat naming the journalist's OWN data file through — that is their material, not ours", () => {
    const doc = formatHandover({
      ...VALID,
      caveat: "Derived from olympics.csv, not from the publisher's own totals.",
    });
    expect(doc).toContain("olympics.csv");
  });
});

/**
 * A25 — THE HAND-OVER IS WRITTEN IN THE STORY'S LANGUAGE.
 *
 * From the owner's own end-to-end run: a French story — article, takeaway, hand fields, title, alt
 * text, credit line — delivered inside an English scaffold, *"## Where it goes in the article"* over
 * a French sentence. Ruling R4 had already settled the principle (the language follows the ARTICLE
 * and is confirmed with the journalist); nothing had applied it to the one artifact they keep.
 *
 * MUTATIONS (each run in a copy under /tmp), and what each reddens:
 *   1. `resolveScaffoldLanguage` returns `{written: "en"}` for everything → the French cases redden,
 *      naming the English heading they found.
 *   2. drop the empty-string throw and default `written` to "en" → the refusal case reddens.
 *   3. `untranslatedNotice` returns `[]` unconditionally → the untranslated case reddens: the
 *      SILENT fallback is the defect, not the fallback.
 *   4. put a literal back in the body (e.g. hard-code `"## The credit line"`) → the French case
 *      reddens on that exact heading.
 */
describe("formatHandover — written in the story's own language (A25, ruling R4)", () => {
  const FR = {
    ...VALID,
    language: "fr",
    placement:
      "après le paragraphe qui donne les 34 Mt, article web, pleine largeur",
    alt: "Les trois sponsors pèsent plus que les Jeux eux-mêmes.",
    credit:
      "Source : bilans carbone publiés par les organisateurs et les sponsors",
    caveat:
      "les 9 Mt de Stellantis + ITA Airways sont dérivées par soustraction, pas publiées",
  };

  it("should write every heading in French for a French story", () => {
    const doc = formatHandover(FR);
    expect(doc).toContain("# Ce que vous avez, et où cela va");
    expect(doc).toContain("## Où cela va dans l'article");
    expect(doc).toContain("## Le texte alternatif");
    expect(doc).toContain("## La ligne de crédit");
    expect(doc).toContain("## La seule chose que cela ne montre pas");
    // and not one English heading left behind, which is exactly the defect: their own words inside
    // our frame.
    expect(doc).not.toContain("Where it goes in the article");
    expect(doc).not.toContain("## The alt text");
    expect(doc).not.toContain("## The credit line");
  });

  it("should describe each delivered file in French too, not only the headings", () => {
    const doc = formatHandover(FR);
    expect(doc).toContain("le fichier vectoriel");
    expect(doc).not.toContain("the one to give the CMS");
  });

  it("should state the cost of a development key in French, since it is the paragraph that costs them money", () => {
    const doc = formatHandover({ ...FR, liveTiles: "development" });
    expect(doc).toContain("100 % de son plafond de dépenses");
    expect(doc).toContain("MAPTILER_DELIVERY_KEY");
    expect(doc).not.toContain("spending limit");
  });

  it("should read the base of a regional tag, so a de-CH story is not treated as a language of its own", () => {
    const doc = formatHandover({ ...FR, language: "fr-CH" });
    expect(doc).toContain("# Ce que vous avez, et où cela va");
  });

  it("should refuse to write anything when no language was recorded, rather than default to English", () => {
    expect(() => formatHandover({ ...FR, language: undefined })).toThrow(
      /own language/,
    );
    // and say where it is recorded, so the refusal is actionable
    expect(() => formatHandover({ ...FR, language: undefined })).toThrow(
      /STORYBOARD\.md/,
    );
  });

  it("should refuse a language NAME where a code belongs, since the parameter is recorded and not free text", () => {
    expect(() => formatHandover({ ...FR, language: "français" })).toThrow(
      /not a language code/,
    );
  });

  // THE DECISION, ASSERTED. A language this document is not written in falls back to English AND
  // SAYS SO, at the top, before the English it is about. Refusing would block a journalist from
  // their own delivered work over a gap that is ours; falling back silently is the failure.
  it("should say, in the document itself, that it is in English when the recorded language has no scaffold", () => {
    const doc = formatHandover({ ...FR, language: "de-CH" });
    expect(doc).toContain("written in English, not in `de-CH`");
    expect(doc).toContain("## Where it goes in the article");
    // The journalist's own words are untouched — only the frame fell back.
    expect(doc).toContain(FR.credit);
    // and the notice comes before the document it is about, not buried under it
    expect(doc.indexOf("written in English")).toBeLessThan(
      doc.indexOf("## The files"),
    );
  });

  // A state translated in one language and forgotten in another is a paragraph that DISAPPEARS —
  // and for `development` it is the paragraph that tells a newsroom their key is readable by any
  // reader and billable to them. MUTATION: delete `development` from `LIVE_TILES.fr` → red here.
  it("should carry the same live-tile states in every language it is written in", () => {
    const states = Object.keys(LIVE_TILES.en).sort();
    for (const [language, table] of Object.entries(LIVE_TILES)) {
      expect(`${language}: ${Object.keys(table).sort().join(",")}`).toBe(
        `${language}: ${states.join(",")}`,
      );
    }
  });

  it("should carry no notice at all when the document really is in the recorded language", () => {
    expect(formatHandover(FR)).not.toContain("written in English");
    expect(formatHandover(VALID)).not.toContain("written in English, not in");
  });
});

describe("formatHandover — the caveat's own material", () => {
  it("should still let a caveat naming the journalist's OWN data file through", () => {
    const doc = formatHandover({
      ...VALID,
      caveat: "Derived from olympics.csv, not from the publisher's own totals.",
    });
    expect(doc).toContain("olympics.csv");
  });
});
