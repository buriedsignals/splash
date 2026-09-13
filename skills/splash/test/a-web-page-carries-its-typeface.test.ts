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
  dominantFontStack,
  embeddedWebFaces,
  fontFaceCss,
  fontRequestsInHtml,
  isWoff2,
  pageTextOf,
  parseUnicodeRange,
  parseWebFaces,
  rangesCover,
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

describe("the bytes, fetched and checked", () => {
  let faces: Array<{
    family: string;
    subset: string;
    base64: string;
    bytes: number;
    unicodeRange: string;
  }>;

  beforeAll(() => {
    // The exact case the corpus produces: French copy, a CO2 subscript, one family, two weights.
    faces = embeddedWebFaces(
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
    const held = readdirSync(cache).filter((n) => n.endsWith(".woff2"));
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

  it("should drop a poisoned cache entry rather than embed it", () => {
    const poisoned = join(cache, "Open-Sans-400-latin.woff2");
    expect(existsSync(poisoned)).toBe(true);
    writeFileSync(
      poisoned,
      "<!doctype html><title>429 Too Many Requests</title>",
    );
    const again = embeddedWebFaces(
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
  const carried = fontFaceCss(
    embeddedWebFaces(
      [{ family: "Open Sans", weight: 400, style: "normal" }],
      "Le CO₂ baisse",
    ),
  );
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
