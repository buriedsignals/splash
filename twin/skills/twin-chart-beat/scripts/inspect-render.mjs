// twin/skills/twin-chart-beat/scripts/inspect-render.mjs
//
// Three checklist items the eye cannot judge on a rendered SVG: contrast against the REAL
// ground (never an assumed white), the presence of an alt-text <desc>, and a root <title> that
// SVG turns into a redundant cursor tooltip. A tool the model runs and reads — not a gate. SP1
// ships no conformance engine.
//
// Like `render-still.mjs` in this same skill, this file is NOT dependency-free: it uses
// `@resvg/resvg-js` directly, on purpose (see below), and says so.
//
// GOVERNING METHOD, after three rounds of patching a regex-driven markup parser and each round
// opening a fresh hole of the same shape (a fill via `style`, `rgb()`, `currentColor`, a
// `<tspan>` override, a stray `>`, a `%` font-size, a `<style>` block, opacity, a CSS comment —
// the list has no end): **this file no longer tries to resolve what a fill "means" by reading
// the markup.** It measures what the renderer actually painted.
//
// For each text-bearing element (<text> or <tspan>, at any depth): render the SVG with just that
// element's OWN direct characters present (its text-bearing children removed, if it has any) and
// again with the element itself removed entirely, then diff the two images pixel-by-pixel. The
// pixels that changed ARE that element's own glyph — nothing else moves, because SVG elements are
// independently positioned (unlike HTML flow layout, removing one element never reflows its
// siblings). Doing this PER RUN, not once for the whole <text>, is what makes a <tspan fill="…">
// override — a different colour living inside the same element — measurable on its own, without
// its pixels drowning in a larger sibling run's. The colour painted, and what is revealed behind
// it, are ground truth: they already have opacity, `<style>` rules, gradients, currentColor,
// comments inside a style attribute and anything else the real renderer applies, because they ARE
// what the real renderer applied. This deletes the entire defect class rather than patching the
// next instance of it — no `NAMED_COLOURS` table, no style/cascade parser, no attribute list.

import { Resvg } from "@resvg/resvg-js";
import { contrast } from "./render-still.mjs";

// Upscale before diffing so even a small/thin glyph has enough device pixels to contain true
// "core" ink (fully covered, not blended by anti-aliasing) — this does not run in a hot loop.
const ZOOM = 4;

// A pixel counts as "changed" between the two renders if any channel moves by more than this —
// filters out rasteriser/floating-point jitter that is not a real difference.
const CHANGE_TOLERANCE = 4;

// GEOMETRIC core filter, not a colour-based one. A first version compared each changed pixel's
// own glyph-vs-background DELTA to the largest delta found for that run, on the theory that
// anti-aliased edge pixels sit closer to the background. That conflates two different things:
// a pixel can have a small delta because it is a faint AA blend, OR because the run's true ink
// colour is simply close to a particular background it happens to cross (measured: text spanning
// a white-then-grey background reported the easy white-side contrast, because the harder grey-
// side pixels had a smaller delta and were discarded by a delta filter that had no way to tell
// "faded by AA" from "always this close, because the background here is harder"). Anti-aliasing
// is a GEOMETRIC fact — it lives in a thin rim around the glyph's true shape — not a colour fact,
// so it is filtered geometrically: erode the changed-pixel mask (an interior pixel survives only
// if all 8 of its neighbours are ALSO changed pixels), twice, which strips the AA rim regardless
// of what colour it blends toward. Verified against a battery of real renders (solid fills, a
// diagonal-stroke glyph, opacity, a fill crossing a harder background) that this recovers the
// EXACT true ink colour and ratio in every case — see the report. If two passes leave nothing
// (an extremely thin, sub-pixel stroke), one pass is tried, then the unfiltered set — a coarser
// reading rather than reporting nothing, and by construction it can only ever read WORSE than the
// true ink (a still-partly-blended pixel is always closer to the background), never better.
const EROSION_PASSES = 2;
const NEIGHBOURS_8 = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

function erode(points, width) {
  let current = points;
  for (let pass = 0; pass < EROSION_PASSES; pass++) {
    const set = new Set(current.map((p) => p.y * width + p.x));
    const next = current.filter((p) =>
      NEIGHBOURS_8.every(([dx, dy]) => set.has((p.y + dy) * width + (p.x + dx))),
    );
    if (next.length === 0) break; // this pass would erase everything — stop one pass short
    current = next;
  }
  return current;
}

// WCAG's large-text floor (3:1 instead of 4.5:1) is defined on the CSS `font-size` (the em box),
// not on the glyph's rendered ink extent — and the two are not the same number. Measured against
// this codebase's own font stack (see report), a genuinely-large 24px declaration measures ~18px
// of ink height even for a shallow all-digit string, and every genuinely-normal size sampled
// (15-20px, including bold) measured well under that. 17px (measured, logical px) sits with
// margin below the large case and above every normal case actually measured — a threshold judged
// by evidence, not a formula, and deliberately on the strict side: WCAG also lowers the floor for
// BOLD text down to 18.66px, but nothing here measures boldness (only the glyph's height, not its
// stroke weight) reliably enough to trust that carve-out, so it is dropped. A 20px bold heading
// that WCAG would call large-enough is held to the stricter 4.5:1 by this tool — uncertainty
// again resolved toward the harder floor, never the easier one.
const LARGE_TEXT_MEASURED_PX = 17;

const TEXT_BEARING = new Set(["text", "tspan"]);

function toHex([r, g, b]) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return "#" + [r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function renderPixels(svg, ground) {
  const image = new Resvg(svg, {
    font: { loadSystemFonts: true },
    fitTo: { mode: "zoom", value: ZOOM },
    background: ground,
  }).render();
  return { pixels: image.pixels, width: image.width, height: image.height };
}

/**
 * Finds the next tag starting at or after `from`, tracking quotes so a stray `>` INSIDE a
 * quoted attribute value (well-formed XML; only `<` and `&` are forbidden raw) cannot be
 * mistaken for the tag's own closing bracket.
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
  return { closing, name: nameMatch ? nameMatch[1] : "", selfClosing };
}

/**
 * Structural-only pass (no fill/colour/font resolution — the renderer does that now): finds the
 * [start, end) span of every <text> and <tspan> element at every depth, with each one's PARENT
 * (the nearest enclosing text-bearing element, or null), and whether a <title> is a direct child
 * of the root <svg> (nesting depth, so a comment or a <desc> before it, or a <title> nested inside
 * a child group, are both handled correctly).
 */
function findStructure(svg) {
  let depth = 0;
  let rootTitle = false;
  const nodes = [];
  const openStack = []; // indices into `nodes` for text-bearing ancestors currently open
  let cursor = 0;
  let tag = nextTag(svg, cursor);

  while (tag) {
    const { closing, name, selfClosing } = parseTag(tag.raw);
    const tagName = name.toLowerCase();
    cursor = tag.end;

    if (closing) {
      depth = Math.max(0, depth - 1);
      if (TEXT_BEARING.has(tagName) && openStack.length > 0) {
        const index = openStack.pop();
        nodes[index].end = tag.end;
      }
      tag = nextTag(svg, cursor);
      continue;
    }

    depth++;
    if (tagName === "title" && depth === 2) rootTitle = true; // direct child of the root <svg>

    if (TEXT_BEARING.has(tagName) && !selfClosing) {
      const parent = openStack.length > 0 ? openStack[openStack.length - 1] : null;
      nodes.push({ start: tag.start, end: null, parent });
      openStack.push(nodes.length - 1);
    }
    if (selfClosing) depth--; // no children can follow; nothing will close this tag later

    tag = nextTag(svg, cursor);
  }

  return { nodes: nodes.filter((n) => n.end !== null), rootTitle };
}

/** Deletes every given [start, end) span from `text` in one pass (spans must not overlap). */
function removeSpans(text, spans) {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let result = "";
  let cursor = 0;
  for (const span of sorted) {
    result += text.slice(cursor, span.start);
    cursor = span.end;
  }
  return result + text.slice(cursor);
}

/**
 * Measures ONE text-bearing element's OWN direct content — excluding any nested <tspan>
 * children, which are measured separately as their own nodes — by rendering it with its
 * children removed (or unchanged, if it has none) against rendering it removed entirely.
 * `{ painted: false }` is what a `<defs>`/unreferenced `<symbol>` ancestor, `fill="none"` or
 * `transparent`, `opacity="0"`, a dangling `url(#missing-gradient)`, or an element that is only
 * ever a wrapper around tspans with no text of its own all collapse to, for free: none of them
 * paint a pixel that is not already accounted for elsewhere.
 */
function measureNode(svg, nodes, index, ground) {
  const node = nodes[index];
  const children = nodes.filter((n) => n.parent === index);
  const ownOnly = children.length > 0 ? removeSpans(svg, children) : svg;
  const removed = removeSpans(svg, [node]);

  let full;
  let withoutOwn;
  try {
    full = renderPixels(ownOnly, ground);
    withoutOwn = renderPixels(removed, ground);
  } catch (err) {
    return { unresolved: true, raw: `render failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (full.width !== withoutOwn.width || full.height !== withoutOwn.height) {
    return { unresolved: true, raw: "removing this element changed the render's canvas size" };
  }

  const changed = [];
  for (let y = 0; y < full.height; y++) {
    for (let x = 0; x < full.width; x++) {
      const i = (y * full.width + x) * 4;
      const fg = [full.pixels[i], full.pixels[i + 1], full.pixels[i + 2]];
      const bg = [withoutOwn.pixels[i], withoutOwn.pixels[i + 1], withoutOwn.pixels[i + 2]];
      const delta = Math.max(Math.abs(fg[0] - bg[0]), Math.abs(fg[1] - bg[1]), Math.abs(fg[2] - bg[2]));
      if (delta > CHANGE_TOLERANCE) changed.push({ x, y, fg, bg });
    }
  }

  if (changed.length === 0) return { painted: false };

  const core = erode(changed, full.width);

  // Worst contrast among the core (fully-covered, geometrically interior) pixels of THIS run —
  // not the average, and not the anti-aliased rim, which always measures artificially close to
  // the background. Each pixel keeps its OWN local background, so a run crossing a gridline or
  // another mark is judged against whichever side is actually harder to read, not an average.
  //
  // The single lowest-ratio pixel, not a trimmed one, is NOT what is taken here — a real 40-
  // character title measured this way landed on 5 pixels out of 40,907 "core" pixels (0.01%)
  // that erosion had not perfectly cleared, all on the curved parts of round letterforms
  // (a/e/o/s), and one still-slightly-blended pixel dragged the whole title's reading down from
  // 21:1 to 5.02:1. Trimming the worst 1% before taking the minimum keeps this "worst, not
  // average" — a gridline crossing a label affects a real, large share of its core pixels (over
  // 40% in the case this trim was checked against), so it survives easily; a handful of leftover
  // curve pixels, at a fraction 100x smaller, does not.
  const byRatio = core
    .map((p) => ({ ratio: contrast(toHex(p.fg), toHex(p.bg)), fg: p.fg }))
    .sort((a, b) => a.ratio - b.ratio);
  const worst = byRatio[Math.floor(byRatio.length * 0.01)];

  const ys = changed.map((p) => p.y);
  const measuredHeightPx = (Math.max(...ys) - Math.min(...ys) + 1) / ZOOM;
  const threshold = measuredHeightPx >= LARGE_TEXT_MEASURED_PX ? 3 : 4.5;

  return {
    fill: toHex(worst.fg),
    ratio: Number(worst.ratio.toFixed(2)),
    pass: worst.ratio >= threshold,
    unresolved: false,
  };
}

export function inspectSvg(svg, { ground }) {
  const stripped = svg.replace(/<!--[\s\S]*?-->/g, "");
  const { nodes, rootTitle } = findStructure(stripped);

  const contrastEntries = [];
  for (let index = 0; index < nodes.length; index++) {
    const measured = measureNode(stripped, nodes, index, ground);
    if (measured.painted === false) continue; // nothing rendered here; not a contrast question
    if (measured.unresolved) {
      contrastEntries.push({ fill: measured.raw, ratio: null, pass: false, unresolved: true });
      continue;
    }
    contrastEntries.push(measured);
  }

  const desc = /<desc>([\s\S]*?)<\/desc>/.exec(stripped);

  return {
    contrast: contrastEntries,
    altText: { present: Boolean(desc), text: desc ? desc[1].trim() : null },
    rootTitle,
  };
}
