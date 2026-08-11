// twin/skills/chart-beat/scripts/inspect-render.mjs
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
//
// The method retired that defect class; the two defects that outlived it were in this file's own
// TUNABLES, where uncertainty had been allowed to buy leniency, and both are now gone rather
// than retuned: the WCAG large-text carve-out (a threshold on measured ink height, which
// descenders inflate) is DELETED — one 4.5:1 floor for every text node — and the "trim the worst
// 1% of core pixels" rule is replaced by a connected-region test. See `CONTRAST_FLOOR` and
// `MIN_CREDIBLE_REGION_PX` below for the measurements behind each.

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

// ONE floor, 4.5:1, for every text node. WCAG's large-text carve-out (3:1) is deliberately NOT
// implemented, and an earlier attempt at it is deleted rather than retuned.
//
// The carve-out is defined on the CSS `font-size` — the em box. This tool has no em box: it
// measures painted ink, and ink height depends on which GLYPHS the string happens to contain. A
// previous version keyed the carve-out off the measured ink height (threshold 17px) and was
// reproduced granting 3:1 to `"Growth by region"` in `#949494` on white at font-size 18 — an
// ordinary axis label at a true 3.03:1 — purely because its `g`/`y` descenders pushed the
// measured height past the threshold. The identical label without descenders, same size, same
// fill, same 3.03:1, correctly failed. A verdict that flips on which letters a word contains is
// not a measurement. Deriving the threshold from cap-height or x-height instead cannot rescue it:
// separating cap-height from ink height needs to know which glyphs are present, which is exactly
// the markup-reading this file exists to avoid.
//
// The leniency also buys almost nothing. The only text in a chart large enough to have earned
// 3:1 is a title, and a title is set in the maximum-contrast ink `deriveFurniture` derives — it
// clears 4.5:1 without difficulty (the seed's own title reads 21:1 on light, 17.89:1 on dark).
// So the carve-out's whole practical effect was to wave through mid-grey labels. A genuinely
// large title at genuinely low contrast is now reported as a failure, and that is a failure
// worth seeing. Uncertainty resolves toward the stricter requirement, as everywhere else here.
const CONTRAST_FLOOR = 4.5;

// Anti-aliasing residue that survives erosion is SPARSE — isolated specks and short chains at
// the thin interior of a curved stroke. A part of a label that genuinely sits on a harder
// background is DENSE — a solid, connected region. So the worst reading is credited only once a
// run of adjacent pixels vouches for it, which is a structural test, not a rank-based one.
//
// This replaces a "discard the worst 1% of core pixels" trim, which was reproduced reporting
// 4.54:1 `pass: true` over a long `#767676` label crossing a 15px-wide `#8C8C8C` strip whose 1086
// solid, genuinely-illegible 1.35:1 pixels were under 1% of the label's ~51k core pixels. A
// percentage is the wrong instrument: what makes a bad reading credible is that it is CONNECTED,
// and connectedness does not scale with how long the rest of the label is.
//
// 7 is one above the largest residue component measured over 156 renders — 14 sizes from 9px to
// 48px, six strings (round letterforms, straight stems, wide caps, accents), regular and bold,
// four fill/ground pairs on both a light and a dark ground. Distribution of the largest residue
// component per render: 0 px ×40, 1 ×52, 2 ×21, 3 ×17, 4 ×10, 5 ×14, 6 ×2. Real crossings measure
// far above that: a 1px gridline behind 20px text gives 42, a 2px gridline behind 12px text 7, a
// 4px gridline behind 12px text 15, the 15px strip above 1086. The two populations only overlap
// at the very bottom — a 1px gridline behind 12-16px text produces a real 3-6px region that is
// genuinely indistinguishable from residue, and is missed. That band is stated in the report as
// an open hole rather than closed by lowering the threshold into the residue.
const MIN_CREDIBLE_REGION_PX = 7;

/**
 * The worst reading that a CONNECTED region of at least `MIN_CREDIBLE_REGION_PX` pixels vouches
 * for. `rated` must be sorted worst-ratio-first; each entry carries its own x/y.
 *
 * Walks the pixels in that order into a union-find, so at every step the components are exactly
 * the connected regions of "pixels at least this bad", and returns the first pixel whose own
 * region reaches the size threshold. Scattered residue never gets there; a solid crossing does
 * so almost immediately.
 *
 * If NO region ever reaches the threshold — the whole core is smaller than one credible region,
 * which happens on text small enough that erosion leaves only a handful of pixels — there is no
 * structure left to appeal to, so the single worst pixel is returned outright. That reads at or
 * below the true ink (a partly-blended pixel always sits closer to the background than the ink
 * does), never above it: the fallback can produce a false FAILURE on very small text, never a
 * false pass. It is also exactly what the 1%-trim did in that regime, since 1% of a handful of
 * pixels trims nothing — so this path is unchanged behaviour, not a new risk.
 */
function worstCredible(rated, width) {
  const parent = new Map();
  const size = new Map();
  const find = (key) => {
    let k = key;
    while (parent.get(k) !== k) {
      parent.set(k, parent.get(parent.get(k))); // path halving
      k = parent.get(k);
    }
    return k;
  };

  for (const pixel of rated) {
    const key = pixel.y * width + pixel.x;
    parent.set(key, key);
    size.set(key, 1);
    for (const [dx, dy] of NEIGHBOURS_8) {
      const neighbour = (pixel.y + dy) * width + (pixel.x + dx);
      if (!parent.has(neighbour)) continue; // not yet added: it reads better than this pixel
      const a = find(key);
      const b = find(neighbour);
      if (a === b) continue;
      const [big, small] = size.get(a) >= size.get(b) ? [a, b] : [b, a];
      parent.set(small, big);
      size.set(big, size.get(big) + size.get(small));
    }
    if (size.get(find(key)) >= MIN_CREDIBLE_REGION_PX) return pixel;
  }
  return rated[0];
}

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
  const byRatio = core
    .map((p) => ({ ratio: contrast(toHex(p.fg), toHex(p.bg)), fg: p.fg, x: p.x, y: p.y }))
    .sort((a, b) => a.ratio - b.ratio);
  const worst = worstCredible(byRatio, full.width);
  // `worst` identifies the local BACKGROUND on which this run reads least well. Its pixel can
  // still be an anti-aliased edge, so it is not a stable identity for the run's paint. Report the
  // most fully covered pixel as `fill`, while retaining the pessimistic local ratio for the
  // verdict. This keeps a tiny #AAAAAA tspan identifiable as #AAAAAA across rasteriser versions
  // without allowing its smoother edge to improve the contrast result.
  const painted = core.reduce((best, pixel) => {
    const delta = Math.max(...pixel.fg.map((channel, i) => Math.abs(channel - pixel.bg[i])));
    const bestDelta = Math.max(
      ...best.fg.map((channel, i) => Math.abs(channel - best.bg[i])),
    );
    return delta > bestDelta ? pixel : best;
  });

  return {
    fill: toHex(painted.fg),
    ratio: Number(worst.ratio.toFixed(2)),
    pass: worst.ratio >= CONTRAST_FLOOR,
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
