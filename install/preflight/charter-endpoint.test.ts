// charter-endpoint.test.ts — readoutFrom turns a CharterProposal (raw measurements, weights,
// signals) into values a page can show, each with the sentence saying where it was read. No
// network here: proposeCharter runs on fixed sources, never collectSiteSources.
import { describe, expect, test } from "bun:test";
import { proposeCharter } from "../../lib/newsroom/charter.ts";
import { readoutFrom } from "./charter-endpoint.ts";

// A site that declares its brand: the readout carries the value AND where it was read, because a
// journalist can only disagree with a value whose origin they can see (skills/newsroom-charter).
test("turns a measured proposal into values with their receipts", () => {
  const proposal = proposeCharter({
    url: "https://example.news",
    html: '<meta name="theme-color" content="#0A5C36">',
    sheets: [],
  });
  const readout = readoutFrom(proposal);
  expect(readout.palette[0]!.hex).toBe("#0a5c36");
  expect(readout.palette[0]!.receipt).not.toBe("");
  // Content, not just presence: the receipt must name the ACTUAL origin (theme-color), or a
  // wrong-signal regression (Finding 1) reddens nothing here.
  expect(readout.palette[0]!.receipt).toContain("theme-color");
});

// Two signals declaring the SAME hex: `rank()` in charter.ts buckets by exact hex first, so this
// pair never takes the merge-across-buckets path that reassigns a candidate's representative
// value by weight — both readings sit in one bucket, in scan order (accent, then brand). The
// receipt still has to point at the HIGHER-weighted, more deliberate declaration (the --brand
// property), not merely at whichever was read first, or a "declared" badge sits over a sentence
// that undercuts it.
test("when two signals declare the same hex, the receipt names the higher-weighted one", () => {
  const proposal = proposeCharter({
    url: "https://example.news",
    html: "<p>hello</p>",
    sheets: [
      {
        href: "https://example.news/site.css",
        css: ":root { --accent: #0a5c36; } :root { --brand: #0a5c36; }",
      },
    ],
  });
  const readout = readoutFrom(proposal);
  expect(readout.palette[0]!.hex).toBe("#0a5c36");
  expect(readout.palette[0]!.confidence).toBe("declared");
  expect(readout.palette[0]!.receipt).toContain("brand");
  expect(readout.palette[0]!.receipt).not.toContain("ACCENT");
});

// An empty measurement stays empty and keeps the extractor's own caveats. A white site with black
// text and a raster logo declares no brand hue: that is a legitimate outcome, and the page must
// be able to say so rather than pick the least-grey pixel.
test("an empty measurement stays empty and keeps the extractor's own caveats", () => {
  const readout = readoutFrom(
    proposeCharter({
      url: "https://plain.news",
      html: "<p>hello</p>",
      sheets: [],
    }),
  );
  expect(readout.palette).toEqual([]);
  expect(Array.isArray(readout.notes)).toBe(true);
  expect(readout.notes.length).toBeGreaterThan(0);
});

// The confidence relayed is exactly what the extractor states — never raised.
test("relays the extractor's own confidence per candidate, never raised", () => {
  const declared = readoutFrom(
    proposeCharter({
      url: "https://example.news",
      html: '<meta name="theme-color" content="#0A5C36">',
      sheets: [],
    }),
  );
  expect(declared.palette[0]!.confidence).toBe("declared");

  const inferred = readoutFrom(
    proposeCharter({
      url: "https://link-only.news",
      html: "<p>hello</p>",
      sheets: [
        {
          href: "https://link-only.news/site.css",
          // A link colour repeated enough times to clear the floor, with no theme-color, no
          // --brand property and no masthead — this is `inferred`, not `declared`.
          css: `a { color: #c8102e; }`.repeat(40),
        },
      ],
    }),
  );
  expect(inferred.palette.length).toBeGreaterThan(0);
  expect(inferred.palette[0]!.confidence).toBe("inferred");
  // The receipt must name the inferred origin (the links), not a declared one it never saw.
  expect(inferred.palette[0]!.receipt).toContain("links");
});

// M1 — the receipt sentence is built from PageCopy, so a French `lang` produces a French
// sentence, not the English literal relayed verbatim to a page the journalist reads in French.
test("builds the receipt in the requested language", () => {
  const proposal = proposeCharter({
    url: "https://example.news",
    html: '<meta name="theme-color" content="#0A5C36">',
    sheets: [],
  });
  const en = readoutFrom(proposal);
  const fr = readoutFrom(proposal, "fr");
  expect(en.palette[0]!.receipt).toContain("Read from");
  expect(fr.palette[0]!.receipt).toContain("Lu depuis");
  expect(fr.palette[0]!.receipt).not.toContain("Read from");
  // The token itself (the literal CSS/meta snippet) is language-neutral and survives either way.
  expect(fr.palette[0]!.receipt).toContain("#0A5C36");
});

// Task 4 (2026-08-06): the receipt used to carry WHAT was read and never WHERE it came from — a
// colour from the newsroom's own CDN and one from an analytics widget's stylesheet read
// identically. `Measurement.source` has carried that since task 2 lifted the same-host filter;
// this is the first thing that actually DISPLAYS it.
test("the receipt names the sheet a colour was read from — the newsroom's own, or a third party's", () => {
  const ownCdn = readoutFrom(
    proposeCharter({
      url: "https://example.news",
      html: "<p>hello</p>",
      sheets: [
        {
          href: "https://cdn.example.news/site.css",
          css: `a { color: #c8102e; }`.repeat(40),
        },
      ],
    }),
  );
  expect(ownCdn.palette[0]!.receipt).toContain(
    "https://cdn.example.news/site.css",
  );

  const thirdParty = readoutFrom(
    proposeCharter({
      url: "https://example.news",
      html: "<p>hello</p>",
      sheets: [
        {
          href: "https://widget.analytics-co.example/embed.css",
          css: `a { color: #c8102e; }`.repeat(40),
        },
      ],
    }),
  );
  expect(thirdParty.palette[0]!.receipt).toContain(
    "https://widget.analytics-co.example/embed.css",
  );
  // The two receipts read the SAME evidence (a repeated link colour) but must not be
  // indistinguishable — that is the entire point of naming the source.
  expect(thirdParty.palette[0]!.receipt).not.toBe(ownCdn.palette[0]!.receipt);
});

test("the typeface receipt names its source the same way", () => {
  const readout = readoutFrom(
    proposeCharter({
      url: "https://example.news",
      html: "<p>hello</p>",
      sheets: [
        {
          href: "https://fonts.example.news/type.css",
          css: `body { font-family: "Publico Text", serif; }`,
        },
      ],
    }),
  );
  expect(readout.typefaces[0]!.receipt).toContain(
    "https://fonts.example.news/type.css",
  );
});

// Task 4, Step 4: "a guess must look like a guess" — on screen, not merely in `confidence`. Both
// directions, so a regression that stops appending the mention, or one that starts appending it
// to a DECLARED reading, reddens here.
describe("the receipt marks an inferred candidate as a guess, and a declared one is not", () => {
  test("an inferred top candidate's receipt carries the guess mention", () => {
    const readout = readoutFrom(
      proposeCharter({
        url: "https://link-only.news",
        html: "<p>hello</p>",
        sheets: [
          {
            href: "https://link-only.news/site.css",
            css: `a { color: #c8102e; }`.repeat(40),
          },
        ],
      }),
    );
    expect(readout.palette[0]!.confidence).toBe("inferred");
    expect(readout.palette[0]!.receipt).toContain(
      "a guess — not a colour your site names as its own",
    );
  });

  test("a declared top candidate's receipt does not carry the guess mention", () => {
    const readout = readoutFrom(
      proposeCharter({
        url: "https://example.news",
        html: '<meta name="theme-color" content="#0A5C36">',
        sheets: [],
      }),
    );
    expect(readout.palette[0]!.confidence).toBe("declared");
    expect(readout.palette[0]!.receipt).not.toContain("a guess");
  });

  test("holds in French too", () => {
    const readout = readoutFrom(
      proposeCharter({
        url: "https://link-only.news",
        html: "<p>hello</p>",
        sheets: [
          {
            href: "https://link-only.news/site.css",
            css: `a { color: #c8102e; }`.repeat(40),
          },
        ],
      }),
      "fr",
    );
    expect(readout.palette[0]!.receipt).toContain(
      "une supposition — pas une couleur",
    );
  });
});

// The ground and the typography, when the site declares them, pass through with a receipt too.
test("carries the ground and the typography through, each with a receipt", () => {
  const proposal = proposeCharter({
    url: "https://example.news",
    html: '<meta name="theme-color" content="#0A5C36">',
    sheets: [
      {
        href: "https://example.news/site.css",
        css: `:root { background: #0b0b0b; } body { font-family: "Publico Text", serif; } h1 { font-family: "Guardian Egyptian", serif; }`,
      },
    ],
  });
  const readout = readoutFrom(proposal);
  expect(readout.ground?.value).toBe("#0b0b0b");
  expect(readout.ground?.receipt).not.toBe("");
  expect(readout.typefaces.length).toBeGreaterThan(0);
  expect(readout.typefaces[0]!.receipt).not.toBe("");
});
