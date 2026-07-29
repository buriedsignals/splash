import { describe, it, expect } from "bun:test";
import {
  accentCandidate,
  cssRules,
  firstFamily,
  groundTheme,
  isNeutral,
  parseCssColour,
  proposeCharter,
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
    expect(parseCssColour("oklch(0.7 0.15 30)")).toBeNull();
    expect(parseCssColour("color-mix(in srgb, red, blue)")).toBeNull();
    expect(parseCssColour("rebeccapurple")).toBeNull();
  });

  it("should never throw on rubbish", () => {
    expect(parseCssColour("")).toBeNull();
    expect(parseCssColour("#")).toBeNull();
    expect(parseCssColour("rgb(")).toBeNull();
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
    const css = ":root{--brand: oklch(0.62 0.19 25)}";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(p.candidates).toEqual([]);
    expect(p.notes.join(" ")).toContain("oklch");
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

describe("accentCandidate", () => {
  it("should offer a second candidate only when its hue is genuinely different", () => {
    const css = ":root{--brand:#0a5c36;--accent:#c8102e}";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(accentCandidate(p)?.value).toBe("#c8102e");
  });

  it("should not offer a tint of the primary as an accent", () => {
    const css = ":root{--brand:#0a5c36;--brand-dark:#0d7345}";
    const p = proposeCharter(bare({ sheets: [{ href: "s.css", css }] }));
    expect(accentCandidate(p)).toBeNull();
  });
});
