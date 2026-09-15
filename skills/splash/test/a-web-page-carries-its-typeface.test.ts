// LANE: heavy
/**
 * A WEB PAGE CARRIES THE FACE IT NAMES, OR IT IS NOT WRITTEN.
 *
 * The sibling of `a-typeface-arrives-as-a-file.test.ts`, for the other consumer. A static plate is
 * drawn HERE, by resvg, from files — and with `loadSystemFonts: false` a face it was not handed
 * simply does not draw, so the defect is loud. A web page is drawn on the READER's machine, and a
 * face it did not carry draws perfectly, in the wrong typeface, with nothing anywhere to say so.
 * Every web beat in this repository shipped that way: `font-family: "Merriweather", Georgia, serif`
 * in the CSS, and no link, no `@font-face` and no bytes in the document.
 *
 * Four properties, each one a way the mechanism could be worse than what it replaced.
 *
 *   1. IT REALLY FETCHES woff2 AND CHECKS IT. Every embedded face opens `wOF2`; an error page opens
 *      `<` and is never kept, because a cached error page would set every later page in silence.
 *   2. IT CARRIES WHAT THE PAGE ACTUALLY USES. The families, weights and styles are derived from
 *      the document, including the inheritance case this format's own stylesheet is built on — one
 *      `font-family` on `body` and eight rules that name a weight and no family.
 *   3. IT REACHES THE CHARACTERS THE COPY REALLY SETS. Google's `latin` and `latin-ext` subsets do
 *      not contain U+2082, and the subscript of CO2 appears 187 times in the committed corpus. A
 *      page that embedded only those two would have shipped that glyph in Georgia.
 *   4. THE GUARD REFUSES. A family, a weight or a code point the page names and does not carry
 *      fails the build, which is the web side of `loadSystemFonts: false`.
 *
 * WHAT IT DOES NOT REACH: whether a browser DRAWS in the face. Nothing outside a browser can answer
 * that, and it is answered by `chart-web/scripts/verify-web.mjs` and
 * `map-web/scripts/verify-interaction.mjs`, both of which measure a string's width against the
 * bridge the page would otherwise fall to.
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertFontsEmbedded,
  codePointsOf,
  cssContentText,
  displayableTextOf,
  dominantFontStack,
  embeddedWebFaces,
  fontCodePoints,
  fontFaceCss,
  fontRequestsInHtml,
  isWoff2,
  jsonPayloadText,
  pageTextOf,
  parseUnicodeRange,
  parseWebFaces,
  requestedFamily,
  rangeSpec,
  rangesCover,
  subsetWebFace,
  typefaceCacheDir,
} from "../../../shared/design-base/typefaces.mjs";

let cache: string;
beforeAll(() => {
  cache = mkdtempSync(join(tmpdir(), "web-typefaces-"));
  process.env.SPLASH_TYPEFACE_CACHE = cache;
});
afterAll(() => {
  delete process.env.SPLASH_TYPEFACE_CACHE;
  rmSync(cache, { recursive: true, force: true });
});

/** One block of a real css2 answer to a MODERN user-agent, kept verbatim so the parser is held to
 *  the shape Google actually emits — the subset name in a comment above the block, the URL on
 *  `fonts.gstatic.com`, the range last. */
const ANSWER = `/* cyrillic */
@font-face {
  font-family: 'Merriweather';
  font-style: normal;
  font-weight: 400;
  font-stretch: 100%;
  src: url(https://fonts.gstatic.com/s/merriweather/v33/aaa.woff2) format('woff2');
  unicode-range: U+0301, U+0400-045F, U+2116;
}
/* latin */
@font-face {
  font-family: 'Merriweather';
  font-style: italic;
  font-weight: 700;
  font-stretch: 100%;
  src: url(https://fonts.gstatic.com/s/merriweather/v33/bbb.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+2000-206F, U+2212;
}`;

describe("what Google serves a browser, read back", () => {
  it("should name each face by the subset Google itself printed above it", () => {
    const faces = parseWebFaces(ANSWER);
    expect(faces.map((f) => f.subset)).toEqual(["cyrillic", "latin"]);
    expect(faces[1]).toMatchObject({
      style: "italic",
      weight: 700,
      stretch: "100%",
    });
    expect(faces[1].url).toBe(
      "https://fonts.gstatic.com/s/merriweather/v33/bbb.woff2",
    );
  });

  it("should read a unicode-range as the code points it stands for", () => {
    const ranges = parseUnicodeRange("U+0000-00FF, U+2212, U+04??");
    expect(rangesCover(ranges, 0x41)).toBe(true);
    expect(rangesCover(ranges, 0x2212)).toBe(true);
    expect(rangesCover(ranges, 0x0455)).toBe(true); // the wildcard, expanded
    expect(rangesCover(ranges, 0x2082)).toBe(false); // the CO2 subscript, in no Latin subset
  });

  it("should count a page's characters from its words and its readable attributes, not its markup", () => {
    const html = `<style>body{font-family:X}</style><p data-detail="≥ 4">Café</p><script>var q="Ω"</script>`;
    const points = codePointsOf(pageTextOf(html));
    const chars = points.map((cp) => String.fromCodePoint(cp)).join("");
    expect(chars).toContain("é");
    expect(chars).toContain("≥"); // a tooltip's own words are words
    expect(chars).not.toContain("Ω"); // a script's internals are not
  });
});

describe("what one document asks for", () => {
  /** The shape both web formats emit: exactly one `font-family`, on `body`, and rules that name a
   *  weight and no family at all. */
  const page = `<!doctype html><html><head><style>
body { font-family: "Open Sans", Helvetica, Arial, sans-serif; }
.chart-title { font-weight: 700; }
.chart-note { font-weight: 600; }
</style></head><body>
<figure style="--label-weight:500">
<span style="font-family:&quot;Merriweather&quot;, Georgia, serif;font-weight:400;font-style:italic">le pic</span>
<span class="chart-note">CO₂</span>
</figure></body></html>`;

  it("should attribute a weight declared with no family of its own to the family body sets", () => {
    const { requests, inherited } = fontRequestsInHtml(page);
    expect(inherited).toBe("Open Sans");
    const asked = requests
      .map((r) => `${r.family} ${r.weight} ${r.style}`)
      .sort();
    expect(asked).toContain("Open Sans 700 normal");
    expect(asked).toContain("Open Sans 600 normal");
    expect(asked).toContain("Merriweather 400 italic");
  });

  it("should resolve a var() weight against the custom property the document defines", () => {
    const { requests } = fontRequestsInHtml(
      `<style>body{font-family:"Open Sans",sans-serif}.t{font-weight:var(--w)}</style>` +
        `<body><figure style="--w:800"><p class="t">x</p></figure></body>`,
    );
    expect(requests.map((r) => r.weight)).toContain(800);
  });

  it("should report a var() weight it cannot resolve rather than defaulting it to 400", () => {
    const { unresolved } = fontRequestsInHtml(
      `<style>body{font-family:"Open Sans",sans-serif}.t{font-weight:var(--nowhere)}</style><body><p class="t">x</p></body>`,
    );
    expect(unresolved.join(" ")).toContain("--nowhere");
  });

  it("should read the page's own dominant stack rather than a literal, and fall back to the house sans", () => {
    const markup =
      `<text font-family="Open Sans, Helvetica, Arial, sans-serif">a</text>` +
      `<text font-family="Open Sans, Helvetica, Arial, sans-serif">b</text>` +
      `<text style="font-family:&quot;Merriweather&quot;, Georgia, serif">c</text>`;
    expect(dominantFontStack(markup)).toBe(
      "Open Sans, Helvetica, Arial, sans-serif",
    );
    expect(dominantFontStack("<p>nothing styled</p>")).toContain("Open Sans");
  });
});

describe("a stack quoted inside an attribute", () => {
  /**
   * THE BLIND SPOT THAT MADE THE CENSUS ANSWER GREEN OVER TEXT IN A FACE NOBODY EMBEDDED.
   *
   * `figureVars` emits stacks that OPEN WITH A QUOTE, which is right for a stylesheet; a component
   * that hands one straight to an SVG presentation attribute writes `font-family="&quot;Open
   * Sans&quot;, …"`, and the census decodes each tag before reading it, so what its pattern met was
   * `font-family=""Open Sans", …"`. Stopping at the first quote, it matched NOTHING — the request
   * fell through to the page's inherited body family, a face the page does carry, and
   * `assertFontsEmbedded` passed. Measured on the committed corpus at the time of this fix:
   * `proof/web-sankey-electricity-sources/renders/rapport.html` shipped 53 `<text>` elements asking
   * for Open Sans 400 on a page that embedded Merriweather and Open Sans 700 and nothing else, and
   * every guard in the tree was green on it.
   *
   * The same leading quote hid a `--…-family` custom property written on the figure, which is how a
   * filed direction reaches a stylesheet: unresolvable, the title was attributed to the body family
   * instead of the one it is really set in. On 15 of the 120 committed directed pages the census
   * named the WRONG family for at least one request because of it.
   */
  it("should read a font-family attribute whose first family is itself quoted", () => {
    const { requests } = fontRequestsInHtml(
      `<style>body{font-family:"Merriweather",Georgia,serif}` +
        `@font-face{font-family:"Merriweather";font-weight:400;src:url(x)}</style>` +
        `<body><svg><text font-family="&quot;Open Sans&quot;, Helvetica, Arial, sans-serif" ` +
        `font-weight="400">DE</text></svg></body>`,
    );
    expect(requests.map((r) => `${r.family} ${r.weight}`)).toContain("Open Sans 400");
  });

  it("should read the same attribute written with single quotes", () => {
    const { requests } = fontRequestsInHtml(
      `<style>body{font-family:"Merriweather",Georgia,serif}</style>` +
        `<body><svg><text font-family="'Open Sans', Helvetica" font-weight="600">FR</text></svg></body>`,
    );
    expect(requests.map((r) => `${r.family} ${r.weight}`)).toContain("Open Sans 600");
  });

  it("should resolve a family custom property whose value opens with a quote", () => {
    const { requests } = fontRequestsInHtml(
      `<style>body{font-family:"Merriweather",Georgia,serif}` +
        `.chart-title{font-family:var(--title-family);font-weight:700}</style>` +
        `<body><figure style="--title-family:&quot;Open Sans&quot;, Helvetica, Arial, sans-serif">` +
        `<h1 class="chart-title">titre</h1></figure></body>`,
    );
    expect(requests.map((r) => `${r.family} ${r.weight}`)).toContain("Open Sans 700");
  });

  // MERRIWEATHER AND NOT OPEN SANS, and that is the whole test: `HOUSE_SANS_STACK` — what this
  // answers when it finds nothing at all — IS the Open Sans stack, so asserting on that stack would
  // have gone green against a reader that saw no stack whatsoever. Found by running the mutation.
  it("should count a quoted attribute stack when it reads the page's dominant family", () => {
    expect(
      dominantFontStack(
        `<text font-family="&quot;Merriweather&quot;, Georgia, serif">a</text>` +
          `<text font-family="&quot;Merriweather&quot;, Georgia, serif">b</text>`,
      ),
    ).toBe('"Merriweather", Georgia, serif');
  });

  it("should name the family, not its entities, when a stack still carries them", () => {
    expect(requestedFamily("&quot;Open Sans&quot;, Helvetica, Arial, sans-serif")).toBe("Open Sans");
  });

  // THE BODY FAMILY IS CARRIED AND THE ATTRIBUTE'S IS NOT — the exact shape of the defect, and the
  // only shape that makes this assertion mean anything: a page whose body family were the missing
  // one would fail with the pattern narrow too, on the inherited request, and prove nothing.
  it("should refuse a page whose quoted attribute names a face it does not carry", () => {
    const page =
      `<!doctype html><html><head><style>` +
      `@font-face{font-family:"Merriweather";font-style:normal;font-weight:400;` +
      `unicode-range:U+0000-00FF;src:url(data:font/woff2;base64,AA)}` +
      `body{font-family:"Merriweather",Georgia,serif}</style></head><body>` +
      `<svg><text font-family="&quot;Open Sans&quot;, Helvetica, Arial, sans-serif" ` +
      `font-weight="400">DE</text></svg></body></html>`;
    expect(() => assertFontsEmbedded(page)).toThrow(/Open Sans/);
  });
});

describe("the bytes, fetched and checked", () => {
  let faces: Array<{
    family: string;
    subset: string;
    base64: string;
    bytes: number;
    unicodeRange: string;
  }>;

  beforeAll(async () => {
    // The exact case the corpus produces: French copy, a CO2 subscript, one family, two weights.
    faces = await embeddedWebFaces(
      [
        { family: "Open Sans", weight: 400, style: "normal" },
        { family: "Open Sans", weight: 700, style: "normal" },
      ],
      "Les émissions de CO₂ ont baissé de 30 %",
    ) as typeof faces;
  });

  it("should embed woff2 and nothing else", () => {
    expect(faces.length).toBeGreaterThan(0);
    for (const face of faces)
      expect(isWoff2(Buffer.from(face.base64, "base64"))).toBe(true);
  });

  it("should keep the files in the SAME cache the resvg path uses, one per family, weight and subset", () => {
    expect(typefaceCacheDir()).toBe(cache);
    const held = readdirSync(cache).filter(
      (n) => n.endsWith(".woff2") && !n.startsWith("subset-"),
    );
    expect(held.length).toBe(faces.length);
    expect(held.some((n) => n.startsWith("Open-Sans-400-latin"))).toBe(true);
  });

  it("should reach U+2082, which lives in no Latin subset Google serves", () => {
    const ranges = faces.flatMap((f) => parseUnicodeRange(f.unicodeRange));
    expect(rangesCover(ranges, 0x2082)).toBe(true);
    // and it is reached by a face asked for BY CHARACTER, not by pulling a whole extra subset
    const extras = faces.filter((f) => f.subset.startsWith("extras-"));
    expect(extras.length).toBeGreaterThan(0);
    for (const face of extras) expect(face.bytes).toBeLessThan(8_000);
  });

  it("should carry only the subsets this text touches", () => {
    // Nothing here is Cyrillic, Greek, Hebrew or Vietnamese, and no page should pay for them.
    for (const face of faces)
      expect(["latin", "latin-ext"]).toContain(
        face.subset.replace(/^extras-.*/, "latin"),
      );
  });

  it("should drop a poisoned cache entry rather than embed it", async () => {
    const poisoned = join(cache, "Open-Sans-400-latin.woff2");
    expect(existsSync(poisoned)).toBe(true);
    writeFileSync(
      poisoned,
      "<!doctype html><title>429 Too Many Requests</title>",
    );
    const again = await embeddedWebFaces(
      [{ family: "Open Sans", weight: 400, style: "normal" }],
      "abc",
    );
    for (const face of again)
      expect(isWoff2(Buffer.from(face.base64, "base64"))).toBe(true);
    expect(isWoff2(readFileSync(poisoned))).toBe(true);
  });

  it("should write a rule a browser can read, with the range beside the bytes", () => {
    const css = fontFaceCss(faces.slice(0, 1));
    expect(css).toContain('font-family: "Open Sans"');
    expect(css).toContain("src: url(data:font/woff2;base64,");
    expect(css).toContain("unicode-range:");
    expect(css).toContain("font-display: block");
  });
});

describe("the guard — a page that names a face it does not carry is not written", () => {
  let carried: string;
  beforeAll(async () => {
    carried = fontFaceCss(
      await embeddedWebFaces(
        [{ family: "Open Sans", weight: 400, style: "normal" }],
        "Le CO₂ baisse",
      ),
    );
  });
  const page = (style: string, body: string) =>
    `<!doctype html><html><head><style>\n${style}\n</style></head><body>${body}</body></html>`;

  it("should pass a page whose every named family, weight and code point is carried", () => {
    expect(() =>
      assertFontsEmbedded(
        page(
          `${carried}\nbody { font-family: "Open Sans", Helvetica, sans-serif; }`,
          "Le CO₂ baisse",
        ),
      ),
    ).not.toThrow();
  });

  it("should refuse a family the page names and does not carry", () => {
    expect(() =>
      assertFontsEmbedded(
        page(
          `body { font-family: "Avenir Next", Helvetica, sans-serif; }`,
          "Le CO2 baisse",
        ),
      ),
    ).toThrow(/Avenir Next/);
  });

  it("should refuse a weight the page names and does not carry", () => {
    expect(() =>
      assertFontsEmbedded(
        page(
          `${carried}\nbody { font-family: "Open Sans", Helvetica, sans-serif; }\n.t { font-weight: 200; }`,
          "Le CO₂ baisse",
        ),
      ),
    ).toThrow(/200 normal/);
  });

  it("should refuse a code point no embedded unicode-range reaches", () => {
    expect(() =>
      assertFontsEmbedded(
        page(
          `${carried}\nbody { font-family: "Open Sans", Helvetica, sans-serif; }`,
          "Le CO₂ baisse ⇉",
        ),
      ),
    ).toThrow(/U\+21C9/);
  });

  it("should say nothing about a page set entirely in a generic keyword", () => {
    expect(() =>
      assertFontsEmbedded(page(`body { font-family: sans-serif; }`, "plain")),
    ).not.toThrow();
  });
});

/**
 * THE CUT — each face reduced to the characters the page can display, and the guard that makes
 * "can display" mean more than "says on load".
 *
 * The mechanism above embedded Google's whole `latin` subset: 231 glyphs, 13 KB for Open Sans and
 * 49 KB for Merriweather, so that anything a script might compose at run time had a net under it.
 * Cutting the face removes that net, and the failure it removes it into is the nastiest one this
 * format has: a glyph that is missing ONLY ON HOVER looks perfect in every screenshot.
 *
 * So three properties, in the order they can break:
 *
 *   1. THE CUT REPORTS WHAT IT REALLY KEPT. hb-subset silently drops a character the source font
 *      has no glyph for, and Google's own `unicode-range` overclaims what its files contain, so the
 *      emitted range is read back off the cut font's `cmap`.
 *   2. THE SET IS EVERYTHING THE PAGE CAN DISPLAY, not the words in the initial markup — the
 *      readable attributes a tooltip reads back, the strings inside a JSON payload a live map hands
 *      to one, and any text a stylesheet generates.
 *   3. THE GUARD REFUSES, PER FAMILY. A character outside one family's cut fails even when another
 *      family on the same page reaches it.
 */
describe("the cut — a face carries the characters this page can display, and says so truthfully", () => {
  const FULL_LATIN_DECLARED = 0x2000; // anything inside Google's `latin` claim of U+2000-206F

  it("should read a face's real repertoire off its own cmap, not off what Google claims", async () => {
    const [face] = await embeddedWebFaces(
      [{ family: "Open Sans", weight: 400, style: "normal" }],
      "abc",
    );
    const declared = parseUnicodeRange(face.unicodeRange);
    // The cut is a LIST, not a claim over a block: the range it writes reaches `a` and does not
    // reach a code point nothing on the page sets.
    expect(rangesCover(declared, "a".codePointAt(0)!)).toBe(true);
    expect(rangesCover(declared, "ж".codePointAt(0)!)).toBe(false);
    expect(face.bytes).toBeLessThan(face.servedBytes);
  });

  it("should NOT report a character the source font has no glyph for", async () => {
    // Google's `latin` range claims U+2000-206F wholesale. Its Open Sans file does not carry
    // U+202F, the narrow no-break space `Intl.NumberFormat("fr-FR")` puts inside a thousand — so a
    // cut that trusted the claim would write a range no glyph answers.
    const held = readFileSync(
      join(cache, readdirSync(cache).find((n) => n.startsWith("Open-Sans-400-latin."))!),
    );
    const source = fontCodePoints(await bytesAsTrueType(held));
    expect(source).toContain(0x00a0);
    expect(source).not.toContain(0x202f);

    const cut = await subsetWebFace(held, [0x41, 0x202f, 0x2082]);
    expect(cut.codePoints).toEqual([0x41]);
    expect(cut.bytes.length).toBeLessThan(held.length);
  });

  it("should write a range a browser can read, with consecutive code points collapsed", () => {
    expect(rangeSpec([0x41, 0x42, 0x43, 0x61, 0x2082])).toBe("U+41-43, U+61, U+2082");
    expect(rangeSpec([])).toBe("");
  });

  it("should read the strings inside a JSON payload and leave a plain script alone", () => {
    const html =
      `<script>var hidden = "Ẑ";</script>` +
      `<script type="application/json" id="mw-live-plan">` +
      JSON.stringify({ features: [{ properties: { name: "Zürich", detail: "1 289 000 hab." } }] }) +
      `</script>`;
    const text = jsonPayloadText(html);
    expect(text).toContain("Zürich");
    expect(text).toContain("1 289 000 hab.");
    expect(text).not.toContain("Ẑ"); // a plain <script> is code, not words
    // and the whole set the cut is measured against carries it, while `pageTextOf` alone does not
    expect(codePointsOf(pageTextOf(html))).not.toContain("ü".codePointAt(0));
    expect(codePointsOf(displayableTextOf(html))).toContain("ü".codePointAt(0));
  });

  it("should read text a stylesheet generates, quoted or escaped", () => {
    const html = `<style>.a::after { content: "→"; } .b::before { content: '\\2190 '; }</style><p>x</p>`;
    expect(cssContentText(html)).toContain("→");
    expect(cssContentText(html)).toContain("←");
    expect(codePointsOf(displayableTextOf(html))).toContain(0x2192);
  });

  it("should carry a character that only ever appears in a hover string", async () => {
    // `data-detail` is the one thing both formats' interaction scripts put on screen, and it is in
    // no text node. Before the cut it was free — the whole latin subset was there. Now it has to be
    // asked for by name or the tooltip has a hole in it.
    const html = `<p>plain</p><circle class="pt" data-detail="Zürich · 1 289 hab."></circle>`;
    const faces = await embeddedWebFaces(
      [{ family: "Open Sans", weight: 400, style: "normal" }],
      displayableTextOf(html),
    );
    const ranges = faces.flatMap((f) => parseUnicodeRange(f.unicodeRange));
    for (const ch of "Zürich·1289hab.") expect(rangesCover(ranges, ch.codePointAt(0)!)).toBe(true);
  });

  it("should carry the digits and signs a formatted value is made of, printed or not", async () => {
    // A series whose readings all start with 1 and 2 types no `7`, and a beat's own numbers are
    // fixed the moment it renders — so the ten digits and the separators travel whether this page
    // happens to print them or not.
    const faces = await embeddedWebFaces(
      [{ family: "Open Sans", weight: 400, style: "normal" }],
      "one two three",
    );
    const ranges = faces.flatMap((f) => parseUnicodeRange(f.unicodeRange));
    for (const ch of "0123456789.,%+−–—’") expect(rangesCover(ranges, ch.codePointAt(0)!)).toBe(true);
  });

  it("should refuse a page whose own words fall outside the cut it carries — naming the character and the family", async () => {
    const faces = await embeddedWebFaces(
      [{ family: "Open Sans", weight: 400, style: "normal" }],
      "Le CO₂ baisse",
    );
    const page = (css: string, body: string) =>
      `<!doctype html><html><head><style>\n${css}\nbody { font-family: "Open Sans", Helvetica, sans-serif; }\n</style></head><body>${body}</body></html>`;

    expect(() => assertFontsEmbedded(page(fontFaceCss(faces), "Le CO₂ baisse"))).not.toThrow();

    // THE MUTATION, in code: one real character taken out of the cut it declares. This is the
    // failure the cut introduces — a subset that no longer reaches a word the page says — and it is
    // the one the whole-subset mechanism could not have.
    const holed = faces.map((f) => ({
      ...f,
      unicodeRange: rangeSpec(
        parseUnicodeRange(f.unicodeRange)
          .flatMap(([lo, hi]) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i))
          .filter((cp) => cp !== "é".codePointAt(0) && cp !== 0x2082),
      ),
    }));
    expect(() => assertFontsEmbedded(page(fontFaceCss(holed), "Le CO₂ baissé"))).toThrow(
      /U\+2082.*Open Sans|Open Sans.*U\+2082/s,
    );
  });

  it("should refuse per FAMILY, not because something on the page reaches the character", async () => {
    // The hole the pooled check had: with each face cut to a list rather than carrying the whole
    // latin subset, two families on one page no longer carry the same repertoire.
    const sans = await embeddedWebFaces(
      [{ family: "Open Sans", weight: 400, style: "normal" }],
      "Le CO₂ baissé",
    );
    const serif = await embeddedWebFaces(
      [{ family: "Merriweather", weight: 400, style: "normal" }],
      "Le CO2 baisse", // no é, no subscript — this family's cut is narrower
    );
    const html =
      `<!doctype html><html><head><style>\n${fontFaceCss([...sans, ...serif])}\n` +
      `body { font-family: "Open Sans", Helvetica, sans-serif; }\n` +
      `.chart-title { font-family: "Merriweather", Georgia, serif; }\n` +
      `</style></head><body><h1 class="chart-title">Le CO₂ baissé</h1></body></html>`;
    expect(() => assertFontsEmbedded(html)).toThrow(/Merriweather/);
  });
});

/** woff2 → TrueType, so `fontCodePoints` can be pointed at a file Google served. The production
 *  path does the same thing inside `subsetWebFace`; here it is only a test's way of reading a
 *  source face's repertoire. */
async function bytesAsTrueType(bytes: Buffer): Promise<Buffer> {
  const fontverter = (await import("fontverter")).default;
  return Buffer.from(await fontverter.convert(bytes, "truetype"));
}
