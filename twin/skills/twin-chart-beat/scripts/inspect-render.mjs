// twin/skills/twin-chart-beat/scripts/inspect-render.mjs
//
// Three checklist items the eye cannot judge on a rendered SVG: contrast against the REAL
// ground (never an assumed white), the presence of an alt-text <desc>, and a root <title> that
// SVG turns into a redundant cursor tooltip. A tool the model runs and reads — not a gate. SP1
// ships no conformance engine.

import { contrast } from "./render-still.mjs";

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const HEX3 = /^#[0-9a-fA-F]{3}$/;

// A defensible subset of CSS named colours a hand-written SVG might use instead of hex. Not
// exhaustive: anything outside this table and outside hex falls through to the SVG initial
// fill value (black) in resolveEffectiveFill() below, rather than being silently dropped —
// silently seeing no text at all is the one failure this tool must never produce.
const NAMED_COLOURS = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  gray: "#808080",
  grey: "#808080",
  silver: "#c0c0c0",
  yellow: "#ffff00",
  orange: "#ffa500",
  purple: "#800080",
  navy: "#000080",
  teal: "#008080",
  maroon: "#800000",
  olive: "#808000",
  lime: "#00ff00",
  aqua: "#00ffff",
  fuchsia: "#ff00ff",
};

/**
 * Resolves a raw colour token to a #rrggbb hex, or a sentinel:
 *  - null      explicitly unpainted ("none" / "transparent") — not a contrast question.
 *  - undefined not declared at all here — the caller inherits from its ancestor.
 */
function resolveColour(raw) {
  if (raw === null || raw === undefined) return undefined;
  const value = raw.trim();
  if (HEX6.test(value)) return value.toUpperCase();
  if (HEX3.test(value)) {
    const [r, g, b] = value.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  const lower = value.toLowerCase();
  if (lower === "none" || lower === "transparent") return null;
  if (NAMED_COLOURS[lower]) return NAMED_COLOURS[lower].toUpperCase();
  return undefined; // e.g. currentColor, or a keyword this table does not know
}

/** Reads one attribute by NAME — anchored, so `data-nofill="..."` can never be read as `fill`. */
function readAttr(rawAttrs, name) {
  const re = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`);
  const match = re.exec(rawAttrs);
  if (!match) return null;
  return match[1] ?? match[2];
}

/** The fill declared directly on this tag — as an attribute or inside its style attribute. */
function ownFill(rawAttrs) {
  const direct = resolveColour(readAttr(rawAttrs, "fill"));
  if (direct !== undefined) return direct;
  const style = readAttr(rawAttrs, "style");
  if (style) {
    const declared = /fill\s*:\s*([^;]+)/.exec(style);
    if (declared) return resolveColour(declared[1]);
  }
  return undefined;
}

function ownNumber(rawAttrs, name) {
  const value = readAttr(rawAttrs, name);
  if (value === null) return undefined;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// WCAG 2.x large text: >=24px regular, or >=18.66px (~14pt) at bold weight (>=700). Large text
// clears the checklist at 3:1; everything else needs 4.5:1. Treating every text node as normal
// text would flag a big bold title as a false failure on a ground it is in fact readable on.
function isLargeText(fontSize, fontWeight) {
  if (fontSize >= 24) return true;
  return fontSize >= 18.66 && fontWeight >= 700;
}

const TAG_RE = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^<>]*?)?)\s*(\/?)>/g;

/**
 * Walks the tag stream once, carrying the fill/font-size/font-weight context each <text>
 * actually inherits down through its ancestors — a `<g fill="...">` wrapping a bare `<text>`
 * is real, legal SVG, and a per-tag regex that only looks at the <text> tag itself misses it
 * completely. Also tracks nesting depth so a `<title>` is only "the root title" when it is a
 * direct child of the root <svg> — a `<title>` on a sub-group is a legitimate accessible name,
 * not a redundant cursor tooltip on the whole chart.
 */
function walk(svg) {
  const stripped = svg.replace(/<!--[\s\S]*?-->/g, "");
  const stack = [{ fill: undefined, fontSize: 16, fontWeight: 400 }];
  const texts = [];
  let depth = 0;
  let rootTitle = false;
  let match;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(stripped))) {
    const [, closing, name, rawAttrs, selfClosing] = match;
    const tag = name.toLowerCase();

    if (closing) {
      if (stack.length > 1) stack.pop();
      depth = Math.max(0, depth - 1);
      continue;
    }

    const parent = stack[stack.length - 1];
    const ownedFill = ownFill(rawAttrs);
    const ownedSize = ownNumber(rawAttrs, "font-size");
    const ownedWeight = ownNumber(rawAttrs, "font-weight");
    const context = {
      fill: ownedFill !== undefined ? ownedFill : parent.fill,
      fontSize: ownedSize !== undefined ? ownedSize : parent.fontSize,
      fontWeight: ownedWeight !== undefined ? ownedWeight : parent.fontWeight,
    };
    depth++;

    if (tag === "title" && depth === 2) rootTitle = true; // direct child of the root <svg>
    if (tag === "text") texts.push(context);

    if (selfClosing) {
      depth--; // no children can follow; nothing will close this tag later
    } else {
      stack.push(context);
    }
  }
  return { texts, rootTitle };
}

/** Skip fills the beat CHOSE not to paint; default the never-declared case to black, the SVG
 *  initial value — never drop the text silently, which is the worst failure this tool can make. */
function effectiveFill(fill) {
  if (fill === null) return null;
  return fill === undefined ? "#000000" : fill;
}

export function inspectSvg(svg, { ground }) {
  const stripped = svg.replace(/<!--[\s\S]*?-->/g, "");
  const { texts, rootTitle } = walk(svg);

  const contrastEntries = [];
  for (const text of texts) {
    const fill = effectiveFill(text.fill);
    if (fill === null) continue; // explicitly unpainted; there is nothing to read the contrast of
    const value = contrast(fill, ground);
    const threshold = isLargeText(text.fontSize, text.fontWeight) ? 3 : 4.5;
    contrastEntries.push({ fill, ratio: Number(value.toFixed(2)), pass: value >= threshold });
  }

  const desc = /<desc>([\s\S]*?)<\/desc>/.exec(stripped);

  return {
    contrast: contrastEntries,
    altText: { present: Boolean(desc), text: desc ? desc[1].trim() : null },
    rootTitle,
  };
}
