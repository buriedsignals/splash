# W4 — Three export sizes, and web as a range. **Charts only.**

Spec against `experiment/doctrine-twin`, 2026-08-10. Closes **B2.1** (produce at portrait, square,
landscape) and **B3.2** (genuinely responsive, with a mobile form) **for the chart genres**, under
the owner's binding ruling **R2**.

Built on `survey/export-sizes.md`. That survey's finding work is not redone here; where a line
number differs from the survey's it is because I re-measured it, and the re-measured one is used.

> **REVISED 2026-08-10, after Task 0 ran.** The probe answered question 4 **TRUE**, which this spec
> says stops Task 1 until it is revised. It is revised: §2's `typeScale` table gains the finding
> that a beat's *spacing* literals are as much 900×560 tuning as its font sizes are; §4 Task 3's
> token list and its cost estimate change; §6 gains a residue the probe found and no measurement in
> it caught. Evidence: `proof/static-carbon-footprint-spread/probe/` — `MEASUREMENTS.md` (generated)
> and `VERDICT.md` (what a person saw). The sequencing below survives unchanged.

## Scope, and the half that is not mine

**Mine:** `chart-beat` (17 chart statics), `chart-video` (19 chart videos),
`chart-web` (18 chart webs), `dw-beat` (1 call site), and the `size` field in the
journey. Plus one free rider, `image-beat`, argued in Task 8.

**Not mine — the map half.** R2 settles the geo rule 12 tension by making the target aspect *an
input the camera takes* (`FEEDBACK-2026-08-10.md:144-148`), which means every map size decision is
a camera decision. `survey/map-camera.md:281-311` already owns it (§2.7, "the cross-cutting one:
aspect ratio, and its collision with B2.1") and its §5 arrives at the same conclusion from the web
side. **The 6 map statics, 6 map videos and 5 map webs are W5's, and the three un-retrofitted
map-web beats are W6's** (Task 7 argues why). This spec does not duplicate a line of it. What W5
inherits from here is the `SIZES` table shape and its walking guard (Task 1), which is written to be
copied into `map-beat` and `map-web` unchanged.

`scrolly` is out: a scrolly has no export size, and it already models size as an envelope
(`ScrollySeed.tsx:150`, `safeBand()` at `:164-181`) — its size problem is B5.1, a different axis.

---

## 1. The measured state

### 1a. Size is stated twice and derived nowhere

**Static.** The frame is a module constant in the component and a pair of literals in the render
script, and `renderStill` throws if they disagree:

```
skills/chart-beat/assets/ChartSeed.tsx:25          const FRAME = { width: 900, height: 560 };
proof/static-carbon-footprint-spread/render.mjs:85-86   width: 900, height: 560,
skills/chart-beat/scripts/render-still.mjs:196-206 renderStill({…width, height…}) → throws
                                                        "asked to render at WxH, but the element is drawn at W'xH'"
```

That throw is not an obstacle. It is the seam's contract stated in the negative — *the element
decides the size and the rasteriser obeys* — and it is why `renderStill` needs **no change at all**
for three sizes. The component does.

**Video.** Stated twice with **nothing between them**:

```
skills/chart-video/assets/Root.tsx:40-41            width={1080} height={1080}
skills/chart-video/assets/EmissionsVideo.tsx:42     const FRAME = { width: 1080, height: 1080 };
skills/chart-video/assets/EmissionsVideo.tsx:239    const { fps } = useVideoConfig();
```

Line 239 is the whole of the video chantier: `useVideoConfig()` already returns `{width, height}`
and every one of the 19 chart-video beats destructures only `fps` from it. There is no guard today
that the `FRAME` constant and the `<Composition>` agree — measured: no test under
`skills/splash/test/` mentions `Root.tsx` or `Composition`.

**Counts, re-measured 2026-08-10** (`proof/`, 76 beat directories):

| genre | beats | of which map (→ W5/W6) | **mine** |
|---|---|---|---|
| static (`render.mjs` calling `renderStill`) | 23 | 6 | **17** |
| video (`Root.tsx`) | 25 | 6 | **19** |
| web (`render-web.mjs`) | 23 | 5 | **18** |

**Every `const FRAME` in `proof/`, by value:** 21× `1080×1080`, 15× `900×560`, 3× `1080×1350`, and
one each of `960×780`, `920×1140`, `900×860`, `900×820`, `900×800`, `900×760`, `900×720`, `900×620`,
`900×1000`, `1080×900`, `1080×1440`. Read plainly: **the twin fixes WIDTH and lets height follow the
content.** R2 asks for the inverse — both dimensions pinned, content made to fit. That inversion is
the work; the plumbing is not.

The video corpus already ships three aspect ratios (1:1, 4:5, 3:4) — each hand-tuned in its own
component, **none of them selectable**.

### 1b. The delivered pixels are not the declared frame

`render-still.mjs:216-219` rasterises `fitTo: { mode: "width", value: width * 2 }`. So a 900×560
element ships an 1800×1120 PNG. **No static artifact in the tree is at a canonical export size**,
and 900×560 is an aspect of 1.607 — neither 16:9 nor anything a platform asks for.

### 1c. Web already has most of B3.2, and names its own gap

`skills/chart-web/assets/ChartWebSeed.tsx:615-629` — `FRAME: WebFrame` is documented at
`:84-90` as *"NOT a rendered pixel size and NOT a cap"*; its only rendered consequence is
`aspectRatio: ${totalWidth} / ${totalHeight}` (`:428`). Everything else is CSS: `width: 100%` with no
cap on the chart chain, `FRAME_PAD_PX = 24`, `max-height: 100dvh`, `PLOT_FLOOR_PX = 120`
(`scripts/render-web.mjs:170, 181, 216-236`). `scripts/verify-web.mjs:62-70` drives real Chrome at
**seven viewports** including 3440×900 and 375×812, and is mutation-proven
(`web-discipline.md:467-478`).

The genre's own last word is the honest one (`web-discipline.md:242-245`): *"At 375 × 812 the seed
still renders a 153px plot in an 812px window… Fitting and filling are two different rules; only the
first is settled here."*

### 1d. Two obstacles, measured

**(i) Two assertions forbid the mechanism rather than the pattern.**

```
skills/chart-web/test/seed-fluid-frame.test.ts:127   expect(css).not.toContain("@media");
skills/chart-web/test/seed-fluid-frame.test.ts:323   expect(css).not.toContain("@media");   // inside the @supports test
```

They encode a correct overturned decision (no fixed rungs) stated too broadly. What they mean to
forbid is *a second pre-rendered layout swapped by a query*. Left as written, whoever implements
B3.2 deletes them — and a guard deleted is the failure mode `HANDOVER.md:725-729` documents.

**(ii) One chart-web beat never got the fluid frame.** `proof/more-heatmap-co2-per-capita-decades/`
still carries `NARROW_LAYOUT` + `@media (max-width: …)` + `.chart-figure { max-width: 900px }`
(`render-web.mjs:245, 251-265`; `Co2HeatmapWeb.tsx:50, 68`). Measured by
`survey/web-genre-and-specifics.md:347-350`: 645 px of heatmap in a 1400 px window. **That is B6.2
exactly** — not a heatmap bug, an un-retrofitted beat. Three map-web beats are in the same state.

### 1e. Size is nowhere in the journey

`checkStoryboard` (`skills/storyboard/scripts/storyboard.mjs:105-161`) validates
`id / proves / medium / genre / candidates / chosen`. `where.mjs`'s independent reading
(`skills/splash/scripts/where.mjs:116-141`) checks the same fields. **Neither knows the word
"size."** `genre-catalog.mjs:21-25` carries three rows with no aspect anywhere. The size *is*
recorded today — in prose, in `BRIEF.md`, checked by nothing
(`proof/static-carbon-footprint-spread/BRIEF.md:3` — *"Channel: article web, 900 x 560"*). That is
the handover's *"prose is the unguarded surface"* lesson arriving on this axis.

### 1f. What the original Splash proves, as evidence and not as an import

The twin may not import from `skills/` at the repository root. What it may take is the *shape*:
`interactiveAspect: "responsive"` on every channel row (`lib/core/channel-policy.ts:28…71`) is the
original having reached R2's conclusion from the other end — **web has no export size, it has a
range**; a produce-time `assertRenderedSize` that throws (`skills/splash/src/channel.ts:62-77`); and
fail-closed on an unknown channel, because the permissive value is the dangerous default.

What it must **not** take, and every one of these is a rule below: one `scale: 1.7` shared by square
*and* portrait (`skills/chart-native/remotion/src/Root.tsx:50-74`); `estimateHeaderPx` laying out
type from `CHAR_WIDTH_RATIO = 0.52` plus a half-line "safety buffer"
(`skills/chart-native/src/core/format.ts:74, 89-117`) — guessing with a decimal point on it, which is
the exact defect `measureText` exists to remove; and **the landscape case exempted from its own size
assertion** (`skills/chart-native/scripts/produce.mjs:352-368`), so the contract holds for two of
three sizes and the default is the unenforced one.

---

## 2. The decision, stated before anything is built

### The table

```js
// skills/<craft-skill>/scripts/sizes.mjs — carried, never imported. One copy per craft skill.
export const SIZES = {
  landscape: { width: 1920, height: 1080, typeScale: … },
  square:    { width: 1080, height: 1080, typeScale: … },
  portrait:  { width: 1080, height: 1920, typeScale: … },
};

export function sizeFor(name) { … }   // throws, naming the three it knows
```

**Names and pixels come from R2 read literally**: landscape for YouTube and article web (16:9),
portrait for stories (9:16), square for social posts (1:1). All six dimensions are even — the
original's `tolerancePx` trap (`channel.ts:53-61`, article-web's odd 675 against a 2× rasteriser)
does not arise, and *"every dimension is even"* becomes a rule any future row must satisfy.

**`typeScale` is per size AND per craft skill, and the guard must not compare it.** The evidence is
this project drawing one chart type twice:

| | `static-diverging-bar…`, 900×1000 | `vidz-diverging-bar…`, 1080×1350 | ratio |
|---|---|---|---|
| frame width | 900 | 1080 | **1.20×** |
| `PAD` | 40 (`DivergingBarChange.tsx:64`) | 72 (`DivergingBarVideo.tsx:53`) | **1.80×** |
| title `fontSize` | 24 (`:66`) | 38 (`:56`) | **1.58×** |
| axis tick | 13 (`:70`) | 17 (`:60`) | **1.31×** |

Nothing scales at the frame's own 1.20×. A video types larger because it is watched small on a
phone; a static types smaller because it sits in an article at reading distance. **A single scale
number cannot express this** — which is precisely what the original tries. So `chart-beat`'s
`square` row and `chart-video`'s `square` row will carry the **same** `width`/`height` and
**different** `typeScale`, deliberately, and the parity guard compares dimensions only.

**A `typeScale` scales SPACING, not only type — the probe's correction.** The seven named
constants (`PAD`, `TITLE`, `SUBTITLE`, `SOURCE`, `AXIS`, `AXIS_TITLE`, `NOTE`) are not the whole of
a beat's 900×560 tuning. `static-carbon-footprint-spread` — the simplest static in the corpus, no
packing, no bespoke collision code — carries **eleven further bare literals** inside its layout
arithmetic (`+ 28`/`+ 22`/`+ 34` between header blocks, `+ 8`/`+ 24`/`+ 6`/`+ 10` inside `padding`,
`+ 20`/`+ 4`/`+ 16`/`− 10` at the marks). Scaling the type and not those literals is what collided
the title into the subtitle at 1920×1080 on the probe's first run, by 1634 × 4.5 px. So the row's
`typeScale` is applied through one rounding helper to **every spacing number in the file**, and
"parameterise the type tokens" is the wrong instruction. Detail:
`proof/static-carbon-footprint-spread/probe/VERDICT.md`.

### The rasteriser question, SETTLED by Task 0

**The frame IS the export size, rasterised 1:1. `rasterise`'s `× 2` (`render-still.mjs:216-219`)
goes, and with it the tuning-knob row *"How closely the still survives being looked at | 2"*.**

Measured, not argued: `probe-landscape.png` (1920×1080 frame at 1×) and `probe-landscape-half2x.png`
(960×540 frame at 2×) are both 1920×1080 and their **type is indistinguishable** — resvg is a vector
rasteriser, so the crispness argument for 2× does not survive contact with it. What separates them is
that at 2× **every `strokeWidth` and `strokeDasharray` doubles**: a component asking for a 1px
gridline is delivered a 2px one, and a `"6 4"` dash arrives as `"12 8"`. The rasteriser was taking a
design decision the component believed it had taken.

*The losing option, recorded:* halved frames (960×540 / 540×540 / 540×960) at 2×. Same pixel count,
same text quality, and it would have kept the existing type tokens nearer their tuned values. It
loses because hairlines stop being hairlines. This paragraph goes into `static-discipline.md`
verbatim at Task 1. What is **not** allowed is shipping both.

### No `allowedFormats` on this table

Which genres exist is already `genre-catalog.mjs`'s job. Size must not learn a second question —
that is how the original ended up with one table that both sizes and gates.

### Why the table is carried, not shared — argued, not assumed

The branch forbids a shared module (`no-cross-skill-imports.test.ts:1-12`). Three reasons this
particular fact belongs in the carried form rather than earning an exception:

1. It is **data of the same kind and size as `GENRE_CATALOG`** (three rows), which this project
   *already* duplicates deliberately between `storyboard` and `deliver` and cross-checks
   by test (`genre-catalog.mjs:8-20`; `genre-shippability.test.ts`, both directions). The precedent
   is not merely available, it is the identical shape of fact with the identical guard.
2. The copies are cheap to guard **now**: `render-still-parity.test.ts` and
   `video-helper-parity.test.ts` walk the tree, so a new copy is guarded the moment it lands.
3. `typeScale` is *supposed* to differ per skill. A shared module would have to be parameterised by
   caller to express that, at which point it is no longer a table.

The genuine risk, named: a judgement that drifts across copies is worse than a constant that drifts,
because a wrong scale is not wrong-*looking* in any single copy. That is why Task 1 lands the guard
**with the first copy, not the third** — and why the guard walks, never lists
(`video-helper-parity.test.ts:10-20`: the hand-written list turned red for a correct change and kept
a dead export alive).

### The blind spot this exposes in the existing walker

`render-still-parity.test.ts` states it in its own header, item 2: *"A drift in module-level
CONSTANTS … are not compared."* So putting `SIZES` inside `render-still.mjs` would put it in the one
place the existing walker provably cannot see. **It gets its own file and its own walker.**

---

## 3. Sequencing

Cheapest-to-dearest, with the two ordering constraints that are not about cost.

| # | Task | Depends on | Cost |
|---|---|---|---|
| **0** | **The probe: one histogram at three sizes, looked at** | — | half a day; **blocks 1-4** |
| 1 | `SIZES` + `sizeFor` + the walking guard, in `chart-beat` only | 0 | low |
| 2 | Video: `useVideoConfig()`, three `<Composition>`s, a real rendered-size throw | 1 | low mechanically, 3× render time |
| 3 | Static: `FRAME` → `sizeFor(name)`, type **and spacing** tokens from `typeScale` | 1 | **high** — revised up by Task 0; ~11 spacing literals per beat on the simplest type, plus a per-type portrait aspect decision |
| 4 | `dw-beat`: one call site | 1 | near zero |
| 5 | **Narrow the two `no @media` assertions** — its own commit, its own reasoning | — | low |
| 6 | Web: the fill rule (`--plot-aspect`) + per-size content decisions | 5 | low mechanically, medium editorially |
| 7 | Retrofit `more-heatmap-co2-per-capita-decades` onto the fluid frame | 5 | low; **do before 6 or 6 is done twice** |
| 8 | `image-beat` free rider | 1 | near zero |
| 9 | `size` in the storyboard slot + both gate readings + parity, **one commit** | W1's fix | low |

**Constraint A — Task 0 blocks 1-4.** The survey rendered nothing; its bucket assignments are
reasoning from source, and this project's record on that is `HANDOVER.md:668-681` (a heatmap that
rendered as a flat grey slab with every assertion green). No `typeScale` number may be typed before
a picture is looked at.

**Constraint B — Task 9 waits on W1.** Adding a field to the storyboard slot touches
`checkStoryboard` **and** `where.mjs`'s independent reading. The two gates already diverged once
(`FEEDBACK-2026-08-10.md:38`), W1 owns that fix, and landing a new field in the old shape hands the
project its next A14. Task 9 is written to whatever shape W1 lands, in **one commit**, extending the
parity test in the same commit.

Task 7 before Task 6 for a smaller reason that is still a real one: the heatmap cannot receive a
narrow-form fill rule until it is on the fluid frame at all, so doing it later means doing it twice.

---

## 4. The change, per craft skill, file by file

### Task 0 — the probe. **RUN 2026-08-10. Findings below; artifacts in `probe/`.**

Ran as written. Five answers, in
`proof/static-carbon-footprint-spread/probe/{MEASUREMENTS.md,VERDICT.md}`:

1. **Clipping / collisions:** 0 / 0 at all three sizes — *after* the eleven spacing literals were
   scaled. Before that, 2 collisions at landscape.
2. **Plot fill:** 51% / 71.9% / 84.2% (landscape / square / portrait) against the base's 55% and the
   original Splash's ~47%-before / ~63%-after. **No `boostPlotAspect` is needed.** The survey's
   hypothesis — that portrait would come back starved — is refuted; it comes back the opposite.
3. **Did the gutters and the wrapped title re-derive with no edit?** **Split.** Yes for everything
   through `measureText` (`wrap()` re-flowed at every width; `padding.left` re-derived from the
   widest tick label at its own new size). No for the eleven bare spacing literals.
4. **Anything outside {typeScale, tick hints, collision thresholds}?** **TRUE**, on those literals —
   which is why this spec carries a revision banner. Nothing beyond them: no bespoke label placement
   moved, no annotation was re-anchored.
5. **Rasteriser:** settled at 1× — see §2.

**The one finding no measurement in this task caught, and it is the important one.** Portrait comes
back with zero clipping, zero collisions and 84% plot fill, and it is a **bad chart**: the plot's
aspect goes from 2.35:1 to **0.54:1** and the tallest bar from 4.2:1 to **18.4:1**, so a right-skewed
distribution becomes one enormous grey column beside nine slivers. A histogram's argument IS a shape,
and shape is an aspect ratio. This is `web-discipline.md:247-273`'s `preserveAspectRatio="none"`
lesson — *a non-uniform scale distorts any mark whose shape is the argument* — arriving on the
static path the moment the frame stops being fixed, where nobody had looked for it. It becomes a
residue in §6 with a trigger, not a silent absorption.

### Task 0 — the probe, as originally specified

Take `proof/static-carbon-footprint-spread` — a simple histogram, buckets A+B only, no packing and
no bespoke collision code. Draw it at **1920×1080**, **1080×1080** and **1080×1920** with a
hand-picked type scale, into `proof/static-carbon-footprint-spread/probe/`, and **look at all
three.** Keep the PNGs; they are the evidence the table's numbers rest on.

**What it must measure, mechanically, not by impression:**

1. **Clipping and collision count.** For each size, walk the rendered SVG's `<text>` runs, measure
   each with `measureText` at its own drawn `font-size`, and count (a) runs whose ink box crosses the
   frame edge, (b) pairs of runs on the same baseline band whose boxes overlap. Expected zero at
   landscape; a non-zero count at portrait is C2/C4 and tells you the tick hint and the collision
   thresholds must be per-size values, which is the survey's hypothesis.
2. **Plot fill.** The fraction of frame height the plot rectangle occupies at each size. The original
   Splash measured its own equivalent at ~47% before a headroom factor and ~63% after
   (`skills/chart-native/src/core/format.ts:132-139`). A twin portrait that comes back at 40% is a
   small landscape island in a sea of margin, and Task 3 needs a `boostPlotAspect`-shaped answer
   rather than a `typeScale`.
3. **Did the measured gutters and the wrapped title re-derive with no edit?** Yes/no, recorded. This
   is the survey's bucket-B claim and the twin's whole advantage. If no, every cost estimate below
   is wrong.
4. **Did anything outside `{typeScale, tick hints, collision thresholds}` need editing?** A boolean,
   recorded in the beat's `BRIEF.md`. If true, stop and revise this spec before Task 1.
5. **Rasteriser: does the type read at the delivered pixel size?** Render the winning candidate both
   ways (frame = export size at 1×, and half-frame at 2×) and compare. This is the decision §2 defers
   to here.

**Failure is a legitimate outcome.** If the probe shows the histogram needs real re-layout at
portrait, the honest answer is that Task 3 costs more than "medium-high" and the spec says so before
17 beats are opened.

### Task 1 — the table and its walker

| file | change | copies |
|---|---|---|
| `skills/chart-beat/scripts/sizes.mjs` | **new.** `SIZES` (three rows) + `sizeFor(name)` which **throws naming the three names it knows** when handed anything else — the `readPalette` precedent (`render-still.mjs:98-123` throws naming every directory it searched rather than defaulting). A chart silently produced at a size nobody chose looks deliberate. | 1 of an eventual 5 |
| `shared/chart-beat/sizes.mjs` | **new**, mirror. `proof/` beats consume craft helpers through the `#shared/*` alias (`package.json:5-7`; 121 files under `proof/` import it), so the beat-facing copy must exist or every render script reaches across a skill boundary. | mirror |
| `skills/chart-beat/SKILL.md` | Tuning-knob rows. `| The frame the seed draws in | 900 × 560 | FRAME, ChartSeed.tsx |` becomes the `SIZES` row, and the `2` raster row goes or stays per Task 0. **Not optional:** `skill-md-matches-code.test.ts` checks a tuning-knob constant exists in the file its row names, and turns red otherwise. | 1 |
| `skills/doctrine/references/static-discipline.md` | Record the decision, the losing option and why — including the rasteriser choice. | 1 |

### Task 2 — video (the cheapest real delivery)

| file | change | copies |
|---|---|---|
| `skills/chart-video/assets/EmissionsVideo.tsx:42, 239` | Delete `const FRAME`. `const { fps, width, height } = useVideoConfig();`. `PAD` and the type tokens derive from a `typeScale` prop. | **19 chart-video beats**, identically |
| `skills/chart-video/assets/Root.tsx:33-44` | Three `<Composition>`s from `SIZES`, ids `<beat>-landscape` / `-square` / `-portrait`, each passing its row's `typeScale` in `defaultProps`. Remotion registers extra compositions for free. | **19**, identically |
| `skills/chart-video/scripts/render-video.mjs:92-116` | Takes a size name, renders `${BEAT}-${size}`, and **after the mp4 exists, reads its real dimensions with `ffprobe` and throws** if they differ from the row. This is the twin's `assertRenderedSize` — the thing the static path has via `renderStill`'s throw and the video path has never had. **It holds for all three sizes**; the original exempting landscape (`produce.mjs:352-368`) is the mistake being avoided, not the model. | **19** |
| `skills/chart-video/scripts/sizes.mjs` + `shared/chart-video/sizes.mjs` | the second copy of the table — same dimensions, **its own `typeScale`** | 2 |

`ffprobe` is available: `video-first-frame-not-empty.test.ts` already drives `ffmpeg` over every
`.mp4` under `proof/`.

### Task 3 — static (the dear one, and the cost is the looking)

| file | change | copies |
|---|---|---|
| `skills/chart-beat/assets/ChartSeed.tsx:25, 21-30, 37, 43` | `const FRAME` → `const { width, height, typeScale } = sizeFor(size)`, where `size` is a prop. `PAD`, `TITLE`, `SOURCE`, `AXIS`, `LABEL` become integer-rounded functions of `typeScale` (integers, so `measureText`'s cache keys stay stable) — **and so does every bare spacing literal in the layout arithmetic**, through one `sp(v) = Math.round(v * typeScale)` helper. Task 0 measured eleven of those in the corpus's *simplest* static; leaving them at their 900×560 value while the type grows is what collides the header. `Y_TICK_HINT`/`X_TICK_HINT` become per-size values on the row. | **17 chart-static beats** |
| each beat's `render.mjs` (e.g. `proof/static-carbon-footprint-spread/render.mjs:85-86`) | `renderStill({ element, ...sizeFor(name), outDir, name })` — **one statement of the size instead of two**, which kills survey finding #1 at its source. `renderStill` itself is **unchanged**; its throw becomes the backstop it was written to be rather than the thing that has to agree with a literal. | 17 |
| `proof/static-small-multiples-solar-eu-six/SolarSmallMultiples.tsx:41` | `const COLUMNS = 3` → chosen from the size's aspect: 3×2 at landscape, 2×3 at portrait. **The beat asks the size for its dimensions and decides its own packing** — `SIZES` must not learn how many columns a six-panel grid takes, or it stops being a table. Same shape for the heatmap and any other packing type. | per beat |

**On "REPLACE ME. Do not parameterise me"** (`ChartSeed.tsx:1-11`) — adding `size` does not violate
it, and the distinction matters enough to write down. What that header forbids is a `variant` prop
that turns one seed into a component library: a variant selects **a different chart**. A size selects
**the canvas the same chart is drawn on**, and it is an externally recorded decision from
`STORYBOARD.md`, exactly like the palette the seed already reads. The precedent is `readPalette`,
including its failure mode.

### Task 4 — `dw-beat`

One call site: `skills/dw-beat/scripts/dw-client.mjs:58` already takes
`{ width = 900, height, zoom = 2 }` and Datawrapper re-lays out server-side. Pass the row. Then
**measure once** what Datawrapper actually returns for each size and pin the returned IHDR against
it; do not assume it honours `height`. The table's copy here carries dimensions and needs no
`typeScale` (nothing local lays out type) — which the guard must tolerate (§5).

### Task 5 — narrow the two assertions. **Its own commit.**

`skills/chart-web/test/seed-fluid-frame.test.ts:127` and `:323`. Replace
`expect(css).not.toContain("@media")` with assertions on the **pattern**, and write the reasoning
into the test's own header in the shape this suite uses:

1. **At most one `@media (max-width: …)` block.** A second rung is a rung.
2. **No `@media` rule may carry `display: none`, `visibility: hidden` or `max-width` on
   `.chart-figure`, `.chart-plot`, or any mark layer.** That is the two-rung defect and the cap
   defect, named as patterns.
3. **`display: none` under `@media` is permitted only on an explicit allowlist of tick-label
   classes.** Dropping alternate x-tick labels on a phone removes a redundant scale reading;
   **nothing that carries a value may be hidden**, ever.
4. `:323`'s clause keeps its real meaning: the `@supports` block contains no `@media` — a capability
   query is not a rung.

This is a **narrowing with a written reason**, not a deletion. Landing it separately is what makes
that legible in the log.

### Task 6 — the web fill rule

| file | change |
|---|---|
| `skills/chart-web/assets/ChartWebSeed.tsx:615-629` | `WebFrame` gains a narrow-form aspect and narrow-form `yTickHint`/`xTickHint`. **No `SIZES` table here** — R2 is explicit that web is a range, not a fourth size, and the container is the CMS's. |
| `skills/chart-web/scripts/render-web.mjs:216-236` | The one `@media (max-width: …)` permitted by Task 5, setting `--plot-aspect` to the narrow value so a portrait window is **filled**, not merely fitted, plus the allowlisted tick-label drop. |
| `skills/chart-web/scripts/verify-web.mjs:62-70` | A new assertion at the phone viewport: the figure's height clears a floor as a fraction of the window. **The number comes from a measurement, not a guess** — today's measured baseline is a 153px plot in an 812px window (`web-discipline.md:242-245`); measure after the rule and pin what is achieved. |
| 18 chart-web beats | re-driven through `verify-web.mjs`, seven viewports each. |

**Inherited rule, not re-litigated:** `preserveAspectRatio="none"` is a non-uniform scale and
distorts any mark whose SHAPE is the argument — a scatter dot, a proportional circle
(`web-discipline.md:247-273`). A different narrow aspect makes that distortion *larger*. Any beat
whose marks are shape-carrying keeps them in the HTML layer at a fixed size, which is already the
stated remedy and already in use.

### Task 7 — the retrofit, and who owns it

**I take `proof/more-heatmap-co2-per-capita-decades`.** It is the only chart-web beat off the fluid
frame (`render-web.mjs:245, 251-265`; `Co2HeatmapWeb.tsx:50, 68`), it is B6.2 outright, and its
two-rung `@media` is *the exact thing* Task 5's narrowed assertion describes. An assertion that lands
green against a tree still containing the defect it names is an assertion nobody trusts. It also
cannot receive Task 6's fill rule until it is on the fluid frame, so any other owner means the work
is done twice.

**W6 takes the three map-web beats** (`mapgen-choropleth-web`, `mapgen-hexgrid-web`,
`mapgen-locator-web`). Not W2, and the reason is not tidiness: **R1 replaces a baked plate with live
MapTiler and its native zoom/pan**, which rewrites those beats' layout wholesale. Retrofitting them
onto the fluid frame first would be building the layout that R1 then throws away. W2 owns making the
*seed* right so the defect stops regenerating; W6 owns these three copies because it is already
inside them.

**Offered to W2, taken here only if W2 declines:** a walking guard for the general class —
`every-web-beat-is-on-the-seed.test.ts`, which walks `proof/*/render-web.mjs` and asserts each either
imports the skill's `renderWeb` or, carrying its own renderer, contains no `max-width` on
`.chart-figure`/`.map-figure`. This is the mechanical answer to
`survey/web-genre-and-specifics.md:29-30`'s class E (*"reached the skill and some copies … guard:
none"*), and it belongs with whoever owns seed-to-copy parity. **W2 decides; if W2's spec does not
claim it, Task 7 ships it.** It stays red until Task 7 and W6 both land, which is correct — a guard
that describes the tree's real state is doing its job.

### Task 8 — `image-beat`, the free rider

Not a chart, and nobody else owns it. It costs almost nothing and excluding it leaves the `SIZES`
family with a gap in the one skill that already has the placement primitive: `ImageBeatSeed.tsx:48`
fixes only `FRAME_WIDTH = 900` and derives its height (`:158`), and `render-still.mjs:254-267`'s
`fitBox` already does uniform scale with centring offsets. The change is `FRAME_WIDTH` →
`sizeFor(name).width` and `BOX_HEIGHT = 420` (`:56`) derived from the size. It does not wait on W5
because a photograph has no camera. **Last, and droppable** if Task 3 overruns.

### Task 9 — the journey. **One commit. After W1.**

| file | change |
|---|---|
| `skills/storyboard/scripts/storyboard.mjs:105-161` | The slot gains `size:`. `checkStoryboard` refuses: a `size` the toolchain does not know (naming the three); `genre: static` or `video` with **no** size; and `genre: web` **with** a size — *web takes no size, it fills its container*, which is R2 written as a check. Shaped exactly like the existing `if (slot.genre) { const gap = genreGap(…) }` at `:147-150`. |
| `skills/splash/scripts/where.mjs:116-141` | `missingForGate2` learns the same rule **independently**, its text copied verbatim so a text comparison can hold the two readings together. |
| `skills/splash/test/where.test.ts` + the cross-check | extended **in the same commit**. |
| each beat's `BRIEF.md` | the prose line stops being the only record. |

The rule *"web takes no size"* is R2's own sentence and it is also the original's
`interactiveAspect: "responsive"` insight reached independently — which is the strongest evidence
available that the model is right, and precisely why the twin states it as a check rather than
importing it as a derivation. Note the ordering difference deliberately kept: the original picks a
channel and **derives** the allowed formats; A5 asks for medium → genre → size, so the twin **checks**
the triple after the journalist has chosen it. `genreGap` already has that shape.

---

## 5. The walking guard, and the mutation that reddens it

**`skills/splash/test/size-table-parity.test.ts`** — new.

It **walks**, it never lists: `findAll(TWIN, "sizes.mjs")`, the same shape as
`render-still-parity.test.ts:68-76`, so a copy added in Task 8 is guarded the moment it lands with
nobody wiring it up. It reads each copy by **dynamic `import()`** rather than parsing text — a table
is data, and the test-only cross-skill read is the exception `genre-shippability.test.ts:1-8` already
reserves for exactly this.

**What it asserts:**

1. **The premise, pinned rather than assumed** — `chart-beat`'s copy exists and carries exactly
   the three rows `landscape`, `square`, `portrait`. Without this, every comparison below can go
   vacuously green (`render-still-parity.test.ts:152-163` states the same discipline).
2. **The walk finds at least as many copies as the tree has craft skills using the table.**
3. **Every copy carries the identical SET of row names.** A fourth row in one copy is drift.
4. **Every copy's `width` and `height` agree, per row, with the canonical copy.**
5. **`typeScale` is NOT compared** — and the header says so in full, as this suite's convention
   demands, with the diverging-bar measurement (1.20× frame → 1.58× title → 1.80× pad) as the reason.
   A guard that forced static and video to share a type scale would force exactly the original's
   `scale: 1.7` defect, where square and portrait share a number that cannot be right for both.
6. **A row's `typeScale`, where present, is a finite positive number** — the shape is checked even
   though the value is not. `dw-beat`'s copy legitimately has none (Datawrapper lays out type
   server-side), so the assertion is *present-and-valid-or-absent*, not *required*.
7. **Every dimension is an even integer** — the `tolerancePx` trap (`channel.ts:53-61`) named as a
   rule instead of a comment.

**The mutations that redden it** — each run in a copy outside the tree, per invariant 4:

| mutation | expected |
|---|---|
| `portrait.height: 1920` → `1922` in `chart-video`'s copy only | **RED**, naming skill, row and field |
| add a fourth row `feed:` to one copy only | **RED** on the row-set assertion |
| delete `landscape` from one copy | **RED** on the row-set assertion |
| `landscape.width: 1920` → `1921` in any copy | **RED** on the even-dimension assertion |
| rename the canonical `sizes.mjs` | **RED** on the premise assertion, not silently green |
| **`square.typeScale` changed in one copy only** | **GREEN — deliberately.** Run and recorded as the guard's named blind spot, so nobody later "fixes" it into a red. |

The last row is as important as the others: it is the difference between a guard that was designed
and a guard that happened.

**Two more guards, each with its mutation:**

- **`skills/splash/test/video-size-comes-from-the-composition.test.ts`** (Task 2) — walks every
  `*Video.tsx` under `proof/` and `skills/`, asserts each contains `useVideoConfig()` destructuring
  `width` and `height`, and contains **no** module-level `const FRAME = { width`. *Mutation:*
  re-introduce the `FRAME` constant in one beat → RED. This closes a drift that has **no guard at
  all** today.
- **The rendered-size throw** (Task 2, in `render-video.mjs`) — *mutation:* register the composition
  at square while asking for portrait; the mp4 renders fine and the throw must fire. This is the
  invariant-4 test of the throw itself, and it is the one the original gets wrong by exempting
  landscape.

---

## 6. What this does NOT close

- **Every map size decision.** 6 map statics, 6 map videos, 5 map webs. R2 makes the target aspect an
  input the camera takes; the camera is W5's and the live-MapTiler web rewrite is W6's. This spec
  hands them a table shape and a walker, nothing more.
- **B3.3** (title and description take the full width). It sits inside the assertion Task 5 touches:
  `seed-fluid-frame.test.ts:116` pins `.chart-header, .chart-source { max-width: 640px; }`, and B3.3
  asks for that cap to go. **Whoever owns B3.3 owns that line**; Task 5's narrowing must not re-pin
  it, and this is a live coordination item, not a residue I can quietly leave.
- **B3.1** (an entrance animation for the whole web graphic) — a different axis entirely.
- **`scrolly`.** No export size. Its `ASPECT_ENVELOPE` + `safeBand()` (`ScrollySeed.tsx:150,
  164-181`) is arguably a **stronger** model than three fixed sizes — it computes the sub-rectangle
  provably visible at every aspect in a range. Named, not adopted: R2 asked for three sizes and
  three sizes is what ships. If a later chantier wants one model for both, that is where it starts.
- **Re-deciding content per size beyond ticks, collision thresholds and packing.** C5 in the survey:
  bespoke label placement (flip/clamp families, end-label gutters, annotation anchors) is not *wrong*
  at a new size, it is **unverified** at a new size. Task 3's cost is that verification and Task 0
  is what tells us how large it is. Any beat where the probe's answer is "needs a real second layout"
  is named in this spec's execution log, not silently absorbed.
- **A `boostPlotAspect` equivalent.** Task 0 fired this trigger and **pointed it the other way**:
  portrait comes back over-filled (84%), not starved, and what it needs is a **cap** on how far a
  plot may be stretched away from the aspect its marks were designed at — not a boost. The measured
  case: the histogram's plot goes 2.35:1 → 0.54:1 and its tallest bar 4.2:1 → 18.4:1, with every
  clipping and collision count at zero. **Deliberately not pre-built**, because the right shape of
  the answer is a per-type judgement (a pyramid WANTS portrait; a 27-row diverging bar wants
  portrait; a right-skewed histogram does not) and one number in `SIZES` cannot hold it — that is
  the original's `scale: 1.7` defect wearing a different name. The trigger for building it: the
  first Task 3 beat whose portrait render needs a real second layout rather than a scale.
- **Whether `static-carbon-footprint-spread` should be reachable at portrait at all.** Task 0's
  honest reading is that this type at 9:16 is a worse chart than the same claim at 1:1, and the
  toolchain has no way to say so — `SIZES` is a table, and §2 forbids it learning a second question.
  The place that knowledge belongs is the type sheet (`references/types/histogram.md`) and the
  proposition phase, not the size table. Named, unclosed.
- **`square`'s static `typeScale`.** The probe's hand-picked 1.2 preserves apparent size *in an
  article column*, and R2 says square is a **social post** — a phone feed at ~400 CSS px, where a
  30px title on a 1080 frame lands at 11px. Picking the real number needs a phone-sized look, which
  Task 0 did not do. Recorded rather than guessed.
- **Print.** The original carries a fourth channel (`print-page`, 2480×1748). R2 named three; a
  fourth row is a decision nobody has taken.
- **Whether a journalist can ask for two sizes of one beat.** Task 9 lets a slot pin one. Producing
  the same beat at all three from one slot is a delivery question and belongs with `deliver`.

---

## 6b. EXECUTION LOG — 2026-08-10

What landed, what did not, and why. Written as the spec's own record so nobody has to reconstruct it
from the log.

### Landed

| # | Task | Commit | Notes |
|---|---|---|---|
| 0 | The probe | `W4 Task 0` | Answered question 4 TRUE. Findings and the revision they forced are in §4 Task 0 and §2. Artifacts: `proof/static-carbon-footprint-spread/probe/`. |
| 1 | `SIZES` + `sizeFor` + the walking guard | `W4 Task 1` | Its own file, its own walker. Nine mutations; two deliberately green, both recorded in the guard's header. |
| 4 | `dw-beat` | `W4 Task 4` | Second copy of the table, no `typeScale`. The IHDR pin became a **check** — see below. |
| 5 | Narrow the two `no @media` assertions | `W4 Task 5` | Seven mutations, six red. B3.3's 640px reversal deliberately untouched. |
| 9 | `size` in both gate readings | `W4 Task 9` | One commit, parity guard extended in it. Closed a live defect: `web` could not pass gate 2 without naming a size it will never use. |
| 3a | **The static SEED only** | `W4 Task 3 (the seed)` | `ChartSeed.tsx` reads `sizeFor(size)`; every spacing number scales. Rendered at three sizes and opened. |

### Not landed, each with its reason

- **Task 3b — the seventeen written static beats.** The seed is done; the beats are not. The probe
  revised this task's cost from "medium-high" to **high**, and its own reason is why it cannot be
  swept quickly: eleven spacing literals in the *simplest* type in this corpus, plus a per-type
  portrait judgement for anything whose marks carry shape (§6's first residue), plus an opened
  render per beat per size — 51 renders. `render-still.mjs`'s `× 2` retires **with** this task, in
  the same step, because removing it while those seventeen frames are still 900×560 ships 900px
  stills. Recorded in `chart-beat/SKILL.md` so it is not a surprise.
- **Task 2 — video, all nineteen beats. COLLISION, not cost.** Another agent is executing the
  visual-mechanisms spec in this same worktree and owns the video components' handover and
  annotation code; its in-flight `video-handover-is-a-cut.test.ts` is red against seven of the very
  `*Video.tsx` files Task 2 rewrites. Editing across would have put two agents in the same nineteen
  files. What Task 2 needs is unchanged and cheap once that clears: `useVideoConfig()` already
  returns `{width, height}` and every beat destructures only `fps` from it.
- **Task 6 — the web fill rule.** Task 5 cleared its way (the `@media` mechanism is now permitted by
  pattern) and the rule itself is unwritten. It also wants Task 7 first, for the reason below.
- **Task 7 — the `more-heatmap-co2-per-capita-decades` retrofit.** Measured before starting rather
  than estimated: it is not a seam repair. That beat renders **two whole SVGs** (`data-layout=
  "desktop"` and `data-layout="narrow"`), carries two complete 13-field layout tables, derives its
  own rung boundary in a 40-line justified function, and caps `.chart-figure` at its desktop design
  width — 482 lines of component plus 285 of runner, all of it organised around the two-rung model
  the fluid frame replaced. The retrofit is a rewrite onto the seed's shape (geometry-only SVG,
  words as HTML at fixed sizes, one layout), and it is honest to say so rather than to half-do it.
  **Its `@media` is exactly what Task 5's narrowed assertion describes and it still contains the
  defect** — which is the coordination cost of leaving it, named rather than hidden.
- **Task 8 — `image-beat`.** The spec calls it "last, and droppable if Task 3 overruns"; Task 3
  overran, so it is dropped on the spec's own instruction. One measurement worth passing on, because
  it makes the estimate wrong too: this seed's frame height is **content-derived**
  (`ImageBeatSeed.tsx:155-156`, `lastBlock.creditTop + CREDIT.fontSize + PAD`), so changing
  `FRAME_WIDTH` alone would produce a 1920 × whatever frame that claims a pinned size and does not
  deliver one. Task 8 needs the same structural inversion as Task 3 — solve `BOX_HEIGHT` from the
  row's height and the block count — plus a loud refusal when N photographs cannot fit the size
  chosen. Not near-zero.
- **`dw-beat`'s measured IHDR pin.** The spec says "measure once what Datawrapper actually
  returns for each size and pin it; do not assume it honours `height`". There is no
  `DATAWRAPPER_TOKEN` on this branch, so there was nothing to measure with — and pinning a number
  nobody has seen is the reasoning-from-source this chantier exists to stop. It ships as
  `assertExportedSize`, which reads the returned PNG's own IHDR and throws naming both sizes. **The
  first real run against the API is the measurement**, and what remains undone is recording what
  Datawrapper does in that skill's `SKILL.md`.
- **Per-size tick hints.** §4 Task 3 proposed making `Y_TICK_HINT`/`X_TICK_HINT` per-size values on
  the row. The probe measured zero collisions at all three sizes with the hints unchanged, so they
  are left alone: inventing a per-size hint nobody measured would be the same defect this spec
  opened with. The trigger for revisiting is the first type whose ticks collide at portrait.

## 7. The proof

Not "tests pass". Artifacts opened, at named sizes, with what is being looked at written down first.

| # | Artifact | Sizes | What is looked at |
|---|---|---|---|
| 0 | `proof/static-carbon-footprint-spread/probe/*.png` | 1920×1080, 1080×1080, 1080×1920 | The five measurements of Task 0. Kept in the tree as the evidence the `typeScale` numbers rest on. |
| 2 | `proof/vidy-histogram-life-expectancy/histogram-{landscape,square,portrait}.mp4` | all three | Opened and **played**, not stilled. `HANDOVER.md:676-681`: a still does not prove a video. Frame 0 non-empty at each size (the existing guard re-runs per artifact); the median line and its label legible at portrait — B6.4's overlap is a portrait-shaped risk and this is where it either recurs or does not. |
| 3 | `proof/static-swiss-age-pyramid/*.png` | all three | A 21-band pyramid is the C6 case: it needs vertical room and gets it at portrait, is tight at square. Central axis labels not cut (B6.5's defect, at a size it was never checked at). |
| 3 | `proof/static-small-multiples-solar-eu-six/*.png` | all three | The one genuine re-derivation: **3×2 at landscape, 2×3 at portrait**. If this needs a hand edit per size, `COLUMNS` was put in the wrong place. |
| 3 | `proof/static-diverging-bar-eu-per-capita/*.png` | all three | 27 rows against a fixed frame height. The type scale either works here or the table is wrong; this is the beat whose static/video pair produced the 1.20/1.58/1.80 evidence. |
| 6 | `proof/webx-carbon-footprint/*.html` | driven at all seven `verify-web.mjs` viewports | **Filling**, not fitting: the plot's share of an 812px window at 375 wide, against the measured 153px baseline. Plus the pointer path at 375 — hover is not a phone gesture and the one-code-path resolution (`web-discipline.md:54-58`) is being re-exercised at a new aspect. |
| 7 | `proof/more-heatmap-co2-per-capita-decades/*.html` | 1400px wide, the width B6.2 was reported at | The heatmap occupies the container, not 645px of it. This is the owner's own item closed, at the width he saw it fail. |
| 9 | A storyboard run through `where.mjs` and `checkStoryboard` | — | Both gates agree on a slot with a size, a slot without one, and a `web` slot that wrongly carries one. **Both readings, same session** — the divergence is the defect. |

Every one of these is opened by a person. The suite is the floor, not the evidence.
