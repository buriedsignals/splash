---
name: chart-video
description: Use to produce a chart beat in the VIDEO format — a directed motion piece (title card, an argument told in shots, the whole chart at the end) written under the owner's choreography rules and one editable timing contract, measured in Bun and verified by looking at rendered frames before the mp4. Carries the directed-video path (rules, 32 type sheets, the shared shot helpers), the timing contract, the seed composition, and the render ladder's second rung.
---

# chart-video — write the edit, render the last frame first, then look

## Overview

The video format of a chart beat. It does not hold a chart: it holds **the edit** — an order in time
that a still cannot have.

Two things live here, and only the first is how a video is built today:

1. **The directed video path** — any subject, any of the 32 chart types: the owner's choreography
   rules, one type sheet per type, one worked example per type under `proof/video-<type>-…`, and the
   shared helpers every beat calls. Start at "The directed video path" below.
2. **The seed** (`co2-suisse`, `assets/EmissionsVideo.tsx`) — an 8 s teaching composition that predates
   the design base. It is kept because the standalone-render and parity tests exercise it; it is not
   the model for a new beat (no title card, no argument, no direction). `life-expectancy` and
   `migration` moved out to `archive/life-expectancy/` and `archive/migration/` (archived 2026-09-17),
   same pre-directed shape.

The doctrine is `doctrine/references/motion-grammar.md`; the owner's binding rules on top of it are
`references/directed-type-choreography.md`.

## The directed video path (start here)

Read in this order, then write.

| step | read / do | what it gives you |
| --- | --- | --- |
| 1 | `references/directed-type-choreography.md` | the rules (below) and the gesture repertoire |
| 2 | `references/types/<type>.md` | what the type keeps, drops and changes in video; the worked example's name |
| 3 | the worked example `proof/video-<type>-…` (index below) | the beat's split into files (table below) |
| 4 | scaffold the plumbing | Scaffold: `bun skills/chart-video/scripts/scaffold-video-beat.mjs …` (see the script's header) |
| 5 | `BRIEF.md`: the choreography shot by shot, each shot tied to an event | the design; no code before it |
| 6 | TDD `states.mjs` / `timing-contract.ts` / `scene.mjs`, then the frame | green tests before any render — the subject-agnostic maths comes from `scripts/series.mjs` (below), never copied into the beat |
| 7 | `--look <dir>`, open the PNGs, fix, then the renders | the mp4s |

**The rules, in brief** (`directed-type-choreography.md` holds the owner's words):

- **Title card at frame 0**, eyebrow + short title only, `establish` = 45 frames (1.5 s); its opacity window closes before frame 0.
- **An argument, not a reveal**: transform a state the viewer understands into the answer (split, detach, slide, magnify, pull back), lengths on one scale. Revealing marks one by one is the floor.
- **Every event changes the picture** (`assertEventStates`); only a last `hold` repeats the state before it.
- **Linear on a measured axis** (time, value); easing only for arrivals.
- **Minimal text**: counts and names, no sentences, no unit line, no standfirst.
- **Whole chart at the end**, the lesson lightly marked; no end card.
- **Credit on one line** (`CREDIT_ONE_LINE`), at the type floor, touching no word.
- **Brisk**: 18–22 s at 30 fps (540–660 frames), `hold` about 60 frames, moves overlapping.
- **30 px floor** in landscape, 36 px square/portrait (`assertTypeFloor`); widths measured in Bun and checked back in Chrome.
- **Zoom** when the decisive datum is too small at overview scale (e.g. a mark one year from the series end): no shared chart camera exists, write it in `scene.mjs`.

**Which style a render uses.** A production video's style comes from the editorial side: the
newsroom's identity (`NEWSROOM.md`, derived by `newsroom-charter` or supplied; parsed and validated by
`parseNewsroom` / `validateNewsroom` in `skills/splash/scripts/newsroom.mjs`, checked at preflight) and
the subject, composed by `composeDirections({ newsroom, filed, palettes?, beat, textPerRegister })`
(`shared/design-base/compose.mjs`), best guarded candidate first. The three **filed directions**
(`creme`, `nocturne`, `rapport` — `shared/design-base/directions/*.md`, byte-identical to
`docs/design-base/directions/`, parsed by `readDirection(path)`, all three by `filedDirections()`) are
demo/catalogue directions:

- a **proof beat** renders all three (`--filed`), one mp4 per direction, in each direction's own accent;
- a **newsroom run** renders the composed direction (`--candidates <n>` for the top n to choose from).

The flags are the scaffolded runner's (see the scaffold's header). The composer's report lines
("N were tried and refused: …") record what was dropped for this beat's text; they do not stop a
`--filed` render. A proof beat's `PALETTE.md` is the newsroom answer the composer reads
(`readPalette`), not the colour a filed render draws in.

**The newsroom's typefaces are part of that identity.** `NEWSROOM.md`'s `typefaces` line is a ladder,
most prominent first, and `composeDirections` walks it against the direction's own roles in the
direction's prominence order: the first declared face that can serve the `display` register's role
takes it, the next face takes the next role, and a role the list does not reach keeps its own ladder.
A face is used only when it passes the guards every ladder entry passes — there is a file for it at
the weights and slants those registers ask for, and it covers the words they set, read out of the
face's own cmap — and **a face that cannot is printed in the report, one line, naming the face and
the reason** (`not installed`, `no coverage for this beat's words`, or the guard that refused it). No
guard is relaxed to admit a house face. Read the report before the render: `the newsroom declares …`
is the block that says which faces went in and which did not.

### The worked example, file by file

Every chart example has the same split (`proof/video-area-swiss-co2`):

| file | holds | plumbing or beat |
| --- | --- | --- |
| `index.ts`, `Root.tsx`, `Directed<Type>Video.tsx` | entry, one `Composition` sized by `sizeFor`, faces via `useEmbeddedFaces` | plumbing (names only) |
| `render-directions-video.mjs` | args (`--only <id>`, `--still`, `--look <dir>`), composer report, type floor at every event end, `writeRenderProps`, `remotion still` then `render` with an empty `--env-file`, `--concurrency=1`, ffprobe size check, refusal cleanup | plumbing; only the look-frame list differs |
| `subject.mjs` | frozen CSV read, shape asserts (e.g. consecutive years) | beat |
| `timing-contract.ts` | the `BeatTiming` instance | beat |
| `states.mjs` | the picture's state at the end of each event, `assertEventStates` | beat |
| `scene.mjs` | `WINDOWS` (share of each event a field moves over), `fieldAt` (windowed, eased unless linear), `sceneAt(props, frame)` | mechanics plumbing, windows and geometry beat |
| `build.mjs` | direction → `resolveDirectionFamilies` → `registerOf` → `videoRegistersOf` → `k`, stage and insets, `titleCardFor`, `sourceCreditFor`, then the beat's own layout; returns `{ props, report, direction }` | ~⅓ plumbing |
| `<Type>Frame.tsx` | the SVG drawn from `sceneAt`; ground, title-card and credit groups | ground/card/credit plumbing |
| `timing.test.ts`, `states.test.ts`, `frame.test.ts` | `checkTiming`, title ≤ 1.5 s, hold ≥ 60, total ≤ 22 s; the states; floor + measured widths at every event end | per-direction loops plumbing |
| `BRIEF.md`, `PALETTE.md`, `renders/` | the choreography; the newsroom answer; `<id>.mp4`, `<id>-final-frame.png`, `<id>-props.json` | beat |

`--look <dir>` renders the last frame of every event, frame 0, and the middle of each gesture's
window. Use a directory unique to the beat (a shared scratchpad `look/` already holds other beats' PNGs).

### The type index

| type | sheet | worked example | owner |
| --- | --- | --- | --- |
| Area | `references/types/area.md` | `proof/video-area-swiss-co2` | validated |
| Bar and column | `references/types/bar-and-column.md` | `proof/video-bar-top-emitters-2024` | validated |
| Beeswarm | `references/types/beeswarm.md` | `proof/video-beeswarm-co2-per-person` | awaiting |
| Box plot | `references/types/boxplot.md` | `proof/video-box-plot-france-co2-decades` | awaiting |
| Bullet | `references/types/bullet.md` | `proof/video-bullet-low-carbon-share` | validated |
| Bump | `references/types/bump.md` | `proof/video-bump-emitter-rank` | validated |
| Calendar heatmap | `references/types/calendar-heatmap.md` | `proof/video-calendar-heatmap-geneva` | validated |
| Connected scatter | `references/types/connected-scatter.md` | `proof/video-connected-scatter-lowcarbon` | validated |
| Diverging bar | `references/types/diverging-bar.md` | `proof/video-diverging-bar-eu-per-capita` | validated |
| Diverging stacked bar | `references/types/diverging-stacked-bar.md` | `proof/video-diverging-stacked-electricity` | awaiting |
| Dot strip | `references/types/dot-strip.md` | `proof/video-dot-strip-lowcarbon-spread` | awaiting |
| Dumbbell | `references/types/dumbbell.md` | `proof/video-dumbbell-life-expectancy-gains` | awaiting |
| Gantt | `references/types/gantt.md` | `proof/video-gantt-top-ten-tenure` | validated |
| Grouped bar | `references/types/grouped-bar.md` | `proof/video-grouped-bar-wind-vs-solar` | validated |
| Heatmap | `references/types/heatmap.md` | `proof/video-heatmap-europe-electricity` | awaiting |
| Histogram | `references/types/histogram.md` | `proof/video-histogram-carbon-footprint-spread` | awaiting |
| Line | `references/types/line.md` | `proof/video-line-swiss-co2` | validated |
| Lollipop | `references/types/lollipop.md` | `proof/video-lollipop-co2-per-person` | validated |
| Marimekko | `references/types/marimekko.md` | `proof/video-marimekko-electricity-mix` | awaiting |
| Parallel coordinates | `references/types/parallel-coordinates.md` | `proof/video-parallel-coordinates-electricity-mix` | awaiting |
| Pictogram | `references/types/pictogram.md` | `proof/video-pictogram-europe-lowcarbon` | awaiting |
| Pie and donut | `references/types/pie-and-donut.md` | `proof/video-donut-world-co2-share` | awaiting |
| Population pyramid | `references/types/population-pyramid.md` | `proof/video-population-pyramid-swiss-age` | awaiting |
| Radar | `references/types/radar.md` | `proof/video-radar-electricity-mix` | awaiting |
| Sankey | `references/types/sankey.md` | `proof/video-sankey-electricity-sources` | awaiting |
| Scatter | `references/types/scatter.md` | `proof/video-scatter-income-life-expectancy` | awaiting |
| Slope | `references/types/slope.md` | `proof/video-slope-europe-lowcarbon` | validated |
| Small multiples | `references/types/small-multiples.md` | `proof/video-small-multiples-lowcarbon` | awaiting |
| Stacked bar | `references/types/stacked-bar.md` | `proof/video-stacked-bar-lowcarbon-growth` | awaiting |
| Streamgraph | `references/types/streamgraph.md` | `proof/video-streamgraph-swiss-electricity` | validated |
| Treemap | `references/types/treemap.md` | `proof/video-treemap-europe-capacity` | awaiting |
| Waterfall | `references/types/waterfall.md` | `proof/video-waterfall-germany-electricity-bridge` | awaiting |

"validated" = by the owner 2026-09-14; "awaiting" = built 2026-09-16, not yet reviewed
(`docs/design-base/CATALOGUE.md`). Choosing between two types for one subject (line vs area for a
level series): take the static sibling's type, then write the argument the subject supports.

### The shared helpers a beat calls

A beat under `proof/` imports these by `#shared/...` (the root's `imports` alias to `shared/`) or by a
relative path into this skill. A skill itself may import neither out of its own directory.

| helper | file | import from a beat as |
| --- | --- | --- |
| `titleCardFor`, `sourceCreditFor`, `keyFor`, `CREDIT_ONE_LINE`, `widthOf`, `bandOf`, `haloOf`, `verticalInsetFor`, `DRAWN_WIDER`, `BAND_PROBE` | `scripts/shots.mjs` | `../../skills/chart-video/scripts/shots.mjs` |
| `videoRegistersOf` (a direction's registers at a video size, floor lifts the whole ladder) | `scripts/video-registers.mjs` | `../../skills/chart-video/scripts/video-registers.mjs` |
| `resolveRegister`, `applyCase` | `scripts/registers.mjs` | `../../skills/chart-video/scripts/registers.mjs` |
| `assertEventStates` | `scripts/choreography.mjs` | `../../skills/chart-video/scripts/choreography.mjs` |
| `wantedOf`, `writeRenderProps`, `videoFaces` | `scripts/video-faces.mjs` | `../../skills/chart-video/scripts/video-faces.mjs` |
| `useEmbeddedFaces` | `assets/embedded-faces.ts` | `../../skills/chart-video/assets/embedded-faces` |
| `sizeFor`, `frameInsetFor`, `assertTypeFloor`, `assertDeliveredSize`, `readPngSize` | `shared/chart-video/sizes.mjs` (copy of `scripts/sizes.mjs`) | `#shared/chart-video/sizes.mjs` |
| `EVENT_ORDER`, `endOf`, `progressOf`, `checkTiming`, `BeatTiming` | `shared/chart-video/timing.ts` (copy of `assets/timing.ts`) | `#shared/chart-video/timing.ts` |
| `clamp01`, `ease`, `lerp` (the easing helpers) | `skills/scrolly/assets/reveal.mjs` | `../../skills/scrolly/assets/reveal.mjs` |
| `fieldAtOf`, `moveOf`, `drawnTo`, `areaPath`, `polylinePath`, `curveTopOver`, `widestOf`, `firstCrossing` (+ `clamp01`, `ease`, `lerp`, `round1`) | `skills/chart-video/scripts/series.mjs` | `../../skills/chart-video/scripts/series.mjs` |
| `readDirection`, `registerOf`, `EYEBROW_TO_DISPLAY`, `resolveDirectionFamilies`, `composeDirections`, `report` | `shared/design-base/` | `#shared/design-base/<file>.mjs` |
| `readPalette`, `mix`, `contrast`, `adjustToContrast`; `deriveFurniture` | `shared/chart-beat/colour.mjs`; `shared/chart-beat/render-still.mjs` | `#shared/chart-beat/...` |

Sizes: landscape 1920×1080 (`typeScale` 2.5, floor 30 px), square 1080×1080 and portrait 1080×1920
(3.0, floor 36 px; portrait keeps a safe band, `assertWithinStage`).

## What the beat takes, and what it must write itself

`scripts/series.mjs` holds the arithmetic every beat needs and no beat should own: the easing, the
field accumulator (`fieldAtOf` — a beat declares only its `WINDOWS` and `LINEAR` and takes the rest),
a series drawn to a clock (`reachAlong`, `drawnTo`) and its outline and surface (`polylinePath`,
`areaPath`), staggered moves (`moveOf`), the room a word has over a curve (`curveTopOver`,
`standsClearOfCurve`), the widest measured text (`widestOf`), a crossing and a gap (`firstCrossing`,
`firstYearGap`). It is subject-agnostic and unit-tested; a beat that writes any of it out again is
carrying a copy, and the copy is what drifts.

What never moves into the skill: **the argument, the gestures, the layout and the composition**.
They are the beat's whole reason to exist, and a parameterised chart that could draw them all would
draw none of them well.

## The copy's language

Every word a beat draws is in ONE language, and which one is decided by the first of these that
answers — never by the data, the source or the subject:

1. **The journalist's request.** They asked in French, the beat is French. Nothing downstream
   overrules the person who asked.
2. **`NEWSROOM.md`'s `languages`, primary first.** It records every language the newsroom publishes
   in, most-used first (`newsroomLanguages(profile)` in `skills/splash/scripts/newsroom.mjs` reads it,
   and the singular `language` an older profile carries); the primary is the answer.
3. **The static sibling**, when neither of the two above says anything: the beat reads in the
   language its own family already reads in.

A French request beside an English profile is not a contradiction to settle by taste — rule 1 wins.
The scaffolded `BRIEF.md` carries a **The copy's language** section; name the language and the rule
that chose it there, before any copy is written.

## When to use

- A closed `STORYBOARD.md` picks medium `chart` and format **video**, or a bare request for a
  `proof/video-<type>-…` beat. `BRIEF.md` first; no brief, no code.
- The argument has an **order**: a state the viewer understands, then a transformation that answers.
  A chart with no order in its argument is a still.
- **Not** for a map: that is `map-beat`'s live-map video path. **Not** for a Datawrapper chart.

## The one gotcha that will waste your day (read first)

**The geometry you want to reuse probably cannot be bundled for a browser.** The still path's
`render-still.mjs` loads `@resvg/resvg-js` — a native module — at module scope, so anything that
imports it, however indirectly, kills the Remotion bundle. Keep pure geometry in its own module
(`proof/co2-suisse/crossing-geometry.ts` is the first such split). In a directed beat, `scene.mjs` and
the frame component stay browser-safe: no Node module, no `#shared/chart-beat` import; everything that
reads files or derives furniture runs in `build.mjs`, in Bun, and reaches the composition as props.

**Across the skill boundary it is copy, not import.** A skill directory has to build on its own in a
journalist's root, so the seed carries its own copy of its pure core (`fr`, `yTickValues`,
`crossingGeometry` in `assets/EmissionsVideo.tsx`); `splash/test/no-cross-skill-imports.test.ts` fails
on any specifier leaving a skill, `splash/test/helper-parity.test.ts` keeps copies in step and
`splash/test/seed-renders-standalone.test.ts` renders the seed alone. Beats under `proof/` are not
skills and do import from skills (table above).

Same trap for colour: `deriveFurniture` cannot run in the browser. Call it in Bun and pass the
colours as props; never reimplement it in a composition.

## The editorial chain in a run

What the journalist retained at Gate 2 is readable by code at every later step, and a step that
stops reading it breaks a named test rather than degrading quietly. Spec: `docs/splash/2026-09-17-editorial-chain-spec.md`.

1. **One art direction per run, and this skill never composes a second.** `DIRECTION.md` sits at
   the story root beside `PALETTE.md`, composed once from `NEWSROOM.md` and the subject
   (`composeRunDirection` / `readRunDirection`, `shared/design-base/run-direction.mjs`) and
   inherited by all four exports. The scaffold REFUSES before writing anything when it is not
   reachable, naming the command that produces it — `assertRunDirection`, the same shape as the
   `PALETTE.md` refusal. `--filed` is the catalogue-only escape, for a proof that deliberately
   renders the three filed demo directions.

2. **The type sheet becomes a frame, never a choreography.** `choreographyFrame`
   (`shared/editorial/frame.mjs`), through this skill's own `chainFrameFor`, reads
   `references/types/<type>.md` into the export's required shape, the type's gesture vocabulary
   (OPEN — an unlisted atom is an addition the sheet owes) and its prohibitions, each citable by
   id. It returns no rows, no cards and no shots: a video beat's choreography — the unfolding in time: the six-shot ladder, each shot's gesture, and what it asserts — is
   AUTHORED, per subject.

3. **The scaffold writes both sections EMPTY.** `withChainSections` puts the table's headers and
   the frame quoted as a comment into `BRIEF.md`, with no rows and no value block, and
   `scaffoldRequirements` (`scripts/precision.mjs`) lists what
   `requiredAssertions` already fixes from the type and the format. The two the journalist answers
   at G1 — the claim's shape and its grounding — are named as owed, never guessed. A scaffold that
   pre-filled a row would be the clone factory this chain exists to prevent.

4. **The beat's author fills the table; the harvest reads it back.**
   `bun scripts/migrate-briefs.mjs --harvest --beat <dir>` runs `parseChoreography` and
   `parsePrecision` (`scripts/choreography.mjs`, `scripts/precision.mjs`) over what the
   beat now declares, writes the two `splash:` value blocks into those same sections and adds
   `derived: v1` to the front matter. Nothing already written is edited, reflowed or translated.

5. **Two corpus guards then hold it.** `checkChoreography` and `checkPrecision` — reachable
   through the scaffold, which re-exports both — back
   `skills/splash/test/a-choreography-is-declared-and-its-own.test.ts` and
   `skills/splash/test/precision-covers-what-the-chain-requires.test.ts`, which run over every beat
   carrying `derived: v1`. They assert that a choreography is declared, that it is this beat's own
   and not its type's worked example, and that it violates none of its type's stated prohibitions.
   They never compare it to an expected choreography.

Beats still owing an authored declaration: `docs/splash/2026-09-17-declarations-owed.md`.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `doctrine/references/motion-grammar.md` | What a layer may do over time; reveal order; furniture establishes first |
| Owner rules | `references/directed-type-choreography.md` | The directed video rules: shots, title card, argument, whole chart at the end, rhythm, precision |
| Type sheets | `references/types/` | 32 sheets, one per chart type, each naming its worked example |
| Shots | `scripts/shots.mjs` | Title card, one-line credit, key, widths and bands measured in Bun |
| Registers | `scripts/video-registers.mjs`, `scripts/registers.mjs` | A direction's registers scaled to the video size and floor |
| Choreography | `scripts/choreography.mjs` | `assertEventStates`: every event changes the picture |
| Sizes | `scripts/sizes.mjs`, `shared/chart-video/sizes.mjs` | The three export sizes, floors, delivered-size checks |
| Contract | `assets/timing.ts`, `shared/chart-video/timing.ts` | `BeatTiming`, `progressOf`, `checkTiming`; the skill copy also holds the seed's `CO2_TIMING` |
| Faces | `scripts/video-faces.mjs`, `assets/embedded-faces.ts` | Faces resolved in Bun, shipped as woff2 props, checked on every frame in Chrome |
| Directions | `shared/design-base/directions/` | The three filed demo directions |
| Seed composition | `assets/EmissionsVideo.tsx` | The seed beat's drawing with its own pure geometry; exports `drawnSoFar` |
| Seed registration | `assets/Root.tsx`, `assets/index.ts` | The seed composition (`co2-suisse`) and entry point |
| Seed render | `scripts/render-video.mjs` | The seed's ladder: frozen CSV, furniture in node, final-frame still, then mp4 |
| Test | `test/timing.test.ts`, `test/choreography.test.ts`, `test/shots.test.ts`, `test/video-registers.test.ts` | The contract rules, the event-state rule, the shot helpers, the register scaling |

**Where Remotion lives.** `remotion` and `@remotion/cli` (4.0.507, pinned) are in this repository's
`package.json` and in `splash/assets/root-template/package.json`, so an installed Splash root can
render a video beat (`splash/test/root-template-tells-the-truth.test.ts` guards it).

## How it works (the shape)

1. **Write the choreography, then the timing contract, before the drawing.** The edit is the design.
2. **`checkTiming` the contract** in a test: events in order, `hold` ending on the last frame.
3. **Compute states per event and assert them** (`assertEventStates`); derive every window from the
   contract with `progressOf`, clamped. Linear on a measured axis; eased for arrivals; a spring only
   critically damped.
4. **Lay out once, in Bun** (`build.mjs`): anything that arrives late has its space reserved from
   frame 0, so nothing shifts when it lands.
5. **Look before rendering the mp4**: `--look <dir>`, then open every PNG. Then `--still` (the last
   frame: a complete, readable chart), then the mp4 per direction.
6. **After the mp4**, open the mp4 only; confirm nothing is clipped and the last frame is the whole chart.

## Quick start

A directed beat (the path above). Scaffold: `bun skills/chart-video/scripts/scaffold-video-beat.mjs …` (see the script's header).

```sh
bun test proof/video-<type>-<slug>
bun proof/video-<type>-<slug>/render-directions-video.mjs --look "$SCRATCH/look-<slug>"   # open them
bun proof/video-<type>-<slug>/render-directions-video.mjs --still                         # last frames
bun proof/video-<type>-<slug>/render-directions-video.mjs                                 # the mp4s
```

The seed (8 s, 240 frames — its own teaching contract, not the directed 18–22 s):

```sh
bun skills/chart-video/scripts/render-video.mjs --still-only
bun skills/chart-video/scripts/render-video.mjs --out /tmp/video-twin
```

## Tuning knobs

The seed's `CO2_TIMING` and composition. A directed beat's knobs are its own `timing-contract.ts` and
`scene.mjs`'s `WINDOWS`.

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

- `TYPEFACE.md` — **the face this skill draws in, and a REQUIRED gate: a render refuses without
  one.** `readTypeface` walks up from the beat's own directory, so a story root's own
  `TYPEFACE.md` overrides this skill's; `useTypeface` then puts the answer in force before
  anything is laid out. `origin` records WHO chose — `newsroom` or `journalist` means somebody
  did, `default` means nobody did and the stack is the substrate's own.

  Two things about it are load-bearing and neither is obvious. **A newsroom's face is proposed,
  never imposed:** `newsroom-charter` measures what a newsroom publishes in and `NEWSROOM.md`
  records it, but the journalist decides whether the graphic uses it, and `origin` is where that
  decision is kept. **A face that cannot be resolved is refused, never substituted:** resvg,
  Chrome and Canvas `measureText` all render a fallback for a family they cannot find and report
  nothing, so `useTypeface` lays a probe string out in the recorded family and in a family that
  exists nowhere and refuses when the two produce identical ink. A journalist told "this machine
  does not have Marr Sans" has chosen; a silent stack has not.

  This file's own prose says all of that and said it only to itself: no `SKILL.md` mentioned
  `TYPEFACE.md` at all, so the first an author heard of the gate was a render stopping — after
  preflight, intake, G1, the storyboard exchange, the palette gate, the analyst and the bake.
  The refusal names what to do, but it arrives phases after the point where a journalist should
  have been asked, and after the expensive work.

  **Which formats require it:** the four that rasterise type themselves — `chart-beat`,
  `chart-video`, `chart-web`, `map-beat`. `dw-beat` lays out type server-side, and `map-web`,
  `scrolly` and `image-beat` draw theirs as HTML in a stylesheet. Measured, not assumed:
  `splash/test/typeface-gate-is-documented.test.ts` derives that roster from the call sites and
  refuses a skill that gains the gate without documenting it.

  **Still open, and deliberately not fixed here:** the typeface has no gate POSITION the way the
  palette does. Movement (9) of `references/exchange.md` is titled "The palette and the typeface"
  and asks only about colour, so the honest common case for a real newsroom — measured faces that
  are not installed on this machine — is a refusal nobody was given the chance to answer. That
  wants a proposal with availability measured, next to the palette's, and it should land with
  issue #41.

- `references/directed-type-choreography.md` — the owner's rules for a directed video beat. Read first.
- `references/types/` — 32 type sheets; each names its worked example under `proof/video-<type>-…`.
- `scripts/shots.mjs` — `titleCardFor`, `sourceCreditFor`, `keyFor`, `CREDIT_ONE_LINE`: the shots every type shares, measured in Bun.
- `scripts/video-registers.mjs` — `videoRegistersOf`, `scaleRegister`: registers at a video size; the floor lifts the whole ladder.
- `scripts/registers.mjs` — `resolveRegister`, `applyCase`: a register resolved against a direction.
- `scripts/choreography.mjs` — `assertEventStates`: refuses an event that does not change the picture.
- `scripts/sizes.mjs` — `sizeFor`, `stageFor`, `frameInsetFor`, `assertTypeFloor`, `assertDeliveredSize`: the three export sizes and their floors.
- `scripts/video-faces.mjs` — **the face reaches Chrome as bytes, or the frame is not drawn.**
  `useTypeface` only puts a family in force in the node process; the frames are painted by headless
  Chrome. A render calls `wantedOf(registers)` then `writeRenderProps` (or `videoFaces`) and passes
  `fontFamily` and `faces` (woff2 cut to the props' words) as props.
- `assets/embedded-faces.ts` — `useEmbeddedFaces`: loads those bytes as `FontFace`s behind
  `delayRender`, draws nothing until they are in, then reads back every text run the frame drew and
  cancels the render if a character, a weight or a family is not covered. `assets/face-coverage.ts`
  is its pure comparison.
- `assets/timing.ts` — the shared timing contract type, `progressOf`, `checkTiming`, and `CO2_TIMING`
  (the seed beat's instance). Beats import the carried copy `shared/chart-video/timing.ts`.
- `assets/EmissionsVideo.tsx` — the seed beat's composition. **Replace per story**; do not
  parameterise it into a general video chart. Carries its own copy of the pure core it draws (`fr`,
  `yTickValues`, `crossingGeometry`). Exports `FONT_FAMILY`, `measureText`, `wrap` and
  `drawnSoFar` so this skill's own tests and `splash/test/helper-parity.test.ts` can exercise
  them without a browser — not as a library for another beat to import.
- `assets/Root.tsx` — the Remotion root; registers the seed composition (`co2-suisse`), sized and
  timed from its own contract.
- `assets/index.ts` — the one Remotion entry point (`registerRoot`).
- `assets/sample-data/rainfall.json` — canonical sample data for the seed: 11 rows of
  `{ year, value }` pairs from 2015–2025.
- `assets/preview.png` — the seed at its **last frame** (frame 239 of 240), rendered by
  `bun scripts/render-preview.mjs`.
- `output-proof/preview.png` — the seed's artifact from this skill's own sample data —
  regenerated by `bun scripts/render-preview.mjs --out output-proof`.
- `scripts/render-video.mjs` — the seed beat's render script: `readingsFromCsv`, still → mp4.
  Imports `deriveFurniture` from this skill's OWN `scripts/render-still.mjs` (a copy, not the
  `chart-beat` original), in node, and passes the result in as props.
- `scripts/render-preview.mjs` — renders THIS skill's seed from THIS skill's sample data at its
  last frame. `--out <dir>` writes elsewhere; `--check` exits 1 if the preview is stale.
- `test/timing.test.ts` — pins the seed beat's contract rules, asserted both green and red.
- `test/canon.test.ts` — asserts `assets/` no longer carries the moved stories, the seed carries the
  canon's marker wording, sample data exists, and the preview is current.
- `doctrine/references/motion-grammar.md` — the doctrine. Read it before writing an edit.
- `archive/life-expectancy/` — `life-expectancy`'s own pre-directed workspace (archived 2026-09-17):
  `Root.tsx` + `index.ts`, `LifeExpectancyVideo.tsx`, `timing-contract.ts`, `render.mjs`, `timing.test.ts`.
- `archive/migration/` — `migration`'s own pre-directed workspace (archived 2026-09-17): `Root.tsx` +
  `index.ts`, `MigrationVideo.tsx`, `timing-contract.ts`, `render.mjs`, `timing.test.ts`.
