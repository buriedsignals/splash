// twin/skills/twin-chart-web/scripts/render-web.mjs
//
// The render ladder's third rung. Rung one (`twin-chart-beat/scripts/render-still.mjs`) turns a
// React element into a PNG; rung two (`twin-chart-video/scripts/render-video.mjs`) turns a
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
// the one gutter this genre still measures (the y-axis label column — see `ChartWebSeed.tsx`):
// `deriveFurniture`/`measureText` live beside a native rasteriser in this skill's OWN
// `./render-still.mjs` — a copy of `twin-chart-beat`'s, because a skill never imports another
// skill — which no browser bundle can load. Deriving here and passing ink/muted/grid/measure in as
// props keeps ONE implementation of the colour rule and the text-measurement rule per render,
// exactly the pattern `render-video.mjs` already set; the copies are kept in step by
// `splash-twin/test/helper-parity.test.ts`.
//
// `renderWeb` below is the genre's own machinery and knows nothing of any one story: it takes the
// component and the props to call it with as arguments, and it never reaches into the component's
// own returned markup — the SSR'd `<figure>` (geometry SVG, HTML furniture, filter, all of it) is
// dropped into the page body verbatim. `buildCss` below is the genre's shared stylesheet: the
// structural CSS grid, the fluid sizing rule, the tooltip — and, ONLY for a beat that declared one
// (`assets/filter.ts`), the filter's own chrome and its generated `:checked` hiding rules —
// every class name a component targets (`.chart-figure`, `.chart-plot`, `.seg`, `.pt`, `.axis-label`,
// `.note`, `.end-label`, `.hit-area`, `#tooltip`) is a documented CONTRACT between this file and
// `ChartWebSeed.tsx`-shaped components, the same contract `.pt`/`.hit-area`/`#tooltip` already were
// in this genre's first build. Everything under the CONFIG marker (the CONFIG block, `render`, the
// CLI block) is the runner for THIS SKILL'S OWN SEED — `assets/ChartWebSeed.tsx`, drawn from
// `assets/sample-data/` — which is the same "the skill's script hosts its own worked values behind
// a labelled seam" shape Tom's own reference skills use (`map-explainer/scripts/prep-geo.mjs`'s
// `COUNTRIES`/`RIVER`/`ANCHOR_BBOX`, `cesium-flyover/scripts/prep-cesium-path.mjs`'s `START`).
//
// It is the seed's runner and not a story's for one hard reason: NOTHING IN THIS FILE MAY IMPORT OUT
// OF THIS SKILL. A real beat writes its own runner in this shape beside its own story
// (`proof/co2-suisse/render-web.mjs` is exactly that from this genre's first build), importing its
// own component and its own props; `renderWeb` itself does not change for it.
//
// Usage:  bun skills/twin-chart-web/scripts/render-web.mjs [outDir] [--data <json>]

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText, readPalette } from "./render-still.mjs";
import {
  assertOneVocabulary,
  buildFilterIndex,
  filterCss,
  filterNotes,
  filterOptionsForMarkup,
} from "../assets/filter.ts";
import {
  ChartWebSeed,
  FRAME,
  seedFilterDeclaration,
} from "../assets/ChartWebSeed.tsx";

/** This genre's own scope selector and radio-id prefix — the two arguments `filter.ts` refuses to
 *  know about, because the same vocabulary is vendored into a genre that scopes on `.map-web-page`.
 *  Declared once here so the stylesheet, the markup's ids and the guard all read one pair. */
const FILTER_SCOPE = ".chart-figure";
const FILTER_ID_PREFIX = "chart-filter";

const HERE = dirname(fileURLToPath(import.meta.url));

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is the SEED beat's own words and defaults: what a
// journalist writing their own web beat replaces wholesale. Everything else in this file — `renderWeb`
// and its `{ component, props, outDir, name }` signature, `inlineable`, `escapeHtml`, `buildCss` —
// is this genre's own mechanics and is left alone.
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

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escapeHtml(props.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss({ ground: props.ground, accent: props.accent, ...furniture, filter: props.filter ?? null, entrance: declaresEntrance })}
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
 * The genre's shared stylesheet — see this file's own header comment for the class-name contract
 * every `ChartWebSeed.tsx`-shaped component relies on. Nothing here is a literal hex outside the
 * furniture custom properties this function itself sets from the derived colours; every type size
 * is a FIXED CSS pixel value (either hard-coded below, e.g. `.chart-title`'s `24px`... no — read
 * from the component's own `--title-size` etc. custom properties, set once per render on the
 * figure's own inline style) so nothing here ever tracks the `<svg>`'s `viewBox` width.
 */
// The frame's own inner margin -- FIXED, never a fraction of container width, on purpose: this
// genre's whole redesign is "type/spacing stays a fixed CSS value, only the plot geometry
// stretches" (see web-discipline.md, "Responsive behaviour"), and an inset is furniture, not
// geometry. A value big enough to read as deliberate at 1600px (24px) is still a small, safe
// fraction of a 375px frame (~6%) rather than the large-fixed-value failure mode that would eat a
// narrow frame -- checked directly at all four widths this beat's own report screenshots, not
// assumed. Found missing by the owner's own screenshot: filling the container was read, correctly,
// as "the frame spans it," which does not by itself mean the CONTENT inside may touch its edges.
const FRAME_PAD_PX = 24;

// The plot rectangle's own floor, in CSS pixels. `.chart-plot` is the ONE shrinkable item in the
// figure's flex column (see `buildCss` below): when the frame's preferred height — header + filter +
// the plot at its canonical `aspect-ratio` + source line — exceeds the visible window, the plot
// absorbs every pixel of the shortfall and nothing else moves. This number is where that absorption
// stops. Measured, not guessed: the seed's own natural plot height at the narrowest width this genre
// verifies at (375px) is 153px, so a floor BELOW that can never fire on any window this genre
// actually ships to, and only a pathologically short window (roughly under 300px of viewport
// height) reaches it. Reaching it is deliberate: a window too short for a legible chart gets a
// scrollbar, which is honest, rather than a 20px strip pretending to be a line chart.
const PLOT_FLOOR_PX = 120;

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
 *   - **Two genres cannot mean two things by one word.** `twin-map-web` has always removed. A
 *     vocabulary vendored into both that dimmed in one and removed in the other would be one name
 *     over two behaviours, which is the thing this whole rework exists to end.
 *
 * What the dimming was protecting is kept by a different mechanism: the axis, the grid, the
 * reference rule and every piece of furniture carry no `data-filter` at all, so the frame a reader
 * is comparing against never moves when the marks inside it do.
 */
const FILTER_CHROME_CSS = `
/* The filter this beat declared. Native radios in a real <fieldset>: reachable and operable from
   the keyboard with no help from this stylesheet or the inline script, and the hiding rules
   (generated per option by filter.ts) are PURE CSS — :checked plus :has() on the enclosing figure —
   so the control works identically with the inline script absent. */
.chart-filter { flex: 0 0 auto; }
.chart-filter {
  margin: 12px 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: center;
  font-size: var(--filter-size);
}
/* float:left is not a layout instruction here -- inside a flex container float is ignored
   outright. It is the HTML rendering spec's own opt-out: only the first legend child that is
   NOT floated or absolutely positioned becomes the "rendered legend" the browser lifts into the
   fieldset's border. Floated, this one stays an ordinary child, which means the flex container
   above can lay it out on the same line as the options. Without it the browser puts the legend on
   a row of its own -- verified in the render, and worth ~20px of the vertical budget the
   window-fit rule above is spending. */
.chart-filter legend { float: left; font-weight: 600; padding: 0; color: var(--ink); }
.chart-filter .options { display: inline-flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; }
.chart-filter label { position: relative; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--muted); }
.chart-filter input { cursor: pointer; margin: 0; }

/* THE NARROWING NOTE — the reader-facing consequence, and it is not optional. A filtered view is a
   PARTIAL view while the title above it states the whole claim, so every narrowed option reveals
   one sentence counting what is shown against what the beat draws ("Showing Above 8 t — 4 of 27
   countries."). Both numbers are derived from the beat's own frozen data by filter.ts's
   filterNotes(), never typed. The unfiltered option reveals nothing, because it IS the claim.
   Hidden by default and revealed by the same :checked mechanism that narrows the marks, so it
   works with JavaScript off. */
.filter-note {
  margin: 0 0 8px;
  font-size: var(--source-size);
  color: var(--muted);
  flex: 0 0 auto;
}

/* THE SEGMENTED CONTROL -- the considered treatment, layered ON TOP of the working native radios
   above rather than replacing them. The owner's read of the first shipped filter was that plain
   radios read as a placeholder, and they did: default blue dots with a bare word beside each,
   indistinguishable from an unfinished form.
   Guarded on :has() on purpose, and the guard is the whole reason this is safe. The checked state
   is expressed through :has() (the <input> is the thing that is :checked; the pill that must
   change is its parent <label>), so an engine without :has() could not draw a checked pill at
   all -- and rather than leave such an engine with identical unlit pills and a hidden input, the
   entire block is dropped there and the reader gets the plain native radios above, which state
   their own checked-ness without any help. That is the same engine in which this genre's hiding
   rules could not work either, so the fallback is not a second design to maintain -- it is the
   design this genre already had.
   The checked pill inverts to ink-on-ground rather than filling with the accent: the accent is
   reserved for the subject (visual-system.md), and a control that borrowed it would make the one
   colour that means something in this frame also mean "you clicked here". ink/ground is the
   maximum-contrast pair deriveFurniture already computed for this ground, so the inversion is
   legible by construction at whatever ground a newsroom brings. Font weight deliberately does NOT
   change between states -- a bolder checked label is wider, and the unchecked pills beside it
   would shift sideways every time the reader changed their mind.
   NOT covered, stated rather than hidden: forced-colors / high-contrast mode, where the pill's
   background is overridden by the OS and the checked state loses its only signal. Nothing else in
   this genre honours forced colours either (the chart is SVG with explicit fills, which that mode
   does not touch), so handling it here alone would be a half-measure -- see
   references/web-discipline.md. */
@supports selector(:has(*)) {
  .chart-filter .options {
    gap: 0;
    padding: 2px;
    border: 1px solid var(--grid);
    border-radius: 999px;
  }
  .chart-filter label {
    gap: 0;
    padding: 5px 12px;
    border-radius: 999px;
    line-height: 1.2;
    white-space: nowrap;
    transition: background-color 120ms ease, color 120ms ease;
  }
  .chart-filter label input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    appearance: none;
    -webkit-appearance: none;
    border-radius: 999px;
  }
  .chart-filter label:hover { color: var(--ink); }
  .chart-filter label:has(input:checked) { background: var(--ink); color: var(--ground); }
  .chart-filter label:has(input:focus-visible) { outline: 2px solid var(--ink); outline-offset: 2px; }
}
`.trim();

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
 * `twin-scrolly`'s precedent, argued in `skills/twin-scrolly/references/scrolly-discipline.md`: put
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
 * genre's own `vector-effect="non-scaling-stroke"`, under this genre's own
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

function buildCss({ ground, accent, ink, muted, grid, filter = null, entrance = false }) {
  // EVERY LINE THE FILTER COSTS IS PAID ONLY BY A BEAT THAT DECLARED ONE. Measured on the committed
  // pages the day this gate was added: **21 of 21 chart x web pages carried 12 lines of
  // `.chart-filter` styling and 3 `#period-early`/`#period-late` dimming rules, and not one of them
  // contained a `<fieldset class="chart-filter">`** — the seed's own story's ids, shipped as dead
  // weight in every delivered file because the stylesheet was written for one beat and handed to
  // every beat. `filterChrome` is now the whole cost and it is an empty string without a
  // declaration, which is what makes "removable" literal.
  const filterChrome = filter ? FILTER_CHROME_CSS : "";
  const filterRules = filterCss(filter, { scope: FILTER_SCOPE, idPrefix: FILTER_ID_PREFIX });
  // THE SAME GATE THE FILTER PAYS, for the same reason. `entrance` is not a flag a runner sets: it
  // is read back off the SSR'd markup by `renderWeb` below — true only when the beat's own
  // component actually tagged layers. A beat that tags none ships not one byte of the block above,
  // which is the difference between a genre a beat may decline and a genre every page pays for.
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
  font-family: Helvetica, Arial, sans-serif;
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
  /* THE WINDOW FIT. A beat is one thing a reader looks at, not a document they scroll through:
     the whole figure must be visible at once. Width filling its container and height following
     from aspect-ratio was only half the rule -- at 1600x800 the measured figure came to 902px
     against an 800px window (102px of it below the fold: the end label, the x-axis and the source
     line), and at 1920x950 it came to 1051px against 950. Clamping here, rather than capping the
     width or shortening the geometry, is what keeps the fill and the fit true at the same time.
     max-height, never height: when the frame's natural height already fits (a tall window, a
     narrow one), nothing changes at all and no empty space is reserved -- which matters because
     this file is embedded inside an article as often as it is opened on its own.
     Two declarations, not one: dvh is what a mobile browser's collapsing toolbar makes correct,
     vh is what an engine without dvh still understands, and the later declaration simply wins
     where it parses. */
  max-height: 100vh;
  max-height: 100dvh;
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
  grid-template-columns: var(--y-gutter) 1fr;
  grid-template-rows: 1fr var(--x-axis-h);
  /* The one shrinkable item in the figure's column -- see .chart-figure's max-height above. Its
     flex BASE size is still the canonical aspect-ratio (set per-render on this element's own
     inline style, from the real geometry), so in a window with room the shape is exactly what it
     always was, byte for byte. Only when the column overflows does 1 (flex-shrink) let this box
     give the height back, and the <svg>'s own preserveAspectRatio="none" follows it down without
     letterboxing or clipping -- the same stretch that already absorbs the gutter drift this
     genre documents. A flatter plot is a real cost, paid knowingly: a slope read at a shallower
     angle is still the same series, whereas a chart whose end label is below the fold is not a
     chart the reader has seen.
     min-height is BOTH the floor (see PLOT_FLOOR_PX) and the override of flexbox's own
     min-height:auto, which would otherwise refuse to shrink this box below its content size and
     re-open the overflow this whole rule exists to close. */
  flex: 0 1 auto;
  min-height: ${PLOT_FLOOR_PX}px;
}
.chart-plot .y-axis { grid-column: 1; grid-row: 1; position: relative; }
svg.chart { grid-column: 2; grid-row: 1; width: 100%; height: 100%; display: block; }
/* pointer-events:none is load-bearing, not decoration: .overlay shares the exact grid cell the
   svg's own .hit-area occupies, and a plain div with no pointer-events override intercepts every
   mouse/touch event over the WHOLE plot before it ever reaches the svg beneath it -- caught only by
   driving a real browser (page.mouse.move landed on .overlay, not the hit-area, and the tooltip
   never appeared), never by the markup or a unit test. Inherited by every span inside it, which is
   correct: none of them is a control. */
.chart-plot .overlay { grid-column: 2; grid-row: 1; position: relative; pointer-events: none; }
.chart-plot .x-axis { grid-column: 2; grid-row: 2; position: relative; }

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
 *  `assets/`) to the genre's generic `renderWeb`. */
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

export { render, renderWeb, SEED, buildCss };
