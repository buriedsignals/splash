/**
 * A DIRECTED VIDEO TAKES ITS STYLE FROM ITS DIRECTION, OR IT IS NOT DIRECTED.
 *
 * The video beats that predate the design base type everything: `FONT_FAMILY = "Helvetica…"`,
 * `TITLE: { fontSize: 38, fontWeight: 700, lead: 48 }`, a hex per mark. A directed video receives
 * its registers (`videoRegistersOf`) and its direction's colours as props, so any of those literals
 * in its composition is a value the direction no longer controls — and the second direction is
 * where it shows. The static twin of this guard scans only `render-directions.mjs` beats.
 *
 * WHAT IT DOES NOT CATCH: a literal hidden behind a variable (`const s = 38; fontSize={s}`); a
 * colour computed by `mix` from a typed hex; a CSS `text-transform` reached through a class name in
 * an external stylesheet rather than written inline; a named colour outside the CSS3 keyword list
 * this scanner carries (an unusual name such as `"rebeccapurple"`'s neighbours it does not know, if
 * any exist); a MapLibre kebab-case property this scanner does not name explicitly; `fill="url(#…)"`
 * and other non-colour string values on a colour-bearing attribute, which are legitimate and stay
 * unflagged; a MapLibre expression array that opens on an exempt operator can still carry a typed
 * literal colour or number further in (e.g. `["match", …, "#fff"]`) — caught only by the colour rule
 * when the literal is a hex or a named colour, not by this rule. It reads source text.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");

/** CSS Color Module 3/4 named colours — a colour-bearing attribute's literal is "named" when it is
 *  one of these, lowercased. Not exhaustive of every CSS keyword (`transparent`, `currentColor`,
 *  `inherit` are deliberately left out: they carry no hue of their own to leak past a direction). */
const NAMED_COLOURS = [
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
];

/** The colour-bearing attributes/properties a directed composition may write a literal into. */
const COLOUR_KEYS = "(?:fill|stroke|color|backgroundColor|stopColor)";

/** MapLibre paint/layout properties a directed composition may not type a literal into — the
 *  kebab-case vocabulary the style JSON takes, not the camelCase one React props take. Every one
 *  here carries a size, width, offset, colour, opacity, font, spacing or max-width literal when
 *  typed; a key whose literal is an enum word instead (`text-anchor: "left"`, `text-justify`) is
 *  deliberately left out — that word is a placement choice, not a drawn style. */
const MAPLIBRE_KEYS =
  "(?:fill-color|fill-opacity|fill-outline-color|" +
  "line-color|line-width|line-opacity|" +
  "circle-color|circle-radius|circle-stroke-color|circle-stroke-width|circle-opacity|" +
  "text-color|text-halo-color|text-halo-width|text-size|text-font|text-letter-spacing|" +
  "text-offset|text-max-width|text-opacity)";

/** MapLibre expression operators — when an array's first element is one of these string literals,
 *  the array is a data-driven expression (`["interpolate", …]`), not a typed literal, and is exempt
 *  even though it opens on a string. */
const MAPLIBRE_EXPR_OPERATORS =
  "(?:interpolate|step|match|case|coalesce|get|literal|linear|exponential|feature-state|zoom|" +
  "\\*|\\+|-|/|min|max|to-color|rgb|rgba)";

const RULES: Array<[string, RegExp]> = [
  ["a typed font size", /fontSize\s*[:=]\s*\{?\s*(?:\d|["'`]\s*\d)/],
  [
    "a typed font weight",
    /fontWeight\s*[:=]\s*\{?\s*(?:\d|["'`]\s*[0-9a-zA-Z])/,
  ],
  ["a typed lead", /\blead\s*:\s*\d/],
  ["a typed line height", /lineHeight\s*[:=]\s*\{?\s*(?:\d|["'`]\s*\d)/],
  ["a typed tracking", /letterSpacing\s*[:=]\s*\{?\s*["'`]?-?\d*\.?\d*[1-9]/],
  ["a typed family", /(FONT_FAMILY|fontFamily)\s*[:=]\s*\{?\s*["'`][A-Za-z]/],
  ["a typed colour", /["'`]#[0-9a-fA-F]{3,8}["'`]/],
  ["a typed font style", /fontStyle\s*[:=]\s*\{?\s*["'`]/],
  ["a typed text transform", /\btextTransform\s*[:=]/],
  [
    "a named or functional colour",
    new RegExp(
      `\\b${COLOUR_KEYS}\\s*[:=]\\s*\\{?\\s*["'\`](?:rgba?\\(|hsla?\\(|#[0-9a-fA-F]{3,8}\\b|(?:${NAMED_COLOURS.join("|")})\\b)`,
      "i",
    ),
  ],
  [
    "a typed MapLibre property",
    new RegExp(
      `["'\`]${MAPLIBRE_KEYS}["'\`]\\s*:\\s*(?:-?\\d|["'\`]|\\[\\s*["'\`](?!${MAPLIBRE_EXPR_OPERATORS}["'\`]))`,
    ),
  ],
];

export function typedStylesIn(source: string): string[] {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return RULES.filter(([, re]) => re.test(code)).map(([name]) => name);
}

/** Every `.ts`/`.tsx` file in a directed video beat directory, except the ones that never carry
 *  drawn style: the timing contract, tests, and the two Remotion registration files. */
function directedVideos(): string[] {
  const proof = join(ROOT, "proof");
  const out: string[] = [];
  for (const dir of readdirSync(proof)) {
    const beat = join(proof, dir);
    if (!existsSync(join(beat, "render-directions-video.mjs"))) continue;
    for (const file of readdirSync(beat)) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      if (/^timing.*\.ts$/.test(file)) continue;
      if (/\.test\.ts$/.test(file)) continue;
      if (file === "Root.tsx" || file === "index.ts") continue;
      out.push(join(beat, file));
    }
  }
  return out;
}

describe("the scanner", () => {
  it("should find a typed size", () => {
    expect(typedStylesIn(`<text fontSize={38}>`)).toEqual([
      "a typed font size",
    ]);
  });
  it("should find a typed size quoted in a JSX attribute", () => {
    expect(typedStylesIn(`<text fontSize="38">`)).toEqual([
      "a typed font size",
    ]);
  });
  it("should find a typed lead in a token table", () => {
    expect(typedStylesIn(`const T = { lead: 48 };`)).toEqual(["a typed lead"]);
  });
  it("should find a typed colour", () => {
    expect(typedStylesIn(`fill="#aac9e0"`)).toEqual([
      "a typed colour",
      "a named or functional colour",
    ]);
  });
  it("should find a typed family", () => {
    expect(
      typedStylesIn(`export let FONT_FAMILY = "Open Sans, Helvetica";`),
    ).toEqual(["a typed family"]);
  });
  it("should find a typed family with a lowercase-led literal", () => {
    expect(typedStylesIn(`fontFamily="sans-serif"`)).toEqual([
      "a typed family",
    ]);
  });
  it("should find a typed font weight quoted as a digit", () => {
    expect(typedStylesIn(`fontWeight="700"`)).toEqual(["a typed font weight"]);
  });
  it("should find a typed font weight quoted as a keyword", () => {
    expect(typedStylesIn(`fontWeight: "bold"`)).toEqual([
      "a typed font weight",
    ]);
  });
  it("should find a typed tracking quoted with a unit", () => {
    expect(typedStylesIn(`letterSpacing="0.05em"`)).toEqual([
      "a typed tracking",
    ]);
  });
  it("should find a typed line height quoted", () => {
    expect(typedStylesIn(`lineHeight: "1.2"`)).toEqual(["a typed line height"]);
  });
  it("should find a typed font style, JSX form", () => {
    expect(typedStylesIn(`<text fontStyle="italic">`)).toEqual([
      "a typed font style",
    ]);
  });
  it("should find a typed font style, token form", () => {
    expect(typedStylesIn(`const T = { fontStyle: "italic" };`)).toEqual([
      "a typed font style",
    ]);
  });
  it("should not find a register-driven font style", () => {
    expect(typedStylesIn(`<text fontStyle={r.display.fontStyle}>`)).toEqual([]);
  });
  it("should find a typed text transform even when register-driven", () => {
    // CSS text-transform is forbidden outright in a directed video: case is applied to the string
    // in Bun with `applyCase`, so a composition never sets this CSS property at all, register or not.
    expect(
      typedStylesIn(`style={{ textTransform: r.display.transform }}`),
    ).toEqual(["a typed text transform"]);
  });
  it("should find a typed text transform written as a literal", () => {
    expect(typedStylesIn(`const s = { textTransform: "uppercase" };`)).toEqual([
      "a typed text transform",
    ]);
  });
  it("should find a named colour in a colour-bearing attribute", () => {
    expect(typedStylesIn(`<rect fill="steelblue" />`)).toEqual([
      "a named or functional colour",
    ]);
  });
  it("should find a functional colour in a colour-bearing property", () => {
    expect(typedStylesIn(`stroke: "rgba(10, 20, 30, 0.5)"`)).toEqual([
      "a named or functional colour",
    ]);
  });
  it("should not find a colour in a register-driven fill", () => {
    expect(typedStylesIn(`<rect fill={ink} />`)).toEqual([]);
  });
  it("should not flag a non-colour literal on a colour-bearing attribute", () => {
    expect(typedStylesIn(`<rect fill="url(#grad)" />`)).toEqual([]);
  });
  it("should find a typed MapLibre paint property", () => {
    expect(typedStylesIn(`"fill-color": "#aac9e0",`)).toEqual([
      "a typed colour",
      "a typed MapLibre property",
    ]);
  });
  it("should find a typed MapLibre layout property carrying a number", () => {
    expect(typedStylesIn(`"text-size": 14,`)).toEqual([
      "a typed MapLibre property",
    ]);
  });
  it("should find a typed MapLibre text-font array", () => {
    expect(typedStylesIn(`"text-font": ["Open Sans Bold"],`)).toEqual([
      "a typed MapLibre property",
    ]);
  });
  it("should not find a MapLibre property fed from a register", () => {
    expect(typedStylesIn(`"text-size": r.axis.fontSize,`)).toEqual([]);
  });
  it("should accept a composition that draws from its registers", () => {
    const source = `<text fontSize={r.display.fontSize} fontWeight={r.display.fontWeight} fill={ink}
      letterSpacing={0} fontFamily={r.display.fontFamily} y={top + r.display.lead}>`;
    expect(typedStylesIn(source)).toEqual([]);
  });
  it("should accept a multiplied register — still register-driven", () => {
    expect(typedStylesIn(`fontSize={r.display.fontSize * scale}`)).toEqual([]);
  });
  it("should not read a size written in a comment", () => {
    expect(
      typedStylesIn(
        `// it used to say fontSize: 38\n<text fontSize={r.body.fontSize}>`,
      ),
    ).toEqual([]);
  });
  it("should accept a MapLibre font array built from a register", () => {
    expect(typedStylesIn(`"text-font": [maptilerFace(r.axis)],`)).toEqual([]);
  });
  it("should accept a MapLibre expression array — the pilot's own fill-color case", () => {
    expect(
      typedStylesIn(
        `"fill-color": ["case", ["has", "value"], ["get", "fill"], ["get", "missing"]],`,
      ),
    ).toEqual([]);
  });
  it("should find a typed MapLibre text-max-width literal", () => {
    expect(typedStylesIn(`"text-max-width": 100,`)).toEqual([
      "a typed MapLibre property",
    ]);
  });
  it("should find a typed MapLibre line-color literal", () => {
    expect(typedStylesIn(`"line-color": "#123456",`)).toEqual([
      "a typed colour",
      "a typed MapLibre property",
    ]);
  });
  it("should not find a register-driven MapLibre text-halo-width", () => {
    expect(typedStylesIn(`"text-halo-width": r.axis.stroke,`)).toEqual([]);
  });
  it("should still find a MapLibre font array with a literal face", () => {
    expect(typedStylesIn(`"text-font": ["Open Sans Bold"],`)).toEqual([
      "a typed MapLibre property",
    ]);
  });
  it("should still find a MapLibre property with a literal number", () => {
    expect(typedStylesIn(`"text-size": 14,`)).toEqual([
      "a typed MapLibre property",
    ]);
  });
});

describe("every directed video in the tree", () => {
  for (const path of directedVideos()) {
    it(`${path.slice(ROOT.length + 1)} should type no style`, () => {
      expect(typedStylesIn(readFileSync(path, "utf8"))).toEqual([]);
    });
  }
});
