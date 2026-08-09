# W3 — the seven visual mechanisms

Implementation spec, 2026-08-10. Axis: **B3.1, B5.2 and B6.1–B6.19** of `twin/FEEDBACK-2026-08-10.md`.
Written inside the frame of `twin/PLAN-2026-08-10.md`; the measurements it builds on are
`twin/survey/web-genre-and-specifics.md`, re-checked against the tree before being used here.

**Nineteen per-beat items are seven mechanisms.** Six of the seven already have a correct
implementation somewhere in this tree; what failed is that the correction travelled. The seventh is
a primitive neither web genre has, and building it once closes two items and unblocks W8.

Ordered by leverage, which is not the order the feedback was written in:

| § | Mechanism | Items | Sites today | Guard exists? |
|---|---|---|---|---|
| **A** | A handover drawn as a **crossfade** instead of a cut | B6.4, B6.7, B6.11, B6.19 | **13 sites, 8 files** | none |
| **E** | A redesign that **reached the skill and some copies** | B6.2, B5.2, B6.5 | 4 un-migrated frames + 3 unconditional tables + 1 un-travelled fix | none |
| **B** | An annotation **placed and coloured without reference to what it annotates** | B6.3, B6.4, B6.5, B6.6, B6.10, B6.16 | 5 files, two legs | none |
| **C** | A **fixed 28 px hit square at the mark's anchor** | B6.14a, B6.18a | 3 copies of one constant | one, **blind by construction** |
| **G** | **No way to hover a line** | B6.9b, B6.15 | 15 `pointerEvents` sites, none on a path | n/a — missing capability |
| **D** | **One collision decision baked at the narrowest width** | B6.1, B6.6, B3.3 | 3 sites | none |
| **F** | **A floor cleared by a hair** | B6.13a, B6.17 | 2 beats | none, and it is a threshold that failed |

Plus three decisions rather than defects — **B5.2** (the accessible table), **B3.1** (an entrance
animation), and the slope's missing axes, which is a type sheet the artifact does not honour.

## What this spec depends on, and what depends on it

- **W2 lands first.** Palette reaches the seeds before any component in here is edited. Several
  changes below choose an ink or an accent *against something*; doing that before the seeds are
  right means doing it twice. This is the frame's own ordering and this spec does not argue with it.
- **W6 rewrites map × web onto live MapTiler** (ruling R1). Mechanisms **C** and **E2** live in
  that genre. Every guard in this spec is **behavioural** — it drives the delivered artifact or
  SSRs the delivered component — so it survives that rewrite unchanged; the *edits* for C's map half
  should be made in whatever layer W6 lands, not twice. Sequence C after W6 or fold C's map half
  into it. C's chart half and everything else here is independent.
- **W8 (flow/route × web) needs § G's hoverable line.** Build it here; W8 consumes it.
- **B5.3** (filters, MapTiler's own controls) is W6's, not this spec's. The one part of B5.3 that is
  a *rule* rather than an architecture — B6.18b, a filter offering an option that excludes the
  subject — is specified in § G's residue because it is editorial, and it must not be "fixed" by
  hiding the claim behind a control.

## The measuring instrument, and why it is already in the tree

Every guard below reads a **rendered document**, never source text. Three instruments exist and two
of them need nothing built:

1. **Statics: the SVG is already committed.** `skills/twin-chart-beat/scripts/render-still.mjs:197-211`
   SSRs the component and writes **both** `<name>.svg` and `<name>.png`. Measured: **24 committed
   `.svg` files, and every one of the 18 static chart and map beats has one.** So a walking guard
   over the static corpus can parse real geometry, real fills and real opacities today, with no
   re-render, no browser and no props file.
2. **Web: the delivered `.html` is committed** and `interaction-promises-are-kept.test.ts` already
   launches Chrome and walks it.
3. **Video: needs one small thing.** The components call `useCurrentFrame()`, so SSR outside
   Remotion requires stubbing two hooks, and it needs the beat's real props. Measured: **15 of the
   25 video beats commit a `*-props.json`** (written by their own `render.mjs` before it calls
   `remotion still`); ten do not. Both halves are specified as **task A0** below.

That asymmetry is why § A carries the only real infrastructure cost in this spec, and why it is
still first: it is 13 sites, and the instrument it builds is reusable by everything after it.

## Three corrections to the record

Recorded rather than silently fixed, because this project's rule is that any report can be wrong.

1. **The slope's connecting lines ARE rendered** (against B6.8 / B6.9). Ten `<line>` elements are in
   `proof/web-co2-decline-slope/co2-decline-slope.html`; the static PNG shows all six slopes;
   `RenewablesShiftSlope.tsx:252-267` draws them. **What is genuinely absent is the two vertical
   axes**, which `skills/twin-chart-beat/references/types/slope.md` requires by name — *"Two vertical
   axes — one per period"* (the "What the drawing actually needs" section, ~:36). The observation was
   right that something is missing; the diagnosis moves. Specified in § G's companion work.
2. **The histogram's label overlap begins at frame 154, not 150.** `timing-contract.ts:47-48`:
   `subject {start:132,duration:22}`, `conclusion {start:154,duration:26}`. At frame 150 only the
   short `65` is painted. The collision window is frames **154–179**, 0.87 s.
3. **The survey's own count for § A is off, and it missed a site.** Its table lists 12 sites in 8
   files under the headline "nine files, thirteen sites". Re-counted here:
   **13 sites in 8 files** — the thirteenth is `proof/map-quake-symbol/QuakeSymbolVideo.tsx:238-259`,
   whose own comment says *"pending outline throughout, then **crossfades** to the accent"*
   (`opacity={furniture * (1 - subjectSpring)}` at `:246` against `opacity={subjectSpring}` at `:257`).
   The number the owner should hold is 13; the file count is 8.

---

# A — a handover drawn as a crossfade instead of a cut

**The mechanism.** A composition draws one screen object twice — a short form and a long form, a
plain form and an accent form, a placeholder and a true fill — as two sibling nodes at the same
anchor, each with its own opacity expression written as `A * (1 - c)` and `A * c`. That is a
**crossfade**: for the whole width of the transition both nodes are painted, superimposed, at
partial opacity. Where the two strings share a prefix it reads as a duplicate; where the two anchors
are identical it reads as a double exposure; where one node is a placeholder texture it means the
data layer is on screen before the ground it sits on.

## The measured state

Confirmed in the tree, node by node:

| # | File | Site | The pair |
|---|---|---|---|
| 1 | `proof/vidy-histogram-life-expectancy/HistogramVideo.tsx` | `339-346` computes, `541-552` / `553-565` draw | `65` → `65 countries, 75–80 years — the most of any span`, same `y`, anchors differ |
| 2 | `proof/vidy-pyramid-niger-population/PyramidVideo.tsx` | `663-671` / `672-683` | `4.67M` → `4.67M · ~6.9× the 65+ population (673K)`, **identical `x`, `y` and `textAnchor`** |
| 3 | `proof/vidy-pyramid-niger-population/PyramidVideo.tsx` | `573` vs `654` | band label plain → accent |
| 4 | `proof/video-population-growth-dumbbell/DumbbellVideo.tsx` | `470` vs `561` | value → sentence |
| 5 | `proof/video-population-growth-dumbbell/DumbbellVideo.tsx` | `473` vs `548` | country plain → accent |
| 6 | `proof/vidy-boxplot-co2-by-continent/BoxplotVideo.tsx` | `525` | category plain → accent |
| 7 | `proof/vidy-boxplot-co2-by-continent/BoxplotVideo.tsx` | `528` | outlier → conclusion |
| 8 | `proof/vidy-lollipop-renewables-share-europe/LollipopVideo.tsx` | `482` | value → conclusion |
| 9 | `proof/vidy-lollipop-renewables-share-europe/LollipopVideo.tsx` | `485` | category plain → accent |
| 10 | `proof/vidy-heatmap-renewables-europe/HeatmapVideo.tsx` | `485` vs `612` | row label plain → accent |
| 11 | `proof/mapgen-choropleth-video/ChoroplethVideo.tsx` | `341-347` / `348-356` | `pending` texture → true ramp fill, **same `d`** |
| 12 | `proof/map-quake-symbol/QuakeSymbolVideo.tsx` | `212-225` / `226-235` | outline on the master clock → fill on the mark's own arrival, **same `cx/cy/r`** |
| 13 | `proof/map-quake-symbol/QuakeSymbolVideo.tsx` | `238-246` / `247-259` | subject outline → subject accent, same `cx/cy/r` |

**Thirteen sites, eight files.** Ten are text pairs, three are shape pairs.

**What each one produces, from the delivered mp4s** (survey measurements, re-derived from the timing
contracts): histogram frames 154–179 print both strings, and at frame 158 the reader sees
`65 countries, 75–80 yea65 — the most of any span`. Pyramid frame 268 shows a grey `4.67M` ghost
sitting over `65+`. Choropleth **frame 0** is every country's dot texture at full opacity on white,
with no title, no source and no basemap. Quake-symbol frame 40 is a plate, a legend and seventeen
empty rings.

**Two rules in the doctrine already forbid this, and one correct implementation already exists.**
`skills/twin-doctrine/references/motion-grammar.md:108` — *"A label's reveal gates on its own mark,
never on a master clock"* — and the anti-pattern list at `:153-166`, whose third entry (`:159`) is
**"The accent before the thing it accents."** The map symbol gates one half of a single mark on the clock
and the other half on the mark, which is that rule applied to a mark rather than a label, and it is
not written down that way. The correct pattern is at
`proof/vidy-heatmap-renewables-europe/HeatmapVideo.tsx:462-505`: the empty outline grid sits inside
`<g opacity={axisOpacity}>`, so frame 0 is title and source only. It never travelled to the maps.

**The reasoning that must survive the fix.** `skills/twin-map-beat/SKILL.md:194-203` records why
`pending` exists: a country fading in from transparent showed the near-white basemap through a
half-opaque fill and **read lighter than the lightest filled class — the opposite of the data.**
"Empty at frame 0" must not be implemented by restoring that fade. The honest correction is a **hard
cut at the mark's own arrival**, never a softer crossfade.

## A0 — the instrument (do this first)

**A0.1 — every video beat commits the props its render used.** Each `render.mjs` already writes
`<name>-props.json` next to its output before calling `remotion still`
(`proof/vidy-histogram-life-expectancy/render.mjs:166-167` is the pattern). Fifteen of twenty-five
are git-tracked. Run the remaining ten with `--still-only` and commit the props file **inside the
beat's own folder** — invariant 3. No component changes.

**A0.2 — SSR a Remotion component at a chosen frame.** In `skills/splash-twin/test/`, a helper that
`mock.module("remotion", …)` re-exporting the real module with `useCurrentFrame` and
`useVideoConfig` replaced by stubs reading a module-level frame and the beat's own `fps`.
`interpolate`, `spring` and `Easing` stay real, so the guard evaluates the beat's actual arithmetic,
not a paraphrase of it. `AbsoluteFill` and `Img` render as a `div` and an `img`, which is what makes
the plate's `style.opacity` visible to the guard.

**This is a spike and it must be measured before the rest of § A is scheduled.** If `mock.module`
cannot reach a component imported through the beat's own module graph, **stop and re-decide** — do
not fall back to a source-text parity guard. The thirteen sites are *correctly different from one
another* and each is wrong on its own terms; a text comparison over them either passes everything or
turns red for a correct change, which is `helper-parity.test.ts`'s failure exactly, and invariant 4
says a guard that cannot go red is worse than none.

## The change, per beat

**Ten text pairs → an exclusive mount.** One node at a time, never two:

```
{conclusion > 0 ? <sentence …/> : <short …/>}
```

Where the pair is a plain form and an **accent** form of the *same string* (sites 3, 5, 6, 9, 10),
the correction is smaller and better: **one node whose `fill` switches** —
`fill={subject > 0 ? accent : ink}` — because two superimposed copies of one string at two colours
composite to a third colour nobody chose, which is invariant 1 broken in the most literal way
available.

The timing contracts do not change. The editorial intent does not change either: the histogram's own
comment calls this *"the label extends in place"*, and an extension is a cut, not a dissolve. Where
the two strings share an opening token — `65` inside `65 countries…`, `4.67M` inside `4.67M · ~6.9×…`
— the shared prefix is precisely what makes a crossfade read as a duplicate, so the cut is not a
compromise, it is the reading of the sentence the beat wanted.

**Three shape pairs → one node.**

- `ChoroplethVideo.tsx:341-356` — mount the pending texture **or** the true fill, never both:
  `arrived < 1 ? <path fill="url(#pending)"/> : <path fill={trueFill}/>`, the switch binary at the
  shape's own window. The `pending` texture stays fully opaque throughout, which is the whole point
  of `SKILL.md:194-203`; what goes is the overlap, not the device.
- `QuakeSymbolVideo.tsx:212-235` — **one** `<circle>` carrying both `stroke` and `fill`, both
  arriving on `arrived`. SVG gives a node both properties; drawing them as two nodes is what created
  the defect. The rule this establishes, and which the guard enforces: *an outline and its fill are
  one node.*
- `QuakeSymbolVideo.tsx:238-259` — the subject is the same node with `stroke`/`fill` switching to
  the accent at `subjectSpring`'s boundary.

**Frame 0 — one beat, precisely.** Checked across all six map videos: `mapvid-dot-population`
(`:239`, *"Title, source and caveat are drawn at full opacity from frame 0"*), `mapgen-flowmap-video`,
`map-quake-symbol`, `mapvid-hexgrid-quakes` and `mapvid-locator-geneva` already do the right thing —
the last two gate a `<g opacity={furniture}>` that holds an in-plate readout, which is furniture
belonging to the plate and correctly gated. **`mapgen-choropleth-video` is the only beat whose title
is gated**: `ChoroplethVideo.tsx:411-412` wraps `titleLines` in `<g opacity={furniture}>` and
`furniture` is exactly 0 at frame 0 (`:204-206`). Move the title, source and note out of that group
to full opacity; leave the plate `<Img>` (`:243-251`) and the field gated. That is the same edit
`HistogramVideo.tsx:287-295` and the other twenty-one beats already carry, and it is what makes
B6.11 and `video-first-frame-not-empty.test.ts` agree rather than contradict: **something is drawn
at frame 0 — the title and the source — and the map field is empty.**

## The walking guard

`skills/splash-twin/test/video-handover-is-a-cut.test.ts` — new, walking, behavioural. It discovers
beats (`proof/*/[A-Z]*Video.tsx` — 25 today), reads each beat's committed props and its
`timing-contract.ts`, SSRs the component at consecutive frames through the `reveal`, `subject` and
`conclusion` windows plus frame 0, and asserts four things on the rendered document.

**A guard that took a list would be the wrong shape here** — a fourteenth crossfade in a beat written
next month is the failure it exists to prevent. It walks, exactly as `render-still-parity.test.ts`
and `video-first-frame-not-empty.test.ts` do.

**Assertion 1 — no crossfading text.** Group every `<text>` by its baseline `y`, banded at one
line-height. Compute each one's **effective** opacity (its own, times every ancestor `<g opacity>` —
these components nest, and reading the leaf alone would miss half the corpus). For frames *n* and
*n+1*, take each text's slope. **Fail when one band, at one frame, holds a text whose opacity is
falling and another whose opacity is rising, both painted at ≥ 0.02.**

The slope is what makes this precise, and it was not obvious: a rule of "two painted texts in one
band" fails a legitimate row of tick labels fading in together (`HeatmapVideo.tsx:463-476` fades
fifteen column headers on one `axisOpacity` — all rising, all correct). A crossfade is the *only*
thing that puts a falling text and a rising text in the same band at the same frame. A cut puts one
text in the band. Opacities that sum to one with a hard boundary put one text in the band at every
frame including the boundary.

**Assertion 2 — no crossfading shape.** Key every `<path>`, `<circle>`, `<rect>` and `<line>` by its
geometry (`d`, or `cx|cy|r`, or `x|y|width|height`). **Two nodes with an identical geometry key may
never both be painted at effective opacity ≥ 0.02.** No slope needed: identical geometry means one
object, and painting two of them *is* the crossfade. This states, and enforces, the rule that an
outline and its fill are one node.

**Assertion 3 — frame 0 is furniture only.** At frame 0: every non-`<text>` node — including the
plate `<img>`'s inline `style.opacity` — must be at effective opacity < 0.02, and **at least two
`<text>` nodes must be at ≥ 0.98**. This closes blind spot #1 of
`video-first-frame-not-empty.test.ts`, which its own header names: *"WHAT is on frame 0 — only that
something is."* It does not replace that guard; it makes it specific.

**Assertion 4 — the report.** On failure it prints beat, frame, band or geometry key, and both
nodes' text or geometry, because a guard whose failure a person cannot act on is a guard someone
disables.

**Cost, and the honest control on it.** Roughly 120 frames per beat × 25 beats of SVG SSR. Measure
it; if it exceeds a minute, step the sample by 2 — the shortest handover window in the corpus is 22
frames (`subject` in the histogram), so a step of 2 cannot miss one. Never sample by more than 2
without re-measuring the shortest window.

## The mutation that reddens it

**The strongest proof is available here and should be used: write the guard before the fixes.** It
must print all thirteen sites red, by name and frame, against today's tree. Then fix them one at a
time and watch the list shrink to zero. That is a mutation proof run on real defects rather than
synthetic ones, and it is better evidence than any injected change.

Then, after green, the standing requirement — three injected mutations, each in a copy of the tree
outside it:

- Restore `HistogramVideo.tsx`'s two `opacity={valueOpacity}` / `opacity={conclusionOpacity}` nodes →
  must name `vidy-histogram-life-expectancy`, a frame in 154–179, and both strings.
- Split `QuakeSymbolVideo.tsx`'s merged mark back into an outline node and a fill node → must name
  the geometry key and both frames.
- Re-gate `ChoroplethVideo.tsx`'s title on `furniture` → must fail assertion 3 naming "frame 0 paints
  no text at full opacity".

## What A does not close

- **Frames between the sampled windows.** `establish` and `hold` are not walked. A crossfade written
  into a hold would pass.
- **A single node whose opacity is wrong.** The guard compares pairs; one badly-timed label alone is
  invisible to it.
- **Whether the cut lands at the right frame.** It proves the handover is a cut, never that the beat
  chose a good moment for it. That stays a person opening the mp4.
- **The static and web siblings.** Only compositions with a frame are walked.

## The proof

Re-render `vidy-histogram-life-expectancy`, `vidy-pyramid-niger-population`,
`mapgen-choropleth-video` and `map-quake-symbol` in full. Then, with `ffmpeg`:

- histogram frames **153, 154, 158, 163, 180** — 153 must be `65` alone, 154 onward the sentence
  alone, nothing in between showing both;
- pyramid frame **268** — one label, no ghost over `65+`;
- choropleth frame **0** — title and source legible, map field blank, no dot texture; and a
  mid-reveal frame (~half of `reveal`) showing pending shapes and filled shapes but no shape both;
- quake-symbol frames **0 and 40** — 0 is title, source and note; 40 has no empty rings, every
  circle either absent or drawn with its fill and outline together.

Open all six mp4s end to end once. The histogram and the pyramid are the two the owner watched.

---

# E — the duplication tax, unpaid

**This is the class the branch's own rule creates, and paying it is what makes the rule safe.** Three
decisions were taken, implemented once, and never walked to their copies. No item here asks for a
shared module: the reason `mapgen-hexgrid-web` could exist at all is that somebody copied a renderer
and changed it. What is missing is the *walking* half of the duplication contract.

## The measured state

**E1 — the fluid frame reached 2 of 5 map-web beats and 17 of 18 chart-web beats.**

| beat | frame |
|---|---|
| `proof/mapgen-dot-web/render-web.mjs` | fluid (`100cqw`) |
| `proof/mapgen-symbol-web/render-web.mjs` | fluid |
| `proof/mapgen-choropleth-web/render-web.mjs` | **two-rung** (`layouts`, `@media (max-width:…)`) |
| `proof/mapgen-hexgrid-web/render-web.mjs` | **two-rung** |
| `proof/mapgen-locator-web/render-web.mjs` | **two-rung** |
| `proof/more-heatmap-co2-per-capita-decades/render-web.mjs` | **two-rung** — `:256` `max-width: ${desktopCapPx}px`, `desktopCapPx = 900` |

B6.2 is the last row: driven at 1400 px the heatmap occupies **645 px and stops**. Its own comment
(`:233-235`) says *"The real answer is the fluid seed … retrofitting the eleven web chart beats onto
it is a known open item"* — the retrofit landed on seventeen and left this one, plus three map beats
nobody counted. Note also `skills/twin-chart-web/SKILL.md:15-17`: *"Fifteen beats ship through this
skill … every one of them is on the fluid frame"* — measured, eighteen hold a `render-web.mjs`,
seventeen import the skill's `renderWeb`. The sentence is stale in both directions and
`skill-md-matches-code.test.ts` checks signatures, not counts.

**E2 — "the table is opt-in" reached the skill and 2 of 5 beats.** `skills/twin-map-web/scripts/render-web.mjs:66`
sets `regionTable: false` and `:86-94` documents it. Measured on the delivered HTML, **all five
map-web beats still ship a rendered table**:

| artifact | rows | why |
|---|---|---|
| `mapgen-dot-web/dot-population.html` | 42 | explicit `regionTable: true` — a decision |
| `mapgen-symbol-web/quake-symbol.html` | 17 | explicit `regionTable: true` — a decision |
| `mapgen-choropleth-web/render/choropleth.html` | 41 | private renderer, no switch |
| `mapgen-hexgrid-web/hex-grid.html` | **156** | `renderHexGridWeb` renders `table` unconditionally (`render-web.mjs:69-84`) |
| `mapgen-locator-web/locator.html` | 11 | `renderMapWeb` renders it unconditionally (`render-web.mjs:64-73`); the file header still says *"one always-rendered accessible table"* |

Two beats made a decision; three carry a renderer that predates the decision existing.

**E3 — a fix that never travelled.** `proof/vidy-pyramid-niger-population/PyramidVideo.tsx:378-396`
measures each band label's own ascent and descent and masks the centre spine behind it, with the
comment *"without this the dashed rule STRUCK THROUGH all 21 of them"* and a note that it was
measured on the delivered mp4's final frame. The static sibling
`proof/static-swiss-age-pyramid/SwissAgePyramid.tsx:311-318` draws that spine as **one continuous
`<line>` from `plot.top` to `plot.bottom`** and `:337-345` centres every band label on the same `x`.
The strike-through is visible in the committed PNG as `95|99`, `85|89`, `100|+`. The web sibling
avoids it structurally (its labels live in a CSS grid track). **This is the second half of B6.5 and
it is the sharper half.**

## The change, per beat

- **E1** — port `mapgen-choropleth-web`, `mapgen-hexgrid-web`, `mapgen-locator-web` and
  `more-heatmap-co2-per-capita-decades` onto the fluid frame their siblings already run: one SSR, a
  container-query stage, no `layouts` array, no `@media (max-width:)` layout swap, no `max-width` on
  the figure. `proof/mapgen-dot-web/render-web.mjs` and `skills/twin-chart-web/scripts/render-web.mjs`
  are the two references. **Four beat-local copies edited; no skill changes.**
- **E2** — the three private renderers gain the same `regionTable` option name and default the skill
  already carries. Whether it is then `true` or `false` per beat is the B5.2 decision below, and it
  is a decision the beat's author takes explicitly.
- **E3** — carry `PyramidVideo.tsx:375-400`'s spine-clearance mask into
  `proof/static-swiss-age-pyramid/SwissAgePyramid.tsx`: measure each band label's own ascent and
  descent, mask the spine behind it, keep the clearance **binary** (present or absent, never faded).
  One beat-local copy, code that already exists and is already measured next door.
- **E1 follow-on** — correct `skills/twin-chart-web/SKILL.md:15-17` to the measured counts.

## The walking guards

Three, all in the `render-still-parity.test.ts` idiom — walk the tree, compare a shape, never take a
list.

1. **`web-frame-is-fluid.test.ts`** — walk every delivered `.html` under `proof/`; fail any whose
   own `<style>` contains a layout-swapping `@media (max-width:` or a `max-width: <px>` on the
   figure. **Four current failures, all real.**
2. **`map-web-table-is-a-decision.test.ts`** — walk every `render-web.mjs` rendering a map genre;
   fail any that renders its table without reading a named option. **Three current failures.**
3. **`genre-renderer-options-match.test.ts`** — the general form, and the one worth arguing for:
   *a decision recorded in a skill must be reachable from every copy of the mechanism.* Mechanically,
   every beat-local copy of a genre renderer exposes the same option names as its skill's own
   renderer — a walking signature comparison, exactly what `render-still-parity.test.ts` does for
   function bodies. This is the guard that would have caught E2 the day it was created, and it
   generalises: it is the guard the *next* skill-level decision needs.

The pyramid spine (E3) needs no new guard of its own — § B's `emphasis-and-annotation` walk over the
committed SVGs covers a rule that strikes through a label, and it is listed there.

## The mutation that reddens it

- Re-add `max-width: 900px` to a fixed copy of `more-heatmap-co2-per-capita-decades` → guard 1 red,
  naming the file and the rule.
- Delete the `regionTable` parameter from a fixed copy of `mapgen-locator-web/render-web.mjs` while
  still rendering the table → guard 2 red.
- Add an option to `skills/twin-map-web/scripts/render-web.mjs`'s `renderMapWeb` signature and leave
  the beat copies alone → guard 3 red, naming every copy that lacks it. **Run this one in both
  directions** — a copy with an *extra* option must NOT be red, or the guard punishes the beat-local
  specialisation the branch's whole method depends on.

## What E does not close

- **Whether a fluid beat actually looks right at 375 and 3440.** Guard 1 refuses a rung; it does not
  judge a layout. `verify-web.mjs --file` at seven viewports is what does that, on demand.
- **The three map-web beats' private renderers stay private.** That is the method, deliberately. The
  guard keeps their *options* in step, not their bodies.
- **E1's map half will be re-opened by W6**, which rewrites how a map-web beat is built. Port the
  four beats anyway: a two-rung layout would survive the MapTiler swap untouched, and the guard is
  what makes sure it does not.

## The proof

Open the four ported artifacts in a real browser at **375, 768, 1400 and 3440 px** and look at one
thing in each: does the graphic reach both edges of its container at every width, and does the
narrow width still hold its labels. `more-heatmap-co2-per-capita-decades` at 1400 is the beat the
owner named — it must no longer stop at 645 px. Re-render `static-swiss-age-pyramid` and open the
PNG at 100 %: the spine must be interrupted at every one of the 21 band labels, and `100+` must read
as `100+`.

---

# B — an annotation placed and coloured without reference to what it annotates

**Two legs, one absence: nothing in this tree derives an annotation's ink or its position from the
mark it is drawn over.** Every annotation in the corpus is a hand-typed offset plus a palette colour
chosen against the page ground.

## Leg 1 — the colour is measured against the ground, never against the mark

`proof/static-carbon-footprint-spread/CarbonFootprintHistogram.tsx:279-287` draws the median rule
`stroke={accent}` from `plot.top` to `plot.bottom` — straight through the 0–4 t bar, drawn
`fill={muted}` at `:226-234`. With `ground:"#FFFFFF"`, `accent:"#0B7A75"` (`render.mjs:80-81`) and
`muted` derived by `render-still.mjs:71-83`:

| pair | contrast |
|---|---|
| accent vs ground | **5.18 : 1** — passes every floor |
| accent vs **the bar it crosses** (`#616161`) | **1.20 : 1** |

The video sibling is worse: `HistogramVideo.tsx:501-509` draws the median `stroke={muted}` and
`:377-392` draws the bars `fill={muted}` — **1.00 : 1**, literally invisible where it crosses a grey
bar. It reads in the delivered mp4 only because the median at 75.3 happens to land on the *accent*
bar. Change the data and it disappears with nothing failing.

`skills/twin-doctrine/references/visual-system.md:89-94` already states the rule — *"a label's ink is
never inherited from the mark it names… computed against the real background the label sits on —
every time, even when that background is a data mark instead of the page"* — and calls it *"the
single most independently-rediscovered defect in this system's history"*. **It is written for TEXT.**
A dashed rule, a leader line and a hatch are not text, so nothing reaches them.

## Leg 2 — the position is typed, never derived

- **B6.5, pyramid static.** `SwissAgePyramid.tsx:348-368` runs the peak leader `x1={plot.left} →
  x2={peak.male_.x}`. For the widest band — by definition the bar with the least margin — that is a
  three-dash stub, and the label sits alone at `x={plot.left}`. Plus the spine strike-through (E3).
- **B6.6, pyramid web.** `proof/weby-population-pyramid-switzerland/SwissAgePyramidWeb.tsx:307-315`
  runs an L-leader from `y = 0` and `:321-327` parks the label at `left:0%, top:0%`. Driven at
  1400×900 the label sits in the plot's **top-left corner, ten rows above the band it names.** Also
  `render-web.mjs:269` sets `peakLabel: "the widest band"` — **the web version dropped the value the
  static carries** (`55-59: the widest band (669,962)`).
- **B6.10, choropleth.** `proof/mapgen-choropleth-video/bake.mjs:42-47`:
  `anchors: { label: [20.3, 52.2] }` with the comment *"nudged east and north so the right-anchored
  label text lands centred over the country"*, consumed at `ChoroplethStill.tsx:239-259` with
  `textAnchor="end"`. Nothing computes a centroid, a bounding-box centre or a pole of
  inaccessibility. The label sits in Poland's upper-right lobe.
- **B6.16, hex grid.** `proof/map-quake-density/HexGridStill.tsx:216-225` gives the subject cell
  `stroke={isSubject ? accent : ground}` — **and no `<text>` in that file names it.** The number
  exists: `proof/map-quake-density/BRIEF.md:33`, *"Densest cell: 1,724 events, Fiji 49 % / Tonga
  36 %"*, listed at `:52` as reveal step 2. It never reached the artifact. **This is the sharpest
  form of the class: emphasis spent with nothing said.**

## The change, per craft skill

**Leg 1 — one new assertion, in a file the walking guard already covers.** Add
`assertAnnotationReadsOverMarks(annotation, fills)` to
`skills/twin-chart-beat/scripts/render-still.mjs`: given an annotation's stroke and the set of fills
its geometry crosses, throw unless every pair clears **3 : 1** (WCAG 2.2 SC 1.4.11, non-text). Then
propagate it, by hand, into **22 copies of `render-still.mjs`** — and that is the leverage:
`render-still-parity.test.ts` **already walks all 22 and compares function by function**, so the new
helper is guarded in every copy the moment it lands, and a twenty-third copy is guarded the day it is
created. No new parity guard is needed for leg 1's helper.

Then call it, and let it fail, in the two beats that fail it:

- `static-carbon-footprint-spread` — the median rule must be drawn in an ink measured against the
  bars it crosses, not against the page. The escalate-to-the-higher-pole method
  `deriveFurniture` already uses is the one to reuse; the honest outcome for a rule crossing
  `#616161` is a near-black or near-white rule, not a teal one.
- `vidy-histogram-life-expectancy` — same rule, and its `stroke={muted}` over `fill={muted}` must
  fail loudly rather than survive on where the median happens to land. The video path calls the
  assertion from its own `render.mjs`, where the props are computed.

**Leg 2 — four beat-local changes, each replacing a typed number with a derivation.**

- `SwissAgePyramid.tsx` — anchor the peak annotation to its own band: the leader runs from the label
  to the band's own bar tip, and the label sits beside the band, not in the margin. Plus E3's spine
  mask.
- `SwissAgePyramidWeb.tsx` — the same, in the CSS grid the web version already has: the label lives
  in the band's own row track. The `0%,0%` park is a § D symptom and it is fixed here.
  **And restore the value**: `render-web.mjs:269` carries the static's full string.
- `mapgen-choropleth-video/bake.mjs` — compute the label anchor from the shape's own projected
  geometry. A **pole of inaccessibility** (a coarse grid search inside the polygon, then refine — 30
  lines, self-contained, duplicable) is the right derivation for a country label, not a centroid,
  which for a concave shape lands outside the land. Bake it; do not type it.
- `map-quake-density/HexGridStill.tsx` — the accented cell gets its sentence, drawn from the beat's
  own frozen data, carrying the number `BRIEF.md:33` already knows.

## The walking guards

Both walk the **committed SVGs** — 24 of them, one per static beat, already in the tree
(`render-still.mjs:210` writes them). No re-render, no browser, no props file.

1. **`annotation-reads-over-what-it-crosses.test.ts`** — for every element carrying
   `stroke-dasharray`, compute the elements whose bounding box its geometry crosses, and assert
   contrast ≥ 3 : 1 against each of their fills. `static-carbon-footprint-spread` fails today at
   **1.20**.
2. **`emphasis-is-a-named-mark.test.ts`** — for every beat whose SVG contains an element whose
   stroke or fill is the beat's accent while its siblings carry another, assert the same document
   holds a `<text>` that is not shared furniture — i.e. **the accent and the statement travel
   together.** `map-quake-density` is the only current failure; the guard's value is that it makes
   the class impossible to repeat. This is also what covers the pyramid's E3 case, since a rule that
   strikes a label is an annotation crossing a text node — add the text-node case to guard 1's
   crossing set.

The video half of leg 1 has no committed SVG per frame; it is covered by the render-time assertion
throwing inside `render.mjs`, which is the project's existing proof rung. **Name that limit rather
than pretending otherwise: the video annotation contrast is checked when someone renders, not when
someone runs the suite.**

## The mutation that reddens it

- In a fixed copy, set `static-carbon-footprint-spread`'s median stroke back to `accent` → guard 1
  red, printing `1.20 : 1` and naming the bar.
- Delete the new subject sentence from a fixed `map-quake-density` SVG → guard 2 red, naming the
  accented cell.
- **Both directions for guard 2**: a beat with an accent *and* a sentence must stay green, or the
  guard punishes every correct beat in the corpus.
- For the helper: change the constant from 3 to 1 in one of the 22 `render-still.mjs` copies →
  `render-still-parity.test.ts` red, naming the drifted copy. (Confirms the free ride is real.)

## What B does not close

- **Whether a derived position is a good position.** A pole of inaccessibility puts the label inside
  the country; whether it collides with a neighbour's label is not measured here.
- **Non-dashed annotations.** Guard 1 discovers by `stroke-dasharray`. A solid leader line or a
  hatch is not found. Widen the selector when one ships.
- **The video corpus for leg 1**, as stated above.
- **What the hex grid's sentence should say.** The guard requires a sentence; the beat's author
  writes it, grounded by `claims-grounded-in-data.test.ts`.

## The proof

Re-render `static-carbon-footprint-spread`, `static-swiss-age-pyramid`, `map-quake-density`,
`mapgen-choropleth-video` (still) and `weby-population-pyramid-switzerland`. Open each PNG at 100 %
and look at one thing: **is the annotation legible where it crosses the darkest thing it crosses**,
and **is it attached to what it names**. For the pyramid web, drive Chrome at 375 and 1400 and check
the label sits beside its band at both, carrying its value. For the choropleth still, the label must
sit over Poland's mass, not its upper-right lobe.

---

# C — the hit target is a fixed square at the anchor, not the mark

**B6.14a and B6.18a are one constant.**

## The measured state

`skills/twin-map-web/assets/MapWebSeed.tsx:87` — `const HIT_TARGET_PX = 28;` — duplicated verbatim
at `proof/mapgen-dot-web/DotDensityWeb.tsx:48` and `proof/mapgen-symbol-web/QuakeSymbolWeb.tsx:66`.
The button is positioned at the mark's own anchor by percentage and sized in fixed CSS pixels;
`assets/interaction.mjs:45-56` binds `pointerenter`/`pointermove` to that button and nothing else —
**the drawn mark is never a hit target.**

Measured in Chrome at 1400×900 over `proof/mapgen-symbol-web/quake-symbol.html`: drawn circles are
**49–53 px** across, the hit target is **28 × 28** on the same centre; a probe at the largest
circle's centre shows the tooltip, a probe **4 px inside its right edge** returns `hidden: true`,
and so does 4 px inside its top edge. Over `dot-population.html`: 42 country buttons of 28 × 28 at
country anchors; a probe 60 px inside France — whose polygon is ~120 px across at that width —
returns `hidden: true`.

**The rationale is on record and is sound as far as it goes.**
`skills/twin-map-web/references/map-web-discipline.md:270` and its "Touch and hover share one target"
section: an SVG-scaled hit circle collapses to a few physical pixels at 375 px. The floor is right;
being *only* a floor is the defect.

## The change, per copy

`HIT_TARGET_PX` stops being the size and becomes the **minimum**:

- a sized symbol's target is `max(HIT_TARGET_PX, the mark's own drawn diameter)`, recomputed from the
  same radius scale the mark is drawn with;
- a polygon's target is a real `<path>` hit region on the polygon's own geometry, with
  `pointer-events: fill`, not a square at an anchor;
- the floor stays, and its reasoning stays: at 375 px a small mark still gets 28 px.

Three copies: `skills/twin-map-web/assets/MapWebSeed.tsx`,
`proof/mapgen-dot-web/DotDensityWeb.tsx`, `proof/mapgen-symbol-web/QuakeSymbolWeb.tsx`. Plus the
tuning-knob line at `skills/twin-map-web/SKILL.md:231`, which must stop calling 28 "the diameter".

**Sequencing with W6.** Ruling R1 puts map × web on live MapTiler, where marks become layer features
and hit testing becomes `queryRenderedFeatures`. The rule above is identical in that world —
*the hit region is the mark, with a floor* — and the guard below is unchanged because it probes the
delivered page. **Make this edit inside W6 if W6 lands first; do not make it twice.**

## The walking guard

**Extend `skills/splash-twin/test/interaction-promises-are-kept.test.ts`**, which already walks the
delivered corpus and dispatches real pointers — and which is **blind to this by construction**: its
own header (`:38-44`) says marks are discovered by `data-detail` and probed **at that element's own
centre**, which is the 28 px button's centre and always answers.

The addition: for each probed mark, take the **drawn mark's** bounding box (the SVG element the
`data-detail` button is anchored to, or the feature's rendered extent) and probe **four inset
points** — 4 px inside each edge — requiring an answer wherever the mark is painted. One added
assertion in a file that already launches the browser.

**Every probe coordinate is rounded to an integer.** The file's own header records the measurement:
`page.mouse.move` at a fractional coordinate silently does nothing — x = 65.63 produced no event,
x = 66 produced the hover. An inset point computed as `rect.right - 4` will be fractional on a fluid
layout roughly half the time.

## The mutation that reddens it

Set `HIT_TARGET_PX` back to a flat 28 in a fixed copy of `QuakeSymbolWeb.tsx` → red naming
`mapgen-symbol-web`, the mark, and the inset point that got no answer. Today's tree reddens it
without any mutation at all, on two artifacts, which is the first proof to run.

## What C does not close

- **Overlapping marks.** With targets at the drawn size, `map-quake-symbol`'s superimposed Sunda-arc
  circles will resolve to whichever is on top. That is § F's problem, not this one, and § F is why
  it must not be "solved" by keeping the targets small.
- **Which mark a pointer resolved to.** Blind spot 2 of the existing guard stands: membership in the
  artifact's own `data-detail` set is asserted, exact identity is not.
- **Touch target minimums below 28 px** at other viewports — the guard drives two.

## The proof

Drive `mapgen-symbol-web/quake-symbol.html` and `mapgen-dot-web/dot-population.html` at 1400×900 and
375×812. On the symbol map: probe the largest circle at its centre and 4 px inside each of its four
edges — four answers, all its own reading. On the dot map: probe the middle of France, the middle of
Spain and the middle of the smallest country in the set — each must answer with its own country.
Then, with a screenshot, confirm nothing about the drawing changed.

---

# G — there is no way to hover a line

**B6.9b (a tooltip on the slope's connecting line) and B6.15 (flow/route × web) need the same missing
primitive. Build it once and both close.**

## The measured state

Every web beat's hit surface is either **one `.hit-area` rect** with nearest-by-x resolution
(`skills/twin-chart-web/assets/ChartWebSeed.tsx:548`, `proof/webz-bump-emitter-rank/BumpWeb.tsx:570`,
and twelve more) or **per-point targets** (`proof/web-co2-decline-slope/SlopeWeb.tsx:480,494`; the
`.pt` buttons in every map-web beat). `grep` for `pointerEvents="all"` returns **15 sites** (the
survey said 16 — recount: 14 in `proof/`, 1 in the chart-web seed) and **not one is on a `<path>`,
`<line>` or `<polyline>`.** `proof/web-co2-decline-slope/slope-interaction.mjs:50-60` binds `.pt`
only.

`MATRIX.md` confirms flow/route × web is the single empty cell in the whole matrix — static, video
and scrolly all exist for the Danube, on the same `geo-flow.ts` and the same baked plate.

## The primitive

A **hoverable line**, duplicated into both web genres in the form each needs:

1. **A transparent stroked twin** of the visible path, drawn immediately after it, with a generous
   `stroke-width` (a stated knob — 24 px is the touch-target floor doubled, and it is a knob, not a
   constant hidden in a component), `stroke="transparent"`, `fill="none"`,
   `pointer-events: stroke`, and its own **`data-detail` baked server-side** from the beat's frozen
   data. `pointer-events: stroke` is the load-bearing property: it makes the *stroke* the hit region
   rather than the bounding box, which for a diagonal line is mostly empty space.
2. **A focusable element per line**, because this project holds every interaction to keyboard parity.
   A `<g tabindex="0" role="button" aria-label="…">` wrapping the pair, reachable in reading order.
3. **The reading itself.** For a slope: both ends, the change between them, and the category — *the
   information that links the two ends*, which is exactly what B6.9 asks for and exactly what a
   per-point tooltip cannot say. For a route: the segment's territory, its distance along the
   journey, and its position in the sequence.

Copies: `skills/twin-chart-web/assets/ChartWebSeed.tsx` +
`skills/twin-chart-web/assets/interaction.mjs`, `skills/twin-map-web/assets/MapWebSeed.tsx` +
`assets/interaction.mjs`, then `proof/web-co2-decline-slope/SlopeWeb.tsx` +
`slope-interaction.mjs`. **Two skills, one beat**, and W8's flow/route beat consumes it as the
fourth.

## The companion work in the same beats — the slope's missing axes

Not a hover item, but the same two files and the other half of B6.8/B6.9.
`skills/twin-chart-beat/references/types/slope.md` requires *"Two vertical axes — one per period"*
**by name**, and neither `proof/static-renewables-shift/RenewablesShiftSlope.tsx` nor
`proof/web-co2-decline-slope/SlopeWeb.tsx` draws them — what look like axes in the delivered HTML
(`.y-axis`, `.r-axis`) are label gutters. Draw the two rules, at the two period positions, in the
grid ink. **A type sheet the artifact does not honour, in a project whose own lesson is that prose is
the unguarded surface.**

Guard for that: extend `emphasis-is-a-named-mark`'s walk into a second, narrow assertion over the
committed SVGs — a beat whose type is `slope` must contain two vertical rules at the two period
positions. It is narrow on purpose; a general "the type sheet is honoured" guard is not writable, and
claiming otherwise would be the kind of guard that cannot go red.

## The walking guard

**Extend `interaction-promises-are-kept.test.ts` again**, in the same pass as § C:

- discover **line marks** — an element carrying `data-detail` that is a `<path>`/`<line>`/`<polyline>`
  with `pointer-events: stroke`;
- probe **on the path**, never at its bounding-box centre. The bbox centre of a diagonal line is off
  the line, and a guard that probed there would report a working primitive as broken. Take the
  point from the element itself in the page — `getPointAtLength(getTotalLength() * f)` at
  f = 0.25, 0.5, 0.75 — **rounded to integers** before `page.mouse.move`;
- assert the same five things the existing guard asserts of a point mark: the tooltip appears, it
  carries one of this artifact's own `data-detail` strings, keyboard focus names its own line, the
  tooltip hides nothing, and something answers.

## The mutation that reddens it

Remove `pointer-events: stroke` from the transparent twin in a fixed copy of `SlopeWeb.tsx` → red,
naming the line and the three points along it that got no answer. Second mutation, aimed at the guard
itself: probe at the bbox centre instead of `getPointAtLength` → the guard must go red on a *correct*
artifact, proving the on-path probe is what is doing the work.

## What G does not close

- **B6.18b, the filter that outlives its subject.** After a real click on "Sunda arc",
  `mapgen-symbol-web` shows five circles and the label **"M9.1"** still reads `display:block`,
  floating beside nothing — `render-web.mjs:161-163`'s `:has()` rules narrow `.pt`,
  `circle[data-group]` and the table rows, and `.point-label` is not among them because
  `QuakeSymbolWeb.tsx:246-251` draws it **unconditionally by design**: *"it is the claim, not an
  interaction result."* **Do not fix this by adding `.point-label` to the hide list** — that puts the
  claim behind a control, which the genre forbids. The honest rule is editorial: **a filter must not
  offer an option that excludes the subject** — either the options are "all" plus the subject's own
  group, or the filtered view restates the subject. Recorded here, decided in W6 with the rest of
  B5.3.
- **The flow/route × web beat itself.** That is W8. This spec builds its primitive and says so.
- **Nearest-line resolution when two lines cross.** The transparent twins overlap at a crossing;
  whichever is later in document order wins. Acceptable and stated; a slope chart's crossings are
  where the reader is *most* likely to point, so this is a known residue worth watching in the proof.

## The proof

Drive `proof/web-co2-decline-slope/co2-decline-slope.html` at 1400×900 and 375×812. Hover each of the
six connecting lines at a quarter, a half and three quarters along, including at a crossing: each
must print its own two readings and its change. Tab through the figure: every line reachable, focus
ring visible, the reading announced. Open the static and the web slope side by side and confirm the
two vertical axes are drawn in both.

---

# D — one collision decision baked at the narrowest width

The fluid redesign made geometry stretch continuously while type stays fixed. Every *de-collision*
decision is still computed **once, server-side, at one width** — and that width is the narrowest.

## The measured state

- **B6.1, bump × web.** `proof/webz-bump-emitter-rank/BumpWeb.tsx:286-310`: `narrowestPlotPx` is
  derived from `NARROWEST_VIEWPORT_PX = 375` (`:186`), `pxAt` divides by it, and the year-tick filter
  is `finalTickPx - pxAt(…) >= yearLabelPx + 6`. The comment is explicit: *"2020 and 2024 are four
  columns apart, which is 25 px on the phone frame against a ~26 px label… measured at the narrow
  width above rather than eyeballed at the wide one."* Driven at 1400 px the ticks read
  `1990 1995 2000 2005 2010 2015 2024`, and the 2015→2024 gap measures **311 px** — 2020 would sit
  ~104 px from each neighbour. **The label is dropped at every width to satisfy 375 px.**
- **B6.6, pyramid × web.** Same cause, fixed in § B: the peak label is parked at `0%,0%` because the
  narrow rung has 6 px of room beside the widest bar.
- **B3.3, title width.** `skills/twin-chart-web/scripts/render-web.mjs:240` —
  `.chart-header, .chart-source { max-width: 640px; }` — with a reading-measure argument at
  `:203-208`. One copy, inherited by all 17 fluid chart-web beats. **The map-web genre has no such
  cap**, which is why `dot-population.html`'s title does run full width. So B3.3 is chart-web only,
  and it is a deliberate typographic decision rather than an oversight.

## The change

- **Bump.** Compute the tick collision from the **rendered** container width, not a baked constant.
  The genre is fluid and its own CSS knows the width; the honest form is a CSS-driven decision (a
  container query hiding the tick only below the width where it actually collides) so that no
  JavaScript writes a layout value and the no-JS page still holds a correct axis. If a CSS-only form
  cannot express it, the fallback is to keep the server decision but take it at the width the beat is
  actually delivered at, and to state that the beat is then no longer width-agnostic.
- **Pyramid web.** Covered in § B.
- **B3.3 — a decision, not a defect, and the honest reversal is not "remove the cap."** A 45–75
  character measure is a real typographic rule and full-bleed prose at 3440 px is unreadable. The
  reversal that respects both is **raise the type size with the frame** so the title fills more of
  the width at the same measure — `clamp()` on `--title-size` against the container, with the cap
  expressed in `ch` rather than `px` so it follows the type. Put this in front of the owner as a
  trade with a rendered comparison at 1400 and 3440, not as a task.

## The walking guard

**`fluid-decisions-are-retaken.test.ts`** — walk every delivered chart-web `.html`, drive Chrome at
**375** and **1600**, and read the axis label sequence at each. Assert that the drawn sequence
contains **no interior gap that is an exact multiple of its own modal step and wide enough for a
label**: if the drawn ticks are 1990, 1995, …, 2015, 2024, the modal step is 5, the 2015→2024 gap is
wide enough for two labels, and 2020 is a missing member of the beat's own arithmetic run. That is
computable from the DOM alone — no knowledge of what the beat *could* have drawn, no font metrics
beyond the labels' own measured boxes.

The awkwardness is worth naming: this is not "a copy drifted", it is "a decision was taken in the
wrong coordinate system", and the guard above catches only the axis-label form of it. It is the
tractable piece; the general form is not guardable and pretending otherwise would be a green guard
that proves nothing.

## The mutation that reddens it

Restore the `narrowestPlotPx` divisor in a fixed copy of `BumpWeb.tsx` → red at 1600, naming
`webz-bump-emitter-rank`, the missing 2020 and the 311 px gap. Second direction: a beat whose axis
legitimately has an irregular step (a decade axis with one extra final tick) must stay green — check
`static-bump-emitter-rank`'s and `webx-life-expectancy`'s axes before trusting the rule.

## What D does not close

- **Non-axis de-collision decisions** — a caption's side, a label's parked corner. Only the axis form
  is mechanised.
- **Widths between 375 and 1600.** Two drives, not seven.
- **B3.3**, which stays a decision awaiting the owner.

## The proof

Open `webz-bump-emitter-rank/bump-emitter-rank.html` at **375, 768, 1400 and 3440**. At 375 the axis
must read `1990 … 2015 2024` with no collision; at 1400 and above 2020 must be present and clear of
both neighbours. Screenshot all four and put them side by side — this is a beat the owner looked at
and named.

---

# F — a floor cleared by a hair

**Both items are a threshold that passed while the render failed to read**, which is why neither is
fixable by moving the threshold.

## The measured state

- **B6.13a, dot density × static.** `proof/mapmore-dot-population/render.mjs:33` sets
  `accent:"#0072B2"`. `geo-dot.ts:375-405`'s `assertStudyAreaReadsApart` composites the study tint
  and enforces `MIN_DOT_CONTRAST = 3` (WCAG 2.2 SC 1.4.11). Computed: study land `#CFCFCF`, **dot vs.
  study land 3.33 : 1**, dot vs. the water tint **2.12 : 1**. The guard passes at 3.33 and the render
  does not read. **A 3 : 1 non-text floor was written for a large solid graphical object; a 3 px dot
  in a field of three thousand is a different perceptual problem**, and applying the floor there is
  the "rule applied outside its domain" failure `HANDOVER.md` §10.5 already names three times.
- **B6.17, proportional symbol.** `geo-symbol.ts:117-120`: `scaleSqrt().domain([0, maxMag])`. Over a
  7.8–9.1 magnitude range that gives a drawn-radius ratio of **√(9.1/7.8) = 1.08** — measured, all
  seventeen circles are **49–53 px** across. The beat's own title says it: *"the biggest circle is
  only 2.9 % wider than the next"*, and its subject note says *"The accent, not the size, is what
  identifies it."* **The beat documented a type-fit failure in prose instead of changing the type.**
- **Precedent.** `HANDOVER.md` records the heatmap that rendered as a flat grey slab with *"every
  assertion true and every contrast check passing"*, and concludes: *"no guard exists for
  'technically compliant and visually flat'."* This class is that sentence, twice more.

## The change

**Dot density.** Raise the separation rather than the floor: the honest lever is the study tint, not
the dot. Lighten the tint until the dot clears a **stated, domain-specific** floor for a small mark —
the 3 : 1 SC 1.4.11 number is for a large object and this is not one. Propose **4.5 : 1 for a mark
under 6 px**, argued in the beat's own reference file rather than smuggled into a constant, and
name the source of the argument. The empty bottom band (`DotDensityStill.tsx:11`,
`FRAME = {width:920, height:1140}` with nothing filling the middle) is a **W4** item — export sizes —
and is left there.

**Proportional symbol. This is an editorial decision the code must force, not make.** Three options,
and the arithmetic for each, because the survey's "encode energy instead" is not free:

| option | drawn ratio | smallest mark |
|---|---|---|
| magnitude, `scaleSqrt` from 0 (today) | **1.08** | 49 px — indistinguishable from the largest |
| **energy** (`10^(1.5Δm)`, which `geo-symbol.ts:253-255` already computes) | **9.4×** | ~3 px at a 25 px max radius — a dot, not a sized symbol |
| a different type, or a different subject framing | — | — |

**So the honest correction is not "switch to energy."** It is that a proportional-symbol map cannot
carry this variable at this range, and the beat has to change its type or its variable. The code's
job is to say so loudly instead of letting prose apologise for it.

## The walking guard

**`an-encoding-separates.test.ts`** — over the committed SVGs, for any size-encoded type, measure the
**drawn** extremes and assert **two bounds**, not one:

- `maxDrawn / minDrawn ≥ 2.0` — below that a reader cannot rank marks by size and the encoding is
  decoration. State it as a floor with its argument, in the same voice
  `MIN_DOT_CONTRAST`'s neighbours are stated in;
- `minDrawn ≥ 8 px` diameter — below that a sized symbol is a dot and the size channel has stopped
  carrying anything.

**Both bounds together are the point.** Magnitude fails the first (1.08), energy fails the second
(~3 px). A guard with only the first bound would have accepted the energy switch and shipped an
unreadable small end; a guard with only the second accepts today's tree. Two bounds convert "the
reader cannot tell these apart" into arithmetic the render refuses, and hand the editorial decision
back to the person who has to make it.

## The mutation that reddens it

Today's tree reddens the first bound on `map-quake-symbol` with no mutation. For the second, in a
fixed copy switch `radiusScale` to energy and confirm the guard goes red on the *small* end, naming
the smallest event and its 3 px. For the dot floor: set the tint back to its current value in a
fixed copy → red at 3.33 against the small-mark floor.

## What F does not close

- **"Technically compliant and visually flat" in general.** The two bounds cover a size channel. A
  colour ramp that is technically distinct and perceptually uniform-grey is not covered, and
  `HANDOVER.md` §10.5's precedent stands unguarded. Say so; do not imply otherwise.
- **The overlap itself.** Even with a separating encoding, five Sunda-arc circles sit on top of each
  other. That is a camera and a type decision (W5 and this beat's own editorial choice), not a
  threshold.
- **The dot-density empty band** — W4.

## The proof

Re-render `mapmore-dot-population` and open the PNG at 100 % **and** at 50 % — the second is the test
that matters, because a 3 px dot is judged at the size a reader actually sees a map at. For the
symbol map, whichever option the owner takes: render it and open it, and confirm that a reader can
rank three named circles by size without the legend. If they cannot, the type was the wrong answer
and the guard was right.

---

# The three decisions

## B5.2 — the accessible table. Recommendation: **keep it, shorten it, and do not adopt the accordion.**

The owner asks for **no table, or an accordion**.
`skills/twin-map-web/references/map-web-discipline.md` argues both away in advance and the argument
should be visible before it is set aside:

> A map is a spatial medium, and a screen-reader user has no spatial access to it. … A hover tooltip,
> alone, is not an answer. It requires knowing where on the canvas a value of interest sits *before*
> you can ask for it — exactly the spatial access the question starts by saying is absent. **An
> ordered, readable list of the regions and their values, behind the same markup, is a legitimate
> answer — not a consolation prize, a genuinely complete one.** (`:168-195`, the list item at `:182`)

and, on the disclosure widget specifically (`:228-234`):

> **Rendered plainly and visibly, never behind a toggle or `sr-only` CSS.** A disclosure widget
> ("show data table") adds an extra interaction step for the one reader who most needs the fallback
> not to be optional… **Opt-in at BUILD time by an author who read this section is a different thing
> entirely from opt-in at READ time by the reader who needs it.**

**What the accordion costs, concretely.** A native `<details>/<summary>` is the least-bad form:

1. **One extra interaction for the reader who most needs it.** The sighted reader loses nothing — the
   map is their channel. The screen-reader reader must find and open the disclosure before reaching
   *any* reading.
2. **It is announced, but not as a table.** A closed `<details>` announces a summary, not "table, 42
   rows, 2 columns" — so the reader cannot tell from the announcement that a complete account exists,
   which is exactly what the current design puts in the reading order for free.
3. **Find-in-page.** Content inside a closed `<details>` is skipped by Ctrl-F in several engines.
4. **It does NOT cost self-containment** — native `<details>` needs no script. That is the one thing
   in its favour and it is real.
5. **What it buys** is the layout complaint, which is genuine: `mapgen-hexgrid-web/hex-grid.html`
   puts **156 rows** under a 312-mark map, and `mapgen-dot-web/dot-population.html` measures
   **2092 px of document in a 900 px window**, nearly all of it table.

**Why the third option wins.** The layout complaint's cause is not that a table exists — it is that
the table repeats every row of a dataset whose claim rests on a handful of them. Hexgrid's 156 rows
are not the beat's claim; **one cell** is (`BRIEF.md:33`). A table carrying the beat's argument — the
subject, its comparison, and the ranked span the claim depends on, typically 8–15 rows — costs about
300 px, which is *less* than the accordion buys back on every beat except hexgrid, and it costs the
screen-reader reader nothing. It also forces an editorial decision the beat should be making anyway:
what is the account this beat owes its reader? Two more arguments the survey did not make: a closed
disclosure is also lost to **print** and to a CMS's plain-text extraction; and **ruling R1 sharpens
the asymmetry** — a live MapTiler map that pans and zooms gives the sighted reader more, and the
non-spatial reader exactly the same nothing, so weakening their one channel at the same moment is the
wrong direction.

**The rule to write, and its guard.** The table's rows are a **stated selection**, named in its own
caption ("the ten densest cells, of 156"), never a dump — and a beat whose claim genuinely rests on
the whole set keeps the whole set, visible, with the length answered by a scroll container
(`role="region" tabindex="0" aria-label`), not a disclosure. Mechanically: fail a beat whose table
row count exceeds a stated cap without a caption stating the selection. `map-web-discipline.md:198-234`
must be rewritten in the same voice whichever way this goes, because it currently argues the opposite
of what would ship.

**Honest residue: this is a recommendation, not a ruling.** If the owner takes the accordion anyway,
the least-bad form is a native `<details open>` on desktop widths and closed below a stated width,
with the summary naming the row count so the announcement still carries the information.

## B3.1 — an entrance animation: borrow the vocabulary, do not invent one

**Nothing exists and no rule exists either way.** `grep` for `animation|@keyframes|transition|prefers-reduced-motion`
across both web genres returns three hits, all functional: `skills/twin-chart-web/scripts/render-web.mjs:326`
(a 120 ms transition on the filter pill), `:343` (120 ms on filtered marks), and `verify-web.mjs:699`
waiting past it. `twin-map-web` has none. Neither discipline file contains the word "entrance". So
nothing has to be overturned — which makes this the cheapest item here to get right and the easiest
to get wrong.

**Borrow from two places that already exist.**

- **The vocabulary, from `skills/twin-chart-video/assets/timing.ts`**: six named events in a fixed
  order — `establish · reference · reveal · subject · conclusion · hold` (`EVENT_ORDER`, `:47-55`),
  each documented in one line a non-programmer can read, with `checkTiming` (`:80-119`) enforcing
  that each event begins only once the previous finished. **Reuse the first five and drop `hold`** — a web beat's
  hold is the rest of its life. The journalist edits durations in one object, as `timing.ts` already
  promises.
- **The mechanism, from `skills/twin-scrolly`** (`scripts/render-scrolly.mjs:287-293` and
  `:377-383`, argued at `references/scrolly-discipline.md:440-485`, verified in a driven browser at
  `:481`): a **class toggle**, never a
  value written from time or scroll; the transition is **CSS and time-bounded**; and the animated
  property lives **only** inside `@media (prefers-reduced-motion: no-preference)`, so under `reduce`
  the property does not exist and the change is instant in every engine with no script branching.

**The design.** SSR ships the settled page, exactly as today. A `@keyframes entrance { from { opacity: 0 } }`
runs *to* the settled state, so the settled state is what the element already has. An
`IntersectionObserver` adds one class to the figure root when it enters the viewport; CSS gives each
**layer** its own `animation-delay`, derived from the five named durations. **No JavaScript writes an
opacity.** With no script: no class, no animation, the complete page. Under `reduce`: the animation
property does not exist. Layer order is the argument's order — furniture, then the reference, then
the marks, then the subject, then the conclusion.

**The caution, written into the discipline file at the same time.** `motion-grammar.md:155`'s first
anti-pattern is **"motion added for energy."** An entrance that fades the whole figure in as one
layer is that anti-pattern with a CSS property attached. That is why borrowing the vocabulary matters
rather than inventing one: the vocabulary *is* the requirement that the entrance carry the argument's
order.

**Guard — `web-entrance-is-an-addition.test.ts`**, walking every delivered `.html`:

1. with JavaScript disabled, no element is at opacity 0 — the settled page is complete;
2. under `emulateMediaFeatures({prefers-reduced-motion: reduce})`, every layer's computed opacity is
   exactly 0 or 1 and no `animation-name` resolves;
3. only `opacity` and `transform` are animated — never a layout property;
4. **at least three distinct delays**, or no entrance at all — mechanically refusing the one-layer
   fade;
5. the whole entrance completes within a stated ceiling.

**Mutations:** remove the `@media (prefers-reduced-motion: no-preference)` wrapper → assertion 2 red.
Collapse the layers to one delay → assertion 4 red. Set a layer's settled opacity to 0 in the SSR'd
markup → assertion 1 red.

**Residue:** the guard cannot judge whether the order chosen *is* the argument's order — that is a
person watching it once, which is what the video genre also relies on.

---

# The residue this whole spec leaves

- **The two-rung map-web beats will be touched again by W6.** Ported anyway (§ E), guarded so the
  port survives.
- **Video annotation contrast** is checked at render time, not in the suite (§ B).
- **"Technically compliant and visually flat"** stays unguarded outside a size channel (§ F).
- **B3.3's title measure** is a decision awaiting the owner, with a rendered comparison to look at.
- **B6.18b**, the filter that outlives its subject, is recorded in § G and decided in W6.
- **The dot-density empty band** and every export-size question belong to W4.
- **Frames outside the sampled windows**, marks between the three probed per artifact, and widths
  between the two driven — each guard's own blind spots, named in its section rather than collected
  here, because a blind spot is only useful next to the guard that has it.

# The order of work

1. **A0** — the SSR instrument and the ten missing props files. Everything in § A waits on the spike;
   if the spike fails, stop and re-decide rather than shipping a text-parity guard.
2. **A** — write the guard, watch thirteen sites go red, fix them one at a time.
3. **E** — four fluid ports, three renderer options, one spine mask; three walking guards.
4. **B** — the contrast helper into 22 `render-still.mjs` copies (free-riding the existing walking
   parity guard), four derived positions, two SVG-walking guards.
5. **C and G together** — one pass over `interaction-promises-are-kept.test.ts`, two additions: the
   edge probe and the on-path probe. Sequence C's map half with W6.
6. **D**, then **F** — the two smallest, and the two where the guard matters more than the fix.
7. **B3.1** and the **B5.2 decision** — after the owner has ruled on the table, because the guard in
   § E2 has to know what it is enforcing.
