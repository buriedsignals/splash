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
import { deriveFurniture, contrast } from "./render-still.mjs";
import { STEPS_META, ImageFrame, DrawnGraphicFrame } from "../assets/ScrollySeed.tsx";

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
async function renderScrolly({ steps, title, source, ground, outDir, name }) {
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

  const stepsHtml = steps
    .map(
      (step, i) => `      <section class="step${i === 0 ? " active" : ""}" data-step="${escapeHtml(step.id)}">
        <div class="step-panel">
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
${buildCss({ ground, ...furniture })}
</style>
</head>
<body>
<article class="scrolly">
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

function buildCss({ ground, ink, muted, grid }) {
  return `
:root {
  --ground: ${ground};
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
/* A comfortable reading measure (~640px, the classic editorial column width — well under the
   ~75-character line-length ceiling even at the panel's own 17px prose), centred with \`margin: 0
   auto\` — not the assembly's own graphic bleeding to whatever the window happens to be. The side
   padding SCALES with the viewport (\`clamp\`) rather than sitting at a fixed 16px, so a realistic,
   not-maximised desktop window (the common case a fixed 16px still let the column read as
   edge-to-edge in, at anything under roughly 670px of window width) keeps a visible gutter on both
   sides too, not only a viewport wide enough to hit the 640px ceiling with room to spare. */
.scrolly { max-width: 640px; margin: 0 auto; padding: 0 clamp(16px, 6vw, 56px); }

/* The header states the beat's own argument in full, unconditional and ahead of every step's own
   reveal — and, deliberately, ahead of the sticky graphic too: it sits in plain document flow,
   scrolled past once, so it is never the thing a step's prose panel has to be measured against. */
.scrolly-header { margin: 0 0 24px; padding: 4px 0 0; }
.scrolly-header h2 { margin: 0 0 4px; font-size: 22px; line-height: 1.25; }
.scrolly-header .source { margin: 0; font-size: 13px; color: var(--muted); }

/* The overlap this genre's own gotcha describes is now DELIBERATE, not engineered away: the
   graphic is the sticky ground, every step's own prose travels OVER it. \`position: sticky\`
   reserves its element's ORIGINAL box at the top of \`.scrolly-track\` — the exact behaviour that
   caused the original defect (see references/scrolly-discipline.md, "The one gotcha," for why).
   The fix does not fight that behaviour, it uses it: \`.scrolly-steps\`'s negative top margin,
   exactly \`--graphic-h\` tall, pulls the steps column back UP over that same reserved box on
   purpose, so the sticky graphic and the scrolling prose occupy the same screen coordinates for as
   long as the track has steps left to give. */
.scrolly-track {
  --graphic-h: min(70vh, 640px);
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
/* Prose is ALWAYS in normal document flow — nothing here is display:none, visibility:hidden or
   otherwise gated. A screen reader or keyboard user reaches every step's own text by reading or
   tabbing through the page exactly like any other paragraph; scrolling into the sticky graphic's
   own centre band is only what changes the GRAPHIC, never what reveals the prose. */
.step {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 4px;
}
.step:last-child { min-height: 60vh; }

/* The panel is OPAQUE, painted with the exact \`--ground\` this render's furniture was derived
   from — never a translucent scrim whose effective colour drifts with whatever part of the
   graphic happens to sit behind it. Because the panel fully occludes the graphic at its own
   footprint, ink-on-ground is the only contrast question left, and \`deriveFurniture\` already
   answers it (asserted again in \`renderScrolly\`, above, and in this skill's own test). See
   references/scrolly-discipline.md, "Measuring prose over the graphic."

   \`max-width\` narrower than \`.step\`'s own box is what leaves the panel free to be CENTRED by
   \`.step\`'s own \`justify-content: center\` (above) rather than pinned to the flex row's default
   start edge — the bug the fourth correction caught: \`.step\` centred the panel VERTICALLY
   (\`align-items: center\`) from the very first build but never HORIZONTALLY, so the panel sat flush
   against the graphic column's own left edge at every width, while \`.scrolly\`'s own left/right
   margin (measured and reported centred) said nothing about it — a reader looks at the panel, not
   at an invisible outer box, and the panel was the thing off-centre. See
   references/scrolly-discipline.md, "The composition is a centred reading column," for the
   measurement that caught this. */
.step-panel {
  max-width: min(42ch, 100%);
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
.step-panel p + p { margin-top: 12px; }
`.trim();
}

// ---------------------------------------------------------------------------------------------
// ===== CONFIG — edit for your story =====
// Everything from here to the closing marker is THIS SEED's own words, its own image and its own
// mapping from `frameKind` to a component — the only part of this file allowed to know that a
// "scrolly" is, this once, a photograph followed by a diagram. A real beat replaces all of it and
// leaves `renderScrolly`, above, untouched.
const SEED = {
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title: "Every reading in this project traces back to one gauge, at one place",
  source: "Illustrative scene and instrument diagram — not a real gauge station",
};
const PHOTO_PATH = join(HERE, "../assets/sample-data/basin-photo.png");
const DEFAULT_OUT_DIR = "/tmp/scrolly-twin";
const OUTPUT_NAME = "gauge-scrolly.html";

/** The `id` → `(waterLevelT, dayLabel)` mapping for this seed's three `"drawn"` steps — the ONLY
 *  place any of this seed's three drawn frames differ from one another. Keyed by `id`, not by some
 *  new field on `STEPS_META`, because the shape a scrolly step needs (`id`/`frameKind`/`prose`)
 *  stays exactly what `assets/interaction.mjs` matches a step to its frame by; a per-day reading is
 *  this SEED's own editorial content, not a fourth field the generic type needs to carry. */
const DRAWN_VARIANTS = {
  instrument: { waterLevelT: 0.58, dayLabel: "today" },
  flood: { waterLevelT: 0.3, dayLabel: "flood day" },
  drought: { waterLevelT: 0.7, dayLabel: "dry spell" },
};

/** The ONE place in this file that reads a step's own `frameKind` and turns it into a built
 *  `ReactElement` — `renderScrolly`, above, never sees `frameKind` at all. Teach this function a
 *  new case for a new medium; `renderScrolly` does not change. */
function buildFrame(meta, { photoDataUri, ground, ink, muted, accent }) {
  if (meta.frameKind === "image") return createElement(ImageFrame, { src: photoDataUri });
  if (meta.frameKind === "drawn") {
    const variant = DRAWN_VARIANTS[meta.id] ?? {};
    return createElement(DrawnGraphicFrame, { ground, ink, muted, accent, ...variant });
  }
  throw new Error(
    `unknown frameKind "${meta.frameKind}" — teach buildFrame a new case, or fix STEPS_META`,
  );
}
// =========================================

/** The seed beat's own runner: reads its own photograph off disk, embeds it as a data URI (the
 *  self-contained-HTML rule this genre keeps for every asset, an SVG frame gets for free just by
 *  being SSR'd inline), and hands `renderScrolly` the two built frames plus their prose. */
async function render({ outDir, name = OUTPUT_NAME }) {
  const photoBuffer = await readFile(PHOTO_PATH);
  const photoDataUri = `data:image/png;base64,${photoBuffer.toString("base64")}`;
  const furniture = deriveFurniture(SEED.ground);

  const steps = STEPS_META.map((meta) => ({
    id: meta.id,
    prose: meta.prose,
    frame: buildFrame(meta, {
      photoDataUri,
      ground: SEED.ground,
      accent: SEED.accent,
      ...furniture,
    }),
  }));

  const { outPath, panelContrast } = await renderScrolly({
    steps,
    title: SEED.title,
    source: SEED.source,
    ground: SEED.ground,
    outDir,
    name,
  });
  return { outPath, steps: steps.length, panelContrast };
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
