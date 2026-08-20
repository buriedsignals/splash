---
name: chart-video
description: Use to produce a chart beat in the VIDEO format — a short motion build of a chart that already exists as geometry, written under the motion grammar, driven by one editable timing contract, and verified by looking at the final frame before the mp4 and at four extracted frames after it. Carries the timing contract, the seed composition, and the render ladder's second rung.
---

# chart-video — write the edit, render the last frame first, then look at four

## Overview

The video format of a chart beat. It does not hold a chart: it holds **the edit**.

A video beat adds exactly one thing to a chart that a still cannot have — an **order in time**. This
skill carries its **seed** (`co2-suisse`); the stories that used to live here, `life-expectancy` and
`migration`, now each live in their own workspaces with their own registrations — `proof/life-expectancy/`
and `proof/migration/`, respectively, each with its own `Root.tsx`/`index.ts`/`render.mjs`. Each beat is
its own composition, its own timing contract instance, and its own pure geometry — never a general "video
chart" parameterised by data, per the replace-me discipline below:

1. **`co2-suisse`** (`EmissionsVideo.tsx`, `timing.ts`'s `CO2_TIMING`) — the seed. A series climbs to a
   peak and later falls back through a level the reader is shown first. It carries its **own inlined**
   pure geometry (`fr`, `yTickValues`, `crossingGeometry`, at the top of `EmissionsVideo.tsx`) and
   imports none: nothing under a skill may import out of the skill, and this seed reached into
   `proof/co2-suisse/crossing-geometry.ts` until that was caught — see "The one gotcha". The story
   beats under `proof/co2-suisse/` do share that file **among themselves**, which is a statement about
   that workspace and not about this skill. (The seed's id, its filename and its `BEAT` constants
   still say `co2-suisse` while the beat it draws is the rainfall sample — a rename parked as its own
   task. Read every `co2-suisse` in this skill as the seed's name, never as a link to `proof/`.)

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
- **one worked composition**, marked replace-me the way `chart-beat`'s seed is. Read
  `EmissionsVideo.tsx` to learn the shape. This is the seed; other compositions have been moved to
  their own proof workspaces.
- **`scripts/render-video.mjs`** — the render ladder's second rung for the seed: the final-frame
  still first, then the mp4. `render-video.mjs` is the CO₂ beat's (kept unrenamed — it predates the
  others). Other beats' render scripts now live in their respective proof workspaces.

The doctrine it is written under is `doctrine/references/motion-grammar.md`, which was written
against the first of these builds.

## When to use

- When a closed `STORYBOARD.md` picks medium `chart` and format **video**, and the beat's `BRIEF.md`
  is written. No brief, no code — same rule as the static format.
- When the argument has an **order**: a baseline the evidence is read against, a subject that lands,
  a sentence that only holds once the marks are on screen. A chart with no order in its argument is
  a still, and a still is a whole format — animating it anyway is the motion grammar's first
  anti-pattern.
- **Not** to re-draw a chart that already exists as a still. Reuse its geometry. If the geometry is
  entangled with the still's rasteriser, split the pure core out first (that is what
  `proof/co2-suisse/crossing-geometry.ts` is — the extraction, done once, that lets that STORY's still
  and web beats draw one core). How you reuse it depends on which side of the skill boundary you are
  on: a story's own video composition, filed beside its story, imports that module; this skill's SEED
  cannot, and carries its own copy — see "The one gotcha".
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
`splash/test/no-cross-skill-imports.test.ts` now fails loud on any specifier leaving a skill,
with `splash/test/helper-parity.test.ts` keeping the copies in step and
`splash/test/seed-renders-standalone.test.ts` rendering this seed in a root that holds nothing
but this directory.

The same trap, one level up, for colour: `deriveFurniture` lives beside the rasteriser and cannot be
called in the browser either. **Do not reimplement it in the composition.** `scripts/render-video.mjs`
runs in node, calls the one implementation there, and passes `ink`/`muted`/`grid` in as input props.
A second copy of the contrast escalation inside a composition is how two formats end up disagreeing
about what "muted" means on the same newsroom ground.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `doctrine/references/motion-grammar.md` | What a layer may do over time; the order a reveal follows; why the conclusion rule governs assertions while the title, source, axis and scale are furniture that establishes first |
| Contract | `assets/timing.ts` | `BeatTiming`, `progressOf` (clamped), `checkTiming` (the structural rules as arithmetic), and `CO2_TIMING` (the seed's instance). `life-expectancy`'s and `migration`'s instances are now in their own proof workspaces: `proof/life-expectancy/timing-contract.ts` and `proof/migration/timing-contract.ts` |
| Composition | `assets/EmissionsVideo.tsx` | The seed beat's drawing, frame by frame, with its own pure geometry and exports `drawnSoFar` (the chronological partial path). Other compositions have been moved to `proof/life-expectancy/LifeExpectancyVideo.tsx` and `proof/migration/MigrationVideo.tsx` |
| Registration | `assets/Root.tsx`, `assets/index.ts` | The seed composition (`co2-suisse`, `durationInFrames` IS `CO2_TIMING.total`) and the one entry point. Other stories register in their own proof workspaces: `proof/life-expectancy/Root.tsx` + `index.ts` and `proof/migration/Root.tsx` + `index.ts` |
| Geometry | inlined in `assets/EmissionsVideo.tsx` (`fr`, `yTickValues`, `crossingGeometry`) | The seed's own pure core, carried not imported — a skill imports nothing outside itself. `proof/co2-suisse/crossing-geometry.ts` is the STORY's copy, shared between that workspace's own still and web beats; the two are kept in step by `splash/test/helper-parity.test.ts`. Other stories' geometries (`migrationGeometry`, `lifeExpectancyGeometry`) likewise live inside their moved compositions in proof workspaces |
| Render | `scripts/render-video.mjs` | The seed beat's render ladder second rung: reads frozen CSV, derives furniture in node, renders final-frame still, then mp4. Other scripts now live in proof workspaces: `proof/life-expectancy/render.mjs` and `proof/migration/render.mjs` |
| Test | `test/timing.test.ts`, `canon.test.ts` | `timing.test.ts` pins the seed beat's contract. `canon.test.ts` asserts this skill's `assets/` no longer carries the migrated stories. Other contract tests are now in proof workspaces: `proof/life-expectancy/timing.test.ts` and `proof/migration/timing.test.ts` |

**Where Remotion lives.** `remotion` and `@remotion/cli` are `devDependencies` of `twin/package.json`
— this repository's own dependencies, alongside `puppeteer` and the d3 packages. They are **not** in
`splash/assets/root-template/package.json`, so an installed Splash root cannot yet render a
video beat. That is a real, named gap and it is deliberate for this exploratory pass: adding them to
the root template is a change to a different skill, and it drags a ~93 MB Chrome Headless Shell
download into every journalist's install, which is a distribution decision, not a code decision.
Whoever ships the video format for real makes that call and moves the two packages.

## Reveal a line by re-drawing it, never by sliding a dash

**The rule.** A line arriving is the path RE-GENERATED from the points it has reached —
`drawnSoFar(points, progress)`, which eleven beats here already use — not one finished path hidden by
a `stroke-dasharray` whose offset runs to zero.

**Why, and the six hours it cost elsewhere.** A dash pattern repeats forever. Set it to the path's own
length and it draws exactly one dash and one gap, which reads as a reveal — until something computes
that pattern in a space the path's length does not live in. `vector-effect: non-scaling-stroke` does
exactly that: it takes the stroke, and with it the dash, out of user units. The line then draws head,
hole and tail, all three sliding together, and the map beat where this happened took six hours and
five wrong diagnoses before anyone measured it. `drawnSoFar` cannot have the defect: there is no
pattern to compute in the wrong space.

**What refuses it here.** `scripts/verify-video.mjs` exports `revealDashInScreenSpace`, a byte copy of
the decision `scrolly` earned, and `test/verify-video.test.ts` walks every `*Video.tsx` this
repository ships — the seed and 25 beats under `proof/` — and fails one that carries a measuring dash
(a declared `pathLength`, or an offset that is not zero) under a non-scaling stroke. Measured on
2026-08-19: **18 beats carry a `strokeDasharray`, 22 marks in all, every one of them decorative — a
reference rule, a drop line, a bracket — and none carries a `strokeDashoffset` or a `vectorEffect`.**
Nothing is being fixed here. The guard exists so the first person who reaches for
`strokeDashoffset` in a beat whose plot scales is told at once instead of in six months.

## The reveal has to be over when the video is

**The rule.** Nothing may still be arriving on the last frame. A reader watches the hold and reads a
finished picture; a mark still fading in at frame 239 is a mark the argument never quite made.

**Why it needs a guard when `checkTiming` exists.** `checkTiming` already refuses a contract whose
`hold` does not end exactly at `total`, so no NAMED event can be running at the end. The offender is
one level down: every `interpolate` in this corpus drives off an already-normalised progress —
measured 2026-08-20, **178 ramps across the 26 components this repository ships, 160 with literal
bounds, 18 computed, and not one taking a raw frame** — and a progress is CLAMPED at 1. So
`interpolate(conclusion, [0.5, 1.2], …)` never reaches its own end, whatever the timing says, and the
mark it fades in is still fading when the reader's video stops.

**What refuses it here.** `neverArrives`, beside the dash guard in `scripts/verify-video.mjs`, with
`rampsFromSource` reading the ramps out of the component. An early finish is not a defect —
`interpolate(conclusion, [0, 0.45], …)` is how a beat lands before its window closes — only a
ceiling that cannot be reached. A ramp with computed bounds (`[w.start, w.end]`) is kept and decided
on by nothing; the walking test counts those too, so a reader that goes quiet fails instead of
passing. Measured: **0 offenders.** Nothing is being fixed here either.

**Why this and not `data-state`.** `scrolly` answers the same question with a vocabulary — a mark the
reveal reaches declares it — and no video component in this tree declares one. The owner's decision
(2026-08-20) was to read the last frame rather than import the vocabulary into 26 components, and for
this format the last frame is arithmetic: it needs no browser and no rendered DOM. See
`GUARDS.md`, `reveal-completes`.

**It reads the component's text, not a rendered DOM, and that is a limit.** A scrolly ships an HTML
file a browser can be pointed at; a chart video ships an mp4 and PNGs, artifacts with no attributes in
them. A video beat's marks exist as marks only inside Remotion's own render, and reaching in means
driving `remotion/Internals` — a guard built on another package's internals is brittle by
construction. So a dash assembled in a helper and spread into an element is invisible to it. Every
dash in the corpus is written literally today, the reader finds 22 of 22, and the walking test asserts
that count so the reader going quiet fails instead of passing.

**What this skill still owes.** `reached-mark-declares` — a mark the build reaches that never says so.
`scrolly` answers it with `data-state="pending"` flipped to `reached`, and **no video beat here
declares `data-state` at all**: this format signals arrival with opacity driven by `progressOf`, which
the guard cannot read. Adopting the vocabulary would be a real change to how a beat is written, not a
guard to copy, so the cell stays `owed` in `doctrine/references/guard-catalogue.json` rather than
being marked carried by a check that reads nothing.

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
bun skills/chart-video/scripts/render-video.mjs --still-only

# the mp4 (still + render), concurrency 1
bun skills/chart-video/scripts/render-video.mjs --out /tmp/video-twin

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
  `drawnSoFar` so this skill's own tests and `splash/test/helper-parity.test.ts` can exercise
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
  `chart-beat` original — a skill never imports another skill), in node, and passes the result
  in as props.
- `scripts/verify-video.mjs` — the two guards this format reaches and carries.
  `revealDashInScreenSpace` (a byte copy of `scrolly`'s decision, walked by
  `splash/test/guard-copies-parity.test.ts`) with `marksFromSource`, which reads a beat's dashed
  elements out of its own component; and `neverArrives` with `rampsFromSource`, this format's OWN
  decision — no copy exists, because no other format reveals against a frame count.
- `scripts/render-preview.mjs` — renders THIS skill's seed from THIS skill's sample data at its
  last frame. Accepts `--out <dir>` to write the proof to that directory instead of `assets/preview.png`.
  Supports `--check` to verify the preview is up-to-date (exits 1 if stale).
- `scripts/compare-png.mjs` — `decodePng`/`comparePngBuffers`: is a fresh render the same PICTURE as
  the committed `assets/preview.png`, decided on decoded pixels rather than on bytes. A byte-identical
  COPY of `skills/splash/scripts/compare-png.mjs`, carried rather than imported and walked by
  `splash/test/compare-png-parity.test.ts`; read its header for what it measurably cannot do.
- `test/timing.test.ts` — pins the seed beat's contract rules, asserted both green and red.
- `test/canon.test.ts` — asserts `assets/` no longer carries the stories that have been moved out.
  Also asserts the seed carries the canon's marker wording, sample data exists, and the preview is
  current.
- `doctrine/references/motion-grammar.md` — the doctrine. Read it before writing an edit.
- `proof/life-expectancy/` — `life-expectancy`'s own workspace: `Root.tsx` + `index.ts` (its own
  Remotion registration), `LifeExpectancyVideo.tsx` (with its own copies of helper functions),
  `timing-contract.ts`, `render.mjs`, `timing.test.ts`.
- `proof/migration/` — `migration`'s own workspace: `Root.tsx` + `index.ts` (its own Remotion
  registration), `MigrationVideo.tsx` (with its own copies of helper functions), `timing-contract.ts`,
  `render.mjs`, `timing.test.ts`.
