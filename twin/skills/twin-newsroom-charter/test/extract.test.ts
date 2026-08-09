import { describe, expect, it } from "bun:test";
import {
  extractBackgroundDeclarations,
  extractFontFamilies,
  extractInlineStyleBlocks,
  extractLanguage,
  extractName,
  extractRootCustomProperties,
  extractStylesheetHrefs,
  extractThemeColor,
  isNeutralHex,
  normalizeHex,
} from "../scripts/extract.mjs";

describe("normalizeHex", () => {
  it("should expand a 3-digit hex to 6 digits", () => {
    expect(normalizeHex("#abc")).toBe("#aabbcc");
  });

  it("should lowercase a mixed-case hex", () => {
    expect(normalizeHex("#D5121E")).toBe("#d5121e");
  });
});

describe("isNeutralHex", () => {
  it("should treat pure white and pure black as neutral, case-insensitively", () => {
    expect(isNeutralHex("#ffffff")).toBe(true);
    expect(isNeutralHex("#000000")).toBe(true);
    expect(isNeutralHex("#FFFFFF")).toBe(true);
  });

  it("should not treat a real colour as neutral", () => {
    expect(isNeutralHex("#d5121e")).toBe(false);
  });
});

describe("extractThemeColor", () => {
  it("should read a real theme-color meta tag (heidi.news)", () => {
    const html = `<head><meta name="theme-color" content="#d5121e"/></head>`;
    const result = extractThemeColor(html);
    expect(result).toEqual([
      {
        value: "#d5121e",
        media: null,
        evidence: '<meta name="theme-color" content="#d5121e"/>',
      },
    ]);
  });

  it("should carry the media query when a site ships separate light/dark variants", () => {
    const html = `
      <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
      <meta name="theme-color" content="#0b0b0b" media="(prefers-color-scheme: dark)">
    `;
    const result = extractThemeColor(html);
    expect(result).toHaveLength(2);
    expect(result[0].media).toBe("(prefers-color-scheme: light)");
    expect(result[1].value).toBe("#0b0b0b");
  });

  it("should expand and lowercase a 3-digit hex", () => {
    const html = `<meta name="theme-color" content="#FFF">`;
    expect(extractThemeColor(html)[0].value).toBe("#ffffff");
  });

  it("should skip a theme-color declared as a named colour, not a hex", () => {
    const html = `<meta name="theme-color" content="black">`;
    expect(extractThemeColor(html)).toEqual([]);
  });

  it("should find nothing when the document declares no theme-color at all (nzz.ch's real shape)", () => {
    const html = `<meta name="msapplication-TileColor" content="000000"/>`;
    expect(extractThemeColor(html)).toEqual([]);
  });

  it("should not be fooled by an unrelated meta tag whose name merely contains 'color'", () => {
    const html = `<meta name="msapplication-TileColor" content="#123456">`;
    expect(extractThemeColor(html)).toEqual([]);
  });
});

describe("extractName", () => {
  it("should prefer og:site_name over the title", () => {
    const html = `<meta property="og:site_name" content="Le Monde.fr"><title>Le Monde - actus</title>`;
    const result = extractName(html);
    expect(result.value).toBe("Le Monde.fr");
    expect(result.source).toBe("meta[property=og:site_name]");
  });

  it("should fall back to the title when og:site_name is absent", () => {
    const html = `<title>Heidi.news</title>`;
    const result = extractName(html);
    expect(result).toEqual({
      value: "Heidi.news",
      source: "<title>",
      evidence: "<title>Heidi.news</title>",
    });
  });

  it("should return null when neither is present", () => {
    expect(extractName("<html></html>")).toBe(null);
  });
});

describe("extractLanguage", () => {
  it("should read the base language subtag, dropping a region (fr-CH -> fr)", () => {
    const html = `<html lang="fr-CH">`;
    expect(extractLanguage(html)?.value).toBe("fr");
  });

  it("should return null when no lang attribute is declared", () => {
    expect(extractLanguage("<html>")).toBe(null);
  });
});

describe("extractStylesheetHrefs", () => {
  it("should resolve a relative href against the page url", () => {
    const html = `<link rel="stylesheet" href="/assets/site.css">`;
    expect(
      extractStylesheetHrefs(html, "https://example.test/section/page"),
    ).toEqual(["https://example.test/assets/site.css"]);
  });

  it("should keep an absolute href as-is (a real CDN link, heidi.news's shape)", () => {
    const html = `<link rel="stylesheet" href="https://cdn.example/site.css" media="all" />`;
    expect(extractStylesheetHrefs(html, "https://example.test")).toEqual([
      "https://cdn.example/site.css",
    ]);
  });

  it("should ignore a link tag whose rel is not stylesheet", () => {
    const html = `<link rel="icon" href="/favicon.ico">`;
    expect(extractStylesheetHrefs(html, "https://example.test")).toEqual([]);
  });

  it("should match a stylesheet rel that carries more than one token", () => {
    const html = `<link rel="preload stylesheet" href="/a.css">`;
    expect(extractStylesheetHrefs(html, "https://example.test")).toEqual([
      "https://example.test/a.css",
    ]);
  });

  it("should deduplicate a repeated href", () => {
    const html = `
      <link rel="stylesheet" href="/a.css">
      <link rel="stylesheet" href="/a.css">
    `;
    expect(extractStylesheetHrefs(html, "https://example.test")).toEqual([
      "https://example.test/a.css",
    ]);
  });
});

describe("extractInlineStyleBlocks", () => {
  it("should concatenate every style block's body, in order", () => {
    const html = `<style>a{color:red}</style><p>x</p><style>b{color:blue}</style>`;
    expect(extractInlineStyleBlocks(html)).toBe("a{color:red}\nb{color:blue}");
  });

  it("should return an empty string when there is no style block", () => {
    expect(extractInlineStyleBlocks("<p>x</p>")).toBe("");
  });
});

describe("extractRootCustomProperties", () => {
  it("should read a hex custom property declared on bare :root", () => {
    const css = `:root{--swiper-theme-color: #007aff}`;
    expect(extractRootCustomProperties(css)).toEqual([
      {
        name: "--swiper-theme-color",
        value: "#007aff",
        selector: ":root",
        evidence: ":root { --swiper-theme-color: #007aff }",
      },
    ]);
  });

  it("should skip a custom property whose value is not a hex colour (a font name, nzz.ch's real shape)", () => {
    const css = `:root{--nzz-font-sans: "NZZ Sans"}`;
    expect(extractRootCustomProperties(css)).toEqual([]);
  });

  it("should still capture a hex property on a qualified :root selector, naming the qualifier", () => {
    const css = `:root.dark{--articleBackground: black;--articleBackground: #ffffff}`;
    const result = extractRootCustomProperties(css);
    expect(result).toHaveLength(1); // "black" isn't a hex, only the second declaration is captured
    expect(result[0]).toEqual({
      name: "--articleBackground",
      value: "#ffffff",
      selector: ":root.dark",
      evidence: ":root.dark { --articleBackground: #ffffff }",
    });
  });

  it("should ignore a custom property declared outside any :root-mentioning selector", () => {
    const css = `.card{--card-bg: #282827}`;
    expect(extractRootCustomProperties(css)).toEqual([]);
  });

  // The real bug this test pins: found running extractBackgroundDeclarations against nzz.ch's
  // actual stylesheet, where `--articleBackground` (a custom property NAME that merely contains
  // the word "background") was being read as a real `background:` declaration by a regex with no
  // word boundary. extractRootCustomProperties never had this bug (it only ever reads `--name:`
  // pairs) — this test documents the fixture that exposed it, read the other way, so a future
  // change to either function has this exact shape on record.
  it("should not let extractBackgroundDeclarations mistake this property's name for a real background rule", () => {
    const css = `:root.dark{--articleBackground: black;--articleBackground: #ffffff}`;
    expect(extractBackgroundDeclarations(css)).toEqual([]);
  });
});

describe("extractBackgroundDeclarations", () => {
  it("should read a plain background declaration on body (theguardian.com's real shape)", () => {
    const css = `body { background: #FFFFFF }`;
    expect(extractBackgroundDeclarations(css)).toEqual([
      {
        selector: "body",
        value: "#ffffff",
        evidence: "body { background: #FFFFFF }",
      },
    ]);
  });

  it("should read background-color as well as the background shorthand", () => {
    const css = `html { background-color: #101010; }`;
    expect(extractBackgroundDeclarations(css)[0].value).toBe("#101010");
  });

  it("should still report a qualified selector's background, naming the qualifier in full", () => {
    const css = `html.short-video,html.short-video body { background: #000 }`;
    const result = extractBackgroundDeclarations(css);
    expect(result).toHaveLength(1);
    expect(result[0].selector).toBe("html.short-video,html.short-video body");
    expect(result[0].value).toBe("#000000");
  });

  it("should ignore a background declared on an unrelated selector (a card, a button)", () => {
    const css = `.card-warning { background: #282827 }`;
    expect(extractBackgroundDeclarations(css)).toEqual([]);
  });

  it("should not match inside a custom-property name that merely contains the word background", () => {
    const css = `body { --card-background-color: #282827; color: black }`;
    expect(extractBackgroundDeclarations(css)).toEqual([]);
  });
});

describe("extractFontFamilies", () => {
  it("should reduce a quoted stack to its first named face (theguardian.com's real shape)", () => {
    const css = `.byline{font-family:'GH Guardian Headline','Guardian Egyptian Web',Georgia,serif}`;
    const result = extractFontFamilies(css);
    expect(result).toEqual([
      {
        stack: "GH Guardian Headline",
        count: 1,
        evidence:
          "font-family: 'GH Guardian Headline','Guardian Egyptian Web',Georgia,serif",
      },
    ]);
  });

  it("should report the most-declared face first", () => {
    const css = `
      a{font-family:'Marr Sans',sans-serif}
      b{font-family:'Marr Sans',sans-serif}
      c{font-family:'Marr Sans Medium',sans-serif}
    `;
    const result = extractFontFamilies(css);
    expect(result[0].stack).toBe("Marr Sans");
    expect(result[0].count).toBe(2);
    expect(result[1].stack).toBe("Marr Sans Medium");
  });

  it("should report nothing for a stack of only generic keywords", () => {
    const css = `body{font-family:inherit}`;
    expect(extractFontFamilies(css)).toEqual([]);
  });

  // The real corruption this test pins: heidi.news's own stylesheet declares
  // `font-family: var(--lt-font-sans,Roboto)!important` — a naive comma-split on that string
  // produces the two fragments `var(--lt-font-sans` and `Roboto)!important`, and without the
  // paren check the second fragment is reported as a real font name (it looks like one). Neither
  // fragment is a real, resolved font declaration, so this must report nothing for that
  // declaration — not a mangled name wearing the shape of a real one.
  it("should not report a mangled fragment out of an unresolved var() with a fallback (heidi.news's real shape)", () => {
    const css = `body{font-family:var(--lt-font-sans,Roboto)!important}`;
    expect(extractFontFamilies(css)).toEqual([]);
  });

  it("should still resolve a separate, real declaration alongside an unresolved var() one", () => {
    const css = `
      h1{font-family:'Sang Bleu Kingdom'}
      body{font-family:var(--lt-font-sans,Roboto)!important}
    `;
    const result = extractFontFamilies(css);
    expect(result).toEqual([
      {
        stack: "Sang Bleu Kingdom",
        count: 1,
        evidence: "font-family: 'Sang Bleu Kingdom'",
      },
    ]);
  });

  it("should read a font-family declaration out of raw HTML too, not only CSS", () => {
    const html = `<div style="font-family: Roboto, sans-serif">x</div>`;
    expect(extractFontFamilies(html)[0].stack).toBe("Roboto");
  });
});
