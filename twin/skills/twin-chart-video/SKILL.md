---
name: twin-chart-video
description: Use to produce a chart beat in the VIDEO genre — a short motion build of a chart that already exists as geometry, written under the motion grammar, driven by one editable timing contract, and verified by looking at the final frame before the mp4 and at four extracted frames after it. Carries the timing contract, one worked composition, and the render ladder's second rung.
---

# twin-chart-video — write the edit, render the last frame first, then look at four

## Overview

The video genre of a chart beat. It does not hold a chart: it holds **the edit**.

A video beat adds exactly one thing to a chart that a still cannot have — an **order in time** — and
it therefore reuses the still beat's geometry rather than drawing a second chart. This story's
composition (`assets/EmissionsVideo.tsx`) imports its coordinates from `proof/crossing-geometry.ts`,
the same pure core `proof/EmissionsLine.tsx` draws on disk. One geometry, two outputs.

The three things that actually live here:

- **`assets/timing.ts`** — the timing contract. Six events named editorially (`establish`,
  `reference`, `reveal`, `subject`, `conclusion`, `hold`), each with a `start` and a `duration` in
  frames. Every interpolation window in the composition derives from it and **no frame literal
  appears in the drawing**, so a journalist retimes the piece by editing one object.
- **`assets/EmissionsVideo.tsx`** — one worked composition, marked replace-me the way
  `twin-chart-beat`'s seed is. Read it to learn the shape; write the next beat's own.
- **`scripts/render-video.mjs`** — the render ladder's second rung: the final-frame still first,
  then the mp4.

The doctrine it is written under is `twin-doctrine/references/motion-grammar.md`, which was written
against this build.

## When to use

- When a closed `STORYBOARD.md` picks medium `chart` and genre **video**, and the beat's `BRIEF.md`
  is written. No brief, no code — same rule as the static genre.
- When the argument has an **order**: a baseline the evidence is read against, a subject that lands,
  a sentence that only holds once the marks are on screen. A chart with no order in its argument is
  a still, and a still is a whole genre — animating it anyway is the motion grammar's first
  anti-pattern.
- **Not** to re-draw a chart that already exists as a still. Import its geometry. If the geometry is
  entangled with the still's rasteriser, split the pure core out first (that is what
  `proof/crossing-geometry.ts` is — the extraction, done once, that let both genres share one core).
- **Not** for a map (a different engine) and **not** for a Datawrapper chart (a different producer).

## The one gotcha that will waste your day (read first)

**The geometry you want to reuse probably cannot be bundled for a browser.** The still path's
`render-still.mjs` loads `@resvg/resvg-js` — a native module — at module scope, so anything that
imports it, however indirectly, kills the Remotion bundle. The first version of
`proof/EmissionsLine.tsx` held both the pure geometry *and* that import in one file; the fix was not
to copy the geometry into the video (two cores that drift), it was to lift the pure half into its
own module both genres import.

The same trap, one level up, for colour: `deriveFurniture` lives beside the rasteriser and cannot be
called in the browser either. **Do not reimplement it in the composition.** `scripts/render-video.mjs`
runs in node, calls the one implementation there, and passes `ink`/`muted`/`grid` in as input props.
A second copy of the contrast escalation inside a composition is how two genres end up disagreeing
about what "muted" means on the same newsroom ground.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `twin-doctrine/references/motion-grammar.md` | What a layer may do over time; the order a reveal follows; why the conclusion rule governs assertions while the title, source, axis and scale are furniture that establishes first |
| Contract | `assets/timing.ts` | `BeatTiming`, `progressOf` (clamped), `checkTiming` (the structural rules as arithmetic), and `CO2_TIMING` — this story's edit |
| Composition | `assets/EmissionsVideo.tsx` | One beat's drawing, frame by frame. Also exports `drawnSoFar`, the chronological partial path |
| Registration | `assets/Root.tsx`, `assets/index.ts` | The Remotion composition (its `durationInFrames` IS `CO2_TIMING.total`) and the entry point |
| Geometry | `proof/crossing-geometry.ts` | Not in this skill. The pure core, shared with the static beat |
| Render | `scripts/render-video.mjs` | Reads the frozen CSV, derives the furniture in node, renders the final-frame still, then the mp4 |
| Test | `test/timing.test.ts` | Pins the contract — each rule asserted green on the shipped timing and RED on a timing mutated to break exactly that rule |

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
6. **Render the mp4, then extract four frames** — early, mid-reveal, the moment the subject lands,
   the final hold — and look at all four. Confirm the accent does not appear before its evidence,
   nothing is clipped, and the final hold matches the still.

## Quick start

```sh
# the last frame, on its own, first
bun skills/twin-chart-video/scripts/render-video.mjs --still-only

# the mp4 (still + render), concurrency 1
bun skills/twin-chart-video/scripts/render-video.mjs --data /tmp/video-twin/data.csv --out /tmp/video-twin

# the four frames a video beat is verified by
cd /tmp/video-twin
for n in 45 110 165 239; do
  ffmpeg -loglevel error -i co2.mp4 -vf "select=eq(n\,$n)" -vsync 0 -frames:v 1 -y frame-$n.png
done
```

Then open all four. The frame numbers are not arbitrary: they are one frame inside `reference`, one
inside `reveal`, one inside `subject`, and the last frame of `hold` — read off `CO2_TIMING`.

## Tuning knobs

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
| The frame the composition draws in | `1080` × `1080` | `FRAME`, `EmissionsVideo.tsx` / `Root.tsx` |
| The margin around everything | `72` (`PAD`) | `EmissionsVideo.tsx` |
| Title size and line spacing | `46` / `58` | `TITLE`, `EmissionsVideo.tsx` |
| Which year the series starts at | `1950` | `BEAT.firstYear`, `render-video.mjs` |

## Files

- `assets/timing.ts` — the timing contract, `progressOf`, `checkTiming`, `CO2_TIMING`.
- `assets/EmissionsVideo.tsx` — this story's composition. **Replace per story**; do not
  parameterise it into a general video chart. Exports `drawnSoFar` so the chronological reveal is
  testable without a browser.
- `assets/Root.tsx` — the Remotion composition, sized and timed from the contract.
- `assets/index.ts` — the Remotion entry point (`registerRoot`).
- `scripts/render-video.mjs` — `readingsFromCsv`, then still → mp4. Imports `deriveFurniture` from
  `twin-chart-beat/scripts/render-still.mjs`, in node, and passes the result in as props.
- `test/timing.test.ts` — the contract's rules, each one asserted both green and red.
- `twin-doctrine/references/motion-grammar.md` — the doctrine. Read it before writing an edit.
