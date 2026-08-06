// charter-endpoint.test.ts — readoutFrom turns a CharterProposal (raw measurements, weights,
// signals) into values a page can show, each with the sentence saying where it was read. No
// network here: proposeCharter runs on fixed sources, never collectSiteSources.
import { expect, test } from "bun:test";
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
