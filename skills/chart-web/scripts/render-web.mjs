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
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
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

/** THE KNOB THIS TRUNK CHROME COULD NOT SET, AND THE MECHANISM THAT MADE IT UNNECESSARY.
 *
 *  This block used to hold `FILTER_NOTE_RESERVE = null` and a paragraph explaining why no number
 *  could go there. The paragraph's measurement was right and is worth keeping: this chrome is
 *  emitted once for EVERY beat that declares a filter, and those beats' sentences are not one
 *  length — `web-income-life-expectancy` writes 38 characters ("Showing Africa — 49 of 164
 *  countries."), the seed 39, and `web-heatmap-europe-electricity` 215, one sentence that sets on a
 *  single 18px line at 1512 and at 375, another that wraps to four lines at 1512 and to nine at
 *  375. Any single number would have been right for one and wrong for the other.
 *
 *  Its conclusion — reserve nothing — was the wrong half of the choice. Reserving nothing is not
 *  neutral: it means the seed's own plot drops 18px the moment a reader touches the control, at
 *  1600 as well as at 375, measured by `verify-web.mjs` on this skill's own output. The reserve is
 *  no longer a number anyone sets: `control-chrome.ts` stacks every sentence in one grid cell, so
 *  the row is as deep as the DEEPEST sentence at the reader's own width — 39 characters or 215, at
 *  1512 or at 375 — and this trunk chrome needs no knob because there is nothing left to decide. */

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
async function renderWeb({ component, props, outDir, name, frame = null, drawing = null, lang = "en" }) {
  assertLanguageTag(lang);
  const furniture = deriveFurniture(props.ground);

  // THE FILTER, IF THIS BEAT DECLARED ONE. `props.filter` is the beat's own declaration
  // (`assets/filter.ts` — what may be narrowed and on what) and `props.filterKeys` is what the beat
  // actually draws, the list every count and every emptiness check is measured against. A beat that
  // declares nothing gets an EMPTY index, `attrsFor` then hands out no attributes, `filterCss`
  // returns the empty string and `filterNotes` returns nothing — no markup, no rule, no listener,
  // which is the difference between a filter that is removable and a control that is merely hidden.
  const filterIndex = buildFilterIndex(props.filter, props.filterKeys ?? []);
  let markup = renderToStaticMarkup(
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

  // A MAP BEAT'S PROSE MOVES INSIDE ITS OWN DISCLOSURE (see MAP_DRAWING_SHARE). A chart beat passes
  // no `drawing` and nothing here runs: its column is exactly the column the owner validated.
  if (drawing) markup = foldProseIntoDisclosure(markup, name ?? "this beat");

  // THE ENTRANCE IS READ OFF THE MARKUP, never passed in. A beat declares an entrance the same way
  // it declares a filter — by DOING it, here by tagging its own layers with `data-entrance-motion`
  // — and a beat that declares none gets no keyframes, no rules and no class ever added. See
  // `buildCss`'s own `entranceRules`.
  // The free-parameter declaration is stamped onto the figure before the document is assembled, so
  // both assembly passes and the delivered file all carry it.
  markup = stampFreeParameters(markup, props.interaction ?? null);

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
    // WHAT THE BEAT SAYS ABOUT ITS OWN FRAME — extendable or fixed, at what bound, and why. A beat
    // that declares nothing emits nothing and is guarded on nothing: the thirty-odd beats that have
    // never been asked the question keep exactly the page they had. See `frameNoteCss`.
    frame,
    filter: props.filter ?? null,
    entrance: declaresEntrance,
    fontStack: stack,
    drawing,
  });
  const page = (css) =>
    webDocument({ lang, title: props.title, css, markup, script: inlineScript });

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
  assertFrameExtension(html, frame, name ?? "this beat");

  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, name);
  await writeFile(outPath, html);
  // MEASURED ON THE FILE A READER OPENS, not on the string this function happened to build.
  if (drawing) await assertDrawingShare(outPath, drawing.share, name ?? "this beat");
  return { outPath };
}

/**
 * THE PAGE SAYS WHICH LANGUAGE ITS WORDS ARE IN, AND IT IS THE CALLER WHO KNOWS.
 *
 * `<html lang>` was a literal `fr` here from the day this renderer was written. It was never wrong
 * in the catalogue — every proof beat in this tree is written in French, so the literal and the
 * words agreed by accident — and that is exactly why it survived: the first page it can mislabel is
 * the first page written in something else, which is a journalist's story and not ours. A screen
 * reader takes the attribute literally and pronounces the words with that language's phonetics, so
 * a mislabelled page is unreadable in the one way a picture of it can never show.
 *
 * `STORYBOARD.md` has recorded `language:` per story all along (`analyst/scripts/gate-contract.mjs`
 * makes it a required scalar, confirmed with the journalist against the article, ruling R4). A
 * beat's own runner passes it here. The default is English rather than French because a default is
 * the thing nobody chose, and the catalogue — which did choose — now says `lang: "fr"` out loud at
 * each of its own call sites. Same shape as `scrolly/scripts/render-scrolly.mjs`, which has carried
 * a `lang` parameter since it was written.
 */
function assertLanguageTag(lang) {
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(String(lang ?? "")))
    throw new Error(
      `lang must be a BCP 47 tag such as "fr" or "en-GB"; got ${JSON.stringify(lang)}. ` +
        `A beat takes it from its story's own STORYBOARD.md \`language:\` field — the code, never the language's name.`,
    );
}

/**
 * THE DECLARATION TRAVELS WITH THE PAGE, as two attributes on the figure.
 *
 * `verify-web.mjs` reads a delivered HTML file and has no access to the beat's render module, so a
 * declaration that stays in the module is one no driven browser can check — which would have left
 * `heldStill` exactly as unverifiable as the prose it replaces. Everything else this format guards
 * is discovered off the markup the same way: `shippedControls` finds a control because the
 * attribute that makes it work is there, `plotViewBoxOf` reads the geometry the component actually
 * drew. This is that contract, for the one clause the whole catalogue writes in prose — « sous une
 * légende qui ne change pas », "the two ends of every band stay exactly where they are" — and that
 * nothing had ever measured.
 */
/** `escapeHtml` is written for TEXT and leaves `"` alone, which is fine between tags and is an
 *  injection inside a double-quoted attribute. These two values are the beat's own words, so the
 *  quote is escaped here rather than widening the shared helper under every other caller. */
const attributeValue = (text) => escapeHtml(text).replace(/"/g, "&quot;");

function stampFreeParameters(markup, plan) {
  if (!plan || !Array.isArray(plan.controls) || plan.controls.length === 0) return markup;
  const parameters = plan.controls.map((control) => control.parameter).filter(Boolean);
  const held = [...new Set(plan.controls.flatMap((control) => control.heldStill ?? []))];
  if (parameters.length === 0 && held.length === 0) return markup;
  return markup.replace(
    /<figure class="chart-figure"/,
    `<figure class="chart-figure" data-free-parameter="${attributeValue(parameters.join("|"))}"` +
      ` data-held-still="${attributeValue(held.join("|"))}"`,
  );
}

/** The one shape of the document every web beat is written into. Exported so the language it
 *  declares can be pinned without fetching a typeface: `renderWeb` assembles the page twice (once
 *  to read which faces its own words need, once with those faces in it) and both passes come
 *  through here. */
function webDocument({ lang = "en", title, css, markup, script }) {
  assertLanguageTag(lang);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${css}
</style>
</head>
<body>
${markup}
<div id="tooltip" role="status" aria-live="polite" hidden></div>
<script>
${script}
</script>
</body>
</html>
`;
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
  const declared = /--cell-w:\s*min\(var\(--track-w\),\s*calc\(var\(--track-h\)\s*\*\s*([\d.]+)\s*\/\s*([\d.]+)\)\)/.exec(html);
  if (!declared)
    throw new Error(
      `${name}: the page carries no --cell-w rule, so its plot cell takes whatever ratio the ` +
        `window leaves it and every filled shape in the geometry is drawn stretched.`,
    );
  const want = width / height;
  const got = Number(declared[1]) / Number(declared[2]);
  if (Math.abs(got - want) > 1e-6)
    throw new Error(
      `${name}: the plot cell is sized ${declared[1]}/${declared[2]} (${got.toFixed(4)}) while the ` +
        `<svg class="chart"> declares ${width}/${height} (${want.toFixed(4)}). The cell must carry ` +
        `its own viewBox's ratio exactly, or preserveAspectRatio="none" stretches the drawing by ` +
        `the difference.`,
    );
}

/**
 * THE FRAME A BEAT DECLARES, AND WHY IT IS A PROPERTY OF THE TYPE RATHER THAN OF THE PAGE.
 *
 * The layout holds the drawing inside the window's height and gives the cell the ratio of its own
 * viewBox, so on a wide, short window a near-square drawing is HEIGHT-BOUND and the width it does
 * not take stays margin. That surplus has exactly three places it could go, and two of them are
 * refused on a render: stretching the cell (a false geography, and the defect this whole series
 * began with) and a column of furniture beside the drawing (refused by the owner: "tu as perdu le
 * layout qu'on avait avant"). The third is the drawing itself: THE BEAT'S OWN FRAME TAKES A WIDER
 * RATIO AND THE DRAWING IS COMPOSED FOR IT. A map opens its geographic window and shows more
 * surroundings AT THE SAME SCALE; a type whose axis is a continuum gets more room between readings.
 *
 * Which types may is not a fact about this file. Radial types (radar, pie) and area-encoded types
 * (treemap, marimekko, pictogram) have a ratio their message imposes; for them nothing changes and
 * the surplus stays margin — "garde-le comme ça". So the beat DECLARES, in one sentence, and this
 * function writes the declaration into the page it is a claim about:
 *
 *   frame: { extends: true, base: { width, height }, maxRatio: 1.5, why: "…" }
 *
 * THE BOUND IS NOT ONE NUMBER FOR EVERYTHING. A frame that keeps opening becomes an illegible
 * frieze, and each type reaches that at its own ratio; a map reaches it sooner still, when the
 * window opens onto land the beat's own study set does not cover. Past the bound the surplus goes
 * back to being margin, and it does so with no rule of its own: the cell already min()s against the
 * track, so a drawing narrower than its track is centred with its gutters travelling beside it.
 *
 * A beat that declares nothing gets nothing — no note, no guard, no change. That is deliberate:
 * this question is asked of a beat when it is re-rendered, not retro-fitted to pages nobody looked
 * at.
 */
function frameNoteCss(frame, plot, name = "this beat") {
  if (!frame) return "";
  const { width, height } = assertPlotGeometry(plot);
  const base = frame.base ?? {};
  const baseW = Number(base.width);
  const baseH = Number(base.height);
  if (!Number.isFinite(baseW) || !Number.isFinite(baseH) || baseW <= 0 || baseH <= 0)
    throw new Error(
      `${name}: a frame declaration needs the type's own base box ({ base: { width, height } }) — ` +
        `the composition the type has when nothing is extended. Without it "extended" names no ` +
        `quantity and the bound below has nothing to be a bound ON. Given ${JSON.stringify(base)}.`,
    );
  const extends_ = frame.extends === true;
  const why = typeof frame.why === "string" ? frame.why.trim() : "";
  if (why.length < 40)
    throw new Error(
      `${name}: a frame declaration must ARGUE itself in a sentence — extendable or fixed, and why ` +
        `this type's own message survives (or does not survive) a wider box. A type that cannot ` +
        `say why it may extend does not extend. Given ${JSON.stringify(frame.why ?? null)}.`,
    );
  const bound = extends_ ? Number(frame.maxRatio) : baseW / baseH;
  if (extends_ && (!Number.isFinite(bound) || bound < baseW / baseH))
    throw new Error(
      `${name}: an extendable frame must declare a maxRatio at least its own base ratio ` +
        `(${(baseW / baseH).toFixed(3)}); it declared ${JSON.stringify(frame.maxRatio ?? null)}. ` +
        `Beyond the bound the drawing is a frieze and the surplus width belongs back in the margin.`,
    );
  // THE BOUND IS WRITTEN AT SIX DECIMALS WHILE THE TWO RATIOS BESIDE IT ARE WRITTEN AS PAIRS, and
  // that is not fussiness: the guard below re-reads this note and compares the page's own ratio
  // against it, so a bound rounded for reading is a bound the page can fail against itself.
  // Measured the first time this ran: the radar's 620/440 wrote `bound 1.409`, the page drew
  // 1.4090909, and all three directions were refused for exceeding their own frame by four
  // ten-millionths. Six decimals leaves a rounding error under the 1e-6 the guard allows.
  return `/* THE FRAME — ${extends_ ? "EXTENDS" : "FIXED"} · base ${baseW}/${baseH} (${(baseW / baseH).toFixed(3)}) · drawn ${width}/${height} (${(width / height).toFixed(3)}) · bound ${bound.toFixed(6)}
   ${why}
   Past the bound the surplus width is margin again, with no rule of its own: the cell below carries
   this page's own viewBox ratio and min()s against the track, so a drawing narrower than its track
   is centred and its gutters travel with it. Nothing is ever stretched to fill. */`;
}

/**
 * THE GUARD, ON THE WRITTEN PAGE RATHER THAN ON THE INTENTION — the frame's half.
 *
 * `frameNoteCss` above refuses a declaration that is malformed, which is a check on what was PASSED
 * IN. This one re-reads the document about to be written and holds the note against the `<svg>` the
 * same document draws, so a page whose note and whose geometry disagree is refused here rather than
 * delivered with a sentence that describes a different picture.
 */
function assertFrameExtension(html, frame, name = "this beat") {
  const note = /\/\* THE FRAME — (EXTENDS|FIXED) · base ([\d.]+)\/([\d.]+) \([\d.]+\) · drawn ([\d.]+)\/([\d.]+) \([\d.]+\) · bound ([\d.]+)/.exec(html);
  if (!frame) {
    if (note)
      throw new Error(
        `${name}: the page carries a frame note but the render was handed no frame declaration. ` +
          `The note is the claim the guard reads; one that nothing declared cannot be held to a bound.`,
      );
    return;
  }
  if (!note)
    throw new Error(
      `${name}: the beat declares a frame (${frame.extends ? "extendable" : "fixed"}) and the ` +
        `written page says nothing about it. A declaration the artifact does not carry is a ` +
        `declaration nothing can be checked against.`,
    );
  const { width, height } = plotViewBoxOf(html, name);
  const baseRatio = Number(note[2]) / Number(note[3]);
  const bound = Number(note[6]);
  if (Number(note[4]) !== width || Number(note[5]) !== height)
    throw new Error(
      `${name}: the frame note says the page is drawn ${note[4]}/${note[5]} while its ` +
        `<svg class="chart"> declares ${width}/${height}. The note describes a different picture ` +
        `than the one being written.`,
    );
  const drawn = width / height;
  if (drawn < baseRatio - 1e-6)
    throw new Error(
      `${name}: the page is drawn at ${drawn.toFixed(3)}, NARROWER than the type's own base frame ` +
        `${baseRatio.toFixed(3)}. Extending opens the frame; it never closes it, and a narrower box ` +
        `gives the surplus width back to the margin for nothing.`,
    );
  if (note[1] === "FIXED" && drawn > baseRatio + 1e-6)
    throw new Error(
      `${name}: the frame is declared FIXED and the page is drawn at ${drawn.toFixed(3)} against a ` +
        `base of ${baseRatio.toFixed(3)}. A type whose ratio its message imposes — a radial, an ` +
        `area encoding, a grid of square icons — is drawn at that ratio and leaves the rest as margin.`,
    );
  if (drawn > bound + 1e-6)
    throw new Error(
      `${name}: the page is drawn at ${drawn.toFixed(3)}, past the bound of ${bound.toFixed(3)} this ` +
        `beat declared for its own type. Past the bound the drawing stops being a chart and becomes ` +
        `a frieze, and the width belongs back in the margin.`,
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

// The plot rectangle's own floor, in CSS pixels. `.chart-plot` is the ONE shrinkable item in the
// figure's flex column (see `buildCss` below): when the frame's preferred height — header + filter +
// the plot at its canonical `aspect-ratio` + source line — exceeds the visible window, the plot
// absorbs every pixel of the shortfall and nothing else moves. This number is where that absorption
// stops. Measured, not guessed: the seed's own natural plot height at the narrowest width this format
// verifies at (375px) is 153px, so a floor BELOW that can never fire on any window this format
// actually ships to, and only a pathologically short window (roughly under 300px of viewport
// height) reaches it. Reaching it is deliberate: a window too short for a legible chart gets a
// scrollbar, which is honest, rather than a 20px strip pretending to be a line chart.
const PLOT_FLOOR_PX = 120;

// ── THE DRAWING'S GUARANTEED SHARE, ON A MAP BEAT ────────────────────────────────────────────────
//
// THE DEFECT. `.chart-figure` is one window tall and `.chart-plot` is the only shrinkable item in
// its column, so every sentence a beat adds above or below the drawing is paid for by the drawing
// and by nothing else. On a CHART that is right and validated: the words are few and the geometry
// gives back a few pixels. On a MAP it is not — the owner, reading the seven map pages: « pour les
// charts ça passe mais pour les maps tu en mets trois tonnes, c'est trop ». Measured at 1512x860
// before this: the validated choropleth gave its drawing 503-520 px of the 812 px usable, the flow
// beat 435-490 and the locator 413-467. Fifty to sixty-nine pixels of map, spent on prose, with
// nothing in the format able to notice.
//
// THE REVERSAL. On a map beat the DRAWING declares a floor as a share of the usable height, and the
// TEXT becomes the adjusting variable: the standfirst is capped at one line, the control's note row
// is no longer reserved at its worst-case height, and the readings that no longer fit are folded
// into the disclosure the page already carries — never deleted, one click away, still in the
// accessible tree and still read out in order.
//
// TWO THIRDS IS WHERE IT STARTED AND WHAT IT SHIPS. 0.66 of the usable height, which at 1512x860 is
// 536 px of drawing against the 812 px the figure has inside its own padding. It is above every
// number measured before it, including the choropleth the owner validated as the pattern.
const MAP_DRAWING_SHARE = 0.66;

/** The window the share is declared against and refused against — the owner's own review size. */
const REVIEW_WINDOW = { width: 1512, height: 860 };

/**
 * THE READINGS GO INTO THE DISCLOSURE THE PAGE ALREADY HAS.
 *
 * Every map beat ends with `<details class="mw-readings">` — the values behind the drawing, for a
 * reader who wants them. The prose paragraphs the beat prints BETWEEN the drawing and the source
 * line say the same kind of thing at the cost of two to five lines of map, so they move inside it,
 * ahead of the table, in the order they were written.
 *
 * It is a move, never a cut: nothing is dropped, and a beat that carries no disclosure is refused
 * rather than silently stripped of its prose.
 */
function foldProseIntoDisclosure(markup, where) {
  const prose = [
    ...markup.matchAll(/<p class="(?:chart-reading|live-hint)"[^>]*>[\s\S]*?<\/p>/g),
  ].map((m) => m[0]);
  if (!prose.length) return markup;
  const summary = markup.match(/<details class="mw-readings"[^>]*>\s*<summary[^>]*>[\s\S]*?<\/summary>/);
  if (!summary)
    throw new Error(
      `${where} declares a drawing share, so its reading paragraphs fold into its own ` +
        `<details class="mw-readings"> — and it carries none. Add the disclosure, or drop the prose.`,
    );
  let out = markup;
  for (const p of prose) out = out.replace(p, "");
  return out.replace(summary[0], `${summary[0]}${prose.join("")}`);
}

/** Same shape as the copy in every other script in this repository that drives Chrome — duplicated,
 *  not imported, because nothing in a skill may import out of it. `puppeteer-core` is what the
 *  journalist's root declares; `puppeteer` is a development-only package of THIS repository, so a
 *  page rendered from an install that reached for it died at module load. */
function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(
          cache,
          build,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          cache,
          build,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(`no Chrome to drive. Looked in:\n  ${candidates.join("\n  ")}`);
  return found;
}

/**
 * THE REFUSAL. The page is opened at the review window and the drawing is MEASURED against the
 * share it declared. A floor written in CSS is a promise; this is the reading that holds it — and
 * it is the same reading that catches the other half, a page whose text no longer fits the window
 * once the drawing has taken its share.
 *
 * No MapTiler key is needed and none is used: the live map never loads from a placeholder, the
 * frozen fallback is what paints, and neither changes the height of a single row in the column.
 */
async function assertDrawingShare(outPath, share, where) {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: resolveChrome(),
    args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ ...REVIEW_WINDOW, deviceScaleFactor: 1 });
    await page.goto(`file://${outPath}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 400));
    // THE LIVE PAGE'S OWN COLUMN, NOT THE KEYLESS ONE. `p.live-hint` ships `hidden` and is revealed
    // the moment the live map arrives, so a page measured without it is measured one row short —
    // 17 px on the locator, which is exactly the overflow this guard exists to catch.
    await page.evaluate(() => {
      for (const hint of document.querySelectorAll(".live-hint")) hint.removeAttribute("hidden");
    });
    const seen = await page.evaluate(() => {
      const fig = document.querySelector(".chart-figure");
      const plot = document.querySelector(".chart-plot");
      if (!fig || !plot) return null;
      const cs = getComputedStyle(fig);
      const usable =
        fig.getBoundingClientRect().height -
        parseFloat(cs.paddingTop) -
        parseFloat(cs.paddingBottom);
      return {
        usable,
        plot: plot.getBoundingClientRect().height,
        doc: document.documentElement.scrollHeight,
        scrollW: document.documentElement.scrollWidth,
        winW: window.innerWidth,
        winH: window.innerHeight,
      };
    });
    if (!seen) throw new Error(`${where} draws no .chart-figure/.chart-plot to measure a share on`);
    const got = seen.plot / seen.usable;
    if (got + 1e-4 < share)
      throw new Error(
        `${where} gives its drawing ${(got * 100).toFixed(1)} % of the ${Math.round(seen.usable)} px ` +
          `usable height at ${REVIEW_WINDOW.width}x${REVIEW_WINDOW.height} — under the ` +
          `${(share * 100).toFixed(1)} % a map beat declares. The text above and below it is what ` +
          `gives way, not the map.`,
      );
    if (seen.doc > seen.winH)
      throw new Error(
        `${where} runs ${Math.round(seen.doc)} px tall in a ${seen.winH} px window once its drawing ` +
          `has taken its ${(share * 100).toFixed(1)} % — the beat no longer fits what it is read in. ` +
          `Shorten the words; the drawing's share is not the variable.`,
      );
    if (seen.scrollW > seen.winW)
      throw new Error(
        `${where} scrolls sideways at ${REVIEW_WINDOW.width} px: ${Math.round(seen.scrollW)} px wide`,
      );
    return { share: got, usable: seen.usable, plot: seen.plot, doc: seen.doc };
  } finally {
    await browser.close();
  }
}

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

function buildCss({ ground, accent, ink, muted, grid, plot, frame = null, filter = null, entrance = false, fontStack = "sans-serif", drawing = null }) {
  const { width: plotWidth, height: plotHeight } = assertPlotGeometry(plot);
  // The beat's own answer to "may this frame open?", written into the page above the rule the
  // answer is about. Empty for a beat that has not been asked. See `frameNoteCss`.
  const frameNote = frameNoteCss(frame, plot, "this beat");
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

${frameNote ? `${frameNote}\n` : ""}/* THE FLUID FILL — the redesign this file exists to ship. .chart-figure and everything inside
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
  /* THREE COLUMNS, THE THIRD NORMALLY EMPTY. The format has always had a left gutter and an
     x-axis band; a beat whose marks END somewhere meaningful (the bump's final ranks) also needs a
     right gutter, and it used to get one by declaring an IMPLICIT third column of its own. That was
     invisible to this stylesheet, and invisible is exactly what '--track-w' below cannot afford:
     the cell's own slack is measured from the track, and a track 127px narrower than assumed moved
     the bump's left gutter 63.5px off the drawing it labels. Declared here, defaulting to nothing,
     it costs a beat that has no end gutter exactly zero. */
  grid-template-columns: var(--y-gutter) 1fr var(--end-gutter, 0px);
  grid-template-rows: 1fr var(--x-axis-h);
  /* The one shrinkable item in the figure's column -- see .chart-figure's max-height above. Its
     flex BASE size is still the canonical aspect-ratio (set per-render on this element's own
     inline style, from the real geometry), so in a window with room the shape is exactly what it
     always was, byte for byte. Only when the column overflows does 1 (flex-shrink) let this box
     give the height back. A flatter plot is a real cost and it USED to be paid by the drawing:
     preserveAspectRatio="none" followed the box down and the geometry went with it.
     THAT REASONING IS NOW OVERTURNED, AND THE COMMENT IT REPLACES IS QUOTED SO THE COST IS MET
     RATHER THAN LOST: "A flatter plot is a real cost, paid knowingly: a slope read at a shallower
     angle is still the same series, whereas a chart whose end label is below the fold is not a
     chart the reader has seen." That held for a CURVE. It does not hold for a scatter, a
     pictogram, an arrowhead or a proportional symbol: a LENGTH in the plane may follow the
     stretch, because it is a distance and it belongs to the plane, but a SHAPE never may. The
     format already knew this for TEXT (which is why every word lives in HTML outside the viewBox)
     and for STROKES (vector-effect="non-scaling-stroke"); it had never written it down for filled
     shapes. The owner read it off a render before any guard did: "les cercles sont pas parfaits
     tout comme les fleches, on dirait que c'est etire" -- measured on the connected scatter at
     1512x860, a 1420x564 cell for an 820x460 viewBox, 1.41x wider than tall.
     min-height is BOTH the floor (see PLOT_FLOOR_PX) and the override of flexbox's own
     min-height:auto, which would otherwise refuse to shrink this box below its content size and
     re-open the overflow this whole rule exists to close. It is ALSO the worst stretcher of the
     two: the pictogram measured 2.15x at 375x812, where this floor pins the height while the
     width collapses -- worse than any wide-and-short window, and out of reach of any fix aimed at
     the clamp alone. */
  flex: 0 1 auto;
  min-height: ${PLOT_FLOOR_PX}px;

  /* THE CELL CARRIES THE VIEWBOX'S OWN RATIO, AT EVERY WINDOW SIZE, WHICH IS WHAT MAKES
     preserveAspectRatio="none" UNIFORM AND THEREFORE HARMLESS.
     Not a letterbox: switching the <svg> to "meet" would shift every HTML overlay positioned in %
     of the cell (the price the radar already paid by pulling its text inside the viewBox). The
     cell is made exact instead, and then the stretch has nothing left to stretch.
     WHY THE ASPECT-RATIO STAYS ON THIS ELEMENT. It looks as though the cell could simply carry
     'aspect-ratio: W / H' and the gutters be forgotten. It cannot: container-type: size implies
     contain: size, so a size container's own size must come from somewhere other than its
     contents. This box takes its height from its width (the inline aspect-ratio the component
     sets, gutters included), the grid then hands the plot cell a box definite in BOTH axes, and
     the min() pair below is what absorbs, with ONE mechanism, all three causes of anisotropy: the
     fixed-pixel gutters that only make the cell exactly W:H at one single width (~2 % drift at
     1464px), the height clamp, and the min-height floor.
     The numbers are the beat's own, read off the <svg> it just drew -- never typed here. */
  container-type: size;
  --track-w: calc(100cqw - var(--y-gutter) - var(--end-gutter, 0px));
  --track-h: calc(100cqh - var(--x-axis-h));
  --cell-w: min(var(--track-w), calc(var(--track-h) * ${plotWidth} / ${plotHeight}));
  --cell-h: min(var(--track-h), calc(var(--track-w) * ${plotHeight} / ${plotWidth}));
  /* Half of whatever the cell did not take, in each axis. The cell is CENTRED in its track, so a
     wide-and-short window gets even side margins and a legible drawing rather than a squashed one
     -- and the gutters travel with it (below), because an axis label that stays glued to the
     track's edge while the plot it labels moves is a worse defect than the one being fixed. */
  --cell-slack-x: calc((var(--track-w) - var(--cell-w)) / 2);
  --cell-slack-y: calc((var(--track-h) - var(--cell-h)) / 2);
}
/* BOTH GUTTERS FOLLOW THE CELL. Each is the cell's own height, so a label at 'top: 62%' lands on
   the same 62 % of the geometry it names; each translate carries it across whatever slack the cell
   left, so it stays flush against the drawing's own edge instead of the track's. */
.chart-plot .y-axis {
  grid-column: 1;
  grid-row: 1;
  position: relative;
  height: var(--cell-h);
  min-height: 0;
  margin-block: auto;
  transform: translateX(var(--cell-slack-x));
}
.chart-plot .end-axis {
  grid-column: 3;
  grid-row: 1;
  position: relative;
  height: var(--cell-h);
  min-height: 0;
  margin-block: auto;
  transform: translateX(calc(0px - var(--cell-slack-x)));
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
/* The x-axis band is the y-axis's mirror: the cell's width, and lifted by whatever vertical slack
   the cell left above it, so the tick under a mark stays under that mark. */
.chart-plot .x-axis {
  grid-column: 2;
  grid-row: 2;
  position: relative;
  width: var(--cell-w);
  min-width: 0;
  margin-inline: auto;
  transform: translateY(calc(0px - var(--cell-slack-y)));
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

${
  drawing
    ? `
/* THE DRAWING'S GUARANTEED SHARE — emitted only for a beat that declared one, which is every MAP
   beat and no chart beat (see MAP_DRAWING_SHARE above for the measurement that made it necessary).

   The floor is a share of the USABLE height, which is the window less the frame's own padding on
   both edges — the same two numbers .chart-figure is built from, so the floor and the box it sits
   in can never disagree about what "the height the beat has" means. 'max()' keeps PLOT_FLOOR_PX
   underneath it: a pathologically short window still gets the honest scrollbar rather than a strip.
   Two declarations for the same reason .chart-figure has two: dvh is what a collapsing mobile
   toolbar makes correct, vh is what an engine without dvh still understands.

   The rule is a floor, not a height. In a tall window the plot's own aspect-ratio is already larger
   and this changes nothing at all. */
.chart-plot {
  min-height: max(${PLOT_FLOOR_PX}px, calc((100vh - ${FRAME_PAD_PX * 2}px) * ${drawing.share}));
  min-height: max(${PLOT_FLOOR_PX}px, calc((100dvh - ${FRAME_PAD_PX * 2}px) * ${drawing.share}));
}
/* THE STANDFIRST IS THE ADJUSTING VARIABLE, NOT THE MAP. One line on the page; the sentence itself
   is untouched in the markup, still read out whole by a screen reader and still copied whole.
   Measured at 1512x860: every map beat's standfirst set two lines, and the second cost 18 px of
   drawing on every one of them.

   …UNTIL ONE LINE STOPS HOLDING THE SENTENCE. The clamp was measured on a 1512px page, and a map
   beat's caveat is required to carry a DERIVED NUMBER — what this beat's own projection costs its
   own subject. At a narrower width that number is the half that gets cut: measured 2026-09-23 at
   375px, the delivered page read « Coefficient de Gini du revenu disponible équivalisé, 2… » and
   the projection's cost was gone. Two rules in one toolchain, one silently overruling the other.

   So the clamp holds where it was measured and lets go below it. Two lines cost 18px of drawing;
   a sentence that stops mid-word costs the reader the number the format exists to make them see. */
.chart-caveat {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
}
@media (max-width: 1100px) {
  .chart-caveat {
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
}
/* AND THE CONTROL'S NOTE ROW STOPS BEING RESERVED AT ITS WORST CASE. 'stacked' notes already put
   every sentence in one grid cell, so the row is as tall as the one showing and the drawing never
   moves when the reader changes option — the reserve on top of that bought nothing and cost the
   map its worst sentence's height before a reader had chosen anything. :where() keeps this at zero
   specificity so a beat that still needs its own reserve can simply say so and win. */
:where(.chart-figure) :where([class$="-notes"]) { min-height: 0; }
`
    : ""
}
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
  webDocument,
  stampFreeParameters,
  MAP_DRAWING_SHARE,
  foldProseIntoDisclosure,
  assertDrawingShare,
  SEED,
  buildCss,
  plotViewBoxOf,
  assertPlotCellIsItsViewBox,
  frameNoteCss,
  assertFrameExtension,
};
