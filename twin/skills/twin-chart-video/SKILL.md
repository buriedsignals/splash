---
name: twin-chart-video
description: Use to produce a chart beat in the VIDEO genre — a short motion build of a chart that already exists as geometry, written under the motion grammar, driven by one editable timing contract, and verified by looking at the final frame before the mp4 and at four extracted frames after it. Carries the timing contract, the seed composition, and the render ladder's second rung.
---

# twin-chart-video — write the edit, render the last frame first, then look at four

## Overview

The video genre of a chart beat. It does not hold a chart: it holds **the edit**.

A video beat adds exactly one thing to a chart that a still cannot have — an **order in time**. This
skill carries its **seed** (`co2-suisse`) plus one story not yet migrated out (`migration` — see the
canon note below); a second story that used to live here, `life-expectancy`, now lives in its own
workspace, `proof/life-expectancy/`, with its own `Root.tsx`/`index.ts`/`render.mjs`. Each beat is its
own composition, its own timing contract instance, and its own pure geometry — never a general "video
chart" parameterised by data, per the replace-me discipline below:

1. **`co2-suisse`** (`EmissionsVideo.tsx`, `timing.ts`'s `CO2_TIMING`) — the seed. A series climbs to a
   peak and later falls back through a level the reader is shown first. Its geometry
   (`proof/co2-suisse/crossing-geometry.ts`) is shared with the still beat that draws the same
   coordinates on disk — one geometry, two outputs.
2. **`migration`** (`MigrationVideo.tsx`, `migration-timing.ts`) — the subject (1997, 1998) is real but
   tiny against swings forty times its size, so the fix is not a rescaled axis (that is exactly the
   anti-pattern `anti-patterns.md` names) but a precisely-interpolated shaded band, both years landing
   together, and a leader-line callout. **Still resident here** — a later task moves it to
   `proof/migration/`, mirroring what already happened to `life-expectancy`.

**`life-expectancy` (moved out, `proof/life-expectancy/`)** — the subject (2020) sits *inside* the
series, not at its tail, so `reveal` draws the whole series before `subject` ever starts; `subject`
lands as an emphasis event on a mark already on screen, not as data still arriving. See
`proof/life-expectancy/LifeExpectancyVideo.tsx`'s doc-comment for the reasoning in full. It carries its
own copies of `FONT_FAMILY`/`measureText`/`wrap`/`drawnSoFar` (the settled rule: a story that needs
something a skill has duplicates it, it does not reach back across the skill boundary) and, until a
later task vendors `assets/timing.ts` to the shared substrate, reaches it by a relative path — see that
file's own doc-comment.

`EmissionsVideo.tsx` and `MigrationVideo.tsx`, both still inside this skill, continue to share
`FONT_FAMILY`, `measureText`, `wrap` and `drawnSoFar` via a same-skill relative import — that is not a
skill-boundary crossing, so it is unchanged.

The things that actually live here, per beat still resident:

- **a timing contract** — six events named editorially (`establish`, `reference`, `reveal`,
  `subject`, `conclusion`, `hold`), each with a `start` and a `duration` in frames. Every
  interpolation window in the composition derives from it and **no frame literal appears in the
  drawing**, so a journalist retimes the piece by editing one object. `assets/timing.ts` carries the
  shared type and the arithmetic (`progressOf`, `checkTiming`) plus `CO2_TIMING`; `migration`'s own
  instance lives beside it (`migration-timing.ts`).
- **one worked composition** per beat, marked replace-me the way `twin-chart-beat`'s seed is. Read
  `EmissionsVideo.tsx` to learn the shape; `MigrationVideo.tsx` is a worked example of adapting
  that shape to a different argument, not a second engine.
- **`scripts/render-<beat>.mjs`** — the render ladder's second rung, one script per beat still
  resident: the final-frame still first, then the mp4. `render-video.mjs` is the CO₂ beat's (kept
  unrenamed — it predates the others); `render-migration.mjs` follows its exact shape.
  `life-expectancy`'s render script is now `proof/life-expectancy/render.mjs`.

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
fix was not to copy the geometry into the video (two cores that drift), it was to lift the pure half
into its own module both genres import.

The same trap, one level up, for colour: `deriveFurniture` lives beside the rasteriser and cannot be
called in the browser either. **Do not reimplement it in the composition.** `scripts/render-video.mjs`
runs in node, calls the one implementation there, and passes `ink`/`muted`/`grid` in as input props.
A second copy of the contrast escalation inside a composition is how two genres end up disagreeing
about what "muted" means on the same newsroom ground.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `twin-doctrine/references/motion-grammar.md` | What a layer may do over time; the order a reveal follows; why the conclusion rule governs assertions while the title, source, axis and scale are furniture that establishes first |
| Contract | `assets/timing.ts` + `migration-timing.ts` | `BeatTiming`, `progressOf` (clamped), `checkTiming` (the structural rules as arithmetic) in `timing.ts`; `migration`'s own named instance beside it. `life-expectancy`'s instance is now `proof/life-expectancy/timing-contract.ts` |
| Composition | `assets/EmissionsVideo.tsx`, `MigrationVideo.tsx` | One beat's drawing per file, frame by frame. `EmissionsVideo.tsx` also exports `drawnSoFar`, the chronological partial path, reused by `MigrationVideo.tsx`. `life-expectancy`'s composition is now `proof/life-expectancy/LifeExpectancyVideo.tsx`, with its own copies of those four functions |
| Registration | `assets/Root.tsx`, `assets/index.ts` | The two `<Composition>`s still resident (each `durationInFrames` IS that beat's own `_TIMING.total`) and the one entry point. `life-expectancy` registers in its own `proof/life-expectancy/Root.tsx` + `index.ts` |
| Geometry | `proof/co2-suisse/crossing-geometry.ts` (beat 1, shared with the static beat); `migrationGeometry` inside `MigrationVideo.tsx`; `lifeExpectancyGeometry` inside `proof/life-expectancy/LifeExpectancyVideo.tsx` | Pure cores. `migration` and `life-expectancy` have no still counterpart yet, so their geometry has no forced reason to live outside the composition the way beat 1's does |
| Render | `scripts/render-video.mjs`, `render-migration.mjs` | One script per beat still resident, same shape: reads its frozen CSV, derives the furniture in node, renders the final-frame still, then the mp4. `life-expectancy`'s is `proof/life-expectancy/render.mjs` |
| Test | `test/timing.test.ts`, `migration-timing.test.ts`, `canon.test.ts` | Pins each resident beat's contract — each rule asserted green on the shipped timing and RED on a timing mutated to break exactly that rule. `canon.test.ts` asserts this skill's `assets/` no longer carries the migrated stories. `life-expectancy`'s contract test is now `proof/life-expectancy/timing.test.ts` |

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
# the last frame, on its own, first — one beat per render script
bun skills/twin-chart-video/scripts/render-video.mjs --still-only
bun skills/twin-chart-video/scripts/render-migration.mjs --still-only
bun proof/life-expectancy/render.mjs --still-only

# the mp4 (still + render), concurrency 1
bun skills/twin-chart-video/scripts/render-video.mjs --out /tmp/video-twin
bun skills/twin-chart-video/scripts/render-migration.mjs --out /tmp/video-twin
bun proof/life-expectancy/render.mjs --out /tmp/video-twin

# frames to verify by, per beat
cd /tmp/video-twin
for n in 45 110 165 239; do
  ffmpeg -loglevel error -i co2.mp4 -vf "select=eq(n\,$n)" -vsync 0 -frames:v 1 -y co2-frame-$n.png
done
for n in 111 168 239; do
  ffmpeg -loglevel error -i life-expectancy.mp4 -vf "select=eq(n\,$n)" -vsync 0 -frames:v 1 -y life-frame-$n.png
done
for n in 111 172 239; do
  ffmpeg -loglevel error -i migration.mp4 -vf "select=eq(n\,$n)" -vsync 0 -frames:v 1 -y mig-frame-$n.png
done
```

Then open them. The frame numbers are not arbitrary: they land inside `reference`, inside `reveal`,
at (or just before) `subject`'s end, and the last frame of `hold` — read off each beat's own timing
contract, since the beats do not share frame numbers exactly (`life-expectancy`'s `conclusion` and
`migration`'s `subject` both run longer than `CO2_TIMING`'s, for reasons written into each
composition's doc-comment).

## Tuning knobs

The table below is `CO2_TIMING`'s. `migration`'s knobs are the same six-event shape at different
values — read them straight off `migration-timing.ts`, whose doc-comment explains *why* its numbers
differ from beat 1's, not just what they are. `life-expectancy`'s knobs live in
`proof/life-expectancy/timing-contract.ts`, same shape.

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
| How hard the subject dot lands | `damping` `200` against `stiffness` `120` — critically damped, no overshoot | `EmissionsVideo.tsx`, `MigrationVideo.tsx`, `proof/life-expectancy/LifeExpectancyVideo.tsx` |
| When the reference label follows its rule | `0.55` of the way through `reference` | all three compositions |
| How soon after the line passes 1973 the peak marker appears | `0.06` of the reveal | `EmissionsVideo.tsx` (same device marks 2023's recovery in `proof/life-expectancy/LifeExpectancyVideo.tsx`) |
| The frame the composition draws in | `1080` × `1080` | `FRAME`, each composition / `Root.tsx` |
| The margin around everything | `72` (`PAD`) | each composition |
| Title size and line spacing | `46` / `58` (beat 1); `40` / `52` (`migration`, `life-expectancy` — longer titles) | `TITLE`, each composition |
| Which year the series starts at | `1950` | `BEAT.firstYear`, `render-video.mjs` (`migration`/`life-expectancy` start where their own CSV does) |
| How wide the shaded sub-zero band's opacity peaks | `0.28` | `MigrationVideo.tsx`'s `bandOpacity` |
| How far the callout sits from the two landed points | `midX + 90` | `MigrationVideo.tsx`'s `calloutX` |

## Files

- `assets/timing.ts` — the shared timing contract type, `progressOf`, `checkTiming`, and beat 1's
  own instance, `CO2_TIMING`.
- `assets/migration-timing.ts` — beat 3's own instance, with a doc-comment on why its numbers depart
  from beat 1's. (`life-expectancy`'s instance is `proof/life-expectancy/timing-contract.ts`, moved
  out of this skill — see the canon note in Overview.)
- `assets/EmissionsVideo.tsx` — beat 1's composition, the seed. **Replace per story**; do not
  parameterise it into a general video chart. Exports `FONT_FAMILY`, `measureText`, `wrap` and
  `drawnSoFar` so beats still resident in this skill reuse them instead of copying them; the
  chronological reveal is testable without a browser.
- `assets/MigrationVideo.tsx` — beat 3. Its own pure geometry (`migrationGeometry`), including the
  exact linear-interpolated zero-crossings either side of the two-point subject: the tiny-dip
  legibility problem and why the axis is never rescaled to solve it are in its doc-comment.
- `assets/Root.tsx` — the Remotion root; registers the compositions still resident here, each sized
  and timed from its own contract. `remotion still`/`remotion render` select a beat by composition id
  (`co2-suisse` / `migration`).
- `assets/index.ts` — the one Remotion entry point (`registerRoot`), shared by the compositions still
  resident here.
- `scripts/render-video.mjs`, `scripts/render-migration.mjs` — one render script per beat still
  resident, same shape: `readingsFromCsv`, then still → mp4. Each imports `deriveFurniture` from
  `twin-chart-beat/scripts/render-still.mjs`, in node, and passes the result in as props.
- `test/timing.test.ts`, `test/migration-timing.test.ts` — each resident beat's contract rules,
  asserted both green and red.
- `test/canon.test.ts` — asserts `assets/` no longer carries a story once it has been moved out (the
  same shape of test each such move adds a case to).
- `twin-doctrine/references/motion-grammar.md` — the doctrine. Read it before writing an edit.
- `proof/life-expectancy/` — `life-expectancy`'s own workspace, out of this skill: `Root.tsx` +
  `index.ts` (its own Remotion registration, one `<Composition id="life-expectancy">`),
  `LifeExpectancyVideo.tsx` (its own copies of `FONT_FAMILY`/`measureText`/`wrap`/`drawnSoFar`, per
  the duplicate-don't-link rule), `timing-contract.ts`, `render.mjs`, `timing.test.ts`.
