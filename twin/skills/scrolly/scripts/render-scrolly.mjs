// twin/skills/scrolly/scripts/render-scrolly.mjs
//
// The vehicle's own render step. It SSRs one complete frame per narrative step, stacks them in a
// fixed graphic that fills the frame, lays every step's own prose out in an opaque card that
// travels UP OVER that graphic as the reader scrolls, and inlines the one interaction script — one
// self-contained HTML file, no external request, the same discipline
// `chart-web/scripts/render-web.mjs` already keeps for its two layouts.
//
// It runs in node, which is why it is the piece that derives the furniture colours: `deriveFurniture`
// / `contrast` live beside a native rasteriser in this skill's OWN `./render-still.mjs` — a copy of
// `chart-beat`'s, because a skill never imports another skill — which no browser bundle can
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
// Usage:  bun skills/scrolly/scripts/render-scrolly.mjs [outDir]

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, contrast, readPalette } from "./render-still.mjs";
import {
  STEPS_META,
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
 * SSRs one React element per entry in `steps`, stacks every resulting frame in a fixed graphic
 * that fills the frame, lays every step's own prose out in an opaque card in ordinary document
 * flow OVER that graphic, and inlines the one interaction script — one self-contained HTML file.
 *
 * `steps` is `{ id, prose, frame }[]` — `frame` is a `ReactElement`, already built by the CALLER
 * (the CONFIG seam below, for this skill's own seed; a real beat's own runner for anything else).
 * This function never asks what kind of thing `frame` is; it treats an `<img>` and an `<svg>`
 * identically — SSR it, wrap it, toggle which wrapped copy is visible. That is the entire contract
 * that makes this scaffold able to assemble different media without knowing it is doing so.
 */
async function renderScrolly({ steps, title, source, ground, outDir, name, proseLane = 0 }) {
  if (!(proseLane >= 0 && proseLane < 0.6))
    throw new Error(
      `proseLane is the fraction of its own height a beat's frames keep clear at the bottom; got ${proseLane}`,
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
  // `ground` (the mid-grey escalation `doctrine/references/visual-system.md` describes). The
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
  // layer measures, because the panel is the thing a reader actually reads, and "which step is the
  // reader reading" has to mean "whose words are on the frame right now" — never "whose 140%-tall
  // section happens to cross the middle of the screen", which is a different question with a
  // different answer at every step boundary.
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
  /* THE BAND A BEAT'S OWN FRAMES STILL KEEP CLEAR AT THEIR BOTTOM, if that beat keeps one
     (\`CONTENT_TOP\` in a beat's own frame file). It is DECLARED, never consumed: this scaffold
     places nothing against it, and since the ninth correction there is no band it COULD place
     anything against — the card travels the whole height of the frame at a uniform rate and rests
     nowhere. The seed passes 0 and its own frames use their full height again; the beats that
     still derive a camera or a plot box from their own copy pass theirs, and it is emitted so the
     number is readable off the delivered file. See references/scrolly-discipline.md, "A reserved
     band cannot survive a card that crosses everything." */
  --prose-lane: ${(proseLane * 100).toFixed(0)}%;
  /* The card's own side gutter, on the viewports wide enough to have one — see \`.step\`, below,
     for the two regimes and the width that separates them. */
  --prose-gutter: clamp(16px, 6vw, 56px);
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

/* THE GRAPHIC FILLS THE FRAME, AND THE CARD TRAVELS OVER IT. The graphic is a layer of a track that
   never moves — it does not stick, it does not catch up and it does not unpin. That is the SEVENTH
   correction, unchanged. The EIGHTH correction took the prose OUT of this box and into a column
   beside it; the NINTH puts it back on top, which is the shape the owner asked for:

     "Le panel avec le texte ne doit pas être sur le côté mais centré et par dessus le contenu
      visuel."

   The eighth correction's split was a sound answer to a real defect — an opaque panel travelling a
   box it SHARES with the graphic crosses every part of that graphic at some offset, and no
   reservation survives a travelling occluder — and it is not the form. Two cells make a collision
   impossible by never letting the two things meet; this genre's whole grammar is that they DO meet
   and that meeting is legible. So the collision is answered the other way: the card is fully
   OPAQUE, painted with the exact \`--ground\` this render's furniture was derived from, and
   \`renderScrolly\` asserts ink-on-ground clears 4.5:1 before it writes a byte. Wherever the card
   sits — over the photograph, over the plot, over the basemap — the colour a reader's eye meets is
   \`--ground\`, and the only contrast question is the one \`deriveFurniture\` already answers.

   WHAT THE CARD COVERS, measured rather than hoped for (a continuous scroll, both directions, three
   widths — see references/scrolly-discipline.md, "What the card covers"): a 410px-wide stripe down
   the middle of the frame at every desktop width (26% of 1600, 32% of 1280) and the full width of a
   phone, sweeping the whole height once per step. It crosses one of a frame's own labels on 44-165
   animation frames of a ~230-frame pass, and the graphic stands entirely clear on 12-35 of them.
   None of that is avoidable while the card travels the frame, and pretending otherwise is what the
   eighth correction's reservation did.

   \`overflow: hidden\` on the track is what keeps the assembly one frame tall; the two layers share
   the box on purpose. */
.scrolly-track {
  position: relative;
  overflow: hidden;
}
.scrolly-graphic {
  position: absolute;
  inset: 0;
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
   move THIS layer and nothing else. The prose travels; the graphic and the header do not.

   \`tabindex="0"\` on this element (written in the markup, not here) is not decoration and it is not
   optional: taking the scroll off the document takes the reader's default keyboard scrolling with
   it, and a scroll container that cannot be focused cannot be driven by a keyboard at all in every
   browser. Focusing it restores Page Down / arrow / space over the prose — the same reach the
   document used to give for free. See references/scrolly-discipline.md, "Keyboard and screen
   readers reach every step." */
.scrolly-steps {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  /* NO BACKGROUND, and that is the whole of the ninth correction in one declaration: this layer
     covers the graphic edge to edge, so anything it paints is a scrim over the visual. The only
     opaque thing in it is the card. The eighth correction gave this element \`background:
     var(--ground)\` and a 1px border because it was a COLUMN of its own beside the graphic; both
     go with the column. */
}
/* Prose is ALWAYS in normal document flow — nothing here is display:none or visibility:hidden, and
   nothing removes a paragraph from the accessibility tree. A screen reader or keyboard user reaches
   every step's own text by reading or tabbing through the page exactly like any other paragraph;
   scrolling is only what changes the GRAPHIC and which panel is PAINTED, never what puts the words
   in the document.

   \`.step\`'s own horizontal padding carries the gutter on the viewports that have one, so the card
   never sits flush against the frame's own edge there.

   \`align-items: center\` is what makes the card TRAVEL, and it is the eighth correction, kept.
   Centred in a step taller than the frame it scrolls inside, the card crosses the whole frame once
   per step: it enters at the bottom edge, passes the middle, and leaves past the top, moving by
   exactly the reader's own scroll on every single animation frame. Nothing clamps it and nothing
   parks it — a card that stops is the defect the owner named ("le panel avec le texte ne bouge
   plus"), and pinning one is what the eighth correction reversed.

   \`140%\`, AND THE NUMBER IS MEASURED. A step is the distance between two consecutive card centres,
   so the share of a pass on which NO card is over the graphic is \`1 - (L + p) / S\` for a track of
   height L, a card of height p and a step of S. At 115% — the eighth correction's value, chosen
   when the card lived beside the graphic and covering it was impossible — that share is 3%: driven,
   the seed measured 0 clear animation frames out of 217 at all three widths, so a reader never once
   saw the visual unobstructed. Raising S buys clear air and costs LOCK-STEP, because the active
   step flips when the incoming card enters the bottom edge, at \`progress = i + 1 - (L + p)/(2S)\`;
   the guard's own ceiling is 0.65 of a step. Driven at three heights on the seed: 115% gave 0/217
   clear and a worst drift of 0.50; 140% gave 28-31 clear of ~230 and 0.58; 170% gave 48-58 clear
   and 0.64-0.66 — at or over the ceiling. 140% is the largest step with real margin on both, and
   it also happens to be the height at which two cards are NEVER on screen at once (measured 0/231
   at every width, against 1-14 at 115%), which over a graphic is worth having: two opaque cards
   beside a visual is a boundary, two opaque cards ON it is a wall.

   Every step is the same height, INCLUDING the last.

   \`140%\`, not \`140vh\` — a seventh correction, kept: a step's scroll distance is a multiple of the
   SCROLLPORT the prose scrolls inside, which is the track itself. \`vh\` would count the fixed
   header too and make every step taller than the box it is read in.

   THE TWO REGIMES, and this is the one lever the vehicle has against the defect the owner reported
   in the round the card was last centred ("the 'flood day' label reduced to 'flo…'"). A label
   sitting UNDER the card reads as absent, which is what a card over a picture means; a label the
   card's own VERTICAL EDGE cuts down the middle reads as broken text, and it stays broken for every
   frame the card spends at that row. So the card is either comfortably narrower than the frame —
   its edges landing in the middle, where a frame does not put its axis furniture — or exactly as
   wide as it, with no edge inside the frame at all. Never in between. Frames keep their own margin
   content in the outer ~15% of their box (\`CHART_LAYOUT\`'s y-axis gutter is \`max(62px, 13%)\`), so
   "comfortably narrower" is at most 70% of the frame's width; the card's own reading measure
   renders at 410px, and 410 / 0.7 = 586, which is where the regimes change. Driven at 375px, the
   in-between shape cut the chart's own y-axis labels for 42 consecutive animation frames; edge to
   edge, it cuts nothing at all — measured 0 sliced runs at that width on all five beats. */
.step {
  min-height: 140%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* NARROW: no gutter, so the card can reach both edges and have no edge inside the frame. */
  padding: 0;
}

/* THE CARD TRAVELS, CENTRED, OVER THE VISUAL. An ordinary flow box, centred in a step taller than
   the frame, moving with the scroll like every other word on the page — the rule that ships is the
   absence of a rule. No \`position\`, no offset, nothing that could park it.

   The card is OPAQUE, painted with the exact \`--ground\` this render's furniture was derived from —
   never a translucent scrim, whose EFFECTIVE colour would be a blend with whatever part of the
   graphic happened to sit behind it at a given scroll position, changing frame to frame and pixel
   to pixel. An opaque card has no such ambiguity, and it is what makes the ninth correction's
   answer to the collision problem measurable at all: wherever the card sits, the background a
   reader's eye meets is \`--ground\`, so the only contrast question left is ink-on-ground — asserted
   at build time by \`renderScrolly\`'s own tripwire and again, off the LIVE computed styles of a
   driven browser, by \`scripts/verify-scrolly.mjs\`'s assertion F.

   NARROW REGIME BY DEFAULT: \`max-width: 100%\` and no gutter, so on a phone the card spans the
   frame edge to edge and has no vertical edge inside it to slice a label against. The reading
   measure is the OVERRIDE, below — the mobile-first order this file already keeps, for the same
   reason: the viewport with the least room to spare is the one a browser that ignores the query
   should get. */
.step-panel {
  max-width: 100%;
  background: var(--ground);
  color: var(--ink);
  border: 1px solid var(--grid);
  padding: 14px 16px;
}

/* THE READING MEASURE, once the frame is wide enough for the card to be comfortably narrower than
   it. 586px is where a 410px card stops being 70% of the frame (see \`.step\`, above, for why 70% is
   the line and what the in-between shape measured); 600px is that with a little room, and it is
   also below every desktop and laptop this genre is checked at. */
@media (min-width: 600px) {
  .step { padding: 0 var(--prose-gutter); }
  .step-panel { max-width: min(46ch, 100%); }
}
.step-panel p {
  margin: 0;
  font-size: 17px;
  line-height: 1.5;
}
.step-panel p + p { margin-top: 10px; }

/* NO CARD IS EVER HIDDEN, and that is the eighth correction removing a mechanism rather than
   tuning one. The seventh build faded every panel that was not \`in-lane\` to \`opacity: 0\`, because a
   \`bottom\`-sticky panel un-pinned one panel-height before the next one parked and spent that gap
   opaque and climbing over the graphic's own labels — real, measured, and closed by not painting it.

   THE NINTH CORRECTION PUTS THE CARD BACK OVER THE GRAPHIC AND STILL DOES NOT REINSTATE THE FADE.
   A card mid-fade is a TRANSLUCENT box over the visual, which is the one thing "Measuring prose
   over the graphic" forbids outright: its effective colour is a blend nobody can measure. Opaque
   and travelling is measurable; translucent and travelling is not. And the reader would watch the
   words they are reading DISSOLVE halfway up the frame instead of scrolling out of it, which is
   the owner's own defect wearing a different costume.

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
