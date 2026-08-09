// twin/skills/twin-scrolly/scripts/render-scrolly.mjs
//
// The vehicle's own render step. It SSRs one complete frame per narrative step, stacks them behind
// a sticky graphic column, lays every step's own prose out in an opaque panel that travels OVER
// that graphic as the reader scrolls, and inlines the one interaction script — one self-contained
// HTML file, no external request, the same discipline `twin-chart-web/scripts/render-web.mjs`
// already keeps for its two layouts.
//
// It runs in node, which is why it is the piece that derives the furniture colours: `deriveFurniture`
// / `contrast` live beside a native rasteriser in this skill's OWN `./render-still.mjs` — a copy of
// `twin-chart-beat`'s, because a skill never imports another skill — which no browser bundle can
// load. Deriving here and passing `ground`/`ink`/`muted`/`grid` in as props (or, for `renderScrolly`
// itself, straight into the CSS custom properties every panel and header reads) keeps ONE
// implementation of the colour rule per render.
//
// `renderScrolly` below is this genre's OWN MACHINERY and knows nothing of any one story, and —
// this is the part correction earned tonight — nothing of any one MEDIUM either. It takes an array
// of `{ id, prose, frame }` and never asks what `frame` is a picture of: not a chart, not a photo,
// not a diagram. It only ever calls `renderToStaticMarkup` on the `ReactElement` it was handed and
// wraps the result in a generic `<div class="step-frame">` — the wrapper this file owns, never the
// frame component itself, which is what lets an `<img>` and an `<svg>` sit in the exact same stack.
// Everything under the CONFIG marker (`SEED`, `buildFrame`, `render`, the CLI block) is the runner
// for THIS SKILL'S OWN SEED — `assets/ScrollySeed.tsx`'s `STEPS_META`, drawn from `assets/sample-
// data/` — the only place in this file that is allowed to read a step's own `frameKind` and decide
// which component to build from it. A real beat writes its own runner in that same shape, importing
// its own `STEPS_META`-equivalent and its own frame components; `renderScrolly` itself does not
// change, and does not need to: it never had an opinion about what a frame was.
//
// Usage:  bun skills/twin-scrolly/scripts/render-scrolly.mjs [outDir]

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, contrast, readPalette } from "./render-still.mjs";
import {
  STEPS_META,
  PROSE_LANE,
  ImageFrame,
  DrawnGraphicFrame,
  MapFrame,
  ChartFrame,
} from "../assets/ScrollySeed.tsx";
import { deriveFacts, parseReadings, readStation } from "../assets/gauge-data.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------------------------
// GENERIC SCAFFOLD — this genre's own mechanics. Media-agnostic: reads no field off a step but
// `id`, `prose` and `frame`. Nothing below this line may reference `frameKind`, `ImageFrame` or
// `DrawnGraphicFrame` by name — that is the CONFIG seam's job, further down this file.
// ---------------------------------------------------------------------------------------------

/**
 * SSRs one React element per entry in `steps`, stacks every resulting frame behind a sticky
 * graphic column, lays every step's own prose out in an opaque panel in ordinary document flow
 * OVER that graphic, and inlines the one interaction script — one self-contained HTML file.
 *
 * `steps` is `{ id, prose, frame }[]` — `frame` is a `ReactElement`, already built by the CALLER
 * (the CONFIG seam below, for this skill's own seed; a real beat's own runner for anything else).
 * This function never asks what kind of thing `frame` is; it treats an `<img>` and an `<svg>`
 * identically — SSR it, wrap it, toggle which wrapped copy is visible. That is the entire contract
 * that makes this scaffold able to assemble different media without knowing it is doing so.
 */
async function renderScrolly({ steps, title, source, ground, outDir, name, proseLane = 0.28 }) {
  if (!(proseLane > 0 && proseLane < 0.6))
    throw new Error(
      `proseLane is the fraction of the graphic's own height reserved for the pinned prose panel; got ${proseLane}`,
    );
  if (steps.length < 2)
    throw new Error(
      `a scrolly needs at least two steps to advance through, got ${steps.length}`,
    );
  const ids = new Set(steps.map((s) => s.id));
  if (ids.size !== steps.length)
    throw new Error(
      `every step needs a unique id — assets/interaction.mjs matches a step to its frame by this id alone`,
    );

  const furniture = deriveFurniture(ground);
  // Tripwire, not a decision: `deriveFurniture` already guarantees `ink` clears WCAG AA against
  // `ground` (the mid-grey escalation `twin-doctrine/references/visual-system.md` describes). The
  // prose panel below is painted fully OPAQUE with this exact `ground` — never a translucent scrim
  // whose effective colour would depend on whatever part of the graphic sits behind it at a given
  // scroll position — so ink-on-ground IS the contrast the reader actually sees wherever the panel
  // crosses the graphic. This asserts that measurement locally, the same "measured again, not
  // inherited silently" discipline `visual-system.md` states for a mark's colour reused as a label
  // — see references/scrolly-discipline.md, "Measuring prose over the graphic."
  const panelContrast = contrast(furniture.ink, ground);
  if (panelContrast < 4.5)
    throw new Error(
      `prose panel contrast measured ${panelContrast.toFixed(2)}:1 against ground ${ground} — below the 4.5:1 floor; this should be structurally impossible given deriveFurniture's own guarantee, so something upstream is wrong`,
    );

  const frameHtml = steps
    .map((step, i) => {
      const inner = renderToStaticMarkup(step.frame);
      return `      <div class="step-frame${i === 0 ? " active" : ""}" data-step="${escapeHtml(step.id)}" aria-hidden="true">
${inner}
      </div>`;
    })
    .join("\n");

  // `data-step` sits on the PANEL as well as the section: the panel is the element the interaction
  // layer observes, because the panel is the thing that is actually pinned in the prose lane, and
  // "which step is the reader reading" has to mean "whose words are in the lane right now" —
  // never "whose 115vh-tall section happens to cross the middle of the screen", which is a
  // different question with a different answer at every step boundary.
  const stepsHtml = steps
    .map(
      (step, i) => `      <section class="step${i === 0 ? " active" : ""}" data-step="${escapeHtml(step.id)}">
        <div class="step-panel" data-step="${escapeHtml(step.id)}">
${step.prose.map((p) => `          <p>${escapeHtml(p)}</p>`).join("\n")}
        </div>
      </section>`,
    )
    .join("\n");

  const interactionSource = await readFile(
    join(HERE, "../assets/interaction.mjs"),
    "utf8",
  );
  const inlineScript = inlineable(interactionSource);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss({ ground, ...furniture, proseLane })}
</style>
</head>
<body>
<article class="scrolly" data-prose-lane="${Math.round(proseLane * 100)}">
  <header class="scrolly-header">
    <h2>${escapeHtml(title)}</h2>
    <p class="source">${escapeHtml(source)}</p>
  </header>
  <div class="scrolly-track">
    <div class="scrolly-graphic">
      <div class="frame-stack">
${frameHtml}
      </div>
    </div>
    <div class="scrolly-steps">
${stepsHtml}
    </div>
  </div>
</article>
<script>
${inlineScript}
</script>
</body>
</html>
`;

  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, name);
  await writeFile(outPath, html);
  return { outPath, steps: steps.length, panelContrast };
}

/** Strips the `export` keyword from each top-level declaration so `interaction.mjs` — authored as
 *  an ES module for its own unit tests — can also run as a plain classic `<script>`: no
 *  `type="module"`, so it keeps working in a CMS iframe or sandboxed embed that restricts module
 *  scripts. The same trick `render-web.mjs` uses. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildCss({ ground, ink, muted, grid, proseLane }) {
  return `
:root {
  --ground: ${ground};
  --ink: ${ink};
  --muted: ${muted};
  --grid: ${grid};
  /* THE PROSE LANE — the band at the BOTTOM of the sticky graphic that belongs to the pinned prose
     panel, and that no frame may place anything meaningful inside. The same fraction the seed's own
     frames compute their safe bands from (assets/ScrollySeed.tsx, \`PROSE_LANE\`), passed in rather
     than written twice: a lane the CSS reserves and the frames do not respect (or the reverse) is
     precisely the panel-over-annotation collision this constant exists to make impossible. */
  --prose-lane: ${(proseLane * 100).toFixed(0)}vh;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: Helvetica, Arial, sans-serif;
}
/* \`.scrolly\` itself carries NO width constraint — a sixth correction. The fourth build's fix
   constrained THIS element to a 640px reading measure, which centred it correctly but also capped
   every child inside it, including the sticky GRAPHIC, to that same narrow column — a visual meant
   to fill the frame it is pinned in, stranded in the middle of a wide page instead. The reading
   measure now belongs to the two things that are actually PROSE — \`.scrolly-header\`, below, and
   \`.step-panel\` (\`.step\`'s own \`justify-content: center\` already centres it, see "Measuring prose
   over the graphic") — never to \`.scrolly-track\`/\`.scrolly-graphic\`, which are left to size
   themselves to their parent's own full width, all the way out to \`body\`. See
   references/scrolly-discipline.md, "The graphic fills the width it is given." */

/* The header takes the same width as the graphic beneath it — no reading-measure cap. It used to
   sit in a centred 640px column, and that was the mismatch the owner named: a title stopping at
   640px above a full-bleed graphic reads as a broken box (see references/scrolly-discipline.md,
   "The reading measure belongs to the prose"). What survives the reversal is the GUTTER: the side
   padding SCALES with the viewport (\`clamp\`) rather than sitting at a fixed 16px, so the header
   never touches the frame's own edge at any width, on a maximised desktop or a phone. The header
   states the beat's own argument in full, unconditional and ahead of every step's own reveal — and,
   deliberately, ahead of the sticky graphic too: it sits in plain document flow, scrolled past once,
   so it is never the thing a step's prose panel has to be measured against. The STEP PANEL keeps
   its own measure (\`.step-panel\`, below): that is prose travelling OVER the graphic, not
   furniture beside it, and the reversal does not reach it. */
.scrolly-header {
  margin: 0 auto 24px;
  padding: 4px clamp(16px, 6vw, 56px) 0;
}
.scrolly-header h2 { margin: 0 0 4px; font-size: 22px; line-height: 1.25; }
.scrolly-header .source { margin: 0; font-size: 13px; color: var(--muted); }

/* The overlap this genre's own gotcha describes is now DELIBERATE, not engineered away: the
   graphic is the sticky ground, every step's own prose travels OVER it. \`position: sticky\`
   reserves its element's ORIGINAL box at the top of \`.scrolly-track\` — the exact behaviour that
   caused the original defect (see references/scrolly-discipline.md, "The one gotcha," for why).
   The fix does not fight that behaviour, it uses it: \`.scrolly-steps\`'s negative top margin,
   exactly \`--graphic-h\` tall, pulls the steps column back UP over that same reserved box on
   purpose, so the sticky graphic and the scrolling prose occupy the same screen coordinates for as
   long as the track has steps left to give.

   \`--graphic-h: 100vh\` — a FIFTH correction: the reader's own viewport is the frame the graphic is
   pinned in, and the graphic should fill it, not sit as a capped, medium-sized band with empty page
   below it. The previous \`min(70vh, 640px)\` was itself a leftover of the third build's
   two-column-era sizing, never revisited once the graphic became the sticky ground — it read fine
   in a screenshot taken AT that band's own edges, but left up to 30% of a real desktop viewport as
   bare page below the graphic, which is exactly the "small and adrift" defect a full-viewport reader
   actually sees. Filling the height does not distort anything: every frame this genre ships already
   paints with \`object-fit: cover\` (\`ImageFrame\`) or \`preserveAspectRatio="xMidYMid slice"\`
   (\`DrawnGraphicFrame\`) — cropping to whatever box it is given, never stretching — so a taller box
   only changes how much of the artwork's own left/right edge is cropped away, the same trade-off
   \`object-fit: cover\` already makes at every width this genre ships. See
   references/scrolly-discipline.md, "The graphic fills the viewport it is pinned in." */
.scrolly-track {
  --graphic-h: 100vh;
  position: relative;
}
.scrolly-graphic {
  position: sticky;
  top: 0;
  height: var(--graphic-h);
  overflow: hidden;
  z-index: 0;
}
.frame-stack { position: absolute; inset: 0; }
/* Every step's own frame is SSR'd and stacked in the SAME box (an \`<img>\` and an \`<svg>\` sit in
   an identical wrapper — this scaffold does not know which is which). Exactly one wrapper carries
   \`.active\` at build time (this file's own \`renderScrolly\`, never the frame component) — that is
   the ENTIRE no-JS contract: with the inline script absent, the CSS below is what keeps that one
   frame visible and every other one invisible, permanently. */
/* Exactly ONE frame is ever visible at a time — opacity 0 or 1, never anything between. The step
   this is pinned to (this file's own \`renderScrolly\`, the \`active\` class in the SSR'd markup) is
   the SOLE thing that changes which one that is: nothing here writes an intermediate opacity from
   scroll position. A reader must be able to perceive a STILL image with the prose travelling over
   it — not a graphic that visibly blends between two unrelated frames for the whole of a step's own
   scroll distance, which is what this file's own third build shipped and the fourth correction
   removed (see references/scrolly-discipline.md, "The graphic is fixed; only the text moves," for
   the measurement that caught it: the two frames sampled at ELEVEN scroll positions spanning the
   full track, and at every single one — including the very last, nowhere near settled — both were
   still a blend, never once a clean 0/1). */
.step-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
}
.step-frame.active { opacity: 1; }
.step-frame img,
.step-frame svg { display: block; width: 100%; height: 100%; }
/* Reduced motion: a reader who asks for no animation gets no animation — the swap becomes an
   instant cut instead of a fade. This is the ONLY animated property this genre ships, and it only
   ever plays at a STEP BOUNDARY (when \`assets/interaction.mjs\`'s \`initScrolly\` moves the \`active\`
   class) — never continuously from scroll position, which is what made the graphic itself, not just
   its swap, look like it was still in motion the whole time a reader scrolled through a step. */
@media (prefers-reduced-motion: no-preference) {
  .step-frame { transition: opacity 0.3s ease; }
}

.scrolly-steps {
  position: relative;
  z-index: 1;
  margin-top: calc(-1 * var(--graphic-h));
}
/* Prose is ALWAYS in normal document flow — nothing here is display:none or visibility:hidden, and
   nothing removes a paragraph from the accessibility tree. A screen reader or keyboard user reaches
   every step's own text by reading or tabbing through the page exactly like any other paragraph;
   scrolling is only what changes the GRAPHIC and which panel is PAINTED, never what puts the words
   in the document.

   \`.step\`'s own horizontal padding carries the gutter: \`.step\` spans the full sticky graphic's
   own width, so without this the panel would sit 1px from the true screen edge on a narrow phone.

   \`align-items: flex-end\` is not a taste decision, it is what makes the sticky panel below work at
   all, and getting it wrong was the first thing driving a browser caught. A \`bottom\` sticky offset
   only ever shifts a box UP — it clamps a box that would otherwise sit BELOW the offset line, and
   it can never push one down. A panel placed at the TOP of its step therefore has nowhere to be
   shifted to and travels with the scroll exactly as if \`position: sticky\` were not there: measured
   at 1600x900, the panel moved from y=768 to y=-32 across one step, and the annotation collisions
   this whole correction exists to remove were all still present. Placed at the BOTTOM of a 115vh
   box, the same offset pins it: it enters below the fold, is pulled up to the lane, and holds there
   for 100vh of the step's own 115vh. \`justify-content: center\` still centres it horizontally, which
   is the correction that first put it over the middle of the graphic rather than flush left.

   Every step is the same height, INCLUDING the last: a shorter final step ends the document while
   its own panel has already un-pinned and started riding up the screen, which puts the last step's
   prose back over the last step's graphic at the one scroll position a reader is guaranteed to
   stop at. Measured: with a 96vh last step the final panel settled at y=35 of a 900px viewport. */
.step {
  min-height: 115vh;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 clamp(16px, 6vw, 56px);
}

/* THE PANEL IS PINNED IN THE LANE, and this is the correction that ends five rounds of collision
   patching. Every earlier build let the panel TRAVEL with the scroll — centred in its step, moving
   from the bottom of the screen to the top across that step's own scroll distance. A travelling
   opaque panel crosses every part of the graphic at SOME offset, so no safe area a frame could
   respect was ever safe for the whole of a step: the measured symptom was this seed's own "flood
   day" label reduced to "flo…" at 1600x900, 55% of the way through a step.

   \`position: sticky\` with a BOTTOM offset parks the panel at a fixed distance from the viewport's
   own bottom edge for the whole of its step, inside \`--prose-lane\`. Bottom-anchored, not
   top-anchored, so a panel that needs an extra line grows UPWARD into the lane instead of
   overflowing past the fold. The frames keep everything they annotate above the lane
   (assets/ScrollySeed.tsx, \`safeBand\`/\`CONTENT_TOP\`), so panel and annotation now occupy disjoint
   bands of the screen by construction rather than by luck.

   The panel is OPAQUE, painted with the exact \`--ground\` this render's furniture was derived from —
   never a translucent scrim whose effective colour drifts with whatever part of the graphic happens
   to sit behind it. Because it fully occludes the graphic at its own footprint, ink-on-ground is the
   only contrast question left, and \`deriveFurniture\` already answers it (asserted again in
   \`renderScrolly\`, above, and in this skill's own test). */
.step-panel {
  position: sticky;
  bottom: clamp(16px, 4vh, 40px);
  max-width: min(46ch, 100%);
  background: var(--ground);
  color: var(--ink);
  border: 1px solid var(--grid);
  padding: 14px 16px;
}
.step-panel p {
  margin: 0;
  font-size: 17px;
  line-height: 1.5;
}
.step-panel p + p { margin-top: 10px; }

/* ONE PANEL AT A TIME — the second half of the same correction. Two steps' panels used to be on
   screen together through every transition, because the outgoing one is still riding up out of the
   lane while the incoming one has already parked in it. That is unavoidable in a flow layout and it
   is not fixed by geometry; it is fixed by PAINTING only the step the reader is on.

   \`.scrolly--live\` is added by \`assets/interaction.mjs\` at init, so this rule exists only where a
   script is actually running: with JavaScript off no panel is ever faded, every step's prose reads
   in flow, and the page degrades to exactly what it degraded to before. \`opacity\` (not
   \`display\`/\`visibility\`) is the deliberate choice — a faded panel stays in the accessibility tree
   and in the document, so a screen reader user still meets every step's words in order. */
.scrolly--live .step:not(.active) .step-panel {
  opacity: 0;
  pointer-events: none;
}
@media (prefers-reduced-motion: no-preference) {
  .step-panel { transition: opacity 0.3s ease; }
}
`.trim();
}

// ---------------------------------------------------------------------------------------------
// ===== CONFIG — edit for your story =====
// Everything from here to the closing marker is THIS SEED's own words, its own image and its own
// mapping from `frameKind` to a component — the only part of this file allowed to know that a
// "scrolly" is, this once, a photograph followed by a diagram. A real beat replaces all of it and
// leaves `renderScrolly`, above, untouched.
// The colours are the one part of `SEED` that is not words: READ back from this skill's own
// `PALETTE.md`, exactly as a beat reads its story's answer.
const SEED_PALETTE = readPalette(join(HERE, "..", "assets"), { stopAt: join(HERE, "..") });
const SEED = {
  ground: SEED_PALETTE.ground,
  accent: SEED_PALETTE.accent,
  title: "One gauge, one river, one number a day",
  source:
    "Readings: daily mean discharge, USGS site 01638500, National Water Information System " +
    "(sample-data/potomac-2024.csv). Station: USGS site file (potomac-station.rdb). Map: MapTiler " +
    "dataviz-light basemap, © OpenStreetMap contributors. The opening scene and the instrument " +
    "diagram are drawings of how a staff gauge works, not photographs of this station.",
};
const SAMPLE_DATA = join(HERE, "../assets/sample-data");
const DEFAULT_OUT_DIR = "/tmp/scrolly-twin";
const OUTPUT_NAME = "gauge-scrolly.html";

/** The `id` → `(waterLevelT, dayLabel)` mapping for this seed's three `"drawn"` steps — the ONLY
 *  place any of this seed's three drawn frames differ from one another. Keyed by `id`, not by some
 *  new field on `STEPS_META`, because the shape a scrolly step needs (`id`/`frameKind`/`prose`)
 *  stays exactly what `assets/interaction.mjs` matches a step to its frame by; a per-day reading is
 *  this SEED's own editorial content, not a fourth field the generic type needs to carry.
 *
 *  `waterLevelT` is a fraction of the STAFF's own safe range (`DrawnGraphicFrame`'s own
 *  `staffTop`..`staffBottom`, both inside `SAFE_AREA.y` — see `ScrollySeed.tsx`'s own doc-comment
 *  on `SAFE_AREA`), not of the whole canvas: 0 is the highest safe reading, 1 the lowest, and every
 *  value in between stays on the visible staff by construction. */
const DRAWN_VARIANT = { waterLevelT: 0.5, dayLabel: "today" };

/** The ONE place in this file that reads a step's own `frameKind` and turns it into a built
 *  `ReactElement` — `renderScrolly`, above, never sees `frameKind` at all. Teach this function a
 *  new case for a new medium; `renderScrolly` does not change, and did not change when the MAP and
 *  CHART tracks were added: the two extra branches below are the entire cost of a new medium. */
function buildFrame(meta, ctx) {
  const { ground, ink, muted, grid, accent } = ctx;
  if (meta.frameKind === "image") return createElement(ImageFrame, { src: ctx.photoDataUri });
  if (meta.frameKind === "drawn")
    return createElement(DrawnGraphicFrame, { ground, ink, muted, accent, ...DRAWN_VARIANT });
  if (meta.frameKind === "map")
    return createElement(MapFrame, {
      plate: ctx.plateDataUri,
      frame: ctx.plate.frame,
      station: {
        px: ctx.plate.station.px,
        py: ctx.plate.station.py,
        // Derived from the station's own name, never re-typed: everything after "at" is the place,
        // which is what a marker on a map has room to say.
        label: ctx.station.name.split(" at ").pop(),
      },
      ground,
      ink,
      accent,
    });
  if (meta.frameKind === "chart")
    return createElement(ChartFrame, {
      readings: ctx.readings,
      facts: ctx.gauge,
      ground,
      ink,
      muted,
      grid,
      accent,
    });
  throw new Error(
    `unknown frameKind "${meta.frameKind}" — teach buildFrame a new case, or fix STEPS_META`,
  );
}
// =========================================

/** The seed beat's own runner: reads its own frozen files off disk, DERIVES every fact its prose
 *  claims from them, embeds the two rasters as data URIs (the self-contained-HTML rule this genre
 *  keeps for every asset — an SVG frame gets it for free just by being SSR'd inline), and hands
 *  `renderScrolly` the four built frames plus their resolved prose. */
async function render({ outDir, name = OUTPUT_NAME }) {
  const [photoBuffer, plateBuffer, plateGeometry, stationRdb, readingsCsv] = await Promise.all([
    readFile(join(SAMPLE_DATA, "basin-photo.png")),
    readFile(join(SAMPLE_DATA, "potomac-plate.jpg")),
    readFile(join(SAMPLE_DATA, "potomac-plate.json"), "utf8"),
    readFile(join(SAMPLE_DATA, "potomac-station.rdb"), "utf8"),
    readFile(join(SAMPLE_DATA, "potomac-2024.csv"), "utf8"),
  ]);

  const station = readStation(stationRdb);
  const readings = parseReadings(readingsCsv);
  const gauge = deriveFacts(readings);
  const furniture = deriveFurniture(SEED.ground);

  const ctx = {
    photoDataUri: `data:image/png;base64,${photoBuffer.toString("base64")}`,
    plateDataUri: `data:image/jpeg;base64,${plateBuffer.toString("base64")}`,
    plate: JSON.parse(plateGeometry),
    station,
    readings,
    gauge,
    ground: SEED.ground,
    accent: SEED.accent,
    ...furniture,
  };

  const facts = { station, gauge };
  const steps = STEPS_META.map((meta) => ({
    id: meta.id,
    // The prose is RESOLVED here, from the facts derived above — see `ScrollySeed.tsx`'s own
    // doc-comment on why no figure this beat says out loud is a literal.
    prose: meta.prose(facts),
    frame: buildFrame(meta, ctx),
  }));

  const { outPath, panelContrast } = await renderScrolly({
    steps,
    title: SEED.title,
    source: SEED.source,
    ground: SEED.ground,
    proseLane: PROSE_LANE,
    outDir,
    name,
  });
  return { outPath, steps: steps.length, panelContrast, facts };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const positional = argv.find((a) => !a.startsWith("--"));
  const outDir = resolve(positional ?? DEFAULT_OUT_DIR);

  const { outPath, steps, panelContrast } = await render({ outDir });
  console.log(
    `scrolly beat → ${outPath}  [${steps} steps, panel contrast ${panelContrast.toFixed(2)}:1]`,
  );
}

export { render, renderScrolly, SEED };
