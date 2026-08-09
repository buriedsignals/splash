---
name: twin-chart-video
description: Use to produce a chart beat in the VIDEO genre — a short motion build of a chart that already exists as geometry, written under the motion grammar, driven by one editable timing contract, and verified by looking at the final frame before the mp4 and at four extracted frames after it. Carries the timing contract, the seed composition, and the render ladder's second rung.
---

# twin-chart-video — write the edit, render the last frame first, then look at four

## Overview

The video genre of a chart beat. It does not hold a chart: it holds **the edit**.

A video beat adds exactly one thing to a chart that a still cannot have — an **order in time**. This
skill carries its **seed** (`co2-suisse`); the stories that used to live here, `life-expectancy` and
`migration`, now each live in their own workspaces with their own registrations — `proof/life-expectancy/`
and `proof/migration/`, respectively, each with its own `Root.tsx`/`index.ts`/`render.mjs`. Each beat is
its own composition, its own timing contract instance, and its own pure geometry — never a general "video
chart" parameterised by data, per the replace-me discipline below:

1. **`co2-suisse`** (`EmissionsVideo.tsx`, `timing.ts`'s `CO2_TIMING`) — the seed. A series climbs to a
   peak and later falls back through a level the reader is shown first. Its geometry
   (`proof/co2-suisse/crossing-geometry.ts`) is shared with the still beat that draws the same
   coordinates on disk — one geometry, two outputs.

**Moved out:** `life-expectancy` and `migration` now live outside this skill. See `proof/life-expectancy/`
and `proof/migration/` for their own compositions, timing contracts, and render scripts. Each carries its
own copies of `FONT_FAMILY`/`measureText`/`wrap`/`drawnSoFar` (the settled rule: a story that needs
something a skill has duplicates it, it does not reach back across the skill boundary) and reaches the
shared timing type by a temporary relative path — see those files' own doc-comments.

The things that actually live here:

- **a timing contract** — six events named editorially (`establish`, `reference`, `reveal`,
  `subject`, `conclusion`, `hold`), each with a `start` and a `duration` in frames. Every
  interpolation window in the composition derives from it and **no frame literal appears in the
  drawing**, so a journalist retimes the piece by editing one object. `assets/timing.ts` carries the
  shared type and the arithmetic (`progressOf`, `checkTiming`) plus `CO2_TIMING`.
- **one worked composition**, marked replace-me the way `twin-chart-beat`'s seed is. Read
  `EmissionsVideo.tsx` to learn the shape. This is the seed; other compositions have been moved to
  their own proof workspaces.
- **`scripts/render-video.mjs`** — the render ladder's second rung for the seed: the final-frame
  still first, then the mp4. `render-video.mjs` is the CO₂ beat's (kept unrenamed — it predates the
  others). Other beats' render scripts now live in their respective proof workspaces.

The doctrine it is written under is `twin-doctrine/references/motion-grammar.md`, which was written
against the first of these builds.

## When to use

- When a closed `STORYBOARD.md` picks medium `chart` and genre **video**, and the beat's `BRIEF.md`
  is written. No brief, no code — same rule as the static genre.
- When the argument has an **order**: a baseline the evidence is read against, a subject that lands,
  a sentence that only holds once the marks are on screen. A chart with no order in its argument is
  a still, and a still is a whole genre — animating it anyway is the motion grammar's first
  anti-pattern.
- **Not** to re-draw a chart that already exists as a still. Import its geometry. If the geometry is
  entangled with the still's rasteriser, split the pure core out first (that is what
  `proof/co2-suisse/crossing-geometry.ts` is — the extraction, done once, that let both genres share
  one core).
- **Not** for a map (a different engine) and **not** for a Datawrapper chart (a different producer).

## The one gotcha that will waste your day (read first)

**The geometry you want to reuse probably cannot be bundled for a browser.** The still path's
`render-still.mjs` loads `@resvg/resvg-js` — a native module — at module scope, so anything that
imports it, however indirectly, kills the Remotion bundle. The first version of
`proof/co2-suisse/EmissionsLine.tsx` held both the pure geometry *and* that import in one file; the
fix was to lift the pure half into its own module — `proof/co2-suisse/crossing-geometry.ts` — which
that story's static and web beats both import.

**Inside one story's workspace, that is the shape. Across the skill boundary it is not.** This
skill's own seed cannot import that module: a skill directory has to build after being copied, on its
own, into a journalist's root, and no copy carries a story workspace with it. So the seed carries its
own copy of the pure core (`fr`, `yTickValues`, `crossingGeometry` in `assets/EmissionsVideo.tsx`) —
it imported `proof/co2-suisse/crossing-geometry` until that was caught, and
`splash-twin/test/no-cross-skill-imports.test.ts` now fails loud on any specifier leaving a skill,
with `splash-twin/test/helper-parity.test.ts` keeping the copies in step and
`splash-twin/test/seed-renders-standalone.test.ts` rendering this seed in a root that holds nothing
but this directory.

The same trap, one level up, for colour: `deriveFurniture` lives beside the rasteriser and cannot be
called in the browser either. **Do not reimplement it in the composition.** `scripts/render-video.mjs`
runs in node, calls the one implementation there, and passes `ink`/`muted`/`grid` in as input props.
A second copy of the contrast escalation inside a composition is how two genres end up disagreeing
about what "muted" means on the same newsroom ground.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `twin-doctrine/references/motion-grammar.md` | What a layer may do over time; the order a reveal follows; why the conclusion rule governs assertions while the title, source, axis and scale are furniture that establishes first |
| Contract | `assets/timing.ts` | `BeatTiming`, `progressOf` (clamped), `checkTiming` (the structural rules as arithmetic), and `CO2_TIMING` (the seed's instance). `life-expectancy`'s and `migration`'s instances are now in their own proof workspaces: `proof/life-expectancy/timing-contract.ts` and `proof/migration/timing-contract.ts` |
| Composition | `assets/EmissionsVideo.tsx` | The seed beat's drawing, frame by frame, with its own pure geometry and exports `drawnSoFar` (the chronological partial path). Other compositions have been moved to `proof/life-expectancy/LifeExpectancyVideo.tsx` and `proof/migration/MigrationVideo.tsx` |
| Registration | `assets/Root.tsx`, `assets/index.ts` | The seed composition (`co2-suisse`, `durationInFrames` IS `CO2_TIMING.total`) and the one entry point. Other stories register in their own proof workspaces: `proof/life-expectancy/Root.tsx` + `index.ts` and `proof/migration/Root.tsx` + `index.ts` |
| Geometry | `proof/co2-suisse/crossing-geometry.ts` | Pure core, shared with the static beat. Other stories' geometries (`migrationGeometry`, `lifeExpectancyGeometry`) live inside their moved compositions in proof workspaces |
| Render | `scripts/render-video.mjs` | The seed beat's render ladder second rung: reads frozen CSV, derives furniture in node, renders final-frame still, then mp4. Other scripts now live in proof workspaces: `proof/life-expectancy/render.mjs` and `proof/migration/render.mjs` |
| Test | `test/timing.test.ts`, `canon.test.ts` | `timing.test.ts` pins the seed beat's contract. `canon.test.ts` asserts this skill's `assets/` no longer carries the migrated stories. Other contract tests are now in proof workspaces: `proof/life-expectancy/timing.test.ts` and `proof/migration/timing.test.ts` |

**Where Remotion lives.** `remotion` and `@remotion/cli` are `devDependencies` of `twin/package.json`
— this repository's own dependencies, alongside `puppeteer` and the d3 packages. They are **not** in
`splash-twin/assets/root-template/package.json`, so an installed Splash root cannot yet render a
video beat. That is a real, named gap and it is deliberate for this exploratory pass: adding them to
the root template is a change to a different skill, and it drags a ~93 MB Chrome Headless Shell
download into every journalist's install, which is a distribution decision, not a code decision.
Whoever ships the video genre for real makes that call and moves the two packages.

## How it works (the shape)

1. **Read the motion grammar**, then write the timing contract before the drawing. The edit is the
   design; the JSX is the consequence.
2. **`checkTiming` the contract** — events in order, nothing starting before the evidence it depends
   on has finished, `hold` ending exactly on the last frame. A test, not a review comment.
3. **Import the geometry**; do not redraw it. Layout is computed once per frame and is identical at
   every frame — the build changes what is *visible*, never where anything *sits*. Anything that
   arrives late has its space reserved from frame 0, so nothing shifts when it lands.
4. **Derive each window from the contract** with `progressOf`, clamped. Linear where the axis is
   time; `Easing.out` for things that arrive; `spring` only critically damped, because a mark that
   overshoots is showing a value the data does not contain.
5. **Render the final frame first** (`--still-only`). If the end state is not a complete, readable
   chart, the video is wrong and you have spent seconds instead of minutes finding out.
6. **Render the mp4, then extract frames** — at minimum mid-reveal, the moment the subject lands, and
   the final hold — and look at all of them. Confirm the accent does not appear before its evidence,
   nothing is clipped, and the final hold matches the still.

## Quick start

```sh
# the last frame, on its own, first — this skill's seed
bun skills/twin-chart-video/scripts/render-video.mjs --still-only

# the mp4 (still + render), concurrency 1
bun skills/twin-chart-video/scripts/render-video.mjs --out /tmp/video-twin

# frames to verify by
cd /tmp/video-twin
for n in 45 110 165 239; do
  ffmpeg -loglevel error -i co2.mp4 -vf "select=eq(n\,$n)" -vsync 0 -frames:v 1 -y co2-frame-$n.png
done
```

Then open them. The frame numbers land inside `reference`, inside `reveal`, at (or just before)
`subject`'s end, and the last frame of `hold` — read off the timing contract.

Other stories (`life-expectancy`, `migration`) are in their own proof workspaces — see their own
`render.mjs` scripts for the same shape of command.

## Tuning knobs

The table below is `CO2_TIMING`'s. Other beats (`life-expectancy`, `migration`) have their own timing
contracts in their own proof workspaces with the same six-event shape but different values — each
has a doc-comment explaining *why* its numbers differ, not just what they are. See
`proof/life-expectancy/timing-contract.ts` and `proof/migration/timing-contract.ts`.

| Want | Knob | Where |
| --- | --- | --- |
| How long the whole beat runs | `total` `240` (8 s × `fps` `30`) | `CO2_TIMING`, `timing.ts` |
| How long the frame settles before anything arrives | `establish.duration` `26` | `CO2_TIMING` |
| How long the baseline takes to draw | `reference.duration` `22` | `CO2_TIMING` |
| **How long the reader gets to read the baseline** — the pause, which is the gap, not an event | `reveal.start` `72` minus `reference` end `54` = `18` | `CO2_TIMING` |
| How fast the curve draws | `reveal.duration` `78` | `CO2_TIMING` |
| How separate the subject's arrival feels | `subject.start` `150` (never below `reveal` end) | `CO2_TIMING` |
| How long the finished chart is held | `hold.duration` `48` | `CO2_TIMING` |
| The floor the hold may not go under | `fps / 2` | `checkTiming`, `timing.ts` |
| How hard the subject dot lands | `damping` `200` against `stiffness` `120` — critically damped, no overshoot | `EmissionsVideo.tsx` |
| When the reference label follows its rule | `0.55` of the way through `reference` | `EmissionsVideo.tsx` |
| How soon after the line passes 1973 the peak marker appears | `0.06` of the reveal | `EmissionsVideo.tsx` |
| The frame the composition draws in | `1080` × `1080` | `FRAME` constant |
| The margin around everything | `72` (`PAD`) | `EmissionsVideo.tsx` |
| Title size and line spacing | `46` / `58` | `TITLE`, `EmissionsVideo.tsx` |
| Which year the series starts at | `1950` | `BEAT.firstYear`, `render-video.mjs` |

## Files

- `assets/timing.ts` — the shared timing contract type, `progressOf`, `checkTiming`, and `CO2_TIMING`
  (the seed beat's instance).
- `assets/EmissionsVideo.tsx` — the seed beat's composition. **Replace per story**; do not
  parameterise it into a general video chart. Carries its own copy of the pure core it draws (`fr`,
  `yTickValues`, `crossingGeometry`) rather than importing one, because nothing under a skill may
  import out of the skill — see "The one gotcha". Exports `FONT_FAMILY`, `measureText`, `wrap` and
  `drawnSoFar` so this skill's own tests and `splash-twin/test/helper-parity.test.ts` can exercise
  them without a browser — **not** as a library for another beat to import: the two beats that began
  beside this one (`proof/life-expectancy/LifeExpectancyVideo.tsx`,
  `proof/migration/MigrationVideo.tsx`) each carry their own copy, which is what
  duplicate-do-not-link requires of them.
- `assets/Root.tsx` — the Remotion root; registers the seed composition (`co2-suisse`), sized and
  timed from its own contract. `remotion still`/`remotion render` select a beat by composition id.
- `assets/index.ts` — the one Remotion entry point (`registerRoot`).
- `assets/sample-data/rainfall.json` — canonical sample data for the seed. Contains 11 rows of
  `{ year, value }` pairs from 2015–2025 — the seed's data.
- `assets/preview.png` — a rendered PNG of the seed at its **last frame** (frame 239 of the
  video's 240 total). Rendered by `bun scripts/render-preview.mjs` from the seed's current shape.
  The last frame is used because a video seed's first frame is deliberately empty.
- `output-proof/preview.png` — the artifact this skill's seed produces from this skill's own sample
  data — regenerated by `bun scripts/render-preview.mjs --out output-proof`.
- `scripts/render-video.mjs` — the seed beat's render script: `readingsFromCsv`, still → mp4.
  Imports `deriveFurniture` from this skill's OWN `scripts/render-still.mjs` (a copy, not the
  `twin-chart-beat` original — a skill never imports another skill), in node, and passes the result
  in as props.
- `scripts/render-preview.mjs` — renders THIS skill's seed from THIS skill's sample data at its
  last frame. Accepts `--out <dir>` to write the proof to that directory instead of `assets/preview.png`.
  Supports `--check` to verify the preview is up-to-date (exits 1 if stale).
- `test/timing.test.ts` — pins the seed beat's contract rules, asserted both green and red.
- `test/canon.test.ts` — asserts `assets/` no longer carries the stories that have been moved out.
  Also asserts the seed carries the canon's marker wording, sample data exists, and the preview is
  current.
- `twin-doctrine/references/motion-grammar.md` — the doctrine. Read it before writing an edit.
- `proof/life-expectancy/` — `life-expectancy`'s own workspace: `Root.tsx` + `index.ts` (its own
  Remotion registration), `LifeExpectancyVideo.tsx` (with its own copies of helper functions),
  `timing-contract.ts`, `render.mjs`, `timing.test.ts`.
- `proof/migration/` — `migration`'s own workspace: `Root.tsx` + `index.ts` (its own Remotion
  registration), `MigrationVideo.tsx` (with its own copies of helper functions), `timing-contract.ts`,
  `render.mjs`, `timing.test.ts`.
