// twin/skills/chart-web/scripts/render-web.mjs
//
// The render ladder's third rung. Rung one (`chart-beat/scripts/render-still.mjs`) turns a
// React element into a PNG; rung two (`chart-video/scripts/render-video.mjs`) turns a
// Remotion composition into an mp4; this turns ONE React element — geometry-only SVG plus its HTML
// furniture, both drawn by the same component — into one self-contained HTML file: SSR'd
// server-side, one inlined interaction script, no external request.
//
// SECOND BUILD (see `references/web-discipline.md`, "Responsive behaviour"): the first build of
// this file mapped a component over an ARRAY of `WebLayout`s, SSRing one SVG per pre-rendered
// width and swapping between them with a CSS media query. The owner's own read of that shipped
// output was that it did not fill its container — a fixed 900px cap with empty gutters either
// side — and asked for a genuinely continuous fill instead, edge to edge, height growing with
// width rather than the width being capped. `ChartWebSeed` now draws ONE fluid frame; this file
// SSRs it ONCE and stops mapping over layouts entirely.
//
// It runs in node, which is why it is the piece that derives the furniture colours and measures
// the one gutter this format still measures (the y-axis label column — see `ChartWebSeed.tsx`):
// `deriveFurniture`/`measureText` live beside a native rasteriser in this skill's OWN
// `./render-still.mjs` — a copy of `chart-beat`'s, because a skill never imports another
// skill — which no browser bundle can load. Deriving here and passing ink/muted/grid/measure in as
// props keeps ONE implementation of the colour rule and the text-measurement rule per render,
// exactly the pattern `render-video.mjs` already set; the copies are kept in step by
// `splash/test/helper-parity.test.ts`.
//
// `renderWeb` below is the format's own machinery and knows nothing of any one story: it takes the
// component and the props to call it with as arguments, and it never reaches into the component's
// own returned markup — the SSR'd `<figure>` (geometry SVG, HTML furniture, filter, all of it) is
// dropped into the page body verbatim. `buildCss` below is the format's shared stylesheet: the
// structural CSS grid, the fluid sizing rule, the tooltip — and, ONLY for a beat that declared one
// (`assets/filter.ts`), the filter's own chrome and its generated `:checked` hiding rules —
// every class name a component targets (`.chart-figure`, `.chart-plot`, `.seg`, `.pt`, `.axis-label`,
// `.note`, `.end-label`, `.mark-active`, `.hit-area`, `#tooltip`) is a documented CONTRACT between this file and
// `ChartWebSeed.tsx`-shaped components, the same contract `.pt`/`.hit-area`/`#tooltip` already were
// in this format's first build. Everything under the CONFIG marker (the CONFIG block, `render`, the
// CLI block) is the runner for THIS SKILL'S OWN SEED — `assets/ChartWebSeed.tsx`, drawn from
// `assets/sample-data/` — which is the same "the skill's script hosts its own worked values behind
// a labelled seam" shape Tom's own reference skills use (`map-explainer/scripts/prep-geo.mjs`'s
// `COUNTRIES`/`RIVER`/`ANCHOR_BBOX`, `cesium-flyover/scripts/prep-cesium-path.mjs`'s `START`).
//
// It is the seed's runner and not a story's for one hard reason: NOTHING IN THIS FILE MAY IMPORT OUT
// OF THIS SKILL. A real beat writes its own runner in this shape beside its own story
// (`proof/co2-suisse/render-web.mjs` is exactly that from this format's first build), importing its
// own component and its own props; `renderWeb` itself does not change for it.
//
// Usage:  bun skills/chart-web/scripts/render-web.mjs [outDir] [--data <json>]

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText, readPalette } from "./render-still.mjs";
import {
  assertFontsEmbedded,
  displayableTextOf,
  dominantFontStack,
  embeddedWebFaces,
  fontFaceCss,
  fontRequestsInHtml,
} from "./typefaces.mjs";
import {
  assertOneVocabulary,
  buildFilterIndex,
  filterCss,
  filterNotes,
  filterOptionsForMarkup,
} from "../assets/filter.ts";
import { controlChromeCss } from "../assets/control-chrome.ts";
import { assertInteractionPlan } from "../assets/interaction-plan.ts";
import {
  ChartWebSeed,
  FRAME,
  seedFilterDeclaration,
} from "../assets/ChartWebSeed.tsx";

/** This format's own scope selector and radio-id prefix — the two arguments `filter.ts` refuses to
 *  know about, because the same vocabulary is vendored into a format that scopes on `.map-web-page`.
 *  Declared once here so the stylesheet, the markup's ids and the guard all read one pair. */
const FILTER_SCOPE = ".chart-figure";
const FILTER_ID_PREFIX = "chart-filter";

/** THE ONE KNOB THIS TRUNK CHROME CANNOT SET, AND WHY IT SETS NOTHING.
 *
 *  A vocabulary reserves a measured number of lines under its control so that choosing an option
 *  never pushes the plot down. This chrome cannot: it is emitted once for EVERY beat that declares a
 *  filter, and those beats' sentences are not one length. Measured on the three that declare one
 *  today: `web-income-life-expectancy` writes 38 characters ("Showing Africa — 49 of 164
 *  countries."), the seed 39, and `web-heatmap-europe-electricity` 215 — one sentence that sets on
 *  a single 18px line at 1512 and at 375, and another that wraps to four lines at 1512 and to nine
 *  at 375. Any single number here would be right for one of them and wrong for the other, which is
 *  worse than none: an over-reserve is dead space under every filter beat in the corpus, and an
 *  under-reserve is the defect the reserve exists to stop, still present and now also lying.
 *
 *  So `null` — the row costs nothing until a sentence appears, which is exactly what this chrome
 *  has always done. What it buys instead, and did not have before, is the live region: the notes now
 *  sit in one `.filter-notes` container carrying `role="status"`, so a narrowed view is ANNOUNCED
 *  rather than merely drawn. Reserving it per beat needs a per-beat knob and is recorded, not
 *  smuggled in under a number nobody measured. */
const FILTER_NOTE_RESERVE = null;

const HERE = dirname(fileURLToPath(import.meta.url));

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is the SEED beat's own words and defaults: what a
// journalist writing their own web beat replaces wholesale. Everything else in this file — `renderWeb`
// and its `{ component, props, outDir, name }` signature, `inlineable`, `escapeHtml`, `buildCss` —
// is this format's own mechanics and is left alone.
// The colours are the one part of `SEED` that is not words: they are read back from this
// skill's own `PALETTE.md` with `readPalette`, exactly as a beat reads its story's answer.
const SEED_PALETTE = readPalette(join(HERE, "..", "assets"), { stopAt: join(HERE, "..") });
/** The seed beat's own constants — the same words `scripts/render-preview.mjs` renders the seed's
 *  preview with, so the skill's two renders never disagree about what the chart says. Duplicated
 *  rather than imported from that script: importing it would also run its own top-level Remotion-free
 *  resvg render as a side effect, which this script must not trigger. */
const SEED = {
  ground: SEED_PALETTE.ground,
  accent: SEED_PALETTE.accent,
  subject: "the sample town",
  title: "Rainfall over the sample town fell by a third",
  source: "Sample data — not a real measurement",
  alt: "A line falling from 912 to 604 across eleven readings.",
};
/** Where the seed's own data lives, and what its own output is named. A real beat's runner points at
 *  its own frozen series and names its own file — a different story's data does not sit at this
 *  path, and a different beat is not named `rainfall.html`. */
const DEFAULT_DATA_PATH = join(HERE, "../assets/sample-data/rainfall.json");
const DEFAULT_OUT_DIR = "/tmp/web-twin";
const OUTPUT_NAME = "rainfall.html";
// =========================================

/**
 * SSRs `component` ONCE with `props` (plus derived furniture and `measure`), wraps the resulting
 * markup in one self-contained HTML file (title, css, inlined interaction script) and writes it to
 * disk. Generic across every web beat: it does not know a story's own frame numbers, tick counts,
 * gutter widths or type scale — only that the component returns markup ready to embed as-is. This
 * function never reads a field off the component's own return value, so it is not coupled to any
 * one story's furniture shape.
 *
 * `props` carries everything the component needs BESIDES the derived furniture/measure
 * (`title`/`source`/`ground`/`accent`/`frame`/... — the story's own numbers). `deriveFurniture(props.ground)`
 * and `measureText` are supplied here, once, exactly as `render-video.mjs` supplies them to its own
 * composition — so every web beat shares one implementation of the colour rule and the
 * text-measurement rule, never a copy per story.
 */
async function renderWeb({ component, props, outDir, name }) {
  const furniture = deriveFurniture(props.ground);

  // THE FILTER, IF THIS BEAT DECLARED ONE. `props.filter` is the beat's own declaration
  // (`assets/filter.ts` — what may be narrowed and on what) and `props.filterKeys` is what the beat
  // actually draws, the list every count and every emptiness check is measured against. A beat that
  // declares nothing gets an EMPTY index, `attrsFor` then hands out no attributes, `filterCss`
  // returns the empty string and `filterNotes` returns nothing — no markup, no rule, no listener,
  // which is the difference between a filter that is removable and a control that is merely hidden.
  const filterIndex = buildFilterIndex(props.filter, props.filterKeys ?? []);
  const markup = renderToStaticMarkup(
    createElement(component, {
      ...props,
      ...furniture,
      measure: measureText,
      filterIndex,
      filterOptions: filterOptionsForMarkup(props.filter, FILTER_ID_PREFIX),
      filterNotes: filterNotes(props.filter, props.filterKeys ?? []),
    }),
  );
  // Read the rendered markup back before it is written: an element drawn from a datum that carries
  // `data-key` without the vocabulary's own `data-filter` is refused here, so a beat cannot ship the
  // half-tagged datum whose visible symptom is a label left on the map after its mark was filtered
  // away (B6.18b). What this cannot see — an element carrying no attributes at all — is what the
  // driven guard walks a real browser for.
  assertOneVocabulary(markup, filterIndex);

  // THE ENTRANCE IS READ OFF THE MARKUP, never passed in. A beat declares an entrance the same way
  // it declares a filter — by DOING it, here by tagging its own layers with `data-entrance-motion`
  // — and a beat that declares none gets no keyframes, no rules and no class ever added. See
  // `buildCss`'s own `entranceRules`.
  const declaresEntrance = /\sdata-entrance-motion="/.test(markup);

  const interactionSource = await readFile(
    join(HERE, "../assets/interaction.mjs"),
    "utf8",
  );
  const inlineScript = inlineable(interactionSource);

  // THE TYPEFACE TRAVELS WITH THE PAGE, AS BYTES.
  //
  // Until this was added, a web beat emitted `font-family: "Merriweather", Georgia, serif` and
  // loaded nothing: no link, no `@font-face`, no bytes. Every reader fell through to the bridge or
  // to their own machine's default, which is the silent substitution `loadSystemFonts: false` had
  // just finished ending on the static side. `shared/design-base/typefaces.mjs` (carried here as
  // `./typefaces.mjs`) fetches the woff2 subsets the page's own words need and returns them
  // base64'd; nothing is linked, so the page makes no third-party request at read time — which is
  // both a privacy exposure a newsroom should not have to accept and something a CSP may block.
  //
  // The document is assembled TWICE from one template: once to be read (which families, which
  // weights, which characters — derived from what the component actually drew, never from a
  // default), and once to be written, with the faces in it. `assertFontsEmbedded` then refuses to
  // write a page that names a family it does not carry.
  //
  // AND EACH FACE IS CUT DOWN to the characters this page can display, which roughly halves what
  // it costs. `displayableTextOf` is what "can display" means, and it is deliberately wider than
  // the rendered words: the readable attributes a tooltip reads back, the strings inside a JSON
  // payload (a live map hands one to its own tooltip), and anything a stylesheet generates. A
  // glyph missing only on hover is in no screenshot, so what each cut face really carries is
  // measured off its own cmap and the coverage guard is per family — `subsetWebFace` and
  // `assertFontsEmbedded` in `typefaces.mjs`.
  const stack = dominantFontStack(markup);
  const baseCss = buildCss({
    ground: props.ground,
    accent: props.accent,
    ...furniture,
    // The plot cell's ratio, taken from the geometry this component actually drew rather than from
    // anything the beat declares twice. See `plotViewBoxOf`.
    plot: plotViewBoxOf(markup, name ?? "this beat"),
    filter: props.filter ?? null,
    entrance: declaresEntrance,
    fontStack: stack,
  });
  const page = (css) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escapeHtml(props.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${css}
</style>
</head>
<body>
${markup}
<div id="tooltip" role="status" aria-live="polite" hidden></div>
<script>
${inlineScript}
</script>
</body>
</html>
`;

  const draft = page(baseCss);

  // EVERY CONTROL CHANGES THE PICTURE, and it is refused here rather than in CI so an author meets
  // it while writing the beat. A control whose state, once applied, equals the default state is one
  // the reader operates while nothing moves — the web sibling of the card `assertStates` refuses in
  // `scrolly` and the event `assertEventStates` refuses in `chart-video`. `props.interaction` is
  // the plan the beat wrote before the code (`assets/interaction-plan.ts`); a beat that has not
  // written one yet still meets the mechanical half, and the census names it
  // (`splash/test/web-interaction-changes-the-picture.test.ts`).
  assertInteractionPlan(draft, props.interaction ?? null, name ?? "this beat");

  const faces = await embeddedWebFaces(fontRequestsInHtml(draft).requests, displayableTextOf(draft));
  const html = page(`${fontFaceCss(faces)}\n${baseCss}`);
  assertFontsEmbedded(html);
  assertPlotCellIsItsViewBox(html, name ?? "this beat");
  assertPlotCellFillsItsTrack(html, name ?? "this beat");

  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, name);
  await writeFile(outPath, html);
  return { outPath };
}

/** Strips the `export` keyword from each top-level declaration so `interaction.mjs` — authored as
 *  an ES module for its own unit tests — can also run as a plain classic `<script>`: no
 *  `type="module"`, so it keeps working in a CMS iframe or sandboxed embed that restricts module
 *  scripts. The file's own top-level `initAll()` call survives untouched and runs the moment the
 *  script tag is parsed, since it sits after the figure and the tooltip div in the HTML. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * THE PLOT'S OWN GEOMETRY, READ OFF THE MARKUP THE COMPONENT JUST DREW — never passed in, never
 * typed into the stylesheet.
 *
 * The cell rules in `buildCss` are generated from these two numbers, so the ratio the CSS holds and
 * the ratio the `<svg>` declares cannot drift apart: there is only one place they come from. A beat
 * whose control swaps between several plates (`unit.ts` emits one `svg.chart[data-unit]` per option)
 * draws several of these, and they must all declare the SAME box — a control that changed the box
 * would change the cell under the reader's hands, which is a different beat, not a different state.
 */
function plotViewBoxOf(markup, name = "this beat") {
  const boxes = new Map();
  for (const tag of String(markup).matchAll(/<svg\b[^>]*>/g)) {
    const source = tag[0];
    if (!/\bclass="(?:[^"]*\s)?chart(?:\s[^"]*)?"/.test(source)) continue;
    const box = /\bviewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*"/.exec(source);
    if (box) boxes.set(`${box[1]}|${box[2]}`, { width: Number(box[1]), height: Number(box[2]) });
  }
  if (boxes.size === 0)
    throw new Error(
      `${name}: no <svg class="chart"> with a viewBox in the rendered markup. The plot cell is ` +
        `sized from that box, so there is nothing to size it from and every filled shape on the ` +
        `page would be drawn at whatever ratio the window happened to leave.`,
    );
  if (boxes.size > 1)
    throw new Error(
      `${name}: the plot draws ${boxes.size} different viewBoxes (${[...boxes.keys()].join(", ")}). ` +
        `One beat is one box: a cell can only carry one ratio, and a control that changed it would ` +
        `reshape the plot under the reader rather than answer a question about it.`,
    );
  return [...boxes.values()][0];
}

/** The same two numbers, refused rather than defaulted. A stylesheet built with no geometry would
 *  silently go back to the stretch this whole mechanism exists to end. */
function assertPlotGeometry(plot) {
  const width = Number(plot?.width);
  const height = Number(plot?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error(
      `buildCss needs the plot's own viewBox ({width, height}) to size the cell; it was given ` +
        `${JSON.stringify(plot)}. Without it the cell takes whatever shape the window leaves and ` +
        `every circle, arrowhead, icon and proportional symbol on the page is drawn out of round.`,
    );
  return { width, height };
}

/**
 * THE GUARD, ON THE WRITTEN PAGE RATHER THAN ON THE INTENTION.
 *
 * Re-reads the document that is about to be written and refuses it unless the cell rules carry the
 * ratio of the `<svg class="chart">` the same document draws. It is deliberately not a check that
 * `buildCss` was called correctly — that would only ever restate the line above it. It reads the
 * emitted CSS, so a beat that appended a rule of its own redefining `--cell-w`, or that drew a
 * plate the stylesheet was not built from, is refused here rather than shipped out of round.
 */
function assertPlotCellIsItsViewBox(html, name = "this beat") {
  const { width, height } = plotViewBoxOf(html, name);
  const declared = /--cell-h:\s*calc\(var\(--track-w\)\s*\*\s*([\d.]+)\s*\/\s*([\d.]+)\)/.exec(html);
  if (!declared)
    throw new Error(
      `${name}: the page carries no --cell-h rule, so its plot cell takes whatever ratio the ` +
        `window leaves it and every filled shape in the geometry is drawn stretched.`,
    );
  // Read as H/W and compared as H/W, because that is the direction the rule is written in: the
  // cell's height is derived from the track's width, never the other way round.
  const want = height / width;
  const got = Number(declared[1]) / Number(declared[2]);
  if (Math.abs(got - want) > 1e-6)
    throw new Error(
      `${name}: the plot cell's height is ${declared[1]}/${declared[2]} (${got.toFixed(4)}) of its ` +
        `width while the <svg class="chart"> declares ${height}/${width} (${want.toFixed(4)}). The ` +
        `cell must carry its own viewBox's ratio exactly, or preserveAspectRatio="none" stretches ` +
        `the drawing by the difference.`,
    );
}

/**
 * THE SECOND GUARD: THE CELL TAKES THE WHOLE WIDTH THE FIGURE LEFT IT.
 *
 * The first guard says the cell has the right SHAPE. It says nothing at all about its SIZE, and
 * that is exactly the hole the owner fell into: a cell built as `min(track, track x W/H)` is the
 * right shape at every width and, under a height clamp, the wrong size at most of them — the
 * connected scatter drew 954px inside a 1420px track at 1512x860, the proportional symbol map 695px
 * inside 1464px. Two empty side gutters, no guard anywhere in the tree, and the owner read it off
 * the render: "la carte ne prend pas toute la largeur tout comme les charts".
 *
 * So: `--cell-w` must be `var(--track-w)` and nothing else — no min(), no clamp(), no max-width,
 * no second term of any kind — and `--track-w` must be the container's whole inline size less the
 * two gutters the beat DECLARED. Those gutters are the "declared margins" the width is measured
 * against; anything else subtracted there is width the reader was promised and did not get.
 *
 * Like its sibling this reads the WRITTEN page rather than the intention, so a beat that appended a
 * rule of its own narrowing the cell is refused here rather than shipped with empty sides.
 */
function assertPlotCellFillsItsTrack(html, name = "this beat") {
  const track = /--track-w:\s*calc\(100cqw - var\(--y-gutter\) - var\(--end-gutter, 0px\)\)/.test(html);
  if (!track)
    throw new Error(
      `${name}: the page's --track-w is not the container's own inline size less the two declared ` +
        `gutters. The track is what "the full available width" means here; measured against ` +
        `anything else, the drawing stops short of the frame and the reader gets empty margins ` +
        `beside it.`,
    );
  const declared = /--cell-w:\s*([^;\n]+);/.exec(html);
  if (!declared)
    throw new Error(
      `${name}: the page carries no --cell-w rule, so nothing decides how much of the track the ` +
        `drawing takes.`,
    );
  const value = declared[1].trim();
  if (value !== "var(--track-w)")
    throw new Error(
      `${name}: the plot cell is sized "${value}" instead of "var(--track-w)". The cell is driven ` +
        `by the WIDTH, always: anything that wraps the track in a min(), a clamp() or a second ` +
        `term lets some other axis decide, and the drawing shrinks away from the frame's two ` +
        `sides. That was refused on a real render; a figure taller than the window is the cost ` +
        `that was accepted in its place.`,
    );
}

/**
 * The format's shared stylesheet — see this file's own header comment for the class-name contract
 * every `ChartWebSeed.tsx`-shaped component relies on. Nothing here is a literal hex outside the
 * furniture custom properties this function itself sets from the derived colours; every type size
 * is a FIXED CSS pixel value (either hard-coded below, e.g. `.chart-title`'s `24px`... no — read
 * from the component's own `--title-size` etc. custom properties, set once per render on the
 * figure's own inline style) so nothing here ever tracks the `<svg>`'s `viewBox` width.
 */
// The frame's own inner margin -- FIXED, never a fraction of container width, on purpose: this
// format's whole redesign is "type/spacing stays a fixed CSS value, only the plot geometry
// stretches" (see web-discipline.md, "Responsive behaviour"), and an inset is furniture, not
// geometry. A value big enough to read as deliberate at 1600px (24px) is still a small, safe
// fraction of a 375px frame (~6%) rather than the large-fixed-value failure mode that would eat a
// narrow frame -- checked directly at all four widths this beat's own report screenshots, not
// assumed. Found missing by the owner's own screenshot: filling the container was read, correctly,
// as "the frame spans it," which does not by itself mean the CONTENT inside may touch its edges.
const FRAME_PAD_PX = 24;

// THERE IS NO `PLOT_FLOOR_PX` ANY MORE, and the constant it replaces is recorded rather than
// silently dropped: `const PLOT_FLOOR_PX = 120` was "the plot rectangle's own floor [...] when the
// frame's preferred height exceeds the visible window, the plot absorbs every pixel of the
// shortfall and nothing else moves. This number is where that absorption stops."
// A floor only means something for a box that can be squeezed. The plot can no longer be squeezed:
// the window-fit clamp is gone (`.chart-figure`), the plot is `flex: 0 0 auto`, and its height is
// its width's own consequence. Keeping the floor would have been actively harmful, not merely
// dead: it was the single worst source of anisotropy this format ever measured — the pictogram at
// 375x812 came to 2.15x TALLER than round, because the floor held the height while the width
// collapsed, worse than any wide-and-short window ever managed.

/**
 * The control's own chrome, emitted ONLY for a beat that declared a filter — the styling of the
 * fieldset, the segmented pills, and the narrowing note the reader is owed. The rules that decide
 * WHAT is hidden are not here: they are generated per option by `filter.ts`'s `filterCss`, over
 * `[data-filter]`, so no element type is ever named twice.
 *
 * ONE OVERTURN, RECORDED RATHER THAN SLIPPED IN. This block used to end with
 * `.chart-figure:has(#period-early:checked) .seg[data-period="late"] { opacity: 0.2 }` and its
 * three siblings, and the comment above them said filtering "only ever dims, never removes, which
 * is what keeps every point reachable and every hover/focus answer honest". That reasoning is real
 * and it is now overturned, for two reasons stated so a future reader meets the cost:
 *
 *   - **Dimming cannot satisfy what a filter is for.** A datum at `opacity: 0.2` is still on the
 *     page, still in the tab order, still answers a hover with its own value. "Everything that
 *     value drew disappears together" is not expressible as an opacity; the label left behind after
 *     its mark was hidden (B6.18b) is the same defect one shade lighter.
 *   - **Two formats cannot mean two things by one word.** `map-web` has always removed. A
 *     vocabulary vendored into both that dimmed in one and removed in the other would be one name
 *     over two behaviours, which is the thing this whole rework exists to end.
 *
 * What the dimming was protecting is kept by a different mechanism: the axis, the grid, the
 * reference rule and every piece of furniture carry no `data-filter` at all, so the frame a reader
 * is comparing against never moves when the marks inside it do.
 */
/**
 * THE FILTER'S CHROME WAS THE TWENTY-FIRST COPY OF A DRAWING THAT NOW HAS ONE HOME.
 *
 * Every vocabulary in `assets/` used to carry its own forty lines of fieldset, legend, pill rail and
 * reserved note row, and this block — the one `filter.ts` and `hold.ts` borrow, because neither has
 * a chrome of its own — was the twenty-first. `control-chrome.ts` now draws all of them. What was
 * lost by leaving it behind was not theoretical: for as long as it stayed, every beat with a FILTER
 * would have kept the solid ink capsule the owner refused three times while every other control on
 * the same corpus had been redrawn, which is a worse page than the defect.
 *
 * WHAT CHANGED IN THE DRAWING, beyond the shared file's own reversal (the chosen option is a 22 %
 * wash of the direction's accent, a full-strength ring and darkened words, not `--ink` on
 * `--ground`): the sentence row is RESERVED. It used to be `.filter-note` paragraphs with no
 * container and no reserve, so revealing one pushed the plot down by its own height, and it carried
 * no `role="status"` — a narrowed view announced nothing. The notes now sit in one
 * `.filter-notes` live region, exactly as the other twenty controls' do.
 *
 * ONE OVERTURN FROM THE BLOCK THIS REPLACES, CARRIED FORWARD RATHER THAN DROPPED. The old comment
 * ended with four dimming rules and the sentence that filtering "only ever dims, never removes,
 * which is what keeps every point reachable and every hover/focus answer honest". That was
 * overturned before this rewrite and stays overturned, for two reasons worth meeting again:
 *
 *   - **Dimming cannot satisfy what a filter is for.** A datum at `opacity: 0.2` is still on the
 *     page, still in the tab order, still answers a hover with its own value. "Everything that
 *     value drew disappears together" is not expressible as an opacity; the label left behind after
 *     its mark was hidden (B6.18b) is the same defect one shade lighter.
 *   - **Two formats cannot mean two things by one word.** `map-web` has always removed. A
 *     vocabulary vendored into both that dimmed in one and removed in the other would be one name
 *     over two behaviours, which is the thing this whole rework exists to end.
 *
 * What the dimming was protecting is kept by a different mechanism: the axis, the grid, the
 * reference rule and every piece of furniture carry no `data-filter` at all, so the frame a reader
 * is comparing against never moves when the marks inside it do.
 *
 * The rules that decide WHAT is hidden are still not here: they are generated per option by
 * `filter.ts`'s `filterCss`, over `[data-filter]`, so no element type is ever named twice.
 */
function filterChromeCss() {
  return controlChromeCss({
    scope: FILTER_SCOPE,
    name: "filter",
    notes: {
      // 8px UNDER the row, not the module's default of nothing. The top y-axis label hangs half a
      // line above the plot (`.axis-label.y` is `translateY(-50%)` at `top: 0`), so a sentence with
      // no clearance below it is overprinted by "950 mm" — seen in the render, not reasoned about.
      // The block this replaced spent the same 8px on the paragraph itself; it is spent on the row
      // now, so it is there whether or not a sentence is showing.
      margin: "4px 0 8px",
      reserve: FILTER_NOTE_RESERVE,
    },
  });
}

/**
 * THE ENTRANCE — the whole of it, and it is emitted ONLY for a beat that declared layers.
 *
 * The design, in one paragraph. SSR ships the SETTLED page, exactly as it did before this existed:
 * every keyframe below runs *to* the state the element already has, so the finished graphic is what
 * the file contains and the animation only ever takes something away and gives it back. An
 * `IntersectionObserver` (`assets/interaction.mjs`'s `initEntrance`) adds ONE class to the figure
 * when it enters the viewport; CSS gives each LAYER its own delay, read off the entrance contract
 * (`assets/entrance.ts`) and written on the element as a custom property by the component. **No
 * JavaScript writes an opacity, a transform or a length.** With the script absent: no class, no
 * animation, the complete page. Under `prefers-reduced-motion: reduce`: the whole block below does
 * not exist, so there is no `animation-name` to resolve and the change is instant in every engine
 * with no branch anywhere.
 *
 * WHY THE KEYFRAMES ARE INSIDE THE MEDIA QUERY TOO, and not just the rules that use them. This is
 * `scrolly`'s precedent, argued in `skills/scrolly/references/scrolly-discipline.md`: put
 * the animated property itself out of reach under `reduce`, rather than overriding it back with a
 * second rule. A `@media (prefers-reduced-motion: reduce) { * { animation: none } }` reset is the
 * other way people write this, and it is worse — it depends on a cascade nobody can see, it can be
 * outweighed, and it leaves an `animation-name` resolving on the element for anything that asks.
 * Here, under `reduce`, the guard's own assertion is literally true: nothing animates because
 * nothing that animates was ever defined.
 *
 * THE THREE MOTIONS, and the reason there are exactly three:
 *
 *   - `fade` — a layer of FURNITURE arriving, or a LABEL arriving on the mark it names. Opacity
 *     only, which composites and never reflows.
 *   - `wipe` — `transform: scaleX()` from the element's own origin. Used by the reference rule
 *     (which is a `<line>` starting at x=0, so scaling it IS advancing its far end — the video's
 *     `interpolate(referenceProgress, [0, 1], [plot.left, plot.right])`, expressed as a transform)
 *     and by the reveal (a `<rect>` inside a `<clipPath>`, at x=0, whose growth uncovers the curve
 *     left to right — the video's `drawnSoFar`, expressed as a clip).
 *   - `land` — `transform: scale()` on the SUBJECT, from nothing to its full size. The component
 *     guarantees the origin by drawing the mark at (0,0) inside a translated `<g>`, so there is no
 *     `transform-box`/percentage question to get wrong at two different engine versions.
 *
 * `transform-box: view-box` with `transform-origin: 0 0` is stated on both transform motions rather
 * than left to the initial value, which has changed in Chrome's own lifetime (`border-box` then
 * `view-box`) and resolves `0 0` to two different points under `fill-box`. Both elements are
 * authored at their own local origin, so `0 0` is the left edge of the wipe and the centre of the
 * subject — but only if the box is the view box, so it is said.
 *
 * ONLY `opacity` AND `transform` ARE ANIMATED. Nothing here animates a width, a height, a length,
 * an inset or a `stroke-dashoffset` — the first four because they are layout and would move the
 * words around the graphic, and the last because it was MEASURED not to work: a probe drove
 * `pathLength="1"` + `stroke-dasharray: 1` + an animated `stroke-dashoffset` on a path carrying this
 * format's own `vector-effect="non-scaling-stroke"`, under this format's own
 * `preserveAspectRatio="none"`, and the line was already 99 % drawn at t=0 and had reached only 80 %
 * at the end. The two coordinate spaces disagree. The wipe was driven in the same probe and tracked
 * the clock exactly (9 % / 24 % / 50 % / 75 % / 99 % at 200/500/1000/1500/2000ms).
 */
function entranceCss() {
  return `
@media (prefers-reduced-motion: no-preference) {
  @keyframes chart-entrance-fade { from { opacity: 0; } }
  @keyframes chart-entrance-wipe { from { transform: scaleX(0); } }
  @keyframes chart-entrance-land { from { transform: scale(0); } }

  /* One class, added once, by an IntersectionObserver — never on load. An embed can sit far below
     the fold of an article, and an entrance nobody watched is a worse artifact than a static one.
     \`backwards\` and not \`forwards\`: the element holds the keyframe's FROM state through its own
     delay (without it every layer would be fully drawn until its turn came, which is no entrance at
     all), and once the animation is over the element returns to its own settled style rather than
     being frozen at a computed value. */
  .chart-figure.entered [data-entrance-motion] {
    animation-duration: var(--e-dur);
    animation-delay: var(--e-delay);
    animation-timing-function: var(--e-ease, linear);
    animation-fill-mode: backwards;
  }
  .chart-figure.entered [data-entrance-motion="fade"] { animation-name: chart-entrance-fade; }
  .chart-figure.entered [data-entrance-motion="wipe"] { animation-name: chart-entrance-wipe; }
  .chart-figure.entered [data-entrance-motion="land"] { animation-name: chart-entrance-land; }
  .chart-figure.entered [data-entrance-motion="wipe"],
  .chart-figure.entered [data-entrance-motion="land"] {
    transform-box: view-box;
    transform-origin: 0 0;
  }
}
`.trim();
}

function buildCss({ ground, accent, ink, muted, grid, plot, filter = null, entrance = false, fontStack = "sans-serif" }) {
  const { width: plotWidth, height: plotHeight } = assertPlotGeometry(plot);
  // EVERY LINE THE FILTER COSTS IS PAID ONLY BY A BEAT THAT DECLARED ONE. Measured on the committed
  // pages the day this gate was added: **21 of 21 chart x web pages carried 12 lines of
  // `.chart-filter` styling and 3 `#period-early`/`#period-late` dimming rules, and not one of them
  // contained a `<fieldset class="chart-filter">`** — the seed's own story's ids, shipped as dead
  // weight in every delivered file because the stylesheet was written for one beat and handed to
  // every beat. `filterChrome` is now the whole cost and it is an empty string without a
  // declaration, which is what makes "removable" literal.
  const filterChrome = filter ? filterChromeCss() : "";
  const filterRules = filterCss(filter, { scope: FILTER_SCOPE, idPrefix: FILTER_ID_PREFIX });
  // THE SAME GATE THE FILTER PAYS, for the same reason. `entrance` is not a flag a runner sets: it
  // is read back off the SSR'd markup by `renderWeb` below — true only when the beat's own
  // component actually tagged layers. A beat that tags none ships not one byte of the block above,
  // which is the difference between a format a beat may decline and a format every page pays for.
  const entranceRules = entrance ? entranceCss() : "";
  return `
:root {
  --ground: ${ground};
  --accent: ${accent};
  --ink: ${ink};
  --muted: ${muted};
  --grid: ${grid};
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  /* The beat's OWN face, read off the markup it just drew (dominantFontStack) — not a literal.
     This rule used to say "Helvetica, Arial, sans-serif", which set every word the components do
     not style themselves, the tooltip above all, in a typeface nobody chose and nothing embedded. */
  font-family: ${fontStack};
}

/* THE FLUID FILL — the redesign this file exists to ship. .chart-figure and everything inside
   .chart-plot take the FULL width of whatever contains them, edge to edge, no max-width cap and
   no fixed rung to swap between. Height is never independently set on the plot: aspect-ratio
   (set per-render on .chart-plot's own inline style, from the component's real geometry) grows
   the height WITH the width, so a very wide container gets a taller chart rather than a flat,
   letterboxed strip -- the failure mode capping the width would otherwise avoid at the cost of
   empty gutters, and the failure mode letting width AND height both float freely would risk
   instead. The header block and the source line USED to carry a 640px reading-measure cap; they
   no longer do. A title that stops at 640px above a chart running to 1600 reads as a broken box,
   not as a comfortable measure -- see references/web-discipline.md, "The words take the same width
   as the graphic," for the reversal and what now bounds the line length instead.

   "Fills the container" is a claim about the FRAME's own edges, never about the content inside
   it -- FRAME_PAD_PX is the fixed inner margin that keeps that distinction real: title, caveat,
   filter, every axis label, the end label and the source line all sit inside it, so nothing ever
   touches the frame's own edge at any width. box-sizing:border-box (above) is what makes width:100%
   plus this padding still equal exactly 100% of the parent -- no overflow, no second width to
   reconcile. */
.chart-figure {
  margin: 0;
  width: 100%;
  padding: ${FRAME_PAD_PX}px;
  display: flex;
  flex-direction: column;
  /* THE WINDOW-FIT CLAMP IS GONE, AND THE COMMENT IT REPLACES IS QUOTED SO THE TRADE IS MET RATHER
     THAN LOST: "THE WINDOW FIT. A beat is one thing a reader looks at, not a document they scroll
     through: the whole figure must be visible at once. [...] Clamping here, rather than capping
     the width or shortening the geometry, is what keeps the fill and the fit true at the same
     time." That was true of a plot whose cell was free to change shape. It stopped being true the
     day the cell was made to carry its own viewBox ratio, because from then on the three things
     could not all hold at once, and one of them had to go:

       1. the drawing keeps its own proportions (a circle is round);
       2. the drawing takes the whole width the figure has;
       3. the whole figure fits inside the window's height.

     (1) is not negotiable -- on a map it is not a style defect, it is a false geography. (2) and
     (3) are the arbitration, and the owner made it on a render: "la carte ne prend pas toute la
     largeur tout comme les charts, fais en sorte qu'ils prennent toute la largeur en respectant
     les marges." So (3) goes. On a wide, short window the figure is now TALLER than the window and
     the page scrolls.

     DELETED RATHER THAN REPLACED BY AN INNER SCROLLER, and the reason is the sentence the old
     comment ended on: this file is embedded inside an article as often as it is opened on its own.
     An 'overflow: auto' here would put a second scrollbar inside the article's own, and a reader
     who scrolls the page would stop at the figure's edge instead of moving through it. The
     DOCUMENT's own vertical scroll is the honest overflow: it is the one the reader already has.
     Horizontal overflow stays forbidden -- see 'assertPlotCellFillsItsTrack' and 'checkFit'. */
}
/* Everything except the plot keeps its natural height: words are never squeezed to make a chart
   fit, the chart is. flex-shrink:0 is the half of that rule the browser does not default to. */
.chart-header, .chart-source { flex: 0 0 auto; }
.chart-title {
  margin: 0 0 4px;
  font-size: var(--title-size);
  font-weight: var(--title-weight);
  color: var(--ink);
}
.chart-caveat, .chart-source {
  margin: 0;
  font-size: var(--subtitle-size);
  color: var(--muted);
}
.chart-source { font-size: var(--source-size); margin-top: 10px; }

${filterChrome}

.chart-plot {
  position: relative;
  width: 100%;
  display: grid;
  /* THREE COLUMNS, THE THIRD NORMALLY EMPTY. The format has always had a left gutter and an
     x-axis band; a beat whose marks END somewhere meaningful (the bump's final ranks) also needs a
     right gutter, and it used to get one by declaring an IMPLICIT third column of its own. That was
     invisible to this stylesheet, and invisible is exactly what '--track-w' below cannot afford:
     the cell IS the track, so a track 127px wider than the beat actually has puts the drawing 127px
     wider than the column it sits in. Declared here, defaulting to nothing, it costs a beat that
     has no end gutter exactly zero.
     The first ROW is '1fr' in a box whose own height is indefinite, which resolves to its items'
     own contribution -- and every item in it is exactly '--cell-h'. That is how the plot's height
     comes to be the cell's height plus the x-axis band, with no ratio typed over the whole box. */
  grid-template-columns: var(--y-gutter) 1fr var(--end-gutter, 0px);
  grid-template-rows: 1fr var(--x-axis-h);
  /* THE PLOT NEVER SHRINKS AND NEVER CARRIES A FLOOR, AND THE COMMENT THIS REPLACES IS QUOTED SO
     NOTHING IS LOST: "The one shrinkable item in the figure's column [...] Only when the column
     overflows does 1 (flex-shrink) let this box give the height back." and "min-height is BOTH the
     floor and the override of flexbox's own min-height:auto".
     Both existed to serve the window-fit clamp, which is gone (see .chart-figure above). With the
     clamp gone there is no shortfall to absorb, so 'flex: 0 0 auto'; and the floor was, measured,
     the WORST stretcher of the lot -- the pictogram at 375x812 came to 2.15x the wrong way because
     the floor pinned the height while the width collapsed. Nothing here pins a height any more:
     this box's height is its content's, and its content is one cell derived from its width.
     A LENGTH in the plane may follow the stretch, because it is a distance and it belongs to the
     plane, but a SHAPE never may. The format already knew this for TEXT (which is why every word
     lives in HTML outside the viewBox) and for STROKES (vector-effect="non-scaling-stroke"); it
     had never written it down for filled shapes. The owner read it off a render before any guard
     did: "les cercles sont pas parfaits tout comme les fleches, on dirait que c'est etire". */
  flex: 0 0 auto;

  /* THE CELL IS DRIVEN BY THE WIDTH, ALWAYS, AND ITS HEIGHT FOLLOWS FROM ITS OWN viewBox RATIO.
     That is what makes preserveAspectRatio="none" a uniform SCALE rather than a distortion, and it
     is what puts the drawing edge to edge in the width the figure has.
     THE COMMENT THIS REPLACES IS QUOTED, BECAUSE ITS REASONING WAS SOUND AND ITS RESULT WAS
     REFUSED: "the min() pair below is what absorbs, with ONE mechanism, all three causes of
     anisotropy: the fixed-pixel gutters [...], the height clamp, and the min-height floor" and
     "The cell is CENTRED in its track, so a wide-and-short window gets even side margins and a
     legible drawing rather than a squashed one." A min() pair is a CONTAIN: under a height clamp
     it is the HEIGHT that ends up driving, and the drawing shrinks away from the frame's two
     sides. The owner refused exactly that, on a map, in one line: "la carte ne prend pas toute la
     largeur tout comme les charts, fais en sorte qu'ils prennent toute la largeur en respectant
     les marges." So the two causes the min() was absorbing are removed at the source (no clamp, no
     floor) instead of being papered over, and the third -- the fixed-pixel gutters -- is handled
     by taking the cell's height from the TRACK's width rather than from any ratio typed over the
     whole box. --cell-w is var(--track-w) with nothing wrapped round it: no min(), no clamp(), no
     cap of any kind. An empty side gutter is now a refusal, not a cost. See
     'assertPlotCellFillsItsTrack'.
     WHY 'container-type: inline-size' AND WHY THE INLINE 'aspect-ratio' IS OVERRIDDEN. The plot's
     height must be the cell's height plus the x-axis band, exactly. It used to come from an
     'aspect-ratio: totalWidth / totalHeight' the component sets inline, which mixes fixed pixel
     gutters with viewBox units and is therefore only right at ONE width: measured across the 40
     committed beats, that ratio puts the plot's box out by up to 115px (the diverging bar at
     1464px) and 84px (the gantt) -- far too much to absorb as slack. So the height is taken from
     the content instead, which is the cell this rule just derived. 'container-type: size' implies
     contain: size and would forbid that (a size container may not be sized by its contents);
     'inline-size' contains only the axis that is actually definite. The inline aspect-ratio is
     overridden with !important because forty shipped components set it in their style attribute,
     and an important author declaration is the one thing that outranks a normal inline one; the
     seed no longer writes it at all. Nothing in the tree queries THIS box's block axis -- every
     beat with an '@container (max-height:)' rule (columns, grouped bar, marimekko, treemap, the
     life-expectancy note) declares its own size container on the box it actually measures.
     The numbers are the beat's own, read off the <svg> it just drew -- never typed here. */
  container-type: inline-size;
  aspect-ratio: auto !important;
  --track-w: calc(100cqw - var(--y-gutter) - var(--end-gutter, 0px));
  --cell-w: var(--track-w);
  --cell-h: calc(var(--track-w) * ${plotHeight} / ${plotWidth});
}
/* BOTH GUTTERS FOLLOW THE CELL. Each is the cell's own height, so a label at 'top: 62%' lands on
   the same 62 % of the geometry it names. There is no translate any more and no slack to cross:
   the cell fills its track in both axes by construction, so the drawing's edge and the track's
   edge are the same edge. */
.chart-plot .y-axis {
  grid-column: 1;
  grid-row: 1;
  position: relative;
  height: var(--cell-h);
  min-height: 0;
  margin-block: auto;
}
.chart-plot .end-axis {
  grid-column: 3;
  grid-row: 1;
  position: relative;
  height: var(--cell-h);
  min-height: 0;
  margin-block: auto;
}
/* Every box that SHARES the plot cell takes the cell's exact size and centres in the track: the
   geometry itself, the HTML overlay that annotates it, and any layer a beat adds over both (the
   tree's own convention names one '...-layer' -- 'option-layer', 'verdict-layer', 'cell-layer').
   min-width/min-height: 0 overrides a grid item's automatic minimum size, which would otherwise
   refuse to let a box carrying intrinsic geometry shrink below it. */
svg.chart,
.chart-plot .overlay,
.chart-plot > [class*="-layer"] {
  grid-column: 2;
  grid-row: 1;
  width: var(--cell-w);
  height: var(--cell-h);
  min-width: 0;
  min-height: 0;
  margin: auto;
}
svg.chart { display: block; }
/* pointer-events:none is load-bearing, not decoration: .overlay shares the exact grid cell the
   svg's own .hit-area occupies, and a plain div with no pointer-events override intercepts every
   mouse/touch event over the WHOLE plot before it ever reaches the svg beneath it -- caught only by
   driving a real browser (page.mouse.move landed on .overlay, not the hit-area, and the tooltip
   never appeared), never by the markup or a unit test. Inherited by every span inside it, which is
   correct: none of them is a control. */
.chart-plot .overlay { position: relative; pointer-events: none; }
/* The x-axis band is the y-axis's mirror: the cell's width, directly under the cell. It used to be
   lifted by 'translateY(0px - var(--cell-slack-y))' across the vertical slack a contained cell left
   above it; a width-driven cell leaves none, so the lift is gone rather than computed as zero. */
.chart-plot .x-axis {
  grid-column: 2;
  grid-row: 2;
  position: relative;
  width: var(--cell-w);
  min-width: 0;
  margin-inline: auto;
}

.axis-label {
  position: absolute;
  font-size: var(--axis-size);
  white-space: nowrap;
}
.axis-label.y { right: 10px; transform: translateY(-50%); }
.axis-label.x { top: 6px; transform: translateX(-50%); }

.note, .end-label {
  position: absolute;
  font-size: var(--note-size);
  white-space: nowrap;
  background: var(--ground);
  padding: 1px 4px;
  border-radius: 2px;
}
.note.reference-label { transform: translateY(-100%) translateY(-4px); }
.note.peak-label.above { transform: translate(-50%, -100%) translateY(-6px); }
.end-label {
  font-size: var(--label-size);
  font-weight: var(--label-weight);
  transform: translate(-100%, -50%) translateX(-10px);
}

/* THE HOVERABLE LINE's own contract with the components that draw one. pointer-events:stroke is
   the whole mechanism: it makes the STROKE the hit region rather than the bounding box, which for
   a diagonal connector is mostly empty space -- a reader aiming at the line they can see would
   otherwise be answered by a rectangle that also covers everything between the line and the frame.
   The twin is transparent and generously wide (the component states the width as a knob); nothing
   here paints it. .line-active is what a component may style to bring the visible line forward. */
.line-hit { pointer-events: stroke; cursor: pointer; fill: none; }
.line-hit:focus { outline: none; }
.line-hit:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

.pt { cursor: pointer; }
.pt:hover, .pt:focus, .pt-active {
  fill: var(--muted);
  outline: none;
}
/* THE MARK ANSWERS, NOT A DOT ON TOP OF IT.
   A .pt is a circle r=5 at the reading's own position, and filling it is exactly right for a
   LINE: the reading is a point there, and the dot IS the mark. It is wrong for a bar or a column,
   where the mark is the whole rectangle and the dot prints a grey spot floating at its top -- the
   owner's own reading of the ranking beat, and the reason these two rules exist.
   A component says which it has by giving the point a data-mark-ref naming the shape that
   answers for it; interaction.mjs then puts .mark-active on [data-mark="<that name>"] on
   hover, focus and tap, and the point itself stays invisible. A beat that names no shape is
   unchanged to the byte: a line beat keeps its dot.
   WHAT THE ACTIVE MARK BECOMES IS THE BEAT'S, NEVER THIS FILE'S. --mark-active is read off the
   mark, so the one place that knows a column is drawn in the accent or in the neutral is the one
   place that says what it takes under a pointer -- and it is measured there against the ground, in
   each direction, rather than nudged here with a brightness filter, which lightens on a light
   ground and on a dark one alike. --muted is the fallback, which is what a mark with no declared
   colour already got. */
.pt[data-mark-ref]:hover, .pt[data-mark-ref]:focus, .pt[data-mark-ref].pt-active {
  fill: transparent;
}
.mark-active { fill: var(--mark-active, var(--muted)); }
.pt:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}
#tooltip {
  position: fixed;
  max-width: 220px;
  padding: 6px 10px;
  font-size: 13px;
  line-height: 1.3;
  background: var(--ground);
  color: var(--ink);
  border: 1px solid var(--muted);
  border-radius: 3px;
  pointer-events: none;
  z-index: 10;
}
#tooltip[hidden] { display: none; }

${filterRules}

${entranceRules}
`.trim();
}

/** The seed beat's own runner: reads the seed's own `{ year, value }` series, builds its props, hands
 *  the seed component and its `FRAME` (`ChartWebSeed`, `FRAME`, imported above from this skill's own
 *  `assets/`) to the format's generic `renderWeb`. */
async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const data = JSON.parse(await readFile(dataPath, "utf8"));
  if (data.length < 2)
    throw new Error(`need at least two readings, got ${data.length}`);

  const { outPath } = await renderWeb({
    component: ChartWebSeed,
    props: {
      data,
      title: SEED.title,
      source: SEED.source,
      alt: SEED.alt,
      subject: SEED.subject,
      ground: SEED.ground,
      accent: SEED.accent,
      frame: FRAME,
      // The seed's own filter declaration and the keys it draws. A beat that wants none omits both
      // lines — nothing downstream needs a `false` anywhere.
      filter: seedFilterDeclaration(data.map((d) => d.year)),
      filterKeys: data.map((d) => String(d.year)),
    },
    outDir,
    name,
  });
  return { outPath, readings: data.length };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const positional = argv.find((a) => !a.startsWith("--"));
  const dataPath = resolve(flag("--data", DEFAULT_DATA_PATH));
  const outDir = resolve(positional ?? flag("--out", DEFAULT_OUT_DIR));

  const { outPath, readings } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${readings} readings]`);
}

export {
  render,
  renderWeb,
  SEED,
  buildCss,
  plotViewBoxOf,
  assertPlotCellIsItsViewBox,
  assertPlotCellFillsItsTrack,
};
