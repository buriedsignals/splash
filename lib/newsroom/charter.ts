// charter.ts — reading a newsroom's own website and MEASURING the house style it already
// publishes: the brand colour, the page ground, the typefaces.
//
// Why this exists: a newsroom profile only helps a newsroom that can fill one in, and
// NEWSROOM-PROFILE.md asks for `#rrggbb`. A journalist is not a designer and does not know the
// newsroom's hex. The site does — it has been serving it to readers for years.
//
// The discipline, and the reason nothing here writes a file: what this module produces is a
// MEASUREMENT, never a decision. Every value carries WHERE it was read ("the colour the site
// declares as its theme", "the colour of the links in an article"), because the journalist has
// to be able to disagree with it. Turning a measurement into a house colour is the journalist's
// act, performed on a gate, and it happens through a different entry point that never sees this
// proposal (skills/splash/scripts/propose-charter.mjs — `read` and `write` are separate
// subcommands, so the extractor structurally CANNOT write a profile).
//
// The method is DECLARATION-based, not pixel-based. "The most frequent colour" on any news site
// is white, then black, then a grey; the colour a reader would name is the one the site's own
// authors labelled — `<meta name="theme-color">`, a `--brand` custom property, the link colour,
// the fill of the masthead SVG. So each signal is weighted by how deliberately it was declared,
// neutrals are excluded from the brand ranking (they are read separately, as the GROUND), and a
// site that declares nothing yields NOTHING rather than a fabricated hue.
//
// Pure and total: no I/O, and no exported function throws (a malformed stylesheet is a thing the
// web is full of, and it must degrade to "I found less", never to a crash).

import { relativeLuminance } from "../core/contrast";

// ── Tuning knobs (each = one number) ──

/** Below this HSL saturation a colour is a neutral: a grey, never a brand hue. */
export const NEUTRAL_SATURATION = 0.18;
/** Above this HSL lightness a colour is a near-white — the paper, not the ink. */
export const NEUTRAL_LIGHTNESS_MAX = 0.94;
/** Below this HSL lightness a colour is a near-black — body text or UI chrome, not a brand hue. */
export const NEUTRAL_LIGHTNESS_MIN = 0.09;
/**
 * The most a colour can earn from merely being FREQUENT.
 *
 * It must stay UNDER the smallest gap between two adjacent signal weights, or frequency stops
 * being a tiebreak and becomes an argument again. The first cut used 40 — larger than every gap
 * in the top four (100/90/85/75) — so a link colour repeated 60 times scored 105 and beat
 * `<meta theme-color>` at 102, silently dropping a `declared` reading to `inferred`. Sixty
 * `a{color:…}` rules is an ordinary newsroom stylesheet, so this was reachable, not theoretical.
 * The ORDERING no longer depends on this number at all (see `rank`); the cap keeps the printed
 * score honest too.
 */
export const FREQUENCY_BONUS_CAP = 4;
/** Occurrences at which the frequency bonus reaches half its cap. */
export const FREQUENCY_HALF = 20;
/**
 * A candidate below this score is not proposed at all.
 *
 * `WEIGHT.control` is the floor because everything under it comes from UNLABELLED stylesheet
 * declarations — "the first saturated hex in the bundle", which is not evidence of anything.
 * Live proof: bbc.com yields `#e00000` at score 13 from three hashed Emotion classes, with no
 * theme-color, no `--brand` and no masthead anywhere. The honest answer there is to ask the
 * question, not to head a ranked list with a colour picked out of a bundle.
 */
export const MIN_CANDIDATE_SCORE = 55;
/** Evidence kept per candidate. Bounds both the ranking cost and what is printed. */
export const EVIDENCE_CAP = 12;
/**
 * How far after a `logo`/`masthead` attribute the SVG is still believed to be the masthead.
 * Was 4000, which reached a share icon 2.6 kB down the page — see `mastheadColours`.
 */
export const MASTHEAD_WINDOW = 1200;
/** Euclidean RGB distance under which two declared colours are the SAME house colour. */
export const MERGE_DISTANCE = 12;
/** Relative luminance under which the page ground counts as dark. */
export const DARK_GROUND_LUMINANCE = 0.2;
/** How many ranked candidates the proposal carries. */
export const CANDIDATE_CAP = 5;

// ── Shapes ──

/** Which kind of declaration a colour was read from. Ordered loosely by deliberateness. */
export type ColourSignal =
  | "theme-color" // <meta name="theme-color">
  | "brand-property" // --brand / --primary custom property
  // NOTE: `accent-property` is an INPUT signal (a site's `--accent` custom property, scored below
  // the link colour), not the removed output field. The house charter stopped OFFERING an accent
  // on 2026-07-29 — nothing in the product rendered it — but a site that declares one is still
  // evidence about its palette.
  | "accent-property" // --accent custom property: a UI accent, not necessarily the masthead
  | "masthead" // fill/stroke of the logo or masthead SVG
  | "link" // the colour of a link
  | "control" // a button / CTA / tag background
  // A colour NOBODY named, but that repeats across the closed set of brand-carrying properties
  // (see RECURRENT_ROLE_PROPERTIES) — a compiled stylesheet's answer to "the button fills, the
  // banner backgrounds, the accented borders", when the class names themselves are hashed and
  // unreadable. Never a `declared` signal (DECLARED_SIGNALS excludes it): repetition is not a
  // site's own say-so, and the journalist is told so on screen.
  | "recurrent-role"
  | "declared"; // any other colour declared in the stylesheet

/** One reading, with where it came from. This is the unit the journalist is shown. */
export type Measurement = {
  /** #rrggbb, lowercase. */
  value: string;
  signal: ColourSignal;
  /** The literal snippet it was read from — the receipt (`--brand: #c8102e`). */
  token: string;
  /**
   * WHERE the text carrying `token` was read: the page itself, or the exact href of the
   * stylesheet it came from. This is what actually distinguishes the newsroom's own declaration
   * from a third party's — not the hostname `stylesheetHrefs` no longer filters on
   * (lib/newsroom/charter-fetch.ts). A `--brand` declared inside an analytics widget's sheet is
   * still read (it may be exactly the typography being looked for), but it carries that widget's
   * URL here, not the newsroom's, so it stays distinguishable rather than passing for the site's
   * own say-so.
   */
  source: string;
};

export type ColourCandidate = {
  /** #rrggbb, lowercase — the best-declared representative of this colour. */
  value: string;
  score: number;
  /** How many times this colour (or one within MERGE_DISTANCE of it) was read. */
  count: number;
  /** Where it was read — capped at EVIDENCE_CAP, so this is a sample, not the whole tally. */
  evidence: Measurement[];
};

export type TypeMeasurement = {
  /** The family as declared, quotes stripped (`Publico Text`). */
  family: string;
  role: "body" | "headings" | "webfont";
  token: string;
  /**
   * WHERE this family was read — the stylesheet's URL, or the page itself for an inline style.
   * The same duty `Measurement.source` carries for colour, and for the same reason: since the
   * same-host filter was lifted, a font family can come from any sheet the page links, and a
   * third-party sheet is precisely where a webfont often lives. Without this, a family read from
   * an unrelated CDN is indistinguishable from the newsroom's own.
   */
  source: string;
};

/**
 * How much the top candidate is worth, stated so the skill can relay it honestly:
 * - `declared` — the site NAMES a brand colour (theme-color, a --brand property, the masthead).
 * - `inferred` — no such declaration; the hue comes from links/controls/frequency. Say so.
 * - `none` — the site declares no non-neutral colour at all. Refuse, and ask the question.
 */
export type CharterConfidence = "declared" | "inferred" | "none";

export type CharterProposal = {
  url?: string;
  /** Ranked brand candidates, best first. EMPTY means the site answers nothing. */
  candidates: ColourCandidate[];
  /** The page ground, when the site declares a non-white one (drives `theme:`). */
  ground?: Measurement & { dark: boolean };
  typography: TypeMeasurement[];
  confidence: CharterConfidence;
  /** Honest caveats about THIS extraction, for the skill to read out verbatim. */
  notes: string[];
};

export type SiteSources = {
  url?: string;
  html: string;
  sheets: { href: string; css: string }[];
};

// ── Colour parsing ──

type Rgb = { r: number; g: number; b: number };

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHex({ r, g, b }: Rgb): string {
  return (
    "#" +
    [r, g, b].map((c) => clamp255(c).toString(16).padStart(2, "0")).join("")
  );
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hh = (((h % 360) + 360) % 360) / 360;
  if (s <= 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const at = (t: number): number => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return {
    r: at(hh + 1 / 3) * 255,
    g: at(hh) * 255,
    b: at(hh - 1 / 3) * 255,
  };
}

/**
 * OKLCH → sRGB: OKLCH polar → OKLab cartesian, then Björn Ottosson's OKLab↔linear-sRGB matrix,
 * then the standard sRGB gamma encode. That matrix is the algebraic composition of the two-step
 * OKLab→XYZ→linear-sRGB path published as the CSS Color 4 spec's own sample code
 * (https://drafts.csswg.org/css-color-4/conversions.js, functions `OKLab_to_XYZ` +
 * `XYZ_to_lin_sRGB`) — the two paths were computed independently and checked to agree, which is
 * how the constants below were verified rather than merely remembered. Gamut clamp happens where
 * every other notation here clamps: `toHex`'s `clamp255`, at the very end.
 */
function oklchToRgb(l: number, c: number, hDeg: number): Rgb {
  const hRad = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const ll = l_ ** 3;
  const mm = m_ ** 3;
  const ss = s_ ** 3;
  const rLin = 4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss;
  const gLin = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss;
  const bLin = -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss;
  const gamma = (v: number): number => {
    const sign = v < 0 ? -1 : 1;
    const av = Math.abs(v);
    const enc = av <= 0.0031308 ? 12.92 * av : 1.055 * av ** (1 / 2.4) - 0.055;
    return sign * enc;
  };
  return { r: gamma(rLin) * 255, g: gamma(gLin) * 255, b: gamma(bLin) * 255 };
}

/**
 * `oklch(L C H)` / `oklch(L C H / A)` — the body between the parens, already lowercase-trimmed.
 * L accepts a percentage or the unit-interval CSS also allows (`97.98%` and `0.9798` are the same
 * lightness); C accepts a bare number or a percentage (100% = 0.4, the CSS Color 4 reference
 * range); H is degrees, bare or with a `deg` suffix — the two forms the committed fixtures and the
 * spec both use. Returns null, never throws, on anything else — same discipline as `rgb()`/`hsl()`.
 */
function parseOklch(inner: string): Rgb | null {
  const parts = inner
    .replace(/\//g, " ")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 3) return null;
  const num = (s: string, pctOf: number): number | null => {
    const m = /^(-?[\d.]+)(%?)$/.exec(s);
    if (!m) return null;
    const v = Number(m[1]);
    if (!Number.isFinite(v)) return null;
    return m[2] === "%" ? (v / 100) * pctOf : v;
  };
  if (parts.length >= 4) {
    const a = num(parts[3]!, 1);
    if (a !== null && a <= 0) return null;
  }
  const l = num(parts[0]!, 1);
  const c = num(parts[1]!, 0.4);
  const hm = /^(-?[\d.]+)(deg)?$/i.exec(parts[2]!);
  if (l === null || c === null || !hm) return null;
  const h = Number(hm[1]);
  if (!Number.isFinite(h)) return null;
  return oklchToRgb(Math.max(0, Math.min(1, l)), Math.max(0, c), h);
}

/**
 * Parse ONE CSS colour token to #rrggbb. Understands `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`,
 * `rgba()`, `hsl()`, `hsla()` in both comma and space syntax, and `oklch()` (see `parseOklch`).
 *
 * Deliberately does NOT understand `oklab()`, `lab()`, `lch()`, `color()` or `color-mix()`:
 * converting those correctly is real colour science, and a wrong conversion here becomes a wrong
 * house colour on every chart the newsroom ever publishes. An unparsed notation is reported as a
 * gap (`notes`), never approximated. Named colours are likewise skipped — `red` on a news site is
 * almost always a browser default or an error state, not a masthead.
 *
 * Fully transparent values return null: `rgba(0,0,0,0)` is a spacer, not a colour.
 * Returns null for anything it cannot read. Never throws.
 */
export function parseCssColour(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(t);
  if (hex) {
    const d = hex[1]!;
    if (d.length === 3 || d.length === 4) {
      if (d.length === 4 && d[3] === "0") return null;
      return `#${d[0]}${d[0]}${d[1]}${d[1]}${d[2]}${d[2]}`;
    }
    if (d.length === 6) return `#${d}`;
    if (d.length === 8) {
      if (d.slice(6) === "00") return null;
      return `#${d.slice(0, 6)}`;
    }
    return null;
  }
  const oklch = /^oklch\(([^)]*)\)$/.exec(t);
  if (oklch) {
    const rgb = parseOklch(oklch[1]!);
    return rgb ? toHex(rgb) : null;
  }
  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(t);
  if (!fn) return null;
  const parts = fn[2]!
    .replace(/\//g, " ")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 3) return null;
  const num = (s: string, pctOf: number): number | null => {
    const m = /^(-?[\d.]+)(%?)$/.exec(s);
    if (!m) return null;
    const v = Number(m[1]);
    if (!Number.isFinite(v)) return null;
    return m[2] === "%" ? (v / 100) * pctOf : v;
  };
  // Alpha, when present, is the 4th component in both syntaxes.
  if (parts.length >= 4) {
    const a = num(parts[3]!, 1);
    if (a !== null && a <= 0) return null;
  }
  if (fn[1]!.startsWith("rgb")) {
    const r = num(parts[0]!, 255);
    const g = num(parts[1]!, 255);
    const b = num(parts[2]!, 255);
    if (r === null || g === null || b === null) return null;
    return toHex({ r, g, b });
  }
  const h = num(parts[0]!, 360);
  const s = num(parts[1]!, 1);
  const l = num(parts[2]!, 1);
  if (h === null || s === null || l === null) return null;
  return toHex(
    hslToRgb(h, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, l))),
  );
}

/** Below this alpha a declared colour is a wash over something else, not that something. */
export const GROUND_MIN_ALPHA = 0.9;

/**
 * The alpha of a CSS colour token, 1 when it declares none. Kept separate from
 * `parseCssColour` (which returns the opaque hex) because alpha only changes ONE ruling —
 * whether a colour can be read as the page's ground — and folding it into the parse would
 * discard legitimately translucent brand marks.
 */
export function alphaOf(raw: string): number {
  const t = raw.trim().toLowerCase();
  const hex = /^#([0-9a-f]{4}|[0-9a-f]{8})$/.exec(t);
  if (hex) {
    const d = hex[1]!;
    const a = d.length === 4 ? d[3]! + d[3]! : d.slice(6);
    return parseInt(a, 16) / 255;
  }
  const fn = /^(?:rgba?|hsla?|oklch)\(([^)]*)\)$/.exec(t);
  if (!fn) return 1;
  const parts = fn[1]!
    .replace(/\//g, " ")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 4) return 1;
  const m = /^(-?[\d.]+)(%?)$/.exec(parts[3]!);
  if (!m) return 1;
  const v = Number(m[1]);
  if (!Number.isFinite(v)) return 1;
  return m[2] === "%" ? v / 100 : v;
}

function rgbOf(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** HSL saturation + lightness of a #rrggbb colour, for the neutral test. Never throws. */
export function saturationLightness(hex: string): {
  s: number;
  l: number;
  h: number;
} {
  const { r, g, b } = rgbOf(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { s: 0, l, h: 0 };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h = h * 60;
  if (h < 0) h += 360;
  return { s, l, h };
}

/**
 * Is this a neutral — a grey, a near-white, a near-black? Neutrals are excluded from the BRAND
 * ranking (they are the paper and the ink, not the house colour) but read separately as the
 * ground. This single predicate is what stops the extractor from proposing `#ffffff` as a
 * newsroom's brand colour, which frequency-counting would do on every site on the web.
 */
export function isNeutral(hex: string): boolean {
  const { s, l } = saturationLightness(hex);
  return (
    s < NEUTRAL_SATURATION ||
    l > NEUTRAL_LIGHTNESS_MAX ||
    l < NEUTRAL_LIGHTNESS_MIN
  );
}

function distance(a: string, b: string): number {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b);
}

// ── CSS scanning ──

type CssRule = { selector: string; decls: string };

/** Strip `/* … *\/` comments. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, " ");
}

/**
 * Remove `@media (prefers-color-scheme: dark) { … }` blocks, brace-matched.
 *
 * A site that ships a dark-mode variant declares a near-black ground inside one of these. Read
 * naively, that block makes every light newsroom look dark-themed — and `theme:` is the one
 * profile field a wrong reading makes VISIBLE on every chart. The site's default is what the
 * reader sees, so only the default is measured.
 */
function stripDarkSchemeBlocks(css: string): string {
  let out = "";
  let i = 0;
  const re = /@media[^{]*prefers-color-scheme\s*:\s*dark[^{]*\{/gi;
  for (;;) {
    re.lastIndex = i;
    const m = re.exec(css);
    if (!m) {
      out += css.slice(i);
      return out;
    }
    out += css.slice(i, m.index);
    let depth = 1;
    let j = m.index + m[0].length;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    i = j;
  }
}

/**
 * Every declaration block in a stylesheet, descending into at-rules (`@media`, `@supports`,
 * `@layer`) so a rule nested in a breakpoint is still read. Bounded by construction — it walks
 * the string once. Never throws on unbalanced braces; it simply stops.
 */
export function cssRules(css: string): CssRule[] {
  const out: CssRule[] = [];
  const walk = (text: string, depth: number): void => {
    if (depth > 6) return;
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open < 0) return;
      const selector = text.slice(i, open).trim();
      let d = 1;
      let j = open + 1;
      while (j < text.length && d > 0) {
        if (text[j] === "{") d++;
        else if (text[j] === "}") d--;
        j++;
      }
      const body = text.slice(open + 1, d === 0 ? j - 1 : text.length);
      if (selector.startsWith("@") && body.includes("{")) walk(body, depth + 1);
      else out.push({ selector, decls: body });
      i = j;
    }
  };
  walk(css, 0);
  return out;
}

/** `prop: value` pairs of a declaration block, in order. */
function declarations(decls: string): { prop: string; value: string }[] {
  const out: { prop: string; value: string }[] = [];
  for (const chunk of decls.split(";")) {
    const c = chunk.indexOf(":");
    if (c <= 0) continue;
    const prop = chunk.slice(0, c).trim().toLowerCase();
    const value = chunk.slice(c + 1).trim();
    if (prop && value) out.push({ prop, value });
  }
  return out;
}

/** The colour tokens inside a declaration value (a shorthand can carry several). */
function colourTokens(value: string): string[] {
  const out: string[] = [];
  const re = /(#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch)\([^)]*\))/g;
  for (const m of value.matchAll(re)) out.push(m[1]!);
  return out;
}

/**
 * What each signal MEANS, in the words the journalist is shown.
 *
 * It lives here, next to the enum and typed `Record<ColourSignal, string>`, so that adding a
 * signal without adding its label is a COMPILE ERROR. It used to live in the CLI as an untyped
 * object literal, and the predictable happened the moment a signal was split out: `--accent`
 * became its own signal, the table was not updated, and a site whose only readable colour was an
 * `--accent` printed `from undefined` in its evidence line. This capability's entire argument is
 * that the journalist can AUDIT what he is shown; `from undefined` is the one place a hole must
 * not appear, and "remember to update the other file" is not a mechanism.
 */
export const SIGNAL_LABEL: Record<ColourSignal, string> = {
  "theme-color":
    "the colour the site declares to browsers as its own (<meta theme-color>)",
  "brand-property":
    "a colour the site's stylesheet NAMES as its brand/primary colour",
  "accent-property":
    "a colour the stylesheet names as an ACCENT (often a hover or a badge, not the masthead)",
  masthead: "the fill of an SVG inside the masthead/logo element",
  link: "the colour of the links",
  control: "the background of the buttons",
  "recurrent-role":
    "a colour repeated across several button/banner/border declarations, though nothing names it as the brand",
  declared: "a colour declared somewhere in the stylesheet",
};

// ── Signal weights ──
//
// The ordering IS the method: a colour the site's own authors LABELLED as the brand outranks a
// colour that merely appears often. Every number is a knob.
//
// Exported: `rank()` below reassigns a candidate's representative value to the evidence entry
// with the highest weight (see the merge loop), and any caller that wants to explain WHICH
// evidence backs that value has to apply the identical rule — duplicating the table beside it
// would drift the moment a weight changes here. One source.
export const WEIGHT: Record<ColourSignal, number> = {
  "theme-color": 100,
  "brand-property": 90,
  masthead: 85,
  link: 75,
  // `--accent` is usually a UI accent — a hover, a badge — not the masthead colour. It is a real
  // declaration, so it outranks an unlabelled one, but it does not outrank the link colour and it
  // does not license `declared` confidence.
  "accent-property": 70,
  /**
   * Strictly between `control` (55, the proposal floor) and `accent-property` (70). It must clear
   * MIN_CANDIDATE_SCORE — repetition on a closed set of brand-carrying properties is real
   * evidence, the whole reason this signal exists — but it must sit under EVERY declared signal,
   * `control` included: a colour a site's own markup labels a button with (`.btn{…}`) is still a
   * more deliberate act than a colour that merely turns up on several buttons/banners/borders
   * with no such label anywhere. 60 is the midpoint of the (55, 70) gap this signal is
   * constrained to, not tuned to any one site's numbers.
   */
  "recurrent-role": 60,
  control: 55,
  declared: 8,
};
/** The smallest gap between two adjacent weights above. The frequency bonus must stay under it. */
const SMALLEST_SIGNAL_GAP = 5;

// A custom property counts as a BRAND declaration only when the brand word is what the property
// is ABOUT — its first meaningful segment, after at most one namespace prefix.
//
// The first cut allowed the word anywhere in the name, and a live read of the Guardian showed
// what that costs: `--article-link-border-hover` and `--key-event-button-hover` were both
// reported as "the site NAMES this as its brand colour", which raised the extraction's stated
// confidence from `inferred` to `declared` on a value that is neither. Overclaiming confidence is
// worse than finding nothing — it is the one thing the journalist cannot check.
const BRAND_PROPERTY =
  /^--(?:(?:color|colour|c|clr|ds|site|global|theme|token)-)?(?:brand|primary|main|highlight)(?:-(?:colou?r|hue|bg|background|base|default|dark|light|hover|[0-9]{1,3}))?$/;
/** `--accent` and friends, scored below the link colour — see WEIGHT. */
const ACCENT_PROPERTY =
  /^--(?:(?:color|colour|c|clr|ds|site|global|theme|token)-)?accent(?:-(?:colou?r|hue|bg|background|base|default|dark|light|hover|[0-9]{1,3}))?$/;
/** The link colour as a NAMED property (`--link`, `--color-link`), not any name containing "link". */
const LINK_PROPERTY =
  /^--(?:(?:color|colour|c|clr|ds|site|global|theme|token)-)?link(?:-colou?r)?$/;
const CONTROL_SELECTOR =
  /(^|[\s.#[])(?:btn|button|cta|badge|tag|pill|chip|submit)/i;
const MASTHEAD_SELECTOR = /(logo|masthead|brand|wordmark|site-?title)/i;
const LINK_SELECTOR = /(^|[\s,>+~])a(?![\w-])/;
const COLOUR_PROP =
  /^(?:color|background(?:-color)?|border(?:-[a-z]+)?-color|fill|stroke|outline-color|text-decoration-color)$/;
/**
 * The CLOSED set of properties `recurrent-role` counts. Each one paints a filled area or a drawn
 * edge — a button fill, a banner background, an accented border, a masthead SVG's fill/stroke —
 * which is the surface a brand colour actually occupies. `color` (running body text) and
 * `outline-color`/`text-decoration-color` are deliberately left out even though `COLOUR_PROP`
 * reads them too: prose repeats far more than any brand hue does, and a focus ring is a state
 * indicator, not a house colour, so counting either would manufacture "evidence" out of noise
 * that has nothing to do with the brand.
 */
const RECURRENT_ROLE_PROPERTIES = new Set([
  "background",
  "background-color",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "fill",
  "stroke",
]);
/**
 * How many separate declarations must repeat a colour, on RECURRENT_ROLE_PROPERTIES, before the
 * repetition itself counts as evidence.
 *
 * Three, not two — because two is already pinned as NOT evidence, by a regression test this
 * signal must not quietly overturn ("regression — the score floor" in charter.test.ts): bbc.com
 * repeats `#e00000` across exactly two brand-carrying declarations (`background-color` on one
 * hashed Emotion class, `border-top-color` on another), and the project's own conclusion about
 * that live reading is "not evidence of anything… ask the question". Two independent
 * declarations is indistinguishable from two components coincidentally sharing an "error red";
 * three is the point past which coincidence stops being the simpler explanation. This number is
 * not fit to any one captured site — see charter-fixtures.test.ts for what it actually turns up,
 * including a case (heidi.news) where nothing clears it at all.
 */
const RECURRENT_ROLE_MIN_COUNT = 3;
const GROUND_SELECTOR = /^(?::root|html|body|\*)$/;
// Same tightening as BRAND_PROPERTY, and for a sharper reason: `theme:` is the profile field a
// wrong reading makes visible on EVERY visual. The loose first cut matched Le Monde's
// `--ds-color-storm-border-on-background-trs-faible-na` — a 10%-alpha BORDER — and reported the
// paper as a black-ground newsroom.
const GROUND_PROPERTY =
  /^--(?:(?:color|colour|c|clr|ds|site|global|theme|token)-)?(?:bg|background|page-?bg|body-?bg|surface|paper)(?:-(?:colou?r|default|base|primary|main))?$/;
/**
 * Selectors that scope a rule to a NON-default theme variant — `[data-color-mode=dark]`,
 * `.dark`, `[data-theme=dark]`. The media-query twin is stripped earlier; this is the same
 * defence for the sites that switch theme by attribute instead, which is what Le Monde does and
 * what made every one of its top candidates a dark-mode value.
 */
const VARIANT_SELECTOR =
  /(?:\[data-(?:[a-z-]*-)?(?:theme|color-?mode|scheme|bs-theme)\s*[~|^$*]?=\s*["']?(?:dark|light)["']?\]|(?:^|[\s,>+~])(?:html|body)?\.(?:dark|light)(?:-mode|-theme)?(?![\w-]))/i;

// ── HTML scanning ──

/**
 * `<meta name="theme-color" content="#…">` — the strongest declaration a site can make. Read
 * from the page itself, so its `source` is filled in by the caller (always the page's own URL,
 * never a stylesheet's) — see `Measurement.source`.
 */
function themeColorMeta(html: string): Omit<Measurement, "source"> | null {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/name\s*=\s*["']?theme-color["']?/i.test(tag)) continue;
    // A `media="(prefers-color-scheme: dark)"` variant is the dark twin, not the default.
    if (/prefers-color-scheme\s*:\s*dark/i.test(tag)) continue;
    const c = /content\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!c) continue;
    const hex = parseCssColour(c[1]!);
    if (hex) return { value: hex, signal: "theme-color", token: tag.trim() };
  }
  return null;
}

/**
 * The masthead: fills and strokes of SVG inside an element whose markup names it as the logo.
 *
 * A crude window (the 4000 characters after a `logo`/`masthead`/`brand` attribute) rather than a
 * DOM walk, because this module takes no HTML-parsing dependency. It over-reads — a colour in
 * the header next to the logo can land here — which is exactly why the measurement is shown to
 * the journalist with its receipt instead of being applied. Read from the page itself, like
 * `themeColorMeta` — `source` is filled in by the caller.
 */
function mastheadColours(html: string): Omit<Measurement, "source">[] {
  const out: Omit<Measurement, "source">[] = [];
  const anchors =
    /(class|id)\s*=\s*["'][^"']*(?:logo|masthead|wordmark|site-?title|brand)[^"']*["']/gi;
  for (const a of html.matchAll(anchors)) {
    const start = a.index ?? 0;
    const window = html.slice(start, start + MASTHEAD_WINDOW);
    // The window must contain an actual `<svg`, and only what is INSIDE that element is read.
    // The first cut credited any `fill=` within 4000 characters of a `logo` attribute — so a page
    // whose logo is an <img> and whose SHARE ICON sits 2.6 kB later reported the share icon's
    // purple as "the fill of the masthead/logo artwork", at `declared` confidence. That is the
    // same defect as the loose brand-property regex, and the same rule condemns it: overclaiming
    // confidence is worse than finding nothing, because the journalist cannot check it.
    const svgAt = window.search(/<svg[\s>]/i);
    if (svgAt < 0) continue;
    const close = window.toLowerCase().indexOf("</svg>", svgAt);
    const svg = window.slice(svgAt, close < 0 ? window.length : close + 6);
    for (const f of svg.matchAll(
      /(?:fill|stroke)\s*[:=]\s*["']?(#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?)\([^)]*\))/gi,
    )) {
      const hex = parseCssColour(f[1]!);
      // The receipt carries the ANCHOR — `class="site-logo"` — not a bare `fill="#…"`. A receipt
      // that does not say which element it came from is not a receipt the journalist can audit.
      if (hex)
        out.push({
          value: hex,
          signal: "masthead",
          token: `${a[0].trim()} … <svg> ${f[0].trim()}`,
        });
    }
  }
  return out;
}

/** Inline `<style>` blocks — where a JS framework often puts the critical brand CSS. */
function inlineStyles(html: string): string {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1]!)
    .join("\n");
}

// ── The extraction ──

type Raw = {
  measurements: Measurement[];
  ground?: Measurement;
  type: TypeMeasurement[];
  unparsed: Set<string>;
};

/**
 * @param source WHERE `css` was read from — the page's own URL for an inline `<style>` block, or
 * the exact href of the linked stylesheet. Threaded onto every `Measurement` this produces, so a
 * reading from a third-party sheet stays distinguishable from the newsroom's own (see
 * `Measurement.source`) — a hostname is no longer the guard, this is.
 */
function scanCss(css: string, raw: Raw, source: string): void {
  for (const rule of cssRules(stripDarkSchemeBlocks(stripComments(css)))) {
    const sel = rule.selector;
    // A rule scoped to a theme VARIANT is not what a reader sees by default. Skipping it whole
    // is right for the ground AND for the brand ranking: a dark-mode palette is a second set of
    // values for the same brand, and counting both doubles the noise.
    if (VARIANT_SELECTOR.test(sel)) continue;
    const isControl = CONTROL_SELECTOR.test(sel);
    const isMasthead = MASTHEAD_SELECTOR.test(sel);
    const isLink = LINK_SELECTOR.test(sel);
    const isGround = sel.split(",").some((s) => GROUND_SELECTOR.test(s.trim()));
    for (const { prop, value } of declarations(rule.decls)) {
      // `oklch` is deliberately absent from this list — the absolute form is read (see
      // `parseOklch`), so a value expressed in it is no longer a gap. The forms it does NOT read
      // are reported where they actually fail, token by token, in the parse loop below — a blanket
      // entry here would report a site that declares a perfectly readable oklch() as a gap.
      // `oklab`/`lab`/`lch`/`color()`/`color-mix()` remain unread whatever their form, and a value
      // that only ever appears in one of THOSE is still reported as missed.
      if (/\b(?:oklab|lab|lch|color-mix|color)\(/.test(value))
        raw.unparsed.add(
          /\b(oklab|lab|lch|color-mix|color)\(/.exec(value)![1]!,
        );
      if (prop === "font-family") {
        const family = firstFamily(value);
        if (family) {
          const role = /^(?:body|html|:root|\*)$/.test(sel.trim())
            ? "body"
            : /(^|[\s,>+~.#])h[1-3](?![\w-])|headline|title|masthead/i.test(sel)
              ? "headings"
              : null;
          if (role)
            raw.type.push({
              family,
              role,
              token: `${sel} { font-family: ${value.trim()} }`,
              source,
            });
        }
        continue;
      }
      if (sel.trim() === "@font-face" || /@font-face/.test(sel)) continue;
      const tokens = colourTokens(value);
      if (tokens.length === 0) continue;
      const custom = prop.startsWith("--");
      if (!custom && !COLOUR_PROP.test(prop)) continue;
      for (const tok of tokens) {
        const hex = parseCssColour(tok);
        if (!hex) {
          // An `oklch()` this parser could not read is a GAP, and has to be reported as one —
          // the module's own invariant ("an unparsed notation is reported as a gap, never
          // approximated"). Dropping `oklch` from the list above was right for the absolute form
          // that IS read now, and wrong for the forms that are not: relative-colour syntax
          // (`oklch(from var(--base) l c h)`) and a hue in `turn`/`rad` both still fail here, and
          // without this they vanished silently. A fully transparent colour is excluded: that is
          // a deliberate skip (a spacer), not a notation this parser failed on.
          if (/^oklch\(/i.test(tok.trim()) && alphaOf(tok) > 0)
            raw.unparsed.add("oklch");
          continue;
        }
        const token = `${sel.length > 60 ? sel.slice(0, 57) + "…" : sel} { ${prop}: ${tok} }`;
        // GROUND first: a near-white/near-black on :root or body is the page, not a brand hue.
        if (
          (isGround &&
            (prop === "background" || prop === "background-color")) ||
          (custom && GROUND_PROPERTY.test(prop))
        ) {
          // A wash is not the ground. `rgba(0,0,0,.1)` is a hairline border over whatever is
          // behind it; taken at face value it turns a white newsroom black — which is exactly
          // what a live read of Le Monde produced before this guard.
          //
          // The LAST declaration wins, because that is what CSS does. The first cut locked in
          // whichever was scanned first, so `body{background:#0b0b0b} body{background:#fff}`
          // reported a dark ground — and inline <style> is scanned before the linked sheets that
          // normally override it.
          if (alphaOf(tok) >= GROUND_MIN_ALPHA)
            raw.ground = { value: hex, signal: "declared", token, source };
          continue;
        }
        if (custom) {
          if (BRAND_PROPERTY.test(prop))
            raw.measurements.push({
              value: hex,
              signal: "brand-property",
              token,
              source,
            });
          else if (ACCENT_PROPERTY.test(prop))
            raw.measurements.push({
              value: hex,
              signal: "accent-property",
              token,
              source,
            });
          else if (LINK_PROPERTY.test(prop))
            raw.measurements.push({
              value: hex,
              signal: "link",
              token,
              source,
            });
          else
            raw.measurements.push({
              value: hex,
              signal: "declared",
              token,
              source,
            });
          continue;
        }
        const signal: ColourSignal = isMasthead
          ? "masthead"
          : isLink && prop === "color"
            ? "link"
            : isControl
              ? "control"
              : "declared";
        raw.measurements.push({ value: hex, signal, token, source });
      }
    }
  }
  // @font-face families: the webfonts the newsroom actually paid for and self-hosts.
  for (const m of stripComments(css).matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    for (const { prop, value } of declarations(m[1]!)) {
      if (prop !== "font-family") continue;
      const family = firstFamily(value);
      if (family)
        raw.type.push({
          family,
          role: "webfont",
          token: `@font-face { font-family: ${value.trim()} }`,
          source,
        });
    }
  }
}

const GENERIC_FAMILY =
  /^(?:inherit|initial|unset|revert|serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|-apple-system|blinkmacsystemfont|segoe ui|roboto|helvetica(?: neue)?|arial|sans|apple color emoji|segoe ui emoji|segoe ui symbol|noto color emoji)$/i;

/**
 * Icon fonts are not a house typeface. They ship glyphs — a burger menu, a share arrow — and a
 * newsroom told "your typeface is icomoon" learns something false about its own site. Measured on
 * therecord.media 2026-08-06, where `icomoon` was reported alongside the real one.
 */
const ICON_FAMILY =
  /^(?:icomoon|icon[-_ ]?font|fontawesome|font awesome(?: \d+ (?:free|brands|pro))?|fa[-_](?:solid|regular|brands|light)|material icons(?: outlined| round| sharp)?|material symbols(?: outlined| rounded| sharp)?|glyphicons(?: halflings)?|feather|bootstrap-icons|remixicon|ionicons|typicons|octicons)$/i;

/**
 * The first NAMED family in a `font-family` stack. The generics and the system-font stack are
 * skipped: `-apple-system, BlinkMacSystemFont, "Segoe UI"` is the browser default dressed up,
 * and reporting it as the newsroom's typeface would be a fabricated finding.
 */
export function firstFamily(value: string): string | null {
  // `!important` rides on the LAST family in the stack; without stripping it, Le Monde's
  // `var(--font-antiqua-b-bold), serif!important` reported a typeface called "serif!important".
  for (const part of value.replace(/!\s*important\s*$/i, "").split(",")) {
    const name = part
      .trim()
      // A `var(--font-x, Roboto)` fallback arrives here as `Roboto)` once the stack is split on
      // the comma. Measured on heidi.news 2026-08-06: the trailing paren stopped GENERIC_FAMILY
      // from recognising a generic, and "Roboto)" was reported to the journalist as their house
      // typeface. Strip it BEFORE the generic test — the paren was the whole disguise.
      .replace(/\)+$/, "")
      .replace(/^["']|["']$/g, "")
      .trim();
    if (!name || GENERIC_FAMILY.test(name)) continue;
    if (ICON_FAMILY.test(name)) continue;
    if (name.startsWith("var(")) continue;
    return name;
  }
  return null;
}

/**
 * A candidate's score: the BEST deliberate declaration behind it, plus a BOUNDED bonus for how
 * often it recurs.
 *
 * The first cut simply summed the weights, and a live read of the Guardian showed why that is
 * wrong: its design-token stylesheet declares hundreds of `--…` colours, so the frequency tail
 * (8 points, several hundred times) buried the site's own `<meta theme-color="#052962">` — its
 * literal statement of its brand — in third place, behind two section-accent colours. Frequency
 * has to be a TIEBREAK, never an argument: capped at 40, it cannot outrank a button (55), a link
 * (75), or a declaration (85-100). The bonus saturates instead of clipping, so two
 * frequency-only candidates still order by how common they are.
 */
function bestWeight(evidence: Measurement[]): number {
  return evidence.reduce((w, e) => Math.max(w, WEIGHT[e.signal]), 0);
}

/** How many readings a candidate has, for the frequency bonus and the tiebreak. */
function occurrences(g: ColourCandidate): number {
  return g.count;
}

function scoreOf(g: ColourCandidate): number {
  const n = g.count;
  return (
    bestWeight(g.evidence) + (FREQUENCY_BONUS_CAP * n) / (n + FREQUENCY_HALF)
  );
}

/**
 * Rank the candidates.
 *
 * The order is LEXICOGRAPHIC — best signal first, then how often it recurs, then the hex, so it
 * is fully deterministic — and NOT a comparison of the summed scores. That is deliberate: an
 * additive order silently depends on the bonus staying smaller than every inter-signal gap, and
 * the first cut got that wrong (a 60× link colour outranked a `<meta theme-color>`). Sorting on
 * the tuple makes "frequency can never outrank a deliberate declaration" a structural property
 * of the comparator instead of an arithmetic coincidence. The printed `score` is for the
 * journalist; nothing depends on it.
 *
 * Grouping is bucketed by exact hex first (a Map) and only then merged across near-identical
 * hexes, so a stylesheet declaring one colour a hundred thousand times is linear in the readings
 * and quadratic only in the number of DISTINCT colours. The unbucketed first cut took 17.9 s on
 * 100k identical declarations.
 */
function rank(measurements: Measurement[]): ColourCandidate[] {
  const buckets = new Map<string, ColourCandidate>();
  for (const m of measurements) {
    if (isNeutral(m.value)) continue;
    const b = buckets.get(m.value);
    if (b) {
      b.count++;
      if (b.evidence.length < EVIDENCE_CAP) b.evidence.push(m);
      else if (WEIGHT[m.signal] > bestWeight(b.evidence))
        b.evidence[EVIDENCE_CAP - 1] = m;
    } else {
      buckets.set(m.value, {
        value: m.value,
        score: 0,
        count: 1,
        evidence: [m],
      });
    }
  }
  const groups: ColourCandidate[] = [];
  for (const b of buckets.values()) {
    const hit = groups.find(
      (g) => distance(g.value, b.value) <= MERGE_DISTANCE,
    );
    if (!hit) {
      groups.push(b);
      continue;
    }
    hit.count += b.count;
    for (const e of b.evidence)
      if (hit.evidence.length < EVIDENCE_CAP) hit.evidence.push(e);
    // The representative is the best-DECLARED reading, not the first one seen.
    hit.value = hit.evidence.reduce((a, c) =>
      WEIGHT[c.signal] > WEIGHT[a.signal] ? c : a,
    ).value;
  }
  for (const g of groups) g.score = Math.round(scoreOf(g));
  groups.sort(
    (a, b) =>
      bestWeight(b.evidence) - bestWeight(a.evidence) ||
      occurrences(b) - occurrences(a) ||
      a.value.localeCompare(b.value),
  );
  // Below the floor, a "candidate" is just the first saturated hex in a bundle — see
  // MIN_CANDIDATE_SCORE. Those are reported in `notes`, never proposed.
  return groups
    .filter((g) => g.score >= MIN_CANDIDATE_SCORE)
    .slice(0, CANDIDATE_CAP);
}

/**
 * Recovers the CSS property a `declared`-signal `Measurement` was read from, by re-reading its
 * own `token` — every such token was written by `scanCss` in the exact `${selector} { ${prop}:
 * ${value} }` shape. Reused rather than threading a sixth field onto `Measurement` for the sake
 * of one signal: the token already carries the property, this just recovers it.
 */
function propertyFromToken(token: string): string | null {
  const m = /\{\s*([a-z-]+)\s*:/i.exec(token);
  return m ? m[1]!.toLowerCase() : null;
}

/**
 * Promotes `declared` readings to `recurrent-role` IN PLACE, when their colour repeats at least
 * RECURRENT_ROLE_MIN_COUNT times on RECURRENT_ROLE_PROPERTIES.
 *
 * Only `declared` is a candidate for promotion — never `control`/`masthead`/`link`/`brand`/etc.
 * Those already came from a more deliberate reading (a role SELECTOR matched the rule, or the
 * property was NAMED as the brand/accent/link), and this signal's whole job is to give the
 * UNLABELLED bucket — a colour that matched none of those — a way to still be evidence, when it
 * turns up again and again on the same kind of surface. `declared` alone earns almost nothing
 * (weight 8); repeated on brand-carrying properties, it earns 60.
 *
 * Mutates in place rather than pushing new measurements alongside the old ones, so a single
 * physical CSS declaration is never counted twice (once as `declared`, again as
 * `recurrent-role`) — `count` on the resulting candidate stays the number of distinct
 * declarations actually read, not a doubled tally.
 */
function promoteRecurrentRoles(measurements: Measurement[]): void {
  const counts = new Map<string, number>();
  for (const m of measurements) {
    if (m.signal !== "declared" || isNeutral(m.value)) continue;
    const prop = propertyFromToken(m.token);
    if (!prop || !RECURRENT_ROLE_PROPERTIES.has(prop)) continue;
    counts.set(m.value, (counts.get(m.value) ?? 0) + 1);
  }
  for (const m of measurements) {
    if (m.signal !== "declared") continue;
    if ((counts.get(m.value) ?? 0) < RECURRENT_ROLE_MIN_COUNT) continue;
    const prop = propertyFromToken(m.token);
    if (!prop || !RECURRENT_ROLE_PROPERTIES.has(prop)) continue;
    m.signal = "recurrent-role";
  }
}

/** The best reading that did NOT clear the floor, so the refusal can name what it saw. */
function belowFloor(
  measurements: Measurement[],
): { value: string; score: number } | null {
  const buckets = new Map<string, number>();
  const signals = new Map<string, number>();
  for (const m of measurements) {
    if (isNeutral(m.value)) continue;
    buckets.set(m.value, (buckets.get(m.value) ?? 0) + 1);
    signals.set(m.value, Math.max(signals.get(m.value) ?? 0, WEIGHT[m.signal]));
  }
  let best: { value: string; score: number } | null = null;
  for (const [value, n] of buckets) {
    const score = Math.round(
      (signals.get(value) ?? 0) +
        (FREQUENCY_BONUS_CAP * n) / (n + FREQUENCY_HALF),
    );
    if (!best || score > best.score) best = { value, score };
  }
  return best;
}

/**
 * The last two labels of a hostname: `cdn.heidi.news` and `www.heidi.news` both reduce to
 * `heidi.news`, `cdn.consent.example` reduces to `consent.example`.
 *
 * An APPROXIMATION of "the same site", and deliberately a cheap one — the exact answer needs the
 * public suffix list, which is a dependency and a list that goes stale, and what this decides is
 * the wording of a NOTE, never whether a reading is kept. It errs towards saying nothing: two
 * unrelated `*.co.uk` sites read as the same site and no note is emitted. Comparing whole
 * hostnames instead would fire on every newsroom that serves its CSS from its own `cdn.` — which
 * is most of them — and a warning that fires on the ordinary case teaches its reader to skip it.
 */
function siteOf(hostname: string): string {
  return hostname.toLowerCase().split(".").slice(-2).join(".");
}

/**
 * A FACT about the top candidate, when its strongest evidence was read from a stylesheet served
 * by another site: which host it came from.
 *
 * NOT a filter and NOT a penalty — the decision that a sheet the newsroom's own document links is
 * the newsroom's, whatever host carries the bytes, stands (see charter-fetch.ts's
 * `stylesheetHrefs`; heidi.news's real CSS lives on a CDN with an unrelated name). But that
 * decision has a measured cost: a consent banner repeating its blue across five
 * `background-color` declarations earns `recurrent-role` (60) and takes first place off the
 * newsroom's own `.btn{background:#0a5c36}` (`control`, 55). The reading is honest; what was
 * missing is the one thing that lets the journalist overrule it, which is knowing where it came
 * from. `Measurement.source` has carried that all along — this puts it in front of him.
 */
function foreignTopCandidateNote(
  top: ColourCandidate,
  pageUrl: string | undefined,
): string | null {
  if (!pageUrl) return null;
  let site: string;
  try {
    site = siteOf(new URL(pageUrl).hostname);
  } catch {
    return null;
  }
  // The evidence that actually earned the candidate its rank — the same "best weight wins" rule
  // `rank` uses to pick the representative value, not the first reading in the list.
  const strongest = top.evidence.reduce((a, c) =>
    WEIGHT[c.signal] > WEIGHT[a.signal] ? c : a,
  );
  let host: string;
  try {
    // A source that is not a URL at all — "the page itself", a fixture's bare filename, the
    // rendered path's "computed styles of the rendered page" — is not a foreign site.
    host = new URL(strongest.source).hostname;
  } catch {
    return null;
  }
  if (!host || siteOf(host) === site) return null;
  return `the colour proposed first (${top.value}) was read from a stylesheet served by ${host}, which is not part of ${site} — the newsroom's own page links that sheet, so it is read and ranked like any other, but the colour may belong to a third party (a consent banner, an embedded widget) rather than to the newsroom`;
}

const DECLARED_SIGNALS = new Set<ColourSignal>([
  "theme-color",
  "brand-property",
  "masthead",
]);

/**
 * Measure a newsroom's site. Returns what was READ, with receipts — never a decision, never a
 * file. An empty `candidates` list is a legitimate, common answer (a white site with black text
 * and a raster logo declares no brand hue), and the caller must relay it as such rather than
 * pick something.
 *
 * Total: any malformed input degrades to fewer measurements. Never throws.
 */
export function proposeCharter(sources: SiteSources): CharterProposal {
  const raw: Raw = { measurements: [], type: [], unparsed: new Set() };
  const notes: string[] = [];
  // What every page-derived reading (theme-color, masthead SVG, inline <style>, an inline
  // style="" attribute) carries as its `source` — as opposed to a linked stylesheet, which
  // carries ITS OWN href. `sources.url` is optional (a captured fixture may omit it); a reading
  // still needs SOME source string rather than none.
  const pageSource = sources.url ?? "the page itself";
  try {
    const html = sources.html ?? "";
    const meta = themeColorMeta(html);
    if (meta) raw.measurements.push({ ...meta, source: pageSource });
    raw.measurements.push(
      ...mastheadColours(html).map((m) => ({ ...m, source: pageSource })),
    );
    const inline = inlineStyles(html);
    if (inline.trim()) scanCss(inline, raw, pageSource);
    for (const sheet of sources.sheets ?? []) {
      try {
        scanCss(sheet.css, raw, sheet.href);
      } catch {
        notes.push(`stylesheet not readable: ${sheet.href}`);
      }
    }
    // Inline `style="--brand:#…"` on the <html>/<body> element: a common place for a themed CMS
    // to put the house colour, and invisible to the stylesheet scan.
    for (const m of html.matchAll(/style\s*=\s*["']([^"']*--[^"']*)["']/gi)) {
      for (const { prop, value } of declarations(m[1]!)) {
        if (!prop.startsWith("--") || !BRAND_PROPERTY.test(prop)) continue;
        const hex = parseCssColour(value);
        if (hex)
          raw.measurements.push({
            value: hex,
            signal: "brand-property",
            token: `style="${prop}: ${value}"`,
            source: pageSource,
          });
      }
    }
  } catch {
    notes.push(
      "the page could not be read to the end; what follows is partial",
    );
  }

  // A colour nobody named still deserves a look when it recurs on the surfaces a brand actually
  // occupies — run AFTER every source has been scanned, since the whole point is a GLOBAL count.
  promoteRecurrentRoles(raw.measurements);

  const candidates = rank(raw.measurements);
  const top = candidates[0];
  const confidence: CharterConfidence = !top
    ? "none"
    : top.evidence.some((e) => DECLARED_SIGNALS.has(e.signal))
      ? "declared"
      : "inferred";

  if (top) {
    const foreign = foreignTopCandidateNote(top, sources.url);
    if (foreign) notes.push(foreign);
  }

  // A reading that did not clear the floor is NAMED but not proposed — hiding it would be as
  // dishonest as proposing it, and the journalist may recognise their own colour in it.
  if (!top) {
    const weak = belowFloor(raw.measurements);
    if (weak)
      notes.push(
        `the strongest colour read was ${weak.value}, but it comes only from unlabelled stylesheet declarations (score ${weak.score}, under the floor of ${MIN_CANDIDATE_SCORE}) — that is not evidence of a brand colour, so nothing is proposed`,
      );
  }

  // Hedged the same way `collectSiteSources`'s own note is (lib/newsroom/charter-fetch.ts): this
  // condition cannot tell "no stylesheet was linked" apart from "one was linked but failed" — it
  // only knows nothing was SCANNED — so it must not assert the JavaScript guess as a flat fact.
  // The two notes can both appear (this module is fed by more than `collectSiteSources`, so it
  // cannot rely on that one having run) — CLI output that shows both should now read as the same
  // claim twice, not as two different claims in two different registers.
  if (!sources.sheets?.length && !inlineStyles(sources.html ?? "").trim())
    notes.push(
      "no stylesheet was read — one possibility is that the page builds its styles in JavaScript, but that is a guess this reading cannot confirm",
    );
  if (raw.unparsed.size)
    notes.push(
      `the site declares colours in ${[...raw.unparsed].sort().join("/")}() notation, which is NOT read here — a brand colour expressed only that way was missed`,
    );
  if (confidence === "inferred")
    notes.push(
      "the site names no brand colour anywhere (no theme-color, no --brand property, no masthead SVG); what follows is inferred from links and controls and is a guess",
    );
  if (confidence === "none")
    notes.push(
      "the site names no brand colour this reading can trust — there is nothing to propose, and the house colour has to be asked for",
    );

  if (raw.ground && luminanceOf(raw.ground.value) < DARK_GROUND_LUMINANCE)
    notes.push(
      "the ground reading is the least reliable measurement here: a page stacks backgrounds, and the one declared on <body> can sit BEHIND the white column the reader actually looks at (Le Monde declares `body,html { background:#000 }` and reads as white). Confirm the dark ground by eye before accepting it",
    );

  const groundHex = raw.ground?.value;
  const ground =
    raw.ground && groundHex
      ? { ...raw.ground, dark: luminanceOf(groundHex) < DARK_GROUND_LUMINANCE }
      : undefined;

  return {
    ...(sources.url ? { url: sources.url } : {}),
    candidates,
    ...(ground ? { ground } : {}),
    typography: dedupeType(raw.type),
    confidence,
    notes,
  };
}

function luminanceOf(hex: string): number {
  try {
    return relativeLuminance(hex);
  } catch {
    return 1;
  }
}

function dedupeType(list: TypeMeasurement[]): TypeMeasurement[] {
  const seen = new Set<string>();
  const out: TypeMeasurement[] = [];
  // body first, then headings, then the webfonts — the order a journalist cares about.
  const order = { body: 0, headings: 1, webfont: 2 } as const;
  for (const t of [...list].sort((a, b) => order[a.role] - order[b.role])) {
    const key = `${t.role}:${t.family.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.slice(0, 6);
}

/**
 * The `theme:` value the ground measurement supports, or null when the site's ground is the
 * ordinary near-white (which is already Splash's default — writing it would be noise).
 */
export function groundTheme(proposal: CharterProposal): string | null {
  const g = proposal.ground;
  if (!g) return null;
  const { l } = saturationLightness(g.value);
  if (l > NEUTRAL_LIGHTNESS_MAX && !g.dark) return null;
  return g.value;
}
