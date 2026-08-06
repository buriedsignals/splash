// twin/skills/twin-chart-beat/scripts/inspect-render.mjs
//
// Three checklist items the eye cannot judge on a rendered SVG: contrast against the REAL
// ground (never an assumed white), the presence of an alt-text <desc>, and a root <title> that
// SVG turns into a redundant cursor tooltip. A tool the model runs and reads — not a gate. SP1
// ships no conformance engine.
//
// GOVERNING RULE, inverted after two rounds of fresh holes: hand-resolving the CSS cascade from
// a regex-driven tag walker is a bottomless task, and every attempt to resolve MORE has produced
// a fresh way to be confidently wrong. So this file does not try to understand SVG/CSS in
// general — it understands a small, ENUMERATED set of forms, and treats everything else,
// including anything it merely SUSPECTS it cannot see, as unresolved:
//   - a `fill` presentation attribute
//   - a single `fill` declared in a `style` attribute (style wins the cascade over the
//     attribute; if `fill` is declared more than once in one `style`, the LAST one wins)
//   - inheritance of fill/font-size/font-weight through <g>/<text>/<tspan> ancestors
//   - the named colours in NAMED_COLOURS below, 6- and 3-digit hex, and classic `rgb(r,g,b)`
//   - `font-size`/`font-weight` as a bare number, an explicit "px" suffix, or (weight only) the
//     keywords bold/bolder/normal/lighter — read from `style` with the same precedence as fill
// Everything outside that list is `unresolved: true, pass: false` — never a guess, and never
// silently absent from the report. Two specific consequences:
//   - a <style> BLOCK anywhere in the document can repaint any element this file cannot predict,
//     so its mere presence marks EVERY contrast entry unresolved, not just the ones it targets.
//   - a font-size/font-weight this file cannot confidently parse (a unit outside px, an unknown
//     weight keyword) is held to the STRICTER 4.5:1 floor rather than inheriting an ancestor's
//     large-text allowance — uncertainty must never buy leniency.
// The one place black is used as an answer, not a guess, is a fill never declared anywhere in
// the ancestor chain at all (and no <style> block exists) — SVG's own initial value for `fill`.

import { contrast } from "./render-still.mjs";

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const HEX3 = /^#[0-9a-fA-F]{3}$/;
const RGB = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;

// A practical subset of CSS named colours, not the full 148-name CSS Color 4 keyword list —
// hand-typing that from memory risks a silently WRONG hex, which is worse than an honest
// UNRESOLVED. Anything outside this table (however common) falls through to unresolved() below.
const NAMED_COLOURS = {
  black: "#000000", white: "#FFFFFF", red: "#FF0000", green: "#008000", blue: "#0000FF",
  gray: "#808080", grey: "#808080", silver: "#C0C0C0", yellow: "#FFFF00", orange: "#FFA500",
  purple: "#800080", navy: "#000080", teal: "#008080", maroon: "#800000", olive: "#808000",
  lime: "#00FF00", aqua: "#00FFFF", fuchsia: "#FF00FF", magenta: "#FF00FF", cyan: "#00FFFF",
  pink: "#FFC0CB", hotpink: "#FF69B4", deeppink: "#FF1493", brown: "#A52A2A", chocolate: "#D2691E",
  coral: "#FF7F50", salmon: "#FA8072", khaki: "#F0E68C", crimson: "#DC143C", gold: "#FFD700",
  tan: "#D2B48C", beige: "#F5F5DC", turquoise: "#40E0D0", violet: "#EE82EE", orchid: "#DA70D6",
  plum: "#DDA0DD", indigo: "#4B0082", orangered: "#FF4500", skyblue: "#87CEEB",
  royalblue: "#4169E1", steelblue: "#4682B4", slateblue: "#6A5ACD", seagreen: "#2E8B57",
  forestgreen: "#228B22", darkgreen: "#006400", lightgreen: "#90EE90", springgreen: "#00FF7F",
  darkred: "#8B0000", firebrick: "#B22222", indianred: "#CD5C5C", darkorchid: "#9932CC",
  mediumpurple: "#9370DB", cornflowerblue: "#6495ED", dodgerblue: "#1E90FF",
  deepskyblue: "#00BFFF", lightblue: "#ADD8E6", powderblue: "#B0E0E6", aquamarine: "#7FFFD4",
  olivedrab: "#6B8E23", darkolivegreen: "#556B2F", yellowgreen: "#9ACD32", chartreuse: "#7FFF00",
  limegreen: "#32CD32", greenyellow: "#ADFF2F", darkgoldenrod: "#B8860B", goldenrod: "#DAA520",
  peru: "#CD853F", sienna: "#A0522D", sandybrown: "#F4A460", wheat: "#F5DEB3", ivory: "#FFFFF0",
  snow: "#FFFAFA", linen: "#FAF0E6", azure: "#F0FFFF", lavender: "#E6E6FA", mintcream: "#F5FFFA",
  honeydew: "#F0FFF0", aliceblue: "#F0F8FF", ghostwhite: "#F8F8FF", whitesmoke: "#F5F5F5",
  gainsboro: "#DCDCDC", lightgray: "#D3D3D3", lightgrey: "#D3D3D3", darkgray: "#A9A9A9",
  darkgrey: "#A9A9A9", dimgray: "#696969", dimgrey: "#696969", lightslategray: "#778899",
  slategray: "#708090", darkslategray: "#2F4F4F", midnightblue: "#191970",
  rebeccapurple: "#663399",
};

function unresolved(raw) {
  return { unresolved: true, raw: raw.trim() };
}
function isUnresolved(value) {
  return value !== null && typeof value === "object" && value.unresolved === true;
}
function isCurrentColourMarker(value) {
  return value !== null && typeof value === "object" && value.currentColour === true;
}

/**
 * Resolves a raw colour token to one of:
 *  - a #RRGGBB hex string          resolved.
 *  - null                          explicitly unpainted ("none"/"transparent") — not a contrast
 *                                   question, nothing is drawn there.
 *  - { currentColour: true }       resolves via the nearest ancestor `color`, handled by the
 *                                   caller (this function does not chase inheritance).
 *  - { unresolved: true, raw }     declared, but this file cannot parse it — NEVER coerced to
 *                                   black. rgba()/hsl() carry alpha or a colour space this tool
 *                                   does not blend against the ground, so they are honestly
 *                                   reported as unresolved rather than guessed.
 *  - undefined                     nothing declared at all here.
 */
function resolveColour(raw) {
  if (raw === null || raw === undefined) return undefined;
  const value = raw.trim();
  if (value === "") return undefined;
  if (HEX6.test(value)) return value.toUpperCase();
  if (HEX3.test(value)) {
    const [r, g, b] = value.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  const rgbMatch = RGB.exec(value);
  if (rgbMatch) {
    return (
      "#" +
      rgbMatch
        .slice(1, 4)
        .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
    );
  }
  const lower = value.toLowerCase();
  if (lower === "none" || lower === "transparent") return null;
  if (lower === "currentcolor") return { currentColour: true };
  if (NAMED_COLOURS[lower]) return NAMED_COLOURS[lower];
  return unresolved(value); // rgba(), hsl(), url(#gradient), an unlisted keyword, garbage
}

/** Reads one attribute by NAME — anchored, so `data-nofill="..."` can never be read as `fill`. */
function readAttr(rawAttrs, name) {
  const re = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`);
  const match = re.exec(rawAttrs);
  if (!match) return null;
  return match[1] ?? match[2];
}

/** The LAST declaration of `property` in this tag's `style` attribute — CSS applies later
 *  declarations of the same property over earlier ones within one declaration block, and
 *  `style="fill:#000000; fill:#AAAAAA"` really paints the second. A single non-global `.exec()`
 *  returns the first match, which is the cascade LOSER whenever a property repeats. */
function readStyleProperty(rawAttrs, property) {
  const style = readAttr(rawAttrs, "style");
  if (!style) return null;
  const re = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "g");
  const matches = [...style.matchAll(re)];
  return matches.length > 0 ? matches[matches.length - 1][1] : null;
}

/**
 * The fill declared directly on this tag. The CSS cascade gives an inline `style` property
 * PRIORITY over the `fill` presentation attribute — a naive "check the attribute first" reading
 * has that backwards, and `fill="#000000" style="fill:#AAAAAA"` genuinely renders the style
 * colour, not the attribute's.
 */
function ownFill(rawAttrs) {
  const styled = resolveColour(readStyleProperty(rawAttrs, "fill"));
  if (styled !== undefined) return styled;
  return resolveColour(readAttr(rawAttrs, "fill"));
}

/** The CSS `color` this tag declares, used only to resolve a `currentColor` fill. */
function ownColour(rawAttrs) {
  const styled = resolveColour(readStyleProperty(rawAttrs, "color"));
  if (styled !== undefined && !isCurrentColourMarker(styled) && !isUnresolved(styled)) return styled;
  const attr = resolveColour(readAttr(rawAttrs, "color"));
  if (attr !== undefined && !isCurrentColourMarker(attr) && !isUnresolved(attr)) return attr;
  return undefined;
}

// Refuse to trust a non-px unit rather than mis-scale it: `50%` is really ~8px, but
// parseFloat("50%") reads 50 and would wrongly clear the >=24 large-text bar. A bare number or
// an explicit "px" suffix is trusted. Anything else returns NaN — DECLARED, but not confidently
// a size — rather than `undefined` ("nothing declared, inherit the ancestor's"): the ancestor
// might be large, and an uncertain child that silently inherited that allowance would grant the
// easier 3:1 floor to text whose real size nobody here actually knows. `NaN` compares false
// against every threshold in isLargeText() below, which is exactly "hold to the stricter floor"
// without a second code path — and it is an OWNED value, not `undefined`, so it overrides the
// parent instead of falling through to it.
function parsePxSize(raw) {
  const match = /^(\d+(?:\.\d+)?)(px)?$/.exec(raw.trim());
  return match ? Number(match[1]) : NaN;
}

/** `style` wins the cascade over the presentation attribute, same precedence as fill. */
function ownFontSizePx(rawAttrs) {
  const styled = readStyleProperty(rawAttrs, "font-size");
  if (styled !== null) return parsePxSize(styled);
  const attr = readAttr(rawAttrs, "font-size");
  return attr === null ? undefined : parsePxSize(attr);
}

// Same "declared but uncertain returns NaN, not undefined" reasoning as parsePxSize — an
// unrecognised weight keyword must not silently inherit a bold ancestor's large-text allowance.
function parseWeight(raw) {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "bold" || trimmed === "bolder") return 700;
  if (trimmed === "normal") return 400;
  if (trimmed === "lighter") return 300;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/** `style` wins the cascade over the presentation attribute, same precedence as fill. */
function ownFontWeight(rawAttrs) {
  const styled = readStyleProperty(rawAttrs, "font-weight");
  if (styled !== null) return parseWeight(styled);
  const attr = readAttr(rawAttrs, "font-weight");
  return attr === null ? undefined : parseWeight(attr);
}

// WCAG 2.x large text: >=24px regular, or >=18.66px (~14pt) at bold weight (>=700). Large text
// clears the checklist at 3:1; everything else needs 4.5:1. Treating every text node as normal
// text would flag a big bold title as a false failure on a ground it is in fact readable on.
function isLargeText(fontSize, fontWeight) {
  if (fontSize >= 24) return true;
  return fontSize >= 18.66 && fontWeight >= 700;
}

/**
 * Finds the next tag starting at or after `from`, tracking quotes so a stray `>` INSIDE a
 * quoted attribute value — well-formed XML; only `<` and `&` are forbidden raw — cannot be
 * mistaken for the tag's own closing bracket. A regex without quote-awareness truncates the tag
 * right there, and whatever attribute follows the stray `>` in source order (e.g. `fill=`) is
 * silently never seen — an intermittent miss, since it depends on attribute order.
 */
function nextTag(text, from) {
  const start = text.indexOf("<", from);
  if (start === -1) return null;
  let i = start + 1;
  let quote = null;
  while (i < text.length) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      break;
    }
    i++;
  }
  return { raw: text.slice(start, i + 1), start, end: i + 1 };
}

function parseTag(raw) {
  const closing = raw[1] === "/";
  let inner = closing ? raw.slice(2, -1) : raw.slice(1, -1);
  const selfClosing = !closing && /\/\s*$/.test(inner);
  if (selfClosing) inner = inner.replace(/\/\s*$/, "");
  const nameMatch = /^([a-zA-Z][\w:-]*)/.exec(inner);
  const name = nameMatch ? nameMatch[1] : "";
  return { closing, name, rawAttrs: inner.slice(name.length), selfClosing };
}

const TEXT_BEARING = new Set(["text", "tspan"]);

/**
 * Walks the tag stream once, carrying fill/colour/font context down through ancestors (a
 * `<g fill="...">` wrapping a bare `<text>` is real, legal SVG) and recording one contrast
 * candidate per text-bearing element (`<text>` AND `<tspan>` — a `<tspan fill="...">` override
 * inside a `<text>` is ordinary inline-highlight SVG, and only walking `<text>` misses it
 * completely) that is observed to carry actual, non-whitespace character data of its own. Text
 * under `<defs>` never renders and is excluded. Tracks nesting depth so a `<title>` only counts
 * as the root title when it is a direct child of the root `<svg>`, and whether a `<style>`
 * element appears anywhere at all (see `hasStyleBlock` at the call site).
 */
function walk(svg) {
  const stripped = svg.replace(/<!--[\s\S]*?-->/g, "");
  const root = {
    tag: "",
    fill: undefined,
    colour: undefined,
    fontSize: 16,
    fontWeight: 400,
    inDefs: false,
    recorded: false,
  };
  const stack = [root];
  const texts = [];
  let depth = 0;
  let rootTitle = false;
  let hasStyleBlock = false;
  let cursor = 0;
  let tag = nextTag(stripped, cursor);

  while (tag) {
    const gap = stripped.slice(cursor, tag.start);
    if (gap.trim()) {
      const owner = stack[stack.length - 1];
      if (TEXT_BEARING.has(owner.tag) && !owner.inDefs && !owner.recorded) {
        texts.push(owner);
        owner.recorded = true;
      }
    }
    cursor = tag.end;

    const { closing, name, rawAttrs, selfClosing } = parseTag(tag.raw);
    const tagName = name.toLowerCase();

    // A <style> element ANYWHERE can repaint any text this walker resolves — CSS rules apply
    // document-wide by selector, not by the <style> tag's own position in the tree. This file
    // does not parse stylesheets, so its mere presence is treated as "cannot trust anything
    // local" rather than attempting to guess whether it happens to target this element.
    if (tagName === "style") hasStyleBlock = true;

    if (closing) {
      if (stack.length > 1) stack.pop();
      depth = Math.max(0, depth - 1);
      tag = nextTag(stripped, cursor);
      continue;
    }

    const parent = stack[stack.length - 1];
    const declaredFill = ownFill(rawAttrs);
    const declaredColour = ownColour(rawAttrs);
    const ownedSize = ownFontSizePx(rawAttrs);
    const ownedWeight = ownFontWeight(rawAttrs);

    const colour = declaredColour !== undefined ? declaredColour : parent.colour;

    let fill;
    if (declaredFill === undefined) {
      fill = parent.fill;
    } else if (isCurrentColourMarker(declaredFill)) {
      fill = colour !== undefined ? colour : unresolved("currentColor");
    } else {
      fill = declaredFill;
    }

    const context = {
      tag: tagName,
      fill,
      colour,
      fontSize: ownedSize !== undefined ? ownedSize : parent.fontSize,
      fontWeight: ownedWeight !== undefined ? ownedWeight : parent.fontWeight,
      inDefs: tagName === "defs" || parent.inDefs,
      recorded: false,
    };
    depth++;

    if (tagName === "title" && depth === 2) rootTitle = true; // direct child of the root <svg>

    if (selfClosing) {
      depth--; // no children can follow; nothing will close this tag later
    } else {
      stack.push(context);
    }

    tag = nextTag(stripped, cursor);
  }

  return { texts, rootTitle, hasStyleBlock };
}

/** Classifies a walked fill for reporting. Black is used ONLY for the truly-never-declared
 *  case (SVG's real initial value) — every other unreadable case is reported, not guessed. */
function classifyFill(fill) {
  if (fill === null) return { skip: true }; // explicitly unpainted
  if (fill === undefined) return { hex: "#000000" }; // never declared anywhere: SVG initial value
  if (typeof fill === "string") return { hex: fill };
  if (isUnresolved(fill)) return { unresolvedRaw: fill.raw };
  return { skip: true };
}

/** A human-readable label for what was found LOCALLY, used only when a <style> block makes that
 *  local answer untrustworthy — shown for context, never treated as the real colour. */
function describeLocalFill(fill) {
  if (fill === null) return "none (locally declared) — a <style> block may repaint this";
  if (fill === undefined) return "no local fill declared — a <style> block may set one";
  if (typeof fill === "string") return `${fill} (locally declared) — a <style> block may override this`;
  if (isUnresolved(fill)) return `${fill.raw} — also unresolved locally, and a <style> block is present`;
  return "unknown — a <style> block is present";
}

export function inspectSvg(svg, { ground }) {
  const stripped = svg.replace(/<!--[\s\S]*?-->/g, "");
  const { texts, rootTitle, hasStyleBlock } = walk(svg);

  const contrastEntries = [];
  for (const text of texts) {
    if (hasStyleBlock) {
      // A stylesheet this file cannot parse could repaint ANY element, including one that
      // otherwise resolved cleanly, or one whose local fill is "none" (a rule could un-hide it).
      // Every entry is reported, none skipped, none guessed.
      contrastEntries.push({
        fill: describeLocalFill(text.fill),
        ratio: null,
        pass: false,
        unresolved: true,
      });
      continue;
    }
    const classified = classifyFill(text.fill);
    if (classified.skip) continue;
    if (classified.unresolvedRaw !== undefined) {
      contrastEntries.push({ fill: classified.unresolvedRaw, ratio: null, pass: false, unresolved: true });
      continue;
    }
    const fill = classified.hex;
    const value = contrast(fill, ground);
    const threshold = isLargeText(text.fontSize, text.fontWeight) ? 3 : 4.5;
    contrastEntries.push({ fill, ratio: Number(value.toFixed(2)), pass: value >= threshold, unresolved: false });
  }

  const desc = /<desc>([\s\S]*?)<\/desc>/.exec(stripped);

  return {
    contrast: contrastEntries,
    altText: { present: Boolean(desc), text: desc ? desc[1].trim() : null },
    rootTitle,
  };
}
