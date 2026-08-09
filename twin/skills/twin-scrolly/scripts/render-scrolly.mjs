// twin/skills/twin-scrolly/scripts/render-scrolly.mjs
//
// The vehicle's own render step. It SSRs one complete SVG frame per narrative step, wraps them in
// a sticky graphic column, lays every step's own prose out below it in ordinary document flow, and
// inlines the one interaction script — one self-contained HTML file, no external request, the same
// discipline `twin-chart-web/scripts/render-web.mjs` already keeps for its two layouts.
//
// It runs in node, which is why it is the piece that derives the furniture colours and measures
// every gutter: `deriveFurniture`/`measureText` live beside a native rasteriser in this skill's OWN
// `./render-still.mjs` — a copy of `twin-chart-beat`'s, because a skill never imports another
// skill — which no browser bundle can load. Deriving here and passing ink/muted/grid/measure in as
// props keeps ONE implementation of the colour rule and the text-measurement rule per render.
//
// `renderScrolly` below is this genre's own machinery and knows nothing of any one story: it takes
// the component and the steps to call it with as arguments, never reaches for one story's own
// constants by name — the same "the skill's renderer does not import a story's numbers" rule
// `render-web.mjs`'s own header note states, learned there the hard way (it used to import the
// CO₂ story's component directly). Everything under it (the CONFIG block, `render`, the CLI block)
// is the runner for THIS SKILL'S OWN SEED — `assets/ScrollySeed.tsx`, drawn from
// `assets/sample-data/` — the same "the skill's script hosts its own worked values behind a
// labelled seam" shape every other genre in this twin uses.
//
// Usage:  bun skills/twin-scrolly/scripts/render-scrolly.mjs [outDir] [--data <json>]

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText } from "./render-still.mjs";
import { ScrollyChartSeed, STEPS, FRAME } from "../assets/ScrollySeed.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is the SEED beat's own words and defaults: what a
// journalist writing their own scrolly beat replaces wholesale. Everything else in this file —
// `renderScrolly` and its `{ component, steps, props, data, outDir, name }` signature,
// `inlineable`, `escapeHtml`, `buildCss` — is this genre's own mechanics and is left alone.
/** The seed beat's own constants — the same words `scripts/render-preview.mjs` renders the seed's
 *  own preview with, so the skill's two renders never disagree about what the story says.
 *  Duplicated rather than imported from that script for the same reason `render-web.mjs`'s own
 *  `SEED` object is: importing it would also run that script's own top-level render as a side
 *  effect, which this script must not trigger. */
const SEED = {
  ground: "#FFFFFF",
  accent: "#0B7A75",
  subject: "the sample basin",
  title: "Flow through the sample basin fell by more than a third",
  source: "Sample data — not a real measurement",
};
const DEFAULT_DATA_PATH = join(HERE, "../assets/sample-data/rainfall.json");
const DEFAULT_OUT_DIR = "/tmp/scrolly-twin";
const OUTPUT_NAME = "rainfall-scrolly.html";
// =========================================

/**
 * SSRs one React element per entry in `steps`, wraps every resulting SVG plus every step's own
 * prose into one self-contained HTML file (sticky graphic column, prose steps in ordinary flow,
 * inlined interaction script) and writes it to disk. Generic across every scrolly beat: it does
 * not know a story's own reveal cutoffs, prose or numbers — only how many steps to render and how
 * to stitch the result together. Each entry of `steps` is passed to `component` verbatim as its
 * `step` prop, and `active` is set `true` for index `0` only — this function never reads a field
 * off a step directly beyond that, so it is not coupled to any one story's step shape.
 *
 * `props` carries everything the component needs BESIDES `step`/`active` and the derived
 * furniture/measure (`subject`/`ground`/`accent` — the story's own numbers) plus `title`/`source`,
 * which this function itself renders into the HTML `<header>` (never into the SVG — see
 * `assets/ScrollySeed.tsx`'s own doc-comment on why the title lives in HTML for this genre).
 */
async function renderScrolly({ component, steps, props, outDir, name }) {
  if (steps.length < 2)
    throw new Error(
      `a scrolly needs at least two steps to advance through, got ${steps.length}`,
    );
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].revealThrough < steps[i - 1].revealThrough) {
      throw new Error(
        `steps must reveal forward only — step ${i} ("${steps[i].id}") reveals through ${steps[i].revealThrough}, earlier than step ${i - 1} ("${steps[i - 1].id}")'s ${steps[i - 1].revealThrough}`,
      );
    }
  }

  const furniture = deriveFurniture(props.ground);
  const frames = steps.map((step, i) =>
    renderToStaticMarkup(
      createElement(component, {
        data: props.data,
        step,
        active: i === 0,
        subject: props.subject,
        ground: props.ground,
        accent: props.accent,
        ...furniture,
        measure: measureText,
      }),
    ),
  );

  const stepsHtml = steps
    .map(
      (step, i) => `<section class="step${i === 0 ? " active" : ""}" data-step="${escapeHtml(step.id)}">
${step.prose.map((p) => `      <p>${escapeHtml(p)}</p>`).join("\n")}
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
<title>${escapeHtml(props.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss({ ground: props.ground, ...furniture })}
</style>
</head>
<body>
<article class="scrolly">
  <div class="scrolly-track">
    <div class="scrolly-graphic">
      <header class="scrolly-graphic__header">
        <h2>${escapeHtml(props.title)}</h2>
        <p class="source">${escapeHtml(props.source)}</p>
      </header>
      <div class="frame-stack">
${frames.join("\n")}
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
  return { outPath, steps: steps.length };
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
.scrolly { max-width: 1100px; margin: 0 auto; padding: 0 16px; }

/* Below the two-column breakpoint, the graphic is NOT sticky — it sits once, statically, above
   every step's own prose, in ordinary document flow. This is a deliberate scope cut, not an
   oversight: a single stacked column has nowhere to put an opaque pinned graphic that a normal-
   flow paragraph below it can never scroll UNDER, and an "advances as you scroll" graphic pinned
   over prose it visually overlaps is worse than a graphic that does not advance at all — see
   references/scrolly-discipline.md, "The one gotcha" for the layout this replaced and why. Below
   this width the reader still gets the full, final graphic and every step's own words, in order;
   only the per-step advancing is desktop-only. */
.scrolly-track { display: block; }
.scrolly-graphic {
  position: static;
  max-width: ${FRAME.width}px;
  margin: 0 auto 24px;
  padding: 10px 0;
  background: var(--ground);
}
.scrolly-graphic__header { padding: 0 4px; }
.scrolly-graphic__header h2 { margin: 0 0 4px; font-size: 20px; line-height: 1.25; }
.scrolly-graphic__header .source { margin: 0; font-size: 13px; color: var(--muted); }

/* Two columns, side by side, is what makes the overlap this genre's own gotcha describes
   STRUCTURALLY impossible rather than merely unlikely: the graphic's sticky column and the
   steps' scrolling column never share the same horizontal space, so no scroll position can ever
   place one over the other, unlike a single stacked column where a pinned, opaque graphic and a
   normal-flow paragraph below it inevitably cross paths as the reader scrolls past the point
   where the graphic has stuck. */
@media (min-width: 720px) {
  .scrolly-track {
    display: grid;
    grid-template-columns: minmax(320px, ${FRAME.width}px) minmax(280px, 1fr);
    gap: 32px;
    align-items: start;
  }
  .scrolly-graphic {
    position: sticky;
    top: 24px;
    margin: 0;
  }
}

/* Every step's own frame is SSR'd and stacked in the SAME box (aspect-ratio fixed to this
   genre's own FRAME so no frame ever reflows the page as it swaps). Exactly one carries .active
   at build time (assets/ScrollySeed.tsx's own doc-comment, item 3) — that is the ENTIRE no-JS
   contract: with the inline script absent, the CSS below is what keeps that one frame visible and
   every other one invisible, permanently. */
.frame-stack {
  position: relative;
  width: 100%;
  aspect-ratio: ${FRAME.width} / ${FRAME.height};
  margin-top: 8px;
}
.step-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
}
.step-frame.active { opacity: 1; }
/* Reduced motion: a reader who asks for no animation gets no animation — the swap becomes an
   instant cut instead of a crossfade. This is the ONLY animated property this genre ships. */
@media (prefers-reduced-motion: no-preference) {
  .step-frame { transition: opacity 0.3s ease; }
}

.scrolly-steps { padding-top: 8px; }
/* Prose is ALWAYS in normal document flow — nothing here is display:none, visibility:hidden or
   otherwise gated. A screen reader or keyboard user reaches every step's own text by reading or
   tabbing through the page exactly like any other paragraph; scrolling into the sticky graphic's
   own centre band is only what changes the GRAPHIC, never what reveals the prose. */
.step {
  min-height: 70vh;
  display: flex;
  align-items: center;
  padding: 24px 4px;
}
.step:last-child { min-height: 60vh; }
.step p {
  max-width: 42ch;
  margin: 0;
  font-size: 17px;
  line-height: 1.5;
  padding: 12px 14px;
  background: var(--ground);
}
`.trim();
}

/** The seed beat's own runner: reads the seed's own `{ year, value }` series, hands the seed
 *  component and its `STEPS` array (imported above from this skill's own `assets/`) to the
 *  genre's generic `renderScrolly`. */
async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const data = JSON.parse(await readFile(dataPath, "utf8"));
  if (data.length < 2)
    throw new Error(`need at least two readings, got ${data.length}`);

  const { outPath } = await renderScrolly({
    component: ScrollyChartSeed,
    steps: STEPS,
    props: {
      data,
      title: SEED.title,
      source: SEED.source,
      subject: SEED.subject,
      ground: SEED.ground,
      accent: SEED.accent,
    },
    outDir,
    name,
  });
  return { outPath, readings: data.length, steps: STEPS.length };
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

  const { outPath, readings, steps } = await render({ dataPath, outDir });
  console.log(`scrolly beat → ${outPath}  [${readings} readings, ${steps} steps]`);
}

export { render, renderScrolly, SEED };
