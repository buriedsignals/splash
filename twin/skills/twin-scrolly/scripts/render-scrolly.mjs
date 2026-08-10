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
    <div class="scrolly-steps" tabindex="0">
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
 *  scripts. The same trick `render-web.mjs` uses.
 *
 *  AND THEN WRAPS THE RESULT IN AN IIFE, which is not tidiness — it is a defect that was shipped
 *  and measured. Stripping `export` turns every top-level declaration into a GLOBAL, and a beat
 *  that inlines a second script of its own (both single-visual beats do: they re-parent their
 *  visual into the frame stack and scrub it from the scroll) lands in the same global scope. When
 *  this scaffold gained a `measureProgress`, the beats' own `measureProgress` — a different
 *  function, taking an array of overlaps rather than panels and a lane — was silently overwritten
 *  by whichever declaration came last, and their paint loop threw
 *  `Cannot read properties of undefined (reading 'top')` on every animation frame. Nothing about
 *  the scaffold is meant to be reachable from a beat's own script; scoping it makes that true
 *  instead of merely intended, and it costs one line. See references/scrolly-discipline.md, "One
 *  page, two inlined scripts." */
function inlineable(moduleSource) {
  return `(function () {\n${moduleSource.replace(/^export /gm, "")}\n})();`;
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
  /* THE PROSE LANE — the band a beat's own frames keep clear at the BOTTOM of every frame
     (\`safeBand\`/\`CONTENT_TOP\` in assets/ScrollySeed.tsx, and a copy of the same constant in
     every beat's own frame file). It is DECLARED here, not consumed: until the eighth correction
     the scaffold pinned the prose panel against this band, and since the prose moved into its own
     cell of the grid nothing in this stylesheet places anything against it. It is emitted so the
     number a beat's frames computed from is readable off the delivered file, and because reclaiming
     that band — the frames now reserve space nothing occupies — is a change to every beat's own
     frames rather than to this scaffold. Named as residue in references/scrolly-discipline.md. */
  --prose-lane: ${(proseLane * 100).toFixed(0)}%;
  /* THE SPLIT — the eighth correction, and the one number pair this scaffold now owns outright.
     The prose gets its OWN space so it can travel the full height of it without ever crossing the
     graphic: a COLUMN beside the graphic on a wide viewport, a BAND below it on a phone. Both are
     measured rather than chosen — see references/scrolly-discipline.md, "The prose has its own
     space," for the driven measurements behind each number. */
  --prose-col: clamp(300px, 30%, 440px);
  --prose-band: clamp(150px, 42%, 340px);
  --prose-gutter: clamp(16px, 6vw, 32px);
}
* { box-sizing: border-box; }
/* THE PAGE DOES NOT SCROLL, and that is the whole model this genre now runs on. The component is
   exactly one frame tall; the ONLY thing in the document with scroll distance is
   \`.scrolly-steps\`, the prose column. See references/scrolly-discipline.md, "The graphic is fixed
   and the page does not scroll," for the seventh correction that replaced the sticky model and for
   the measurement that condemned it. This is also what makes the file safe to embed in a CMS
   article: a component that scrolls its own prose never steals the host page's scroll. */
html, body { height: 100%; }
body {
  margin: 0;
  overflow: hidden;
  background: var(--ground);
  color: var(--ink);
  font-family: Helvetica, Arial, sans-serif;
}
/* \`.scrolly\` itself carries NO width constraint — a sixth correction. The fourth build's fix
   constrained THIS element to a 640px reading measure, which centred it correctly but also capped
   every child inside it, including the GRAPHIC, to that same narrow column — a visual meant to
   fill the frame it sits in, stranded in the middle of a wide page instead. The reading measure now
   belongs to the two things that are actually PROSE — \`.scrolly-header\`, below, and
   \`.step-panel\` (\`.step\`'s own \`justify-content: center\` already centres it, see "Measuring prose
   over the graphic") — never to \`.scrolly-track\`/\`.scrolly-graphic\`, which are left to size
   themselves to their parent's own full width, all the way out to \`body\`. See
   references/scrolly-discipline.md, "The graphic fills the width it is given."

   The HEIGHT rule is the SEVENTH correction, and it is a change of model rather than of a number.
   \`.scrolly\` is a two-row grid exactly one frame tall: the header takes what it needs, and the
   track takes everything left (\`minmax(0, 1fr)\` — never \`1fr\` alone, whose \`auto\` minimum
   would let a tall track push the component past the frame and put the document back in the
   scrolling business). Nothing in this grid ever moves. */
.scrolly {
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
}

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
   furniture beside it, and the reversal does not reach it.

   THE HEADER NEVER MOVES — a seventh correction, and the owner's own words: "on scroll d'abord
   dans la page, ce qui fait disparaître le titre, alors que ça devrait être fixe." Under the
   sticky model the header was the first casualty of the reader's first gesture: the DOCUMENT
   scrolled, so the title slid away before the graphic had even finished arriving. It is now row 1
   of \`.scrolly\`'s own grid, OUTSIDE the one element that scrolls, so it is fixed by construction
   rather than by a \`position\` keyword that has to be got right. \`margin-bottom\` is gone with it:
   the gap now belongs to the header's own padding, because a margin between two grid rows would
   show the page's ground where the frame should start. */
.scrolly-header {
  padding: 4px clamp(16px, 6vw, 56px) 14px;
}
.scrolly-header h2 { margin: 0 0 4px; font-size: 22px; line-height: 1.25; }
.scrolly-header .source { margin: 0; font-size: 13px; color: var(--muted); }

/* THE GRAPHIC IS FIXED, AND THE PROSE HAS ITS OWN SPACE BESIDE IT. The graphic is a grid cell of a
   track that never moves — it does not stick, it does not catch up and it does not unpin. That is
   the SEVENTH correction, unchanged. What the EIGHTH correction changes is what the OTHER cell is.

   THE EIGHTH CORRECTION, in the owner's own words: "le panel avec le texte ne bouge plus alors que
   l'effet c'est vraiment de les faire défiler au scroll vers le haut." The seventh correction pinned
   each prose panel with a \`bottom\` sticky offset so it PARKED in a reserved band for the whole of
   its step. The document stopped scrolling and the header stopped moving — both right, both kept —
   but the words stopped moving too, and a scrollytelling piece whose text does not travel is a
   slideshow. Measured on the shipped artifacts with this skill's own continuous-scroll guard: the
   middle panels held ONE screen offset for 42-45% of every scroll-advancing animation frame, and
   the last panel for 78%, sweeping 187px of an 821px track at 1600x900.

   WHY THE SEVENTH CORRECTION PARKED THEM, because reverting is not the fix. An OPAQUE panel that
   travels the full height of a shared box crosses every part of the graphic at some offset, so no
   safe area a frame respects is safe for the whole of a step. That is real, it was measured, and
   the lane closed it.

   SO THE PROSE GETS ITS OWN SPACE INSTEAD OF A RESERVATION INSIDE THE GRAPHIC'S. The track is a
   two-cell grid: the graphic in one cell, the prose column in the other, never overlapping. The
   panel travels the full height of its own cell — entering at its bottom edge, leaving past its top
   — and a collision is impossible BY CONSTRUCTION rather than by a band both sides have to agree
   about. \`overflow: hidden\` on both cells is what makes the edges real: a panel riding out of the
   top of a phone's band is clipped at that band's own edge, never painted over the graphic above it.

   WHAT IT COSTS, and it is not free. The graphic no longer spans the full viewport width on a wide
   screen — it spans the viewport minus the prose column. "All web visuals take the full width" was
   satisfied by the sixth correction and is now satisfied only up to that column. The alternative is
   the parked panel the owner rejected; this scaffold cannot have both.

   Filling its cell does not distort anything: every frame this genre ships paints with
   \`object-fit: cover\` (\`ImageFrame\`) or \`preserveAspectRatio\` (\`DrawnGraphicFrame\`) — cropping
   to whatever box it is given, never stretching. See references/scrolly-discipline.md, "The prose
   has its own space."

   HISTORY, kept because the corrections are only legible against it. Every build up to the sixth
   pinned the graphic with \`position: sticky; top: 0\` inside a track that began BELOW the header,
   and pulled the prose column back over it with \`margin-top: calc(-1 * var(--graphic-h))\`. That is
   a correct use of sticky and it produced three defects no value of \`--graphic-h\` could fix: the
   graphic spent the reader's first gesture CLIMBING to \`top: 0\` (so a FITTED frame's own content
   hung below the fold, into the pinned panel's lane, measured at 90px of a 3330px track at 1600x900
   and 177px of 3100 at 375x812); the header scrolled away with the document, which the owner named
   directly; and the whole component fought the host page for the scroll, which a CMS embed must
   never do. A graphic that is never positioned FROM the scroll cannot lag behind it. \`--graphic-h\`
   went with that model and has not come back: each cell's size is the grid's, so there is no second
   number to keep in step with the first.

   THE STACKED BRANCH IS THE DEFAULT, and that is deliberate rather than mobile-first fashion: a
   phone is the viewport where the split is TIGHT, so it is the one written without a media query,
   where a browser that ignores the query still gets the arrangement that has the least room to
   spare. The wide branch is the override. */
.scrolly-track {
  position: relative;
  overflow: hidden;
  display: grid;
  /* Stacked: the graphic takes what is left, the prose band takes a measured slice of the bottom.
     \`minmax(0, 1fr)\` never bare \`1fr\` — an \`auto\` minimum would let a tall frame push the band
     off the bottom of the component and put the document back in the scrolling business. */
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) var(--prose-band);
}
.scrolly-graphic {
  position: relative;
  grid-row: 1;
  grid-column: 1;
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

/* THE ONE SCROLLER IN THE DOCUMENT. Nothing else in the page has scroll distance — \`body\` is
   \`overflow: hidden\` and exactly one frame tall — so the reader's wheel, finger and arrow keys
   move THIS column and nothing else. The prose travels; the graphic and the header do not.

   \`tabindex="0"\` on this element (written in the markup, not here) is not decoration and it is not
   optional: taking the scroll off the document takes the reader's default keyboard scrolling with
   it, and a scroll container that cannot be focused cannot be driven by a keyboard at all in every
   browser. Focusing it restores Page Down / arrow / space over the prose — the same reach the
   document used to give for free. See references/scrolly-discipline.md, "Keyboard and screen
   readers reach every step." */
.scrolly-steps {
  position: relative;
  grid-row: 2;
  grid-column: 1;
  z-index: 1;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  /* THE EDGE THE PANEL CLIPS AT. \`overflow\` on this element is what makes "the prose travels in
     its own space" true rather than merely intended: a panel riding out past the top of the band
     is CUT at this border, so nothing of it is ever painted on the graphic above. The 1px rule is
     that edge made visible — the reader sees a column, not a leak. */
  border-top: 1px solid var(--grid);
  background: var(--ground);
}

/* SIDE BY SIDE ONCE THERE IS ROOM FOR BOTH. The breakpoint is where the two cells stop fitting
   beside each other: the prose column floors at 300px (a 46ch measure is impossible below roughly
   that, and \`--prose-gutter\` takes 32px of it) and the graphic needs enough width that a FITTED
   chart frame's own y-axis gutter — \`max(62px, 13%)\` in this seed's own \`CHART_LAYOUT\` — is still
   the percentage rather than the floor, which is 477px. 300 + 477 = 777, and 860px is that with
   room for the gutters, one step above the widest phone in landscape. Below it the graphic would
   be squeezed narrower than its own labels need and the two cells stack instead. */
@media (min-width: 860px) {
  .scrolly-track {
    grid-template-columns: minmax(0, 1fr) var(--prose-col);
    grid-template-rows: minmax(0, 1fr);
  }
  .scrolly-steps {
    grid-row: 1;
    grid-column: 2;
    border-top: 0;
    border-left: 1px solid var(--grid);
  }
}
/* Prose is ALWAYS in normal document flow — nothing here is display:none or visibility:hidden, and
   nothing removes a paragraph from the accessibility tree. A screen reader or keyboard user reaches
   every step's own text by reading or tabbing through the page exactly like any other paragraph;
   scrolling is only what changes the GRAPHIC and which panel is PAINTED, never what puts the words
   in the document.

   \`.step\`'s own horizontal padding carries the gutter, so the panel never sits flush against the
   column's own edge.

   \`align-items: center\` is what makes the panel TRAVEL, and it is the eighth correction. The
   seventh build set \`flex-end\` so a \`bottom\` sticky offset had something to clamp — that pair was
   correct for the model it belonged to and it is what parked the words. Centred in a step 15%
   taller than the column it scrolls inside, the panel crosses the whole column once per step:
   it enters at the bottom edge, passes the middle, and leaves past the top, moving by exactly the
   reader's own scroll on every single animation frame. Nothing clamps it, because nothing needs to
   — the graphic is not underneath it any more.

   Every step is the same height, INCLUDING the last. Under the sticky model a shorter last step
   ended the document with its panel already un-pinned and riding up over the graphic; under this
   one it would simply hand the reader a final panel further up the column than every other. Same
   height, same arrival, and the last panel settles a little above the middle of its column rather
   than exactly on it — a property of a 115% step, and visible at the one scroll position every
   reader is guaranteed to stop at.

   \`115%\`, not \`115vh\` — a seventh correction, kept: a step's scroll distance is a multiple of the
   SCROLLPORT the prose scrolls inside, which is now the prose column (its own cell of the track),
   not the viewport and not the track. \`vh\` here would make every step taller than the box it is
   read in, and on a phone — where the column is a band of a few hundred pixels — it would make it
   several times taller. */
.step {
  min-height: 115%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--prose-gutter);
}

/* THE PANEL TRAVELS, AND IT TRAVELS IN ITS OWN COLUMN. This is the eighth correction, and it
   REVERSES the seventh's own \`position: sticky; bottom: …\` pin — see \`.scrolly-track\` above for
   the owner's report and the measurement of what the pin cost. The rule that ships here is the
   absence of a rule: an ordinary flow box, centred in a step taller than the column, moving with
   the scroll like every other word on the page.

   What the pin bought is NOT given back. It existed so an opaque travelling panel could not cross
   the graphic's own labels; the panel now cannot reach the graphic at all, because the two live in
   different cells of the track's grid and each cell clips its own content. A guarantee made by the
   box model instead of by two constants agreeing.

   The panel is OPAQUE, painted with the exact \`--ground\` this render's furniture was derived from —
   never a translucent scrim. It no longer crosses the graphic, so this is one less thing it has to
   be true for; it stays because ink-on-ground is the contrast \`deriveFurniture\` guarantees and
   \`renderScrolly\` asserts, and a panel that changed colour to match a cell background nobody
   measured would be a new pairing owed a new measurement. */
.step-panel {
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

/* NO PANEL IS EVER HIDDEN, and that is the eighth correction removing a mechanism rather than
   tuning one. The seventh build faded every panel that was not \`in-lane\` to \`opacity: 0\`, because a
   \`bottom\`-sticky panel un-pinned one panel-height before the next one parked and spent that gap
   opaque and climbing over the graphic's own labels — real, measured, and closed by not painting it.

   That mechanism has nothing left to protect. The prose lives in its own cell of the track's grid
   and is clipped at that cell's own edge, so an outgoing panel cannot reach a label whatever its
   opacity. Keeping the fade would now do active harm: the reader would watch the words they are
   reading DISSOLVE halfway up the column instead of scrolling out of it, which is the same defect
   the owner named, wearing a different costume. Two panels on screen through a boundary is not a
   bug in a scroll-driven piece; it is what a boundary looks like.

   Gone with it: \`pickLanePanel\`, the \`in-lane\` class, and \`.scrolly--live\` — a class whose only
   consumer was the rule above, and which existed so that a page whose script never ran could not
   hide a word. With no rule that hides a word, there is nothing left for it to guard. */
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
