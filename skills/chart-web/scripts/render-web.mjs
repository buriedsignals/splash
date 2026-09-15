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
    // The reading column's measure, from the words that column will actually hold, in the size the
    // source line is set at — the smallest register any of those words uses, so the measure is
    // never wider than the text needs.
    aside: { minWidth: asideMeasure(markup) },
    bands: plotBandsOf(markup, name ?? "this beat"),
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
  assertNoEmptySurplus(html, name ?? "this beat");

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

/** The column's measure, refused rather than defaulted, for the same reason the plot's geometry is.
 *  A stylesheet built with no measure would fall back to some number this file invented, and the
 *  column beside the drawing would be whatever that number happened to be on every beat at once —
 *  which is the "gutter with a label" the whole arrangement exists to avoid. */
function assertAsideMeasure(aside) {
  const min = Number(aside?.minWidth);
  if (!Number.isFinite(min) || min <= 0)
    throw new Error(
      `buildCss needs the reading column's own measure ({minWidth}), derived from the words that ` +
        `column holds; it was given ${JSON.stringify(aside)}. Without it the surplus width beside ` +
        `the drawing has no floor and the layout cannot say where the drawing stops.`,
    );
  return Math.ceil(min);
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
  const declared = /aspect-ratio:\s*([\d.]+)\s*\/\s*([\d.]+)\s*;/.exec(html);
  if (!declared)
    throw new Error(
      `${name}: the page carries no aspect-ratio on the boxes that share the plot cell, so the ` +
        `drawing takes whatever shape the window leaves it and every filled shape in the geometry ` +
        `is drawn stretched.`,
    );
  const want = width / height;
  const got = Number(declared[1]) / Number(declared[2]);
  if (Math.abs(got - want) > 1e-6)
    throw new Error(
      `${name}: the plot cell is shaped ${declared[1]}/${declared[2]} (${got.toFixed(4)}) while the ` +
        `<svg class="chart"> declares ${width}/${height} (${want.toFixed(4)}). The cell must carry ` +
        `its own viewBox's ratio exactly, or preserveAspectRatio="none" stretches the drawing by ` +
        `the difference.`,
    );
}

/**
 * THE SECOND GUARD: NO WIDTH IS LEFT EMPTY.
 *
 * The first guard says the drawing has the right SHAPE. It says nothing about where the width goes,
 * and that is exactly the hole the owner fell into twice. A cell built as `min(track, track x W/H)`
 * is the right shape at every width and, under a height budget, leaves two empty gutters: 954px of
 * drawing inside a 1420px track on the connected scatter at 1512x860, 695px inside 1464px on the
 * symbol map. Removing the budget instead made every page taller than the window, which he refused
 * in turn: "ca prend la largeur mais ne respecte pas la hauteur qu'on avait avant".
 *
 * So what is refused here is EMPTY SURPLUS, in either arrangement. Three structural claims, read off
 * the written page rather than off the intention, because a beat that appends a rule of its own is
 * the case this exists for:
 *
 *   1. the figure's second column is `minmax(var(--aside-min), 1fr)` — every pixel the drawing does
 *      not take belongs to the words, and there is no third place for width to go;
 *   2. the plot is `width: max-content` — the drawing's own column hugs the drawing plus the beat's
 *      declared gutters, so the surplus the column receives is the real surplus;
 *   3. everything that shares the cell is sized `height: 100%` + `aspect-ratio: W / H`, capped by
 *      `--room-w` expressed as a HEIGHT — never as a width, which would keep the height where it was
 *      and break the very ratio the first guard protects.
 */
function assertNoEmptySurplus(html, name = "this beat") {
  const { width, height } = plotViewBoxOf(html, name);
  const checks = [
    [
      /minmax\(var\(--aside-min\),\s*1fr\);/,
      `the figure's second track is not "minmax(var(--aside-min), 1fr)". That track is what takes ` +
        `every pixel the drawing does not ` +
        `take to the words beside it; without it the leftover width has somewhere else to go, and ` +
        `where it goes is nowhere — an empty gutter, which is the defect this guard exists for.`,
    ],
    [
      /grid-template-columns:\s*\n?\s*min\(/,
      `the drawing's column is not stated as a min() of the room the words leave and the width its ` +
        `own height implies. Left to 'auto' the track is sized in a pass that cannot know the ` +
        `row's height — measured on the cartogram at 1512x860 it resolved 1014.3px for a plot that ` +
        `then laid out at 1158px and ran 120px over the column beside it.`,
    ],
    [
      new RegExp(`aspect-ratio:\\s*${width}\\s*/\\s*${height}`),
      `the page does not size what shares the plot cell by "aspect-ratio: ${width} / ${height}", ` +
        `the viewBox its own <svg> declares. Sized any other way the drawing is either stretched ` +
        `or afloat in a box bigger than itself.`,
    ],
    [
      /\.chart-plot\s*\{[^}]*aspect-ratio:\s*auto\s*!important/,
      `the plot does not override the inline "aspect-ratio" its component still sets. Left in ` +
        `force it fights "width: max-content" and the plot's box stops being the drawing's: ` +
        `measured, 1176px wider than the drawing it holds, and 852px off the side of the document.`,
    ],
    [
      /100dvh - var\(--frame-pad\) \* 2/,
      `the drawing's column does not take the frame's own inset out of the window's height. Left ` +
        `in, the drawing is sized for a window taller than it has and overruns the column beside ` +
        `it; and expressed with a container unit instead, it is off by that inset again — an ` +
        `element is not its own query container, so '100cqw' means the viewport here and the ` +
        `figure's content box one level down. Measured, exactly 48px of drawing lost either way.`,
    ],
  ];
  for (const [re, why] of checks) if (!re.test(html)) throw new Error(`${name}: ${why}`);
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

// The gap between the drawing and the column that reads it, and the gap between two blocks stacked
// inside that column. Both fixed, for the reason FRAME_PAD_PX is fixed: a gap is furniture, not
// geometry, and a gap expressed as a fraction of the window is one that vanishes on a phone and
// gapes on an ultrawide.
const ASIDE_GAP_PX = 24;
const ASIDE_ROW_GAP_PX = 10;

// THE COLUMN'S OWN MEASURE, DERIVED FROM THE BEAT'S OWN WORDS — never typed.
//
// The column beside the drawing has to be wide enough to be a column. What decides that is the
// text it holds, in the face this page actually embeds, so it is measured here rather than guessed:
// the widest line the column can be asked to set without breaking (its longest single word), and a
// reading measure of `ASIDE_MEASURE_CHARS` characters taken from the column's own longest sentence.
// The wider of the two wins, because a column narrower than either is one that either breaks a word
// or sets four words to a line.
//
// `ASIDE_MEASURE_CHARS` is the only literal here and it is the classic one: a newspaper column is
// cut at the low end of the 45-75 character band, which is where a narrow measure stops being
// comfortable. Everything else — the face, the size, the words — comes from the page.
const ASIDE_MEASURE_CHARS = 45;

/** The text the column will hold: every direct child of the figure that is neither the header nor
 *  the plot. Read off the markup the component just drew, so a vocabulary that arrives next week is
 *  measured without this file learning its name. */
function asideTextOf(markup) {
  const figure = /<figure\b[^>]*class="(?:[^"]*\s)?chart-figure(?:\s[^"]*)?"[^>]*>([\s\S]*)<\/figure>/.exec(
    String(markup),
  );
  if (!figure) return [];
  const body = figure[1];
  const out = [];
  let depth = 0;
  let keep = false;
  const tag = /<(\/?)([a-zA-Z0-9]+)\b([^>]*?)(\/?)>/g;
  let m;
  let last = 0;
  while ((m = tag.exec(body))) {
    if (keep) out.push(body.slice(last, m.index));
    const closing = m[1] === "/";
    const selfClosing = m[4] === "/";
    if (!closing && depth === 0) {
      const cls = (/class="([^"]*)"/.exec(m[3]) ?? [, ""])[1];
      const names = cls.split(/\s+/);
      keep =
        m[2].toLowerCase() !== "style" &&
        !names.includes("chart-header") &&
        !names.includes("chart-plot");
    }
    if (!selfClosing) depth += closing ? -1 : 1;
    if (depth === 0) keep = false;
    last = tag.lastIndex;
  }
  return out
    .join(" ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .split(/\s*[\n\r]+\s*/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** THE BEAT'S OWN THREE FIXED BANDS, read off the `.chart-plot` the component just drew.
 *
 *  They are inline custom properties on that element — `--y-gutter`, `--end-gutter`, `--x-axis-h` —
 *  and the figure's own grid needs them as NUMBERS, not as `var()`s. A nested `var()` inside a
 *  custom property is substituted against the element that DECLARES it, and these live one level
 *  down: written as `var(--y-gutter, 0px)` in a rule on `.chart-figure` they silently take their
 *  fallback, and the drawing comes out one gutter too wide. Measured: on the cartogram at 1512 that
 *  was a 1282px plot across a 282px column. So they are read here, once, from the markup.
 *
 *  A beat that re-declares one inside a query (the lollipop widens its x-axis band when a name
 *  wraps) still gets that inside the plot; what is baked here is the base value the figure's own
 *  column is measured from. */
function plotBandsOf(markup, name = "this beat") {
  const tag = /<div[^>]*class="(?:[^"]*\s)?chart-plot(?:\s[^"]*)?"[^>]*style="([^"]*)"/.exec(String(markup));
  const style = tag ? tag[1].replace(/&quot;/g, '"') : "";
  const px = (prop) => {
    const m = new RegExp(`${prop}:\\s*([-\\d.]+)px`).exec(style);
    return m ? Number(m[1]) : 0;
  };
  if (!tag)
    throw new Error(
      `${name}: no <div class="chart-plot"> with a style attribute in the rendered markup. The ` +
        `figure's own column is measured from the bands that element declares, and there is ` +
        `nothing here to measure it from.`,
    );
  return { yGutter: px("--y-gutter"), endGutter: px("--end-gutter"), xAxisH: px("--x-axis-h") };
}

/** The column's measure in CSS pixels, from those words and the register they are actually set in.
 *  The size is read off the figure's own `--source-size` custom property — the smallest register any
 *  word in that column uses — so a beat that sets its words larger or smaller gets a column measured
 *  at ITS size, and this file never types a type size it does not own. */
function asideMeasure(markup) {
  const declared = /--source-size:\s*([\d.]+)px/.exec(String(markup));
  if (!declared)
    throw new Error(
      "this beat's figure declares no --source-size, so the reading column beside the drawing has " +
        "no register to be measured in. The column's width is derived from the words it holds at " +
        "the size they are set in; there is nothing here to derive it from.",
    );
  const size = Number(declared[1]);
  const weight = 400;
  const lines = asideTextOf(markup);
  const words = lines.flatMap((l) => l.split(" ")).filter(Boolean);
  const longestWord = words.reduce(
    (w, word) => Math.max(w, measureText(word, { fontSize: size, fontWeight: weight })),
    0,
  );
  const longestLine = lines.reduce((a, b) => (b.length > a.length ? b : a), "");
  const sample = longestLine.slice(0, ASIDE_MEASURE_CHARS);
  const measure = measureText(sample, { fontSize: size, fontWeight: weight });
  return Math.ceil(Math.max(longestWord, measure));
}

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

function buildCss({ ground, accent, ink, muted, grid, plot, aside, bands = { yGutter: 0, endGutter: 0, xAxisH: 0 }, filter = null, entrance = false, fontStack = "sans-serif" }) {
  const { width: plotWidth, height: plotHeight } = assertPlotGeometry(plot);
  const asideMin = assertAsideMeasure(aside);
  const { yGutter, endGutter, xAxisH } = bands;
  const sideBands = yGutter + endGutter;
  // THE BREAKPOINT, DERIVED AND NOT TYPED. Two columns hold while the drawing beside the column is
  // at least as much of a drawing as the column is a column. The floor under it is the column's own
  // measure carried through the DRAWING'S OWN ASPECT: a drawing whose short side is under the
  // reading measure of the words next to it has stopped being the subject of the figure. So the
  // drawing's floor is `asideMin` on its short side, which on its long side is
  // `asideMin * max(W/H, 1)` wide; add the beat's own declared gutters, the gap, the column, and
  // the frame's two margins, and that is the window width below which the column goes underneath.
  // Every term comes from the beat or from the words; nothing here is a round number somebody liked.
  const drawMin = Math.ceil(asideMin * Math.max(plotWidth / plotHeight, 1));
  const stackBelowPx = Math.ceil(
    FRAME_PAD_PX * 2 + drawMin + ASIDE_GAP_PX + asideMin,
  );
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

/* THE FIGURE IS TWO COLUMNS: THE DRAWING, AND THE WORDS THAT READ IT.
   Three requirements, and the arrangement that holds all three at once.

     1. the drawing keeps its own proportions -- on a map a stretch is a false geography;
     2. no width is left EMPTY;
     3. the figure is not taller than the window it opens in.

   The pass before this one held (1) and (3) and paid with empty side gutters: the cell was
   'min(track, track x W/H)', centred, so under the height budget the drawing shrank away from the
   frame's two sides -- 954px inside a 1420px track on the connected scatter at 1512x860, 695px
   inside 1464px on the symbol map. Refused. The pass after it held (1) and (2) by making the cell
   width-driven with no height budget at all, and every page then ran past the fold. Refused too:
   "ca prend la largeur mais ne respecte pas la hauteur qu'on avait avant".

   THE FOURTH ARRANGEMENT, and the one newsrooms actually use: when the box is wider than the
   drawing needs at the height it has, THE SURPLUS WIDTH GOES TO THE FURNITURE. The drawing keeps
   its aspect and its height; the key, the control, its notes, the reading sentence and the source
   move into a column beside it. Nothing is stretched, no gutter is empty, and the page does not
   grow past the window.

   WHAT GOES IN THE COLUMN, and why it is stated as a rule rather than a list. Everything that is
   not the header and not the drawing: every fieldset and its notes, the key, every reading
   sentence, the caveat that sits under the plot, a total, the source line. The rule survives a
   vocabulary arriving next week, which a list would not -- sixteen control vocabularies ship in
   this tree and each names its fieldset after itself. The HEADER stays full width on top, because
   the title is the claim and the ruling that took the 640px reading-measure cap off it is still in
   force: a headline is measured against the whole figure, not against a column. The CONTROL travels
   with its own notes rather than staying above the drawing, because a control and the sentence that
   says what it narrowed cannot live in two different columns. Reading order in the DOM is
   untouched, so the keyboard still meets the control before the drawing.

   WHY THE FIGURE CARRIES A DEFINITE HEIGHT and not 'max-height'. The plot has to be able to say
   "the height I have", and a 'max-height' leaves every row indefinite -- measured, that collapses
   the plot to nothing rather than failing loudly. 'dvh' is what a mobile browser's collapsing
   toolbar makes correct; the 'vh' line above it is the fallback for an engine that does not know
   dvh, and the later declaration simply wins where it parses.

   The header's own height is never subtracted by hand anywhere in this file: the grid does it.
   Row 1 is 'auto' and the plot spans from row 2 down, so whatever the title wraps to is taken out
   of the drawing's budget by the layout itself. That is why this arrangement is expressible at all
   -- every attempt that put the drawing's width in terms of the window's height needed a number for
   the header, and CSS has none.

   "Fills the container" is a claim about the FRAME's own edges, never about the content inside
   it -- FRAME_PAD_PX is the fixed inner margin that keeps that distinction real: title, caveat,
   filter, every axis label, the end label and the source line all sit inside it, so nothing ever
   touches the frame's own edge at any width. */
.chart-figure {
  margin: 0;
  width: 100%;
  padding: ${FRAME_PAD_PX}px;
  display: grid;
  /* COLUMN 1 IS THE DRAWING, AT AN EXPLICIT WIDTH. Column 2 takes EVERYTHING that is left, down to
     its own measure — that pair is the whole no-empty-surplus rule: there is no third place for
     width to go.
     THE WIDTH IS TYPED OUT HERE AND NOT LEFT TO 'auto', and this is the defect that made the first
     build of this arrangement overflow. A grid sizes its COLUMNS before its ROWS, so an 'auto'
     column asks the plot how wide it wants to be while the row's height is still unknown — and a
     box whose width comes from its height cannot answer. Measured on the cartogram at 1512x860:
     the track resolved to 1014.3px, the plot then laid out at 1158px, and it ran 120px over the
     column beside it. 'max-content', 'min-content' and 'fit-content(100%)' all gave the identical
     1014.3px, so it is not a choice of keyword — it is that the question cannot be answered in that
     pass. Asked as arithmetic instead, it always can be. */
  grid-template-columns:
    min(
      calc(100% - var(--aside-min) - var(--aside-gap)),
      calc((100dvh - var(--frame-pad) * 2 - ${xAxisH}px) * ${plotWidth} / ${plotHeight} + ${sideBands}px)
    )
    minmax(var(--aside-min), 1fr);
  /* EVERY ROW IS SIZED BY THE WORDS IN IT, and the drawing spans all of them. The drawing does not
     need a row to tell it how tall it is any more — its width comes from the window's height above
     and its height from its own ratio — so nothing here has to be flexible. It did once, and the
     cost of getting that wrong is worth recording: with row 1 'minmax(0, 1fr)' the first block of
     the column shared that row with the drawing, the row was sized as the LEFTOVER rather than as
     the block, and the title, the control, the key and the reading all printed on top of one
     another. */
  grid-auto-rows: min-content;
  align-content: start;
  column-gap: var(--aside-gap);
  row-gap: ${ASIDE_ROW_GAP_PX}px;
  height: 100vh;
  height: 100dvh;
  --aside-min: ${asideMin}px;
  --aside-gap: ${ASIDE_GAP_PX}px;
  /* The frame's own inset, as a property, because the column arithmetic above has to take it out of
     the window's height and the two must never disagree about how much it is. */
  --frame-pad: ${FRAME_PAD_PX}px;
  /* NO CONTAINER QUERY UNIT IN THE COLUMN ARITHMETIC, and this cost a whole build to learn: an
     element is NOT its own query container, so '100cqw' written in a rule ON '.chart-figure'
     resolves against the viewport while the same token written on a DESCENDANT resolves against the
     figure's content box. Measured, the two differed by exactly the frame's own padding — 48px —
     and the drawing came out 48px narrower than the column it was given. '100%' inside
     'grid-template-columns' is the figure's own content box by definition, and the figure's height
     is '100dvh' because this rule sets it: neither needs a container at all. */
}
/* Everything except the plot keeps its natural height: words are never squeezed to make a chart
   fit, the chart is. */
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
  /* The height and the width the grid gave it, both definite. Column 1's width
     is exactly the drawing's own width plus the beat's declared gutters — arithmetic, not an
     intrinsic guess — so the surplus the column gets is the REAL surplus and never a gutter with a
     label on it. */
  height: auto;
  align-self: start;
  width: 100%;
  min-width: 0;
  /* THE INLINE aspect-ratio FORTY COMPONENTS STILL SET ON THIS BOX IS OVERRIDDEN HERE, and an
     important author declaration is the one thing that outranks a normal inline one. It used to be
     this box's only height source and it cannot be one now: it mixes a gutter measured in CSS pixels
     with a viewBox measured in its own units, so it is right at exactly ONE container width — across
     the forty committed beats it puts the box out by as much as 115px. Left in place it also fights
     the hug below outright: measured on the diverging stacked bar at 1512, the plot came out
     1176px wider than the drawing in it and ran 852px off the side of the document; on the cartogram
     it overran the column beside it. The trunk decides this box's size, both axes, alone. */
  aspect-ratio: auto !important;
  display: grid;
  /* THREE COLUMNS, THE THIRD NORMALLY EMPTY. The format has always had a left gutter and an
     x-axis band; a beat whose marks END somewhere meaningful (the bump's final ranks) also needs a
     right gutter, and it used to get one by declaring an IMPLICIT third column of its own. That was
     invisible to this stylesheet, and invisible is exactly what the middle column cannot afford.
     Declared here, defaulting to nothing, it costs a beat that has no end gutter exactly zero.
     The middle column is 'auto': it takes the drawing's own width, which the rule below derives
     from the height this box was given. */
  grid-template-columns: var(--y-gutter) 1fr var(--end-gutter, 0px);
  grid-template-rows: auto var(--x-axis-h);
}
/* TWO PLACEMENTS, AND THE HEADER IS IN THE COLUMN WITH THE REST OF THE WORDS.
   It was above, full width, for one draft. It cannot be: a full-width header of UNKNOWN height
   cannot be subtracted from the window in CSS, and the drawing's width is the window's height minus
   that header. Every formulation that kept it there needed a number nobody has. In the column the
   arithmetic closes exactly, and what the column holds stops being a caption and becomes the
   figure's whole text — the claim, the caveat, the key, the control and its notes, every reading
   sentence and the source. That is the answer to "a column holding one short sentence is just a
   gutter with a label": this one holds the beat's words.
   Spanning rather than '1 / -1': '-1' is the end of the EXPLICIT grid, and the column beside the
   drawing makes implicit rows. Measured: with '1 / -1' the plot resolves to zero height and the
   drawing disappears without a word.
   A <style> a beat inlines is display:none in the UA sheet and is therefore not a grid item. */
.chart-figure > .chart-plot { grid-column: 1; grid-row: 1 / span 60; }
.chart-figure > :not(.chart-plot) { grid-column: 2; min-width: 0; }

/* THE DRAWING IS SIZED BY ITS HEIGHT AND SHAPED BY ITS OWN viewBox, and that is what makes
   preserveAspectRatio="none" a uniform SCALE rather than a distortion.
   'height: 100%' is the row the grid left after the x-axis band; 'aspect-ratio' turns it into a
   width; 'max-height' is the one place the WIDTH available can bind, expressed as the height that
   width implies, so the ratio survives both branches. A LENGTH in the plane may follow the stretch,
   because it is a distance and it belongs to the plane; a SHAPE never may. The owner read that off
   a render before any guard did: "les cercles sont pas parfaits tout comme les fleches, on dirait
   que c'est etire".
   Every box that SHARES the cell takes the same three declarations -- the geometry, the HTML
   overlay that annotates it, and any layer a beat adds over both (the tree's own convention names
   one '...-layer'). They resolve to the same number by construction rather than by being kept in
   step. The numbers are the beat's own, read off the <svg> it just drew -- never typed here. */
svg.chart,
.chart-plot .overlay,
.chart-plot > [class*="-layer"] {
  grid-column: 2;
  grid-row: 1;
  width: 100%;
  height: auto;
  aspect-ratio: ${plotWidth} / ${plotHeight};
  min-width: 0;
  min-height: 0;
  margin: auto;
}
svg.chart { display: block; }
/* BOTH GUTTERS FOLLOW THE CELL. Each is the cell's own height, so a label at 'top: 62%' lands on
   the same 62 % of the geometry it names. The cell fills the middle column by construction, so
   there is no slack for either of them to cross. */
.chart-plot .y-axis {
  grid-column: 1;
  grid-row: 1;
  position: relative;
  height: 100%;
  min-height: 0;
}
.chart-plot .end-axis {
  grid-column: 3;
  grid-row: 1;
  position: relative;
  height: 100%;
  min-height: 0;
}
/* pointer-events:none is load-bearing, not decoration: .overlay shares the exact grid cell the
   svg's own .hit-area occupies, and a plain div with no pointer-events override intercepts every
   mouse/touch event over the WHOLE plot before it ever reaches the svg beneath it -- caught only by
   driving a real browser (page.mouse.move landed on .overlay, not the hit-area, and the tooltip
   never appeared), never by the markup or a unit test. Inherited by every span inside it, which is
   correct: none of them is a control. */
.chart-plot .overlay { position: relative; pointer-events: none; }
/* The x-axis band is the y-axis's mirror: the middle column's width, directly under the cell.
   'width: 100%' and NOT 'margin-inline: auto'. An auto inline margin makes a grid item shrink to
   fit instead of stretching, and this band's labels are absolutely positioned inside it, so they
   contribute nothing to fit: measured, the band came out 0.0px wide and every tick label piled up
   on one point. It survived the old rule only because that one set an explicit width. */
.chart-plot .x-axis {
  grid-column: 2;
  grid-row: 2;
  position: relative;
  width: 100%;
  min-width: 0;
}

/* AND WHEN THE DRAWING WOULD BE NARROWER THAN THE COLUMN THAT READS IT, THE COLUMN GOES BACK
   UNDERNEATH. The threshold is not typed: it is the beat's own gutters plus the column's measure
   twice -- once for the column, once as the floor under the drawing beside it -- where the floor is
   itself the drawing's own aspect applied to that measure (a drawing whose SHORT side is under the
   reading measure of the words next to it has stopped being the subject of the figure). ONE width
   query, which is the one this format's doctrine allows; nothing in it caps the frame and nothing
   in it takes content away. Stacked, the figure's height goes back to its
   content: a phone scrolls, which it was always going to do. */
@media (max-width: ${stackBelowPx - 1}px) {
  .chart-figure {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
    height: auto;
  }
  .chart-figure > .chart-plot,
  .chart-figure > :not(.chart-plot) { grid-column: 1; grid-row: auto; }
  svg.chart,
  .chart-plot .overlay,
  .chart-plot > [class*="-layer"],
  .chart-plot .y-axis,
  .chart-plot .end-axis { height: auto; max-height: none; }
  svg.chart,
  .chart-plot .overlay,
  .chart-plot > [class*="-layer"] { width: 100%; }
  .chart-plot .y-axis,
  .chart-plot .end-axis { height: calc((var(--room-w) - var(--y-gutter, 0px) - var(--end-gutter, 0px)) * ${plotHeight} / ${plotWidth}); }
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
  assertNoEmptySurplus,
};
