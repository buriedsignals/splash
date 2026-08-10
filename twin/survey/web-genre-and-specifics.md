# Survey — the web genre's own gaps, and the 19 per-beat specifics

Read-only survey, 2026-08-10. Nothing in this survey changed a byte of the tree.
Axis: **B3.1, B5.2, B5.3, and B6.1–B6.19** of `twin/FEEDBACK-2026-08-10.md`.

Everything below was checked against an artifact, not against a description: PNGs opened, mp4
frames extracted with `ffmpeg`, HTML driven in Chrome with real `page.mouse.move` / `page.mouse.click`
at integer coordinates. Where a claim could not be reproduced it says so in bold, with the
measurement that contradicts it.

**On the branch's rule.** The twin duplicates rather than imports
(`skills/splash/test/no-cross-skill-imports.test.ts`), so every class below ends with *which
copies carry it* and *whether a walking guard exists*. No class here asks for a shared module. One
class (F) exists **because** of duplication, and it is the most valuable finding in this file.

---

## The headline

**Nineteen per-beat items are seven mechanisms.** Six of them already have a correct implementation
somewhere in the tree; what is missing is that the correction travelled. The seventh (a hoverable
line) is a primitive neither web genre has.

| Class | What it is | Feedback items it explains | Copies | Walking guard? |
|---|---|---|---|---|
| **A** | A thing drawn as **two elements with two independent gates**, handed over by a **crossfade** instead of a swap | B6.4, B6.7, B6.11, B6.19 | 9 files, 13 sites | **none** |
| **B** | An annotation **placed and coloured without reference to what it annotates** | B6.3, B6.5, B6.6, B6.10, B6.16 | 5 files | **none** |
| **C** | The hit target is a **fixed 28px square at the mark's anchor**, decoupled from the mark's drawn extent | B6.14a, B6.18a | 3 copies of one constant | one, and it is **blind here by construction** |
| **D** | **One collision decision baked at one width** for a continuously fluid frame | B6.1, B6.6, B3.3 | 3 sites | **none** |
| **E** | A genre redesign that **reached the skill and some copies** | B6.2, B5.2 | 4 un-migrated beats + 3 unconditional tables | **none** — this is the duplication tax, unpaid |
| **F** | A **floor cleared by a hair** while the render still fails to read | B6.13a, B6.17 | 2 beats + a named precedent | **none**, and the handover already says so |
| **G** | **No way to hover a line** — only a point | B6.9b, B6.15 | every web beat | n/a (missing capability) |

Plus three items that are not defects but **decisions the owner is overturning**, each with a
recorded argument that has to survive the reversal: B3.1 (no entrance vocabulary exists at all),
B5.2 (the accessible table), B5.3 (MapTiler's own controls vs. self-containment).

And two items I could not reproduce as stated: **B6.8/B6.9 "the connecting lines are not
rendered" — they are** (all ten are in the DOM and 9 dark runs are measurable in a pixel column);
what is genuinely absent is the two vertical axes the type sheet demands.

---

# The classes

## Class A — one thing, two elements, two gates, crossfaded in place

**This is one mechanism, and the owner saw two of its nine copies.**

### The shape

A composition draws the same screen object twice — a short form and a long form, or a placeholder
form and a true form — as two sibling elements at the same anchor, each with its own opacity
expression. The handover is written as `A * (1 - c)` on one and `A * c` on the other. That is a
**crossfade**: for the whole width of the transition window both elements are painted, at partial
opacity, on top of each other.

### Evidence, histogram (B6.4)

`proof/vidy-histogram-life-expectancy/HistogramVideo.tsx:339-346` computes the pair; `:541-552`
draws the short label at `x = (subjectBar.x1 + subjectBar.x2) / 2`, `textAnchor="middle"`,
`y = subjectBar.yTop - 16`, `opacity={valueOpacity}` (`:548`); `:553-565` draws the sentence at
`x = conclusionX` (left-anchored, clamped to the plot's right edge), **the same `y`**,
`opacity={conclusionOpacity}` (`:561`).

Timing (`proof/vidy-histogram-life-expectancy/timing-contract.ts:47-48`): `subject 132+22`,
`conclusion 154+26`. So frames **154–179** paint both. Extracted from the delivered mp4:

- frame 158 → `65 countries, 75–80 yea`**`65`**` — the most of any span` — the short label opaque
  and dark, the sentence at roughly half.
- frame 163 → both fully dark, superimposed.
- frame 180 → clean, sentence only.

**0.87 s of double-printed label, and the two strings begin with the same token, which is why it
reads as a duplicate.** The owner's "0:05" is frame 150; the collision actually opens at frame 154.

### Evidence, pyramid (B6.7)

`proof/vidy-pyramid-niger-population/PyramidVideo.tsx:663-671` and `:672-683`: two `<text>`
elements, **identical `x={g.centreX}`, identical `y={subjectLabelY}`, both `textAnchor="middle"`**,
opacities `subjectValueOpacity * (1 - conclusionOpacity)` (`:669`) and
`subjectValueOpacity * conclusionOpacity` (`:680`). Timing `conclusion 254+32`
(`timing-contract.ts:55`). Frame 268 of the delivered mp4 shows
`4.67M · ~6.9× the 65+ population (673K)` with a grey `4.67M` ghost sitting over `65+`.

Same mechanism, one variable different: the histogram's two anchors differ (centre vs. left), the
pyramid's are identical. That is why one reads as a smear and the other as a double-exposure.

### The same idiom in the map videos (B6.11, B6.19)

The placeholder-to-true handover is the same two-element/two-gate crossfade with a different
subject.

- `proof/mapgen-choropleth-video/ChoroplethVideo.tsx:341-347` paints the `pending` dot texture
  **with no opacity gate at all** whenever `arrived < 1`; `:348-356` paints the true ramp fill at
  `opacity={arrived}`. Meanwhile the basemap plate under it is gated (`:243-251`,
  `opacity: furniture`, and `furniture = interpolate(establish, …)` at `:205`, exactly `0` at
  frame 0). **Frame 0 of `render/choropleth.mp4`, extracted: every country's dot texture at full
  opacity on white — no title, no source, no basemap.** The data layer arrives before the ground
  it sits on. Reproduced exactly as reported.
- `proof/map-quake-symbol/QuakeSymbolVideo.tsx:212-225` draws each quake's outline at
  `opacity={furniture}` (a **master clock**), `:226-235` draws its fill at `opacity={arrived}`
  (the **mark's own** progress). Frame 40 of `render/quake-symbol.mp4`: plate up, legend up,
  seventeen empty rings, no fills. Reproduced exactly as reported.

`doctrine/references/motion-grammar.md:108` already states the rule this violates — *"A
label's reveal gates on its own mark, never on a master clock"* — and `:160` lists **"The accent
before the thing it accents"** as a named anti-pattern. The map symbol gates one half of a single
mark on the clock and the other half on the mark. That is the rule, applied to a mark instead of a
label, and it is not written down that way.

**The reasoning that must survive the fix.** `skills/map-beat/SKILL.md:194-202` records why
`pending` exists: a country fading in from transparent showed the near-white basemap through a
half-opaque fill and **read lighter than the lightest filled class — the opposite of the data**.
"Empty at frame 0" must not be implemented by restoring that fade. The honest correction is a
**hard cut at the mark's own arrival**, not a softer crossfade.
`proof/mapgen-flowmap-video/FlowMapVideo.tsx:318-325` already declines `pending` with its own
reasoning, and `proof/vidy-heatmap-renewables-europe/HeatmapVideo.tsx:462,491-505` shows the
correct chart-video pattern: the empty outline grid sits inside `<g opacity={axisOpacity}>`, so its
frame 0 (extracted) is title + source only. **The right answer already exists in the tree; it did
not travel to the two map beats.**

### Every copy

| File | Sites | Pair |
|---|---|---|
| `proof/vidy-histogram-life-expectancy/HistogramVideo.tsx` | 339-346, 541-565 | value → sentence |
| `proof/vidy-pyramid-niger-population/PyramidVideo.tsx` | 663-683 | value → sentence |
| `proof/vidy-pyramid-niger-population/PyramidVideo.tsx` | 573 | band label plain → accent |
| `proof/video-population-growth-dumbbell/DumbbellVideo.tsx` | 470, 504-513, 553-565 | value → sentence |
| `proof/video-population-growth-dumbbell/DumbbellVideo.tsx` | 473, 493-503, 539-551 | country plain → accent |
| `proof/vidy-boxplot-co2-by-continent/BoxplotVideo.tsx` | 525, 528 | category, outlier → conclusion |
| `proof/vidy-lollipop-renewables-share-europe/LollipopVideo.tsx` | 481, 485 | value, category |
| `proof/vidy-heatmap-renewables-europe/HeatmapVideo.tsx` | 485 | row label plain → accent |
| `proof/mapgen-choropleth-video/ChoroplethVideo.tsx` | 341-356 | pending → true fill |
| `proof/map-quake-symbol/QuakeSymbolVideo.tsx` | 212-235 | outline → fill |

**Nine files, thirteen sites.** The owner looked at two.

### Guard

**None exists, and no existing guard is the right shape.** `video-helper-parity.test.ts` walks the
tree but compares only `measureText`/`wrap` **as source text**; its own header (`:47-52`) names
"helpers duplicated in a video beat that are NOT in the canonical set" as out of scope. A text
parity guard cannot catch this anyway: the thirteen sites are *correctly* different from one
another, and each one is wrong on its own terms.

**What would catch it, as a walking guard.** SSR each `proof/*/[A-Z]*Video.tsx` at every frame of
its own `conclusion`/`subject` window (each beat exports its component and its timing; three beats
already commit a `*-props.json`), parse the returned SVG, and assert that **no two `<text>` nodes
sharing a `y` within one line-height both carry `opacity ≥ 0.05`**, and that **no two `<path>`/
`<circle>` nodes with the same geometry are both painted**. That is behavioural, not textual, and
it covers a copy created after it was written. It is the same walking discipline
`render-still-parity.test.ts` and `video-first-frame-not-empty.test.ts` already use.

### The correction, per the branch's rule

Not extraction. The same edit, thirteen times: replace the crossfade with an **exclusive handover**
— one element mounted at a time (`conclusion > 0 ? <sentence/> : <short/>`), or opacities that sum
to exactly one with a hard boundary. Then the walking guard above, which makes the thirteenth copy
and the fourteenth safe.

---

## Class B — an annotation placed and coloured without reference to what it annotates

Two legs, both from the same absence: **nothing in the tree derives an annotation's position or its
ink from the mark it is drawn over.** Every annotation in the corpus is a hand-typed offset plus a
palette colour chosen against the page ground.

### Leg 1 — colour measured against the ground, never against the mark (B6.3, B6.4)

`proof/static-carbon-footprint-spread/CarbonFootprintHistogram.tsx:279-287` draws the median rule
`stroke={accent}` from `plot.top` to `plot.bottom` — straight through the 0–4 t bar, which is drawn
`fill={muted}` at `:226-234`. With `ground: "#FFFFFF"` and `accent: "#0B7A75"`
(`proof/static-carbon-footprint-spread/render.mjs:80-81`), and `muted` derived by
`shared/chart-beat/render-still.mjs:71-83`:

| pair | contrast |
|---|---|
| accent `#0B7A75` vs ground `#FFFFFF` | **5.18 : 1** — passes every floor |
| muted `#616161` vs ground | 6.19 : 1 |
| **accent vs the bar it crosses `#616161`** | **1.20 : 1** |

The video sibling is worse: `proof/vidy-histogram-life-expectancy/HistogramVideo.tsx:501-509` draws
the median `stroke={muted}` and `:377-392` draws the bars `fill={muted}` — **1.00 : 1**, literally
invisible where it crosses a grey bar. It only reads in the delivered mp4 because the median at
75.3 happens to land on the *accent* bar. Change the data and it disappears silently.

`doctrine/references/visual-system.md:89-94` already states the rule — *"a label's ink is
never inherited from the mark it names… computed against the real background the label sits on —
every time, even when that background is a data mark instead of the page"* — and calls it "the
single most independently-rediscovered defect in this system's history". **It is written for TEXT
only.** A dashed rule, a leader line and a hatch are not text, so the rule does not reach them, and
nothing measures a non-text annotation against what it crosses.

### Leg 2 — position hand-typed, never derived (B6.5, B6.6, B6.10, B6.16)

- **Pyramid static, B6.5.** `proof/static-swiss-age-pyramid/SwissAgePyramid.tsx:348-368`: the peak
  annotation's leader runs `x1={plot.left} → x2={peak.male_.x}`. For the widest band — by
  definition the bar with the least margin — that is a 3-dash stub; the label sits at
  `x={plot.left}`, `y = centerLabelY - 8`, alone in the left margin. Opened the PNG: it is
  legible (black on white) but reads as unattached. **The second half of B6.5 is a different and
  sharper defect**: `:311-318` draws the centre spine as **one continuous `<line>` from `plot.top`
  to `plot.bottom`**, and `:337-345` draws every age-band label centred on that same `x`. The line
  strikes through all 21 labels — visible in `static-swiss-age-pyramid-still.png` as `95|99`,
  `85|89`, `100|+`.
  **The video already fixed exactly this.** `proof/vidy-pyramid-niger-population/PyramidVideo.tsx:378-396`
  measures each label's own ascent/descent and masks the spine behind it, with the comment *"without
  this the dashed rule STRUCK THROUGH all 21 of them"*. The fix never travelled to the static
  sibling. The web sibling avoids it structurally (labels live in a real CSS grid track).
- **Pyramid web, B6.6.** `proof/weby-population-pyramid-switzerland/SwissAgePyramidWeb.tsx:307-315`
  runs an L-leader from `y = 0`; `:321-327` parks the label at `left: "0%", top: "0%"`. Driven at
  1400×900: **"the widest band" sits in the plot's top-left corner, ten rows above the band it
  names,** with a dashed rule running the whole left edge down to it. The code's own comment
  (`:296-306`) explains why — at 375px there are 6px between the frame and the bar. Also:
  `proof/weby-population-pyramid-switzerland/render-web.mjs:269` sets
  `peakLabel: "the widest band"` — **the web version dropped the value the static carries**
  (`55-59: the widest band (669,962)`).
- **Choropleth, B6.10.** `proof/mapgen-choropleth-video/bake.mjs:42-46`:
  `anchors: { label: [20.3, 52.2] }`, a hand-typed lon/lat with the comment *"nudged east and north
  so the right-anchored label text lands centred over the country"*, consumed at
  `proof/mapgen-choropleth-video/ChoroplethStill.tsx:239-259` with `textAnchor="end"`. Nothing
  computes a pole of inaccessibility, a centroid, or even a bounding-box centre. Opened
  `render/static.png`: the label sits in Poland's upper-right lobe. Reproduced.
- **Hex grid, B6.16.** `proof/map-quake-density/HexGridStill.tsx:216-225` gives the subject cell
  `stroke={isSubject ? accent : ground}` — **and there is no `<text>` anywhere in that file that
  names it.** Opened `render/static.png`: one orange-outlined hexagon, no label, no callout, no
  legend entry, nothing in the note. The number is in the beat's own contract —
  `proof/map-quake-density/BRIEF.md:33` "Densest cell: **1,724 events**, Fiji 49% / Tonga 36%",
  and `:52` lists it as reveal step 2 — and it never reached the artifact. This is the sharpest
  form of the class: **emphasis spent with nothing said.**

### Guard

None. Two shapes are available and both are walking:

1. **Non-text annotation contrast.** Extend the existing measured-contrast discipline to
   *annotation vs. the marks it overlaps*: at render, for every dashed rule / leader / hatch,
   compute the fills it crosses and assert ≥ 3 : 1 (WCAG 2.2 SC 1.4.11, non-text). Walk
   `proof/*/*.tsx` for elements carrying `strokeDasharray` and compare against the fills in their
   own geometry. The histogram would have failed loudly at 1.20 and 1.00.
2. **An emphasised mark is a named mark.** For every beat whose component contains an `isSubject ?
   accent : …` branch, assert the SSR'd output contains a `<text>` whose content is not drawn from
   the shared furniture — i.e. **the accent and the statement travel together.** `map-quake-density`
   is the only current failure; the guard's value is that it makes the class impossible to repeat.

---

## Class C — the hit target is a fixed square at the anchor, not the mark

**B6.14a and B6.18a are one constant.**

`skills/map-web/assets/MapWebSeed.tsx:87` — `const HIT_TARGET_PX = 28;` — duplicated verbatim
at `proof/mapgen-dot-web/DotDensityWeb.tsx:48` and `proof/mapgen-symbol-web/QuakeSymbolWeb.tsx:66`.
The button is positioned at the mark's own anchor by percentage
(`QuakeSymbolWeb.tsx:262-278`) and sized in fixed CSS pixels. `assets/interaction.mjs:47-56` binds
`pointerenter`/`pointermove` to that button and nothing else — **the drawn mark is never a hit
target.**

Measured, driving Chrome at 1400×900 over `proof/mapgen-symbol-web/quake-symbol.html`:

| | value |
|---|---|
| drawn circle diameters | 49 – 53 px |
| hit target | 28 × 28 px, centred on the same point |
| `page.mouse.move` at the largest circle's centre | tooltip **visible** |
| 4 px inside its right edge | tooltip **`hidden: true`** |
| 4 px inside its top edge | tooltip **`hidden: true`** |

Same over `proof/mapgen-dot-web/dot-population.html`: 42 country buttons, each 28 × 28, at the
country's own anchor. Probing 60 px inside the same country returns `hidden: true`. France's
polygon is ~120 px across at that width. **Both reproduced exactly.**

The rationale is on record and is sound as far as it goes
(`skills/map-web/references/map-web-discipline.md`, "Touch and hover share one target"): an
SVG-scaled hit circle collapses to a few physical pixels at 375 px. The correction is not to
abandon the floor — it is `max(28, the mark's own drawn diameter)` for a sized symbol, and a real
`<path>` hit region for a polygon.

### Guard

`skills/splash/test/interaction-promises-are-kept.test.ts` **walks the delivered corpus and
drives real pointers** — and is blind to this by construction. Its own header (`:38-44`) says marks
are discovered by `data-detail`, and it probes each mark **at that element's own centre**. That is
the 28 px button's centre, which always answers. Blind spot 2 (`:106-112`) even names
`mapgen-dot-web` resolving to a neighbour.

**The extension that closes it, in the guard that already exists:** for each probed mark, also
probe **the drawn mark's own bounding box at four inset points**, and require an answer wherever
the mark is painted. One added assertion in a file that already launches the browser.

---

## Class D — one collision decision baked at one width, for a frame that is continuously fluid

The fluid redesign made geometry stretch continuously while type stays fixed. Every *de-collision*
decision, however, is still computed **once, server-side, at one width** — and that width is the
narrowest.

- **B6.1, bump-web.** `proof/webz-bump-emitter-rank/BumpWeb.tsx:288-310`: the year-tick filter is
  `finalTickPx - pxAt(…) >= yearLabelPx + 6`, and `pxAt` divides by `narrowestPlotPx` (`:288-289`).
  The comment (`:292-297`) is explicit: *"2020 and 2024 are four columns apart, which is 25px on the
  phone frame against a ~26px label… measured at the narrow width above rather than eyeballed at the
  wide one."* Driven at 1400 px: ticks read `1990 1995 2000 2005 2010 2015 2024`; the 2015→2024 gap
  measures 311 px, so 2020 would sit ~104 px from its neighbours with room to spare. **The label is
  dropped at every width to satisfy 375 px.** Reproduced.
- **B6.6, pyramid-web.** Same cause: the peak label is parked at `0%,0%` (`SwissAgePyramidWeb.tsx:324`)
  because the narrow rung has 6 px of room. At 1400 px there is ample room beside the band.
- **B3.3, title width.** `skills/chart-web/scripts/render-web.mjs:240` —
  `.chart-header, .chart-source { max-width: 640px; }` — with a reading-measure argument at
  `:203-208`. One copy, inherited by all 17 fluid chart-web beats; visible in every screenshot taken
  for this survey (the bump's title wraps at ~620 px inside a 1400 px frame). **The map-web genre has
  no such cap** — `skills/map-web/scripts/render-web.mjs` has no header `max-width`, which is
  why `dot-population.html`'s title does run full width. So B3.3 is a chart-web item only, and it is
  a deliberate typographic decision, not an oversight: overturning it means choosing between
  full-bleed prose and a 45–75-character measure, and the honest reversal raises the type size
  rather than removing the cap.

### Guard

None, and the shape is awkward: this is not "a copy drifted", it is "a decision made in the wrong
coordinate system". The tractable guard is the one the genre already has the machinery for —
`skills/chart-web/scripts/verify-web.mjs` drives 7 viewports; add an assertion that **the set
of drawn axis labels / annotations is not identical at 375 and at 1600 when the geometry differs by
more than one label width**, i.e. that a decision which had to be taken at the narrow end was
retaken at the wide end. Failing that, the cheap correction is to compute the collision test from
the *rendered* container width in CSS, not from a baked constant.

---

## Class E — the redesign reached the skill and some copies. This is the duplication tax, unpaid.

**This is the class the branch's own rule creates, and it is the answer to "which copies carry it".**

### E1 — the fluid frame reached 2 of 5 map-web beats and 17 of 18 chart-web beats

| beat | pattern |
|---|---|
| `proof/mapgen-dot-web/render-web.mjs` | fluid (`100cqw`) |
| `proof/mapgen-symbol-web/render-web.mjs` | fluid (`100cqw`) |
| `proof/mapgen-choropleth-web/render-web.mjs` | **two-rung** (`layouts`, `@media (max-width:…)`) |
| `proof/mapgen-hexgrid-web/render-web.mjs` | **two-rung** |
| `proof/mapgen-locator-web/render-web.mjs` | **two-rung** |
| `proof/more-heatmap-co2-per-capita-decades/render-web.mjs` | **two-rung** |

**B6.2 is exactly this.** `proof/more-heatmap-co2-per-capita-decades/render-web.mjs:256` —
`.chart-figure { margin: 0; max-width: ${desktopCapPx}px; }` with `desktopCapPx = 900`
(`Co2HeatmapWeb.tsx:50`) and a narrow rung at 375 (`:68`). Driven at 1400 px: the heatmap occupies
645 px and stops. The file's own comment (`:233-235`) says *"The real answer is the fluid seed …
and retrofitting the eleven web chart beats onto it is a known open item"* — the retrofit landed on
sixteen and left this one, plus three map beats nobody counted.

Note also that `skills/chart-web/SKILL.md:15-17` asserts *"Fifteen beats ship through this
skill … and every one of them is on the fluid frame this skill now teaches."* Measured: eighteen
beats hold a `render-web.mjs`, seventeen import the skill's `renderWeb`, one does not. The sentence
is stale in both directions. (`skill-md-matches-code.test.ts` checks signatures, not counts.)

### E2 — "the table is opt-in" reached the skill and 2 of 5 beats (B5.2)

The 2026-08-09 decision made `regionTable` default to `false`
(`skills/map-web/scripts/render-web.mjs:66,86-94`). Measured on the delivered HTML — **every
one of the five map-web beats still ships a rendered table**:

| artifact | `<table>` | rows |
|---|---|---|
| `proof/mapgen-dot-web/dot-population.html` | 1 | 42 — via an explicit `regionTable: true` (`render-web.mjs:476`) |
| `proof/mapgen-symbol-web/quake-symbol.html` | 1 | 17 — via `regionTable: true` (`render-web.mjs:517`) |
| `proof/mapgen-choropleth-web/render/choropleth.html` | 1 | 41 — its own private renderer |
| `proof/mapgen-hexgrid-web/hex-grid.html` | 1 | **156** — `renderHexGridWeb` renders `table` unconditionally, `render-web.mjs:69-84`, no switch |
| `proof/mapgen-locator-web/locator.html` | 1 | 11 — `renderMapWeb` renders it unconditionally, `render-web.mjs:64-73`; the file header (`:6`) says "one **always-rendered** accessible table" |

Two beats made a decision; three carry a copy of the renderer that predates the decision existing.
`mapgen-hexgrid-web` puts **156 table rows under a 312-mark map**, which is the loudest instance of
what the owner is objecting to.

### E3 — a fix that never travelled

The pyramid spine mask (Class B, leg 2) is the third instance: measured, implemented and documented
in the video copy, absent in the static copy, structurally unnecessary in the web copy.

### Guard

**This is where a walking guard buys the most, and none exists.** Three are worth writing, all in
the `render-still-parity.test.ts` idiom (walk the tree, compare behaviour or shape, never a
hand-written list):

1. **`web-frame-is-fluid.test.ts`** — walk every delivered `.html` under `proof/`; fail any that
   contains `@media (max-width:` around a layout swap, or a `max-width: <px>` on the figure. Four
   current failures, all real.
2. **`map-web-table-is-a-decision.test.ts`** — walk every `render-web.mjs` that renders a map
   genre; fail any that renders its table without reading a named option. Three current failures.
3. **The general form**, which is the one worth arguing for: **a decision recorded in a skill must
   be reachable from every copy of the mechanism.** Mechanically that is *"every beat-local copy of
   a genre renderer exposes the same option names as the skill's own"* — a walking signature
   comparison, exactly what `render-still-parity.test.ts` does for functions.

**I am not proposing a shared module.** The branch's rule is right here: the reason
`mapgen-hexgrid-web` could be written at all is that it copied a renderer and changed it. What is
missing is not linkage, it is the *walking* half of the duplication contract — and
`helper-parity.test.ts`'s hand-written list is the cautionary tale, since it covered six of twenty
copies and once turned red for a correct change.

---

## Class F — a floor cleared by a hair, and the render still fails to read

- **B6.13a, dot-density static.** `proof/mapmore-dot-population/render.mjs:33` sets
  `accent: "#0072B2"`. `geo-dot.ts:377-405`'s `assertStudyAreaReadsApart` composites the study tint
  and enforces `MIN_DOT_CONTRAST = 3` (`:375`, WCAG 2.2 SC 1.4.11). Computed:
  study land = `#CFCFCF`, **dot vs. study land = 3.33 : 1**, dot vs. the water tint = **2.12 : 1**.
  The guard passes at 3.33 and the render does not read — opened `render/static.png` to confirm.
  A 3 : 1 non-text floor was written for a large solid graphical object; a 3-px dot in a field of
  three thousand is a different perceptual problem, and applying the floor there is the
  "rule applied outside its domain" failure `HANDOVER.md` §10.5 already names three times.
- **B6.17, proportional symbol.** Measured on the delivered web artifact: **all seventeen circles
  are 49–53 px across** — the radius scale is `√magnitude` over a 7.8–9.1 range, a ratio of 1.08.
  The beat's own title says it: *"17 great quakes, 2005–2017: the biggest circle is only 2.9 %
  wider than the next"*, and its subject note says *"The accent, not the size, is what identifies
  it."* The screenshot shows five circles in the Sunda arc almost entirely superimposed and two off
  Sumatra fully overlapping. **The beat documented a type-fit failure in prose instead of changing
  the type.** A proportional-symbol map cannot carry a 1.3-unit log range; the honest options are a
  different encoding, a different variable (energy, which is 32× per step), or a different type.
- **Precedent.** `HANDOVER.md` already records the heatmap that rendered as a flat grey slab with
  "every assertion true and every contrast check passing", and concludes: *"no guard exists for
  'technically compliant and visually flat'."* This class is that sentence, twice more.

### Guard

Honestly: **none of these is guardable by a threshold, because a threshold is what failed.** The
tractable mechanical piece is narrower and worth having — **assert that an encoding actually
separates**: for any size- or luminance-encoded type, fail when the ratio between the largest and
smallest drawn mark is under a stated minimum (here 1.08 against any sane floor). That converts
"the reader cannot tell these apart" into arithmetic the render can refuse. The rest stays what it
has always been in this project: someone opens the artifact and looks.

---

## Class G — there is no way to hover a line

**B6.9b (a tooltip on the slope's connecting line) and B6.15 (flow/route × web) need the same
missing primitive.**

Measured across the corpus: every web beat's hit surface is either **one `.hit-area` rect** with
nearest-by-x resolution (`skills/chart-web/assets/ChartWebSeed.tsx:548`,
`proof/webz-bump-emitter-rank/BumpWeb.tsx:563-571`, and 12 more) or **per-point targets**
(`proof/web-co2-decline-slope/SlopeWeb.tsx:480,494`; `.pt` buttons in every map-web beat).
`grep` for `pointerEvents="all"` returns 16 sites and **not one is on a `<path>`, `<line>` or
`<polyline>`.** `proof/web-co2-decline-slope/slope-interaction.mjs:50-60` binds only `.pt`.

A hoverable line needs: a transparent stroked twin of the visible path at a generous
`stroke-width` with `pointer-events: stroke`, its own `data-detail` baked server-side, and — for
keyboard parity, which this project holds every interaction to — a focusable element per line.
None of that exists anywhere.

---

# The three overturned decisions

## B3.1 — an entrance animation for the whole graphic

### What exists today: nothing, and no rule either way

`grep` for `animation|@keyframes|transition|prefers-reduced-motion` across both web genres returns
**three hits, all functional**: `skills/chart-web/scripts/render-web.mjs:326` (a 120 ms
background/colour transition on the filter pill), `:343` (a 120 ms opacity transition on filtered
marks), and `verify-web.mjs:699` waiting past it. `skills/map-web` has none.
Neither `web-discipline.md` nor `map-web-discipline.md` contains the word "entrance", "animation" or
"reveal" in this sense. **This is an unaddressed gap, not a rejected idea** — nothing has to be
overturned, which makes it the cheapest item on this list to get right and the easiest to get wrong.

### What the video genre already knows

`skills/chart-video/assets/timing.ts` is a complete, tested reveal vocabulary that is
editorial rather than technical:

- six named events in a fixed order (`:47-54`): `establish` · `reference` · `reveal` · `subject` ·
  `conclusion` · `hold`, each documented in one line a non-programmer can read (`:31-43`);
- `checkTiming` (`:80-119`) mechanises the grammar's structural rules: each event begins only once
  the previous finished, the composition ends exactly on the hold, the hold clears a half-second
  floor;
- `progressOf` (`:68-71`) is clamped, with the reason stated: an unclamped window keeps moving
  outside itself and "the hold is not still";
- `doctrine/references/motion-grammar.md` carries the editorial rules the vocabulary encodes —
  `:128` *"Furniture establishes, then stops… They may fade in; they may not slide, scale, stagger
  or re-animate"*, `:108` *"a label's reveal gates on its own mark, never on a master clock"*, and
  the anti-pattern list at `:153-166` (**"Motion added for energy"** is the first entry).

### Can the web genre borrow it? Yes — and the tree already contains the proof of concept

`skills/scrolly` runs exactly the mechanism a web entrance needs, and its discipline file
argues it at length (`references/scrolly-discipline.md:440-485`):

- **a class toggle, never a value written from scroll or time** — `initScrolly`'s
  `IntersectionObserver` sets `.active`, and CSS does the rest;
- **the transition is CSS and time-bounded** — `render-scrolly.mjs:291-293`,
  `.step-frame { transition: opacity 0.3s ease; }`;
- **the whole animated property lives inside `@media (prefers-reduced-motion: no-preference)` and
  nowhere else**, so under `reduce` the property does not exist and the change is instant, in every
  engine, with no script branching (`:468-481`, verified in a driven browser);
- **the no-JS page is the settled state** — nothing is `display:none` or `visibility:hidden`.

Put together, the borrow is precise and small:

1. **Vocabulary**: reuse `establish → reference → reveal → subject → conclusion`, dropping `hold`
   (a web beat's hold is the rest of its life). The journalist edits event durations in one object,
   exactly as `timing.ts` promises.
2. **Mechanism**: a single class on the figure root, added on `DOMContentLoaded`, driving CSS
   `transition-delay` per layer. No JavaScript writes an opacity.
3. **Contract**: the settled state is what SSR already ships. **The animation must be an addition
   to a page that is complete without it** — otherwise it violates the genre's own standing rule
   that the no-JS page carries the full claim (`web-discipline.md`, "What must not become
   interactive").
4. **Reduced motion**: every transition inside `@media (prefers-reduced-motion: no-preference)`,
   the scrolly's exact pattern.
5. **Verification**: `verify-web.mjs` already drives Chrome at seven viewports; add a sample under
   `emulateMediaFeatures({prefers-reduced-motion: reduce})` asserting every layer is exactly 0 or 1,
   and a sample with JavaScript disabled asserting the settled frame.

One caution worth writing into the discipline file at the same time: the motion grammar's first
anti-pattern is **motion added for energy**. An entrance that only fades the whole figure in is that
anti-pattern with a CSS property attached. If it is worth building, it should carry the *argument's*
order — furniture, then reference, then data, then subject — which is precisely why borrowing the
vocabulary rather than inventing one matters.

---

## B5.2 — the accessible table: what an accordion costs

The owner asks for **no table, or an accordion**. `skills/map-web/references/map-web-discipline.md`
argues both away in advance, and the argument should be visible before it is set aside.

**On why the table exists at all** (`:165-195`):

> A map is a spatial medium, and a screen-reader user has no spatial access to it. … Tabbing
> through thirteen points in *some* order gives a screen-reader user thirteen numbers, but not the
> one thing the map itself is for — the spatial pattern those thirteen numbers make.
>
> - **A hover tooltip, alone, is not an answer.** It requires knowing where on the canvas a value of
>   interest sits *before* you can ask for it — exactly the spatial access the question starts by
>   saying is absent.
> - **An ordered, readable list of the regions and their values, behind the same markup, is a
>   legitimate answer** — not a consolation prize, a genuinely complete one.

**On what turning it off costs** (`:198-222`, written when the owner made it opt-in):

> **a beat that leaves it off has no answer.** Concretely, that reader loses:
> - **the complete set of readings.** … the values survive, the ACCOUNT of them does not.
> - **the comparison the beat is about.** "Paris is the largest" is a claim about thirteen numbers
>   side by side. A table makes it checkable in one pass. Thirteen separate focus stops do not: by
>   the eighth the reader is remembering, not reading.
> - **any reading at all without a keyboard trap of patience.** … The button sweep is thirteen
>   interactions to obtain what the table gives in one.

**On the accordion specifically** — the file already refuses it, by name, in the two choices it says
the table makes when a beat does turn it on (`:225-234`):

> - **Rendered plainly and visibly, never behind a toggle or `sr-only` CSS.** A disclosure widget
>   ("show data table") adds an extra interaction step for the one reader who most needs the
>   fallback not to be optional, and screen-reader-only CSS has a well-known failure mode: a
>   positioning bug, a CSS reset that strips it, an author who "cleans up" a rule they do not
>   recognise the purpose of, and the content silently stops reaching anyone. Visible-to-everyone is
>   what makes it un-losable. **Opt-in at BUILD time by an author who read this section is a
>   different thing entirely from opt-in at READ time by the reader who needs it.**

### What an accordion actually costs, stated concretely

A native `<details>/<summary>` is the least-bad form and it is not free:

1. **One extra interaction for the reader who most needs it.** The sighted reader loses nothing (the
   map is the channel); the screen-reader reader must find and open the disclosure before reaching
   *any* reading. That is the asymmetry the file names.
2. **It is announced, but not as a table until opened.** A closed `<details>` announces a summary,
   not "table, 42 rows, 2 columns" — so the reader cannot tell from the announcement that the
   complete account exists, which is the exact information the current design puts in the reading
   order for free.
3. **Find-in-page and Ctrl-F.** Content inside a closed `<details>` is skipped by find-in-page in
   several engines. A reader looking for one country loses that.
4. **It survives JS-off** (native `<details>` needs none) — so the accordion does *not* cost
   self-containment. That is the one thing in its favour and it is real.
5. **What it buys, honestly**: the layout complaint. `proof/mapgen-hexgrid-web/hex-grid.html` puts
   **156 rows** under its map, and `proof/mapgen-dot-web/dot-population.html` measures **2092 px of
   document in a 900 px window**, almost all of it table. That is a genuine defect of the delivered
   page even though the map itself fits (`map-web-discipline.md:50-60` explicitly permits the table
   to sit below the beat as normal document reading).

**The trade, put plainly for a decision.** *No table* costs a whole reader class their only complete
account, in a genre whose own discipline calls that "no answer". *An accordion* costs one
interaction, a weaker announcement and find-in-page, and buys back the page length. *Keeping the
table and shortening it* — a beat's table need not carry 156 rows when the claim rests on one cell —
costs nothing and is not currently on the table as an option. Whichever way it goes,
`map-web-discipline.md:198-222` has to be rewritten in the same voice, because it currently argues
the opposite of what would ship.

---

## B5.3 — filters, and MapTiler's own controls

**Filters already exist and are styled.** `proof/mapgen-symbol-web/quake-symbol.html` ships a
five-chip segmented control ("All arcs / Eastern China / Japan & Kuril arc / Melanesian arc /
Sunda arc"), pure CSS `:has()`, working with JavaScript disabled
(`proof/mapgen-symbol-web/render-web.mjs:148-163`). Driven with a real click on "Sunda arc":
circles 17 → 5, table rows 17 → 5. The mechanism is sound.

**Its one hole is B6.18b, and it is a rule collision rather than an omission.** The `:has()` rules
at `render-web.mjs:161-163` narrow `.pt`, `svg.map circle[data-group]` and `.region-table tbody tr`.
`.point-label` is not in that list and carries no `data-group` — because
`proof/mapgen-symbol-web/QuakeSymbolWeb.tsx:246-251` draws it **unconditionally, by design**:
*"Drawn unconditionally — it is the claim, not an interaction result"*, per the genre's standing
rule that nothing argument-bearing sits behind a control. Measured: after the click, the map shows
five Sunda-arc circles and the label **"M9.1"** still reads `display: block`, floating beside
nothing.

`map-web-discipline.md:328-334` already records the same class once — *"One vocabulary, because two
of them shipped a broken filter"*. The honest fix is not to add `.point-label` to the hide list
(that would put the claim behind a control); it is that **a filter must not offer an option that
excludes the subject.** Either "All arcs" plus the subject's own arc are the only options, or the
subject's label is restated in the filtered view. That is an editorial decision, not a CSS one.

**MapTiler's own zoom and pan is an architecture decision, not a fix.**
`map-web-discipline.md`, "Pan and zoom", records that live tiles were considered and rejected in
writing:

> reach for LIVE map tiles once a reader zooms past the baked plate's own resolution — **rejected**:
> it breaks self-containment (a request to a tile server at read time) and would ship a MapTiler key
> inside the delivered file, a real credential leak this project's own local-first, self-contained
> design exists to avoid

What ships instead is one bounded CSS step: `ZOOM_SCALE = 1.4` (`MapWebSeed.tsx:91`), a native
checkbox `#mw-zoom-toggle`, native scroll for panning, no script. The owner's specific objection
(B6.14b) is about its **presentation**, and it is fair: driven at 1400 px,
`proof/mapgen-dot-web/dot-population.html` shows an unstyled square checkbox above the map labelled
*"Zoom in (2.2×, bounded) — then scroll or use the arrow keys to pan"* — an instruction manual
where a control should be. That much is fixable inside the existing architecture: the filter chips
in the same genre are already properly treated, and the zoom toggle simply never got the same pass.

Real MapTiler controls means a live `maplibre-gl` map at read time, which means an external request
and a key inside the delivered HTML. **That is the owner's call, and it is the genre's founding
constraint, so it belongs in front of him as a trade rather than in a task list.**

---

## flow / route × web — what is actually missing (B6.15)

`MATRIX.md` confirms it is the single empty cell in the whole matrix:

| type | static | web | video | scrolly |
|---|---|---|---|---|
| **flow / route map** | `mapmore-flow-danube` | **—** | `mapgen-flowmap-video` | `mapmore-scrolly-danube` |

### What already exists to build on

- **`proof/mapmore-flow-danube/`** — the static: `FlowMapStill.tsx`, `geo-flow.ts` (the projected
  route + the territories it crosses), a baked `plate/`, frozen `danube-route.csv` and
  `countries.geojson`, `render-still.mjs`.
- **`proof/mapgen-flowmap-video/`** — the video: `FlowMapVideo.tsx` with a `reveal` that grows the
  route and fades each crossed territory in **at the moment the line reaches it**
  (`:318-330`), plus its own `timing-contract.ts`. Notably this beat **declines the `pending`
  device** with reasoning (Class A) — it is the cleanest reveal in the map family.
- **`proof/mapmore-scrolly-danube/`** — the scrolly, on the same plate and the same `geo-flow.ts`,
  with `MapFrame.tsx` as its per-step frame. So a stepped web presentation of this exact geometry
  already works.
- **`skills/map-web/`** — the genre's machinery: fluid stage, baked plate, HTML furniture over
  a geometry-only SVG, CSS-only filters, bounded zoom, `RegionTable`, `assets/interaction.mjs`.

### What a web sibling genuinely needs — three things, one of them new

1. **A hoverable line (Class G) — this is the only real gap.** Every existing map-web mark is a
   point. A route's readings are *along* it: which territory, at what distance, at what point of the
   journey. That needs a transparent stroked twin of the route path with `pointer-events: stroke`
   and a baked `data-detail` per segment, plus a focusable element per segment for keyboard parity.
   Nothing in either web genre does this today. **This is the same primitive B6.9 asks for on the
   slope's connecting line — build it once, in the form each genre needs, and two feedback items
   close.**
2. **Territory targets, which the genre already has in the wrong shape.** The crossed countries are
   polygons; `HIT_TARGET_PX = 28` (Class C) is wrong for them in exactly the way it is wrong for
   `mapgen-dot-web`. Both need a real path hit region. Same correction, two beats.
3. **A reading order for a route, which is not "largest first."** `RegionTable`/`readingOrder`
   sorts by value; a route's honest order is **journey order** — source to mouth. That is a
   `readingOrder` variant, not a new mechanism, and it is the one place where a route map's
   accessible channel is *better* than a choropleth's, because a route genuinely has a linear
   structure a screen reader can follow. Worth saying out loud in whatever replaces the table
   discussion (B5.2): the flow map is the map type where the linear channel is not a consolation.

Everything else — plate, filters, legend, fluid stage, window fit, no-JS survival — is reuse. The
beat is small; the primitive it needs is not currently anywhere in the tree.

---

# Appendix — the per-beat list, item by item

| # | Beat | Verified? | Class | Evidence |
|---|---|---|---|---|
| **B6.1** | `webz-bump-emitter-rank` — 2020 missing | **yes** | D | `BumpWeb.tsx:303-310`; ticks at 1400 px read `…2015 2024`; the collision test divides by `narrowestPlotPx` (`:288-289`) |
| **B6.2** | `more-heatmap-…-decades` — not full width | **yes** | E1 | `render-web.mjs:256` `max-width: 900px`; measured 645 px in a 1400 px window; the only chart-web beat not on the fluid frame |
| **B6.3** | `static-carbon-footprint-spread` — median over grey bars | **yes** | B leg 1 | `CarbonFootprintHistogram.tsx:279-287` `stroke={accent}` over `:226-234` `fill={muted}`; **1.20 : 1** |
| **B6.4** | `vidy-histogram-life-expectancy` — median + overlapping labels | **yes** | B leg 1 + **A** | median `stroke={muted}` over `fill={muted}` = **1.00 : 1** (`HistogramVideo.tsx:501-509` / `:377-392`); overlap frames 154–179, `:339-346`, `:541-565` |
| **B6.5** | `static-swiss-age-pyramid` — "widest band" + cut axis labels | **yes** | B leg 2 | leader stub `SwissAgePyramid.tsx:348-368`; **continuous spine `:311-318` strikes through all 21 band labels `:337-345`** — the video's mask (`PyramidVideo.tsx:378-396`) never travelled |
| **B6.6** | `weby-population-pyramid-switzerland` — "widest band" off-centre | **yes** | B leg 2 + D | label parked at `left:0%, top:0%` (`SwissAgePyramidWeb.tsx:324`), ten rows above its band; also **the value was dropped** — `render-web.mjs:269` `peakLabel: "the widest band"` |
| **B6.7** | `vidy-pyramid-niger-population` — overlapping labels at 0:09 | **yes** | **A** | `PyramidVideo.tsx:663-683`, identical `x`/`y`/anchor; frame 268 shows the `4.67M` ghost over `65+` |
| **B6.8** | `static-renewables-shift` — axis + connecting lines | **partly — the connecting lines ARE rendered** | B | all six slopes visible in the PNG, `RenewablesShiftSlope.tsx:252-267`. **What is genuinely absent is the two vertical axes**, which `chart-beat/references/types/slope.md:37` requires by name: *"Two vertical axes — one per period"* |
| **B6.9** | `web-co2-decline-slope` — same + hover the line | **partly** | B, **G** | **All ten `<line>` elements are in the DOM** (`co2-decline-slope.html`, 10 `<line>` + 20 leader polylines) and 9 dark runs measure at x=700; **no vertical axis rules** (`.y-axis`/`.r-axis` are label gutters). **Hover on the line does not exist**: `slope-interaction.mjs:50-60` binds `.pt` only |
| **B6.10** | `mapgen-choropleth-video` — "Poland" not centred | **yes** | B leg 2 | `bake.mjs:46` `label: [20.3, 52.2]` hand-typed, `ChoroplethStill.tsx:239-259` `textAnchor="end"`; nothing computes a centroid |
| **B6.11** | `mapgen-choropleth-video` — not empty at 0:00 | **yes** | **A** | `ChoroplethVideo.tsx:341-347` ungated `pending` texture; plate gated at `:243-251`. Frame 0 extracted: dot texture only. **Note: `video-first-frame-not-empty.test.ts` passes this beat** — its own header names "WHAT is on frame 0 — only that something is" as blind spot #1 |
| **B6.12** | `mapgen-choropleth-web` | — | B5.1–B5.3, B4.1 | also on the **two-rung** layout (E1) |
| **B6.13** | `mapmore-dot-population` — blue on grey, empty bottom | **yes** | **F** + fixed frame | dot vs. study land **3.33 : 1** against a `MIN_DOT_CONTRAST = 3` floor (`geo-dot.ts:375,398-401`); empty band comes from `FRAME = {width:920, height:1140}` (`DotDensityStill.tsx:11`) with the caveat pinned at `:121` and nothing filling the middle |
| **B6.14** | `mapgen-dot-web` — hover at capital; zoom button | **yes, both** | **C**; presentation | 42 buttons of 28×28 at country anchors, probe 60 px inside → `hidden: true`; the toggle is a bare checkbox labelled *"Zoom in (2.2×, bounded) — then scroll or use the arrow keys to pan"*. Live MapTiler controls collide with the recorded self-containment decision |
| **B6.15** | flow / route × web | **yes — the cell is empty** | **G** | `MATRIX.md`, maps table. Needs a hoverable line, polygon hit regions, and a journey-order reading |
| **B6.16** | `map-quake-density` — highlighted hexagon, nothing said | **yes** | B leg 2 | `HexGridStill.tsx:225` accent stroke, **no `<text>` names it**; the number lives only in `BRIEF.md:33` |
| **B6.17** | `map-quake-symbol` — overlap and size | **yes** | **F** | measured 49–53 px across all 17 marks (ratio 1.08); the beat's own title concedes *"only 2.9 % wider than the next"*; five Sunda-arc circles superimposed |
| **B6.18** | `mapgen-symbol-web` — hover at centre; label survives filter | **yes, both** | **C**; rule collision | 4 px inside the largest circle's edge → `hidden: true`; after a real click on "Sunda arc", circles 17→5, rows 17→5, `.point-label "M9.1"` still `display: block` (`render-web.mjs:161-163` omits it; `QuakeSymbolWeb.tsx:246-251` draws it unconditionally by design) |
| **B6.19** | `map-quake-symbol` — outlines before fills | **yes** | **A** | `QuakeSymbolVideo.tsx:212-225` outline on `furniture` (master clock), `:226-235` fill on `arrived` (own mark). Frame 40: 17 empty rings. Violates `motion-grammar.md:108` |

### Transversal items touched on this axis

| # | Verified? | Note |
|---|---|---|
| **B3.1** entrance animation | — | **nothing exists**, and no rule either way. Borrow `chart-video/assets/timing.ts`'s five named events and `scrolly`'s CSS-only, reduced-motion-gated class toggle |
| **B3.2** genuinely responsive | partly | 17/18 chart-web beats are fluid; **4 beats are still two-rung** (E1) |
| **B3.3** title full width | **yes** | `skills/chart-web/scripts/render-web.mjs:240`, one copy, reading-measure argument at `:203-208`. Chart-web only — map-web has no header cap |
| **B5.1** map fills width, fits height | **yes** | `.mw-viewport { width: min(100cqw, calc(100cqh * aspect)) }` honours the plate's **baked** aspect exactly (`render-web.mjs:334-345`), so a square plate in a landscape window is height-bound and leaves the width empty. The correction is at the **bake** (the camera must know the delivery aspect) — the same machinery B2.1/B4.1 need. `dot-population.html` measures 2092 px of document in a 900 px window, nearly all of it table |
| **B5.2** no table / accordion | **yes** | opt-in reached 2 of 5 beats; all five still render one; hexgrid ships 156 rows. Cost of the accordion argued above |
| **B5.3** filters + MapTiler controls | **yes** | filters exist and are styled (symbol-web); the zoom toggle is unstyled; live controls collide with self-containment |

---

# What I could not reproduce, plainly

1. **"The connecting lines between the two axes are not rendered" (B6.8, B6.9).** They are. Ten
   `<line>` elements are present in `co2-decline-slope.html`, the static PNG shows all six slopes,
   and a pixel column at x=700 in the driven web render yields nine dark runs (two lines merging).
   The genuine defect in the same place is that **neither the static nor the web slope draws the two
   vertical axes** that `chart-beat/references/types/slope.md:37` requires by name — a type
   sheet the artifact does not honour, in a project whose own lesson is that *prose is the unguarded
   surface*.
2. **"Two label layers overlap at 0:05" (B6.4).** The overlap is real but begins at frame **154**
   (5.13 s), not 150. At frame 150 only the short `65` is drawn. The window is frames 154–179.
3. **"The video does not start empty" — but the frame-0 guard passes it.** Not a contradiction I can
   resolve: `video-first-frame-not-empty.test.ts` requires frame 0 to be **non-empty** (it was
   built when 19 of 22 mp4s had blank poster frames), and B6.11 asks for the choropleth to be
   **empty** at 0:00. The two are only reconcilable one way — title and source at full opacity from
   frame 0 (which the chart video beats already do, `HistogramVideo.tsx:287-295`) and the map field
   empty. **The map video beats never received that fix**; `mapgen-choropleth-video`'s furniture is
   still gated on `establish` (`:205, :412`), so its title is invisible at frame 0 and only the
   pending texture satisfies the guard. `map-quake-symbol` did receive it (its frame 0 is title +
   source + note, verified). That asymmetry is the finding.
