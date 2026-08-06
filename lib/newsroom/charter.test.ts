import { describe, it, expect } from "bun:test";
import {
  alphaOf,
  cssRules,
  firstFamily,
  groundTheme,
  isNeutral,
  parseCssColour,
  proposeCharter,
  SIGNAL_LABEL,
  type ColourSignal,
  type SiteSources,
} from "./charter";

const bare = (over: Partial<SiteSources> = {}): SiteSources => ({
  html: "<html><head></head><body></body></html>",
  sheets: [],
  ...over,
});

describe("parseCssColour", () => {
  it("should read a six-digit hex", () => {
    expect(parseCssColour("#C8102E")).toBe("#c8102e");
  });

  it("should expand a three-digit hex", () => {
    expect(parseCssColour("#0a5")).toBe("#00aa55");
  });

  it("should drop the alpha of an eight-digit hex", () => {
    expect(parseCssColour("#c8102eff")).toBe("#c8102e");
  });

  it("should return null for a fully transparent colour", () => {
    expect(parseCssColour("rgba(0,0,0,0)")).toBeNull();
    expect(parseCssColour("#00000000")).toBeNull();
  });

  it("should read rgb() in comma and space syntax", () => {
    expect(parseCssColour("rgb(200, 16, 46)")).toBe("#c8102e");
    expect(parseCssColour("rgb(200 16 46 / 80%)")).toBe("#c8102e");
  });

  it("should read hsl()", () => {
    expect(parseCssColour("hsl(0, 100%, 50%)")).toBe("#ff0000");
  });

  it("should refuse a notation it cannot convert rather than approximate it", () => {
    expect(parseCssColour("lab(29.2345% 39.3825 20.0664)")).toBeNull();
    expect(parseCssColour("color-mix(in srgb, red, blue)")).toBeNull();
    expect(parseCssColour("rebeccapurple")).toBeNull();
  });

  it("should never throw on rubbish", () => {
    expect(parseCssColour("")).toBeNull();
    expect(parseCssColour("#")).toBeNull();
    expect(parseCssColour("rgb(")).toBeNull();
  });
});

// Reference values, not the fixture's own output — each is independently checkable:
// - oklch(62.8% 0.2577 29.23) ≈ #ff0000 is the CSS Color 4 spec's own worked example for pure
//   red (drafts.csswg.org's relative-color examples resolve `oklch(from hsl(0 100% 50%) l c h)`
//   to `oklch(0.627966 0.257704 29.2346)`; the Culori colour library's test suite pins the same
//   round trip to full precision — github.com/Evercoder/culori, test/oklch.test.js, `oklch('red')`
//   = { l: 0.6279553639214311, c: 0.2576833038053608, h: 29.233880279627854 }).
// - oklch(0% 0 0) = #000000 and oklch(100% 0 0) = #ffffff are definitional (zero/full lightness,
//   zero chroma).
// - oklch(17.764% 0 0) ≈ #111111 is the same Culori test suite, `oklch('#111')` = { l:
//   0.17763777307657064, c: 0 } — a second, independent published pair, chosen because it is a
//   pure-grey case (c: 0) where the hue term cannot mask an error in the a/b split.
// All three were also cross-checked against the CSS Color 4 spec's own two-step conversion code
// (OKLab_to_XYZ + XYZ_to_lin_sRGB, drafts.csswg.org/css-color-4/conversions.js) composed
// independently of the direct matrix this module uses — the two paths agree to sub-integer
// precision on every value below.
describe("parseCssColour — oklch()", () => {
  it("should convert the CSS Color 4 spec's own reference red", () => {
    expect(parseCssColour("oklch(62.8% 0.2577 29.23)")).toBe("#ff0000");
  });

  it("should convert pure black and white", () => {
    expect(parseCssColour("oklch(0% 0 0)")).toBe("#000000");
    expect(parseCssColour("oklch(100% 0 0)")).toBe("#ffffff");
  });

  it("should convert a pure-grey reference pinned from the Culori library's test suite", () => {
    expect(parseCssColour("oklch(17.764% 0 0)")).toBe("#111111");
  });

  it("should accept unit-interval lightness as the same value as the percentage", () => {
    expect(parseCssColour("oklch(0.628 0.2577 29.23)")).toBe(
      parseCssColour("oklch(62.8% 0.2577 29.23)"),
    );
  });

  it("should accept the site's real syntax — percentage lightness, bare chroma, bare degrees", () => {
    // The exact form heidi.news declares its red scale in.
    expect(parseCssColour("oklch(55.41% .2189 26.74)")).toBe("#d5121e");
  });

  it("should accept an explicit deg suffix on the hue", () => {
    expect(parseCssColour("oklch(62.8% 0.2577 29.23deg)")).toBe("#ff0000");
  });

  it("should read the alpha channel and treat a fully transparent one as no colour", () => {
    expect(parseCssColour("oklch(62.8% 0.2577 29.23 / 0)")).toBeNull();
    expect(parseCssColour("oklch(62.8% 0.2577 29.23 / 50%)")).toBe("#ff0000");
  });

  it("should refuse a malformed oklch() rather than guess", () => {
    expect(parseCssColour("oklch(not a colour)")).toBeNull();
    expect(parseCssColour("oklch(50% 0.1)")).toBeNull();
  });
});

describe("alphaOf — oklch()", () => {
  it("should read a low alpha the same as any other translucent colour", () => {
    expect(alphaOf("oklch(62.8% 0.2577 29.23 / 10%)")).toBeCloseTo(0.1, 5);
    expect(alphaOf("oklch(62.8% 0.2577 29.23 / 0.1)")).toBeCloseTo(0.1, 5);
  });

  it("should default to fully opaque when no alpha is declared", () => {
    expect(alphaOf("oklch(62.8% 0.2577 29.23)")).toBe(1);
  });
});

describe("isNeutral", () => {
  it("should call white, black and grey neutral", () => {
    expect(isNeutral("#ffffff")).toBe(true);
    expect(isNeutral("#000000")).toBe(true);
    expect(isNeutral("#333333")).toBe(true);
    expect(isNeutral("#f7f7f7")).toBe(true);
  });

  it("should not call a saturated brand hue neutral", () => {
    expect(isNeutral("#c8102e")).toBe(false);
    expect(isNeutral("#0a5c36")).toBe(false);
  });
});

describe("cssRules", () => {
  it("should descend into an at-rule", () => {
    const rules = cssRules("@media (min-width:600px){ a { color:#c8102e } }");
    expect(rules.map((r) => r.selector)).toContain("a");
  });

  it("should not lose the rule that follows a block", () => {
    const rules = cssRules("a{color:red}b{color:blue}");
    expect(rules.length).toBe(2);
  });

  it("should stop instead of throwing on an unbalanced brace", () => {
    expect(() => cssRules("a { color: red")).not.toThrow();
  });
});

describe("firstFamily", () => {
  it("should return the first named family", () => {
    expect(firstFamily('"Publico Text", Georgia, serif')).toBe("Publico Text");
  });

  it("should skip the system font stack rather than report it as the newsroom typeface", () => {
    expect(
      firstFamily("-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"),
    ).toBeNull();
  });

  // heidi.news: a `var(--font-x, Roboto)` fallback arrived here as "Roboto)" once split on the
  // comma, and the trailing paren hid the generic from GENERIC_FAMILY — reported as the house
  // typeface. The paren must be stripped BEFORE the generic test.
  it("should strip a trailing paren before testing for a generic family", () => {
    expect(firstFamily("var(--font-x, Roboto)")).toBeNull();
  });

  // therecord.media: "icomoon" was reported alongside the real typeface. An icon font ships
  // glyphs, not a house typeface, and telling a newsroom "your typeface is icomoon" is false.
  it("should skip an icon font rather than report it as the newsroom typeface", () => {
    expect(firstFamily("icomoon")).toBeNull();
  });
});

describe("proposeCharter — what the site declares", () => {
  it("should take the theme-color meta as a declared brand colour", () => {
    const p = proposeCharter(
      bare({
        html: '<meta name="theme-color" content="#c8102e">',
      }),
    );
    expect(p.candidates[0]!.value).toBe("#c8102e");
    expect(p.confidence).toBe("declared");
    expect(p.candidates[0]!.evidence[0]!.signal).toBe("theme-color");
  });

  it("should ignore the dark-mode twin of the theme-color meta", () => {
    const p = proposeCharter(
      bare({
        html: '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#111111">',
      }),
    );
    expect(p.confidence).toBe("none");
  });

  it("should take a --brand custom property over a merely frequent colour", () => {
    const css = `
      :root { --brand: #0a5c36 }
      .a { color: #7b3fa0 } .b { color: #7b3fa0 } .c { color: #7b3fa0 }
      .d { border-color: #7b3fa0 } .e { border-color: #7b3fa0 }
    `;
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates[0]!.value).toBe("#0a5c36");
    expect(p.confidence).toBe("declared");
  });

  it("should read the link colour when nothing is declared, and say the result is inferred", () => {
    const css = "a { color: #1a5fb4 } a:hover { color: #1a5fb4 }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates[0]!.value).toBe("#1a5fb4");
    expect(p.confidence).toBe("inferred");
    expect(p.notes.join(" ")).toContain("is a guess");
  });

  it("should read the masthead SVG fill", () => {
    const html = `<div class="site-logo"><svg><path fill="#c8102e" d="M0 0"/></svg></div>`;
    const p = proposeCharter(bare({ html }));
    expect(p.candidates[0]!.value).toBe("#c8102e");
    expect(p.candidates[0]!.evidence[0]!.signal).toBe("masthead");
  });

  it("should merge two near-identical readings into one candidate", () => {
    const css =
      ":root{--brand:#c8102e} a{color:#c9112f} .btn{background:#c8102e}";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates.length).toBe(1);
    expect(p.candidates[0]!.evidence.length).toBe(3);
  });

  it("should carry the receipt of every reading", () => {
    const p = proposeCharter(
      bare({ sheets: [{ href: "s.css", css: ":root{--primary:#0a5c36}" }] }),
    );
    expect(p.candidates[0]!.evidence[0]!.token).toContain("--primary");
  });

  // The same-host filter used to be what kept a third party's stylesheet from being read at all
  // (deleted with it: charter-fetch.test.ts's "should drop a third-party stylesheet"). Now that
  // any linked sheet is read (lib/newsroom/charter-fetch.ts, task 2), a `--brand` declared inside
  // an analytics widget's own CSS is read too — correctly, since a third-party font sheet is
  // exactly where the typography this measurement wants can live. What must NOT happen is that
  // widget's declaration passing for the newsroom's OWN say-so: `Measurement.source` is the
  // sheet's href, not the page's, so it stays distinguishable rather than reaching
  // `DECLARED_SIGNALS` disguised as the site's own brand declaration.
  it("keeps a third-party sheet's declaration distinguishable from the newsroom's own", () => {
    const p = proposeCharter(
      bare({
        url: "https://example.news/",
        sheets: [
          {
            href: "https://cdn.ads.example/consent.css",
            css: ":root{--brand:#d5121e}",
          },
        ],
      }),
    );
    const evidence = p.candidates[0]!.evidence[0]!;
    expect(evidence.signal).toBe("brand-property");
    expect(evidence.source).toBe("https://cdn.ads.example/consent.css");
    expect(evidence.source).not.toBe("https://example.news/");
  });

  it("marks a page-derived reading (theme-color) with the page's own URL as its source", () => {
    const html = '<meta name="theme-color" content="#d5121e">';
    const p = proposeCharter(bare({ html, url: "https://example.news/" }));
    expect(p.candidates[0]!.evidence[0]!.source).toBe("https://example.news/");
  });

  // heidi.news declares its red scale only in oklch() — this is the shape of that declaration
  // (lib/newsroom/fixtures/sites/heidi-news.css: `--lt-color-red-500: oklch(55.41% .2189 26.74)`),
  // and it must read as a --brand declaration, at `declared` confidence, exactly like a hex would.
  it("should take a --brand declared in oklch() at the same confidence as hex", () => {
    const css = ":root { --brand: oklch(55.41% .2189 26.74) }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates[0]!.value).toBe("#d5121e");
    expect(p.candidates[0]!.evidence[0]!.signal).toBe("brand-property");
    expect(p.confidence).toBe("declared");
  });

  it("should not propose a near-white/grey read only in oklch() — the neutral rule applies after conversion too", () => {
    // oklch(96% 0.005 90) is a near-white; isNeutral must still catch it once converted to hex.
    const css = ":root { --brand: oklch(96% 0.005 90) }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates).toEqual([]);
  });
});

describe("proposeCharter — refusing rather than inventing", () => {
  it("should propose NOTHING for a white site with black text", () => {
    const css = "body{background:#ffffff;color:#111111} a{color:#111111}";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates).toEqual([]);
    expect(p.confidence).toBe("none");
    expect(p.notes.join(" ")).toContain("has to be asked for");
  });

  it("should say so when no stylesheet was read at all", () => {
    const p = proposeCharter(bare());
    expect(p.notes.join(" ")).toContain("JavaScript");
  });

  it("should report an unreadable colour notation instead of guessing it", () => {
    // oklch() is read now (see "proposeCharter — what the site declares"); lab() is still not —
    // this is the notation the refuse-rather-than-invent path is proven against today.
    const css = ":root{--brand: lab(29.2345% 39.3825 20.0664)}";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates).toEqual([]);
    expect(p.notes.join(" ")).toContain("lab");
  });

  it("should never throw, whatever it is handed", () => {
    expect(() =>
      proposeCharter({
        html: "<<<{{{",
        sheets: [{ href: "x", css: "}}}{{{" }],
      }),
    ).not.toThrow();
    expect(() =>
      proposeCharter({ html: undefined as unknown as string, sheets: [] }),
    ).not.toThrow();
  });
});

describe("proposeCharter — the ground", () => {
  it("should read a dark body background as a dark ground", () => {
    const css = "body{background-color:#12161c} :root{--brand:#e8b100}";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.ground?.value).toBe("#12161c");
    expect(p.ground?.dark).toBe(true);
    expect(groundTheme(p)).toBe("#12161c");
  });

  it("should not report the ordinary white ground as a theme worth writing", () => {
    const css = "body{background:#ffffff} :root{--brand:#0a5c36}";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(groundTheme(p)).toBeNull();
  });

  it("should not take a prefers-color-scheme:dark block as the site's ground", () => {
    const css =
      "body{background:#ffffff} @media (prefers-color-scheme: dark){ body{background:#0b0b0b} }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.ground?.dark).toBe(false);
  });

  it("should keep the ground out of the brand ranking", () => {
    const css = "body{background:#12161c} a{color:#e8b100}";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates.map((c) => c.value)).not.toContain("#12161c");
  });
});

describe("proposeCharter — typography", () => {
  it("should read the body and heading families", () => {
    const css = `body{font-family:"Publico Text",Georgia,serif} h1{font-family:"Publico Banner",serif}`;
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.typography.find((t) => t.role === "body")?.family).toBe(
      "Publico Text",
    );
    expect(p.typography.find((t) => t.role === "headings")?.family).toBe(
      "Publico Banner",
    );
  });

  it("should read a self-hosted webfont name", () => {
    const css = `@font-face{font-family:"Guardian Egyptian";src:url(a.woff2)}`;
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.typography.some((t) => t.family === "Guardian Egyptian")).toBe(
      true,
    );
  });
});

// ── Regression guards. Each of these FAILS on the implementation that shipped before it, which
// is the only thing that makes it a guard rather than a description.

describe("regression — frequency is a tiebreak, never an argument", () => {
  it("should keep a declared theme-color ahead of a link colour repeated sixty times", () => {
    const css = Array.from(
      { length: 60 },
      (_, i) => `a.n${i} { color: #1a5fb4 }`,
    ).join("\n");
    const p = proposeCharter({
      html: '<meta name="theme-color" content="#c8102e">',
      sheets: [{ href: "s.css", css }],
    });
    expect(p.candidates[0]!.value).toBe("#c8102e");
    expect(p.confidence).toBe("declared");
  });

  it("should keep a theme-color ahead of a --brand property repeated twenty times", () => {
    const css = Array.from(
      { length: 20 },
      (_, i) => `.n${i} { --brand: #0a5c36 }`,
    ).join("\n");
    const p = proposeCharter({
      html: '<meta name="theme-color" content="#c8102e">',
      sheets: [{ href: "s.css", css }],
    });
    expect(p.candidates[0]!.value).toBe("#c8102e");
  });

  it("should still order two equally-declared colours by how often they occur", () => {
    const css = [
      ".a { --primary: #c8102e }",
      ...Array.from({ length: 9 }, (_, i) => `.b${i} { --primary: #0a5c36 }`),
    ].join("\n");
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates[0]!.value).toBe("#0a5c36");
  });

  it("should count every reading even past the evidence cap", () => {
    const css = Array.from(
      { length: 50 },
      (_, i) => `.n${i} { --primary: #0a5c36 }`,
    ).join("\n");
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates[0]!.count).toBe(50);
    expect(p.candidates[0]!.evidence.length).toBeLessThanOrEqual(12);
  });

  it("should rank a hundred thousand identical declarations without stalling", () => {
    const css = Array.from(
      { length: 100_000 },
      (_, i) => `.n${i} { --primary: #0a5c36 }`,
    ).join("\n");
    const started = Date.now();
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates[0]!.value).toBe("#0a5c36");
    expect(Date.now() - started).toBeLessThan(10_000);
  });
});

describe("regression — the Guardian's loose brand property", () => {
  it("should NOT treat --article-link-border-hover as a brand declaration", () => {
    const p = proposeCharter(
      bare({
        sheets: [
          {
            href: "s.css",
            css: ":root { --article-link-border-hover: #c70000 }",
          },
        ],
      }),
    );
    expect(p.confidence).not.toBe("declared");
  });

  it("should NOT treat --key-event-button-hover as a brand declaration", () => {
    const p = proposeCharter(
      bare({
        sheets: [
          { href: "s.css", css: ":root { --key-event-button-hover: #c70000 }" },
        ],
      }),
    );
    expect(p.confidence).not.toBe("declared");
  });

  it("should score a --accent property below the link colour", () => {
    const css = ":root { --accent: #c8102e } a { color: #1a5fb4 }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates[0]!.value).toBe("#1a5fb4");
    expect(p.confidence).toBe("inferred");
  });
});

describe("regression — the masthead window must not swallow the page", () => {
  it("should NOT credit a share icon that sits far below an <img> logo", () => {
    const html = `<a class="site-logo"><img src="/logo.png"></a>${"<p>filler</p>".repeat(220)}<svg class="share"><path fill="#7b2fbe"/></svg>`;
    const p = proposeCharter(bare({ html }));
    expect(p.candidates).toEqual([]);
    expect(p.confidence).toBe("none");
  });

  it("should still credit the logo's own SVG", () => {
    const html = `<a class="site-logo"><svg><path fill="#c8102e"/></svg></a>`;
    const p = proposeCharter(bare({ html }));
    expect(p.candidates[0]!.value).toBe("#c8102e");
  });

  it("should NOT read a fill that sits after the logo SVG closes", () => {
    const html = `<a class="site-logo"><svg><path fill="#c8102e"/></svg><svg class="share"><path fill="#7b2fbe"/></svg></a>`;
    const p = proposeCharter(bare({ html }));
    expect(p.candidates.map((c) => c.value)).toEqual(["#c8102e"]);
  });

  it("should name the anchoring element in the receipt", () => {
    const html = `<a class="site-logo"><svg><path fill="#c8102e"/></svg></a>`;
    const p = proposeCharter(bare({ html }));
    expect(p.candidates[0]!.evidence[0]!.token).toContain("site-logo");
  });
});

describe("regression — the score floor", () => {
  it("should refuse a colour that only appears in hashed utility classes", () => {
    const css =
      ".css-1ab { color: #e00000 } .css-2cd { background-color: #e00000 } .css-3ef { border-top-color: #e00000 }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates).toEqual([]);
    expect(p.confidence).toBe("none");
  });

  it("should name the colour it refused, so the journalist can recognise it", () => {
    const css = ".css-1ab { color: #e00000 }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.notes.join(" ")).toContain("#e00000");
    expect(p.notes.join(" ")).toContain("nothing is proposed");
  });

  it("should still refuse a colour on only TWO brand-carrying declarations — the bbc.com reading this floor exists for", () => {
    // Same live case the constant's own comment cites: three hashed, unrelated classes, one
    // colour, and only two of the three properties (background-color, border-top-color) are on
    // the closed set `recurrent-role` reads — RECURRENT_ROLE_MIN_COUNT keeps this below evidence.
    const css =
      ".css-1ab { color: #e00000 } .css-2cd { background-color: #e00000 } .css-3ef { border-top-color: #e00000 }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates).toEqual([]);
    expect(p.confidence).toBe("none");
  });
});

// A compiled stylesheet does not name its brand in a custom property — it repeats the colour on
// the roles that carry a brand: button fills, banner backgrounds, accented borders. Repetition on
// those roles is evidence; repetition anywhere is not, which is why a neutral never qualifies.
describe("recurrent-role — a colour repeated on brand-carrying roles, with no name anywhere", () => {
  it("finds a brand colour repeated on brand-carrying roles", () => {
    const css = Array.from(
      { length: 12 },
      (_, i) => `.btn-${i}{background:#d5121e}`,
    ).join("");
    const p = proposeCharter({
      url: "https://x.news",
      html: "",
      sheets: [{ href: "a.css", css }],
    });
    expect(p.candidates[0]!.value).toBe("#d5121e");
    expect(p.confidence).not.toBe("declared");
  });

  // Never the least-grey pixel: a repeated neutral is a layout colour, not a brand.
  it("a repeated neutral is not a brand colour", () => {
    const css = Array.from(
      { length: 20 },
      (_, i) => `.x-${i}{background:#f4f4f4}`,
    ).join("");
    const p = proposeCharter({
      url: "https://x.news",
      html: "",
      sheets: [{ href: "a.css", css }],
    });
    expect(p.candidates).toEqual([]);
  });

  it("finds it even when the class names are hashed and carry no readable role", () => {
    // The actual defect this signal fixes: no `.btn`, no `.masthead` — nothing a selector-text
    // regex can read, which is what a CSS-modules/atomic build produces. Six on `background`,
    // four on `border-color`: the closed property set, not the selector, is what fires here.
    const css = [
      ...Array.from({ length: 6 }, (_, i) => `.h${i}x9{background:#3355aa}`),
      ...Array.from({ length: 4 }, (_, i) => `.q${i}z2{border-color:#3355aa}`),
    ].join("");
    const p = proposeCharter({
      url: "https://x.news",
      html: "",
      sheets: [{ href: "a.css", css }],
    });
    expect(p.candidates[0]!.value).toBe("#3355aa");
    expect(p.candidates[0]!.evidence[0]!.signal).toBe("recurrent-role");
    expect(p.confidence).toBe("inferred");
  });

  it("does not promote a colour repeated only on `color` — running prose, not a brand role", () => {
    const css = Array.from(
      { length: 12 },
      (_, i) => `.p${i}{color:#3355aa}`,
    ).join("");
    const p = proposeCharter(bare({ sheets: [{ href: "a.css", css }] }));
    expect(p.candidates).toEqual([]);
  });

  it("stays below every declared signal even at high frequency", () => {
    const css = [
      ":root { --brand: #0a5c36 }",
      ...Array.from({ length: 200 }, (_, i) => `.h${i}z{background:#3355aa}`),
    ].join("\n");
    const p = proposeCharter(bare({ sheets: [{ href: "a.css", css }] }));
    expect(p.candidates[0]!.value).toBe("#0a5c36");
    expect(p.confidence).toBe("declared");
  });
});

describe("regression — the ground", () => {
  it("should take the LAST background declaration, the way CSS does", () => {
    const css = "body { background: #0b0b0b } body { background: #ffffff }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.ground?.value).toBe("#ffffff");
    expect(groundTheme(p)).toBeNull();
  });

  it("should let a linked stylesheet override an inline <style>", () => {
    const p = proposeCharter({
      html: "<style>body{background:#0b0b0b}</style>",
      sheets: [{ href: "s.css", css: "body{background:#ffffff}" }],
    });
    expect(p.ground?.dark).toBe(false);
  });

  it("should not read a ten-percent wash as the page ground", () => {
    const css = ":root { --ds-color-background-faible: rgba(0,0,0,.1) }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.ground).toBeUndefined();
  });

  it("should warn that a dark ground is the least reliable reading", () => {
    const css = "body { background: #12161c } :root { --brand: #e8b100 }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.notes.join(" ")).toContain("least reliable");
  });
});

describe("regression — theme variants are not the default", () => {
  it("should skip a [data-color-mode=dark] rule", () => {
    const css =
      "body{background:#ffffff} html[data-color-mode=dark] body { background: #0b0b0b }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.ground?.value).toBe("#ffffff");
  });

  it("should skip a [data-theme=dark] rule", () => {
    const css =
      ':root{--brand:#0a5c36} [data-theme="dark"] { --brand: #e8b100 }';
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates.map((c) => c.value)).toEqual(["#0a5c36"]);
  });

  it("should skip a .dark class scope", () => {
    const css = ":root{--brand:#0a5c36} html.dark { --brand: #e8b100 }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates.map((c) => c.value)).toEqual(["#0a5c36"]);
  });

  it("should not skip a rule that merely mentions a word containing dark", () => {
    const css = ".darkroom { --brand: #0a5c36 }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates[0]!.value).toBe("#0a5c36");
  });
});

describe("regression — !important is not a typeface", () => {
  it("should not report serif!important as the newsroom's font", () => {
    const css =
      ".ds-card__title { font-family: var(--font-antiqua-b-bold),serif!important }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.typography.map((t) => t.family)).not.toContain("serif!important");
    expect(p.typography).toEqual([]);
  });

  it("should still read a real family that carries !important", () => {
    const css = "body { font-family: 'Publico Text', serif !important }";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.typography[0]!.family).toBe("Publico Text");
  });
});

describe("regression — every signal a reading can carry is explainable", () => {
  // The type already makes a missing label a compile error. This adds the two things the type
  // cannot check — that no label is blank, and that a signal actually PRODUCED by an extraction
  // resolves to prose — because `from undefined` reaching a journalist defeats the whole premise
  // that he can audit what he is shown.
  const SIGNALS: ColourSignal[] = [
    "theme-color",
    "brand-property",
    "accent-property",
    "masthead",
    "link",
    "control",
    "recurrent-role",
    "declared",
  ];

  it("should label every signal with non-empty prose", () => {
    for (const s of SIGNALS) {
      expect(SIGNAL_LABEL[s]).toBeString();
      expect(SIGNAL_LABEL[s].length).toBeGreaterThan(0);
    }
  });

  it("should have no label beyond the signals that exist", () => {
    expect(Object.keys(SIGNAL_LABEL).sort()).toEqual([...SIGNALS].sort());
  });

  it("should resolve a label for an accent-only site — the reading that printed `undefined`", () => {
    const p = proposeCharter(
      bare({ sheets: [{ href: "s.css", css: ":root { --accent: #c8102e }" }] }),
    );
    const signal = p.candidates[0]!.evidence[0]!.signal;
    expect(signal).toBe("accent-property");
    expect(SIGNAL_LABEL[signal]).toContain("ACCENT");
  });

  it("should resolve a label for every signal a real extraction emits", () => {
    const p = proposeCharter({
      html: '<meta name="theme-color" content="#c8102e"><a class="site-logo"><svg><path fill="#0a5c36"/></svg></a>',
      sheets: [
        {
          href: "s.css",
          css: ":root{--brand:#1a5fb4;--accent:#e8b100} a{color:#7b2fbe} .btn{background:#3cad00} .x{color:#00a0a0}",
        },
      ],
    });
    const emitted = new Set(
      p.candidates.flatMap((c) => c.evidence.map((e) => e.signal)),
    );
    expect(emitted.size).toBeGreaterThan(3);
    for (const s of emitted) expect(SIGNAL_LABEL[s]).toBeTruthy();
  });
});

describe("regression — accent removed from the charter", () => {
  it("should no longer export an accent candidate", async () => {
    // `accent` was removed from the house charter (2026-07-29): it was the only proposal field
    // that named a colour nothing in the product renders.
    const mod = (await import("./charter")) as Record<string, unknown>;
    expect(mod.accentCandidate).toBeUndefined();
  });
});
