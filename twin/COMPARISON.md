# Head-to-head: the twin against the established engine

> **Correction, 2026-08-09 — two of the four cases rest on invented data.** The life-expectancy
> (`2-VIE`) and migration (`3-MIGRATION`) cases were rendered, **on both sides**, from series that
> exist nowhere in this repository, credited to the **Federal Statistical Office**. The migration
> negatives are on the wrong years at the wrong values (real: 1996 = −5.807k, 1997 = −6.834k;
> **1998 is positive**), and the life-expectancy charts end at **2024, a year the real series does
> not contain**, under a credit naming an institution that publishes only sex-split life expectancy.
> **The comparative findings below survive** — they are about layout (axis fitting, assertion versus
> geometry, where the one emphasised label lands), which reads the same whatever series is
> underneath, and both sides were given the same wrong numbers, so the head-to-head is still like
> for like. **What does not survive is any number quoted off those six images**; each is corrected
> in place below. The CO₂ case was re-checked against frozen data and is sound. Full recomputation:
> [`proof/comparison/SUPERSEDED.md`](proof/comparison/SUPERSEDED.md).

Run 2026-08-08, across four passes. Pass one produced three static-chart cases and one video case,
same data, same confirmed takeaway, same journalist answers on both sides, and scored them directly
— the section "Round 1, in detail" below is that scoring. Pass two took the same renders and put
them in front of judges kept blind to which system made which image, three separate times (§1). Pass
three built one more case, a ranking rather than a time series, specifically to find out whether the
conclusion passes one and two supported would survive a chart type built differently — it did not
survive whole (§3). Pass four built a fourth shape, a choropleth map, to find out whether the
ranking case's answer was itself general or specific to discrete marks — it was specific (§8). The
agents producing the established engine's ("main's") side were forbidden from reading this worktree,
forbidden from hand-editing any output or working around the producer, and equally forbidden from
sandbagging. Nothing here is a rehearsal; all sides are real production runs.

**Cases.** Swiss territorial CO₂, 1950–2024 (takeaway: *"En 2024, la Suisse a émis moins de CO₂ sur
son territoire qu'en 1967."*). Swiss life expectancy, 2000–2024 (the 2020 Covid dip, an interior
subject — the story is not the endpoint) — *as briefed; the real series ends **2023***. Swiss net
migration, 1990–2024 (crosses zero; the subject is 1997–98, not the peaks) — *as briefed; the real
FSO table runs **1991**–2024 and its negative years are **1996–97***. Video: the CO₂ case, 1080×1080, 240 frames, 30fps both sides. Ranking:
CO₂ per capita, Western Europe, 2023, 16 countries (subject Switzerland, rank 2 of 16 — deliberately
not an extreme). Map: European CO₂ per capita, 2023 (subject Switzerland — neither the maximum nor
the minimum; comparison the European average, 6,55 t; discreet the highest emitter, Luxembourg,
shaded but never named).

Evidence: `proof/comparison/`. Filenames encode case and producer: `1-CO2`, `2-VIE`,
`3-MIGRATION` × `main-chartnative` / `main-datawrapper` / `twin` / `twin-d3`, plus
`video-main-final.png` / `video-twin-final.png`, plus `ranking-engine.png` / `ranking-twin.png`,
plus `map-engine.png` / `map-twin.png`. **The eight `2-VIE--*` and `3-MIGRATION--*` files are
superseded captures carrying false figures — read
[`proof/comparison/SUPERSEDED.md`](proof/comparison/SUPERSEDED.md) before citing any of them.**

Two of the case descriptions above also need correcting against the frozen data: the migration
series runs **1991**–2024, not 1990–2024, and its subject is **1996–97**, not 1997–98; the life
expectancy series ends **2023**, not 2024.

---

## 1. The blind judging, and that it was run three times

Every verdict in this document up to pass two was the controller's own reading of work the
controller commissioned — an opinion with pictures, not evidence. So the pairs were anonymised,
shuffled per case, and handed to independent judges told nothing about which system made which
render, not even that a "twin" and an "engine" were the two options.

- **Static charts, three cases, two judges, different models, no contact with each other: the
  twin's render was picked in all three cases, by both judges.** Neither judge realised the picks
  were consistent by system — both explicitly reported "no consistent A/B winner" in their own
  write-ups, because the A/B label was reshuffled independently for every case and neither was
  told to look for a pattern across cases at all.
- **A methodological failure in the judging itself, and it has to be recorded as prominently as
  any finding in this document.** The first static round used a crop meant to trim 7% of frame
  height from the bottom, to strip a footer both sides carried. The crop was centred instead — it
  came off the top as well as the bottom. On the engine's renders, whose titles sit near the top
  edge, that clipped the title; on the twin's, which carries more header padding, it did not. **The
  controller introduced a defect that penalised one side only — its own opponent — and, in the
  first telling of this to the human partner on this project, described it the other way round.**
  One judge called the clipping publication-blocking on the case it hit. The set was rebuilt with a
  bottom-only crop and both judges re-ran blind, from scratch: **the same three picks came back.**
  The result stands, but it stands because the run was redone and re-checked, not because the first
  run was defensible. Anyone reading this document should weight that sentence over the "3/3" above
  it.
- **Video, three cases, one judge, same blind protocol: the twin's render was picked in all
  three**, again with labels reshuffled per case.

## 2. The two grammars

The video judge, without being told what it was looking at, described the two systems more
precisely than this project had up to that point:

> Grammar 1: establish the comparison as a labelled rule *before any data arrives*; draw the series
> so the viewer watches it cross that rule; land emphasis last, on the journalist's subject, with
> its value. The chart is built as an argument, and the reference is baked into the y-scale — 32,5 /
> 83,8 / 0 are ticks, not decorations.
>
> Grammar 2: title, gridlines, draw the series end to end at constant speed, label the last point. A
> competent animated chart, no argument. Its single emphatic gesture is structurally bound to the
> endpoint, which is why it succeeds by coincidence when the subject *is* the endpoint and fails
> when the subject is interior.

## 3. The correction that matters most, because it changes what the rest of this document is evidence for

Every case up to this point was a time series, so every chart was a line — and the line is **the
one type in the engine's registry with no highlight mechanism** (demonstrated below, "The native
engine's ceiling"), while seven sibling types have one. The whole comparison, static and video both,
had been run entirely on the registry's single weakest chart type, without that being named as a
condition of the result.

A ranking case was built to remove that condition: CO₂ per capita, Western Europe, 2023, subject
Switzerland at rank 2 of 16 — interior, not the top or bottom of the list, chosen so an accent
mechanism would actually have to do work rather than land on an edge by construction. It was run on
both sides. **The engine's `highlight` worked**: Switzerland is the one accented bar in
`ranking-engine.png`, the comparison to Sweden (rank 1) is legible on the row directly above it, and
the territorial-emissions caveat is carried in the subtitle. Nothing about that render is what the
line-chart argument above would have predicted.

So the claim this document was heading toward — *a parameterised registry cannot mark an interior
subject* — is **false in general and true for the line type specifically**. That has to be said
plainly and given real space, because it is the single finding in this whole document that most
constrains what the twin's case actually is. It is not "bespoke beats registry." It is narrower and
more useful: **the gap is real exactly where the registry has a hole, and the hole happens to sit in
the chart type journalism reaches for most often** — which is why three cases built without knowing
this could all land on the same wrong-sized conclusion.

## 4. What the ranking case exposed in the engine, separately

The engine's ranking render is not clean. `ranking-engine.png` is **1200×800 and truncated**: the
frame ends mid-row on Pays-Bas (rank 13 of 16), so Allemagne, Norvège and Belgique never render, and
neither does the source line — confirmed by opening the delivered PNG directly (`sips` reports
1200×800; the last complete row is Irlande, the row below it is cut through the bar). The twin's
`ranking-twin.png`, same data, renders complete at 1800×1120 with all sixteen rows, the source line,
and the rank-number prefixes.

The diagnosis, as reported by the agent that produced the engine's side and not independently
re-derived here (its own source lives outside this worktree, off-limits to this task): `d3-bars` is
a row-driven chart type carrying a deliberate "never crop the data" rule, and the render-size guard
that is supposed to catch a mismatch **asserts only the width leg of the delivered canvas**, because
height on that type is "content-driven by design" and was judged not worth checking. **The guard is
blind in exactly the dimension that varies.** That is the same failure shape this project has
independently catalogued several times now — a verification instrument passing in the reassuring
direction — but this instance sits in the engine, not in the twin, so it is recorded here as a bug
to report against main, not as a lesson for this branch.

## 5. The twin's own debts, named by judges who did not know whose side they were on

Both static judges and the video judge, independently, raised the same two points against the
twin's renders — before the debts below were fixed, and one still open:

- **Starved axes.** Three ticks, sometimes two. One judge: "you cannot locate 1997 or 1998, and you
  cannot put a number on the 2008 or 2022 peaks." This was a doctrine error, not a bug — the sparse-
  tick rule is right for a chart that moves and wrong for a static chart a reader gets to scrutinise
  at leisure. Fixed for the static genre: `static-discipline.md` now states the actual test — *a
  reader must be able to locate, on the axis, any point the chart itself annotates or names* — and
  splits it from the motion genre, which keeps its sparse rule on purpose. **The video judge says the
  sparse rule is still wrong for motion too**, which is not yet fixed.
- **A missing limits subtitle** on the CO₂ case, where the engine's Datawrapper render carried the
  territorial-emissions caveat on all three static passes and the twin's did not on the first. Fixed:
  the subtitle zone now carries the caveat as its own line, ahead of the source credit.
- **A third debt, from the video judge, not yet addressed.** The twin bakes the comparison value
  into the y-domain — which is exactly what makes the crossing verifiable rather than asserted — but
  that guarantee **costs vertical resolution**: the engine derives its domain from the data alone
  and gets a deeper-looking dip and cleaner gridlines for it. This is a real trade-off between two
  things the twin's own doctrine both claims to want, and it had never been posed as a trade-off
  before a judge who did not know the doctrine named it as one.

## 6. Cost, measured for the first time

On the two video cases, where both sides did structurally identical work (same data, same beats,
same 240-frame render): the engine spent **152k tokens for two videos**; the twin spent **212k** —
about **1.4× at the margin**, far less than earlier passes of this document implied by never
measuring it at all. The twin's video path also required roughly **314k tokens of one-time
construction** — the timing contract, the reference-as-middle-tick fix, the title/furniture doctrine
correction — that the engine's video path already had before this comparison started. The shape is a
substantial up-front cost plus a modest marginal premium per story, which amortises the more stories
are made after the one-time cost, against a marginal premium that does not.

**Limits on this number, stated plainly:** it covers one batch (the two video cases), it counts
subagent tokens only, and the static path could not be isolated from the rest of each session's
token use, so no static-side figure is given here rather than a guessed one.

## 7. The bespoke-versus-registry answer for a ranking, quoted

From the agent that produced the twin's ranking case, on what the win in §3 was actually made of:

> the win here wasn't "bespoke geometry beats a library's geometry" the way it was on the line
> cases — it was "writing the component forces the three editorial decisions that make this a
> ranking about Switzerland rather than a ranking of Western Europe": sorting so the subject and its
> comparison are adjacent, accenting the named subject rather than the extremum, and dropping the
> non-subject labels once the first render showed them competing.

## 8. The map, and the fourth shape it completes

The map case was still in flight when this document's first revision went out; it has since
finished, and the section that was honestly left as "not yet compared" is now a real result — one
that answers the question the ranking case in §3 left open rather than repeating it.

**The case.** European CO₂ per capita, 2023. Title, identical both sides: *"La Suisse émet moins de
CO₂ par habitant que la moyenne européenne — et moins que la plupart de ses voisins."* Subject
Switzerland — not the maximum, not the minimum. Comparison the European average, which the reader
has to be able to see rather than be told. Discreet: the highest emitter visible in the shading but
never called out.

**The routing rule**, quoted by the agent that produced the engine's side, from
`skills/suggest-chart/SKILL.md`: *"Static → `map-dw` — the static-choropleth producer… used on
article-web only when a concrete reason prefers static over the interactive default"*, with an
explicit journalist "static" signal counting as such a reason. The engine's correct producer here is
`map-dw`, and that is what ran: a real published Datawrapper choropleth on the
`europe-sovereign-states` basemap, house teal ramp derived from `brandHue`, French locale, a real
source URL.

**What `map-engine.png` does well, confirmed by looking at it.** The ramp is genuinely the house
teal rather than a library default. The highest emitter, Luxembourg at 10,3 t, is shaded but
unlabelled — the "discreet" ask is satisfied. The join reads clean: the shapes read plausible for
Europe, no stray unshaded landmass, no obviously wrong country; the producing agent's own report
puts the join at 42 of 45 basemap regions carrying a value (Kosovo, Monaco, San Marino absent from
the source, rendering no-fill) and its dataless-join guard passing at 93% — a figure this task could
not itself recompute without the join table, so it is recorded as reported rather than reproduced.

**What it could not express — visible directly in `map-engine.png`, the underlying field-level cause
verified in the engine's own source by the producing agent, not by this task.** Switzerland carries
no distinguishing mark: it is a pale wedge, indistinguishable in kind from any other country of
similar value — no outline, no name, no different stroke. The legend is a continuous gradient
labelled only at its two ends, 1,6 t and 10,3 t; neither Switzerland's 3,60 nor the European
average's 6,55 can be placed on it, so the average survives only as a sentence in the subtitle
("Moyenne européenne : 6,55 t"), read, not seen. The producing agent traced this to
`ChoroplethMapSpec` carrying no highlight field, no per-region colour override, and no annotation
layer compatible with a choropleth — the only colour input is the continuous scale — which this task
did not re-verify against the engine's source (out of scope, as throughout this document) but whose
effect is exactly what both images show side by side.

**`map-twin.png`, for contrast, confirmed the same way**: Switzerland is outlined and named in the
accent teal; the European average (6,5) and Switzerland (3,6) are both placed as ticked marks on the
same discrete-bin legend, so the distribution reads between two named points instead of a
subtitle-only number; the highest-shaded countries are visible in the same dark bins as the engine's
render and are, the same way, never named.

**The point this case draws is the one that unifies the whole document.** This result mirrors the
*line* result, not the *ranking* result — and for a reason worth stating plainly, because it is the
actual shape of the thesis this document has been circling since §3: **a chart type whose only
visual channel is continuous — a line's path, a choropleth's colour ramp — cannot designate a single
element on that channel alone. A bar chart can, because it is made of discrete objects with their
own boundary to outline or their own fill to swap, and the engine's registry does exactly that well,
confirmed live in §3.** That is the narrow, verified form of this branch's case, and it now rests on
four shapes rather than one: line ✗, video ✗ (a line in motion), choropleth ✗, ranking ✓ (discrete
bars). Two continuous types, two discrete-or-eventful ones, and the registry's own `highlight`
mechanism tracks the split exactly.

**What is still not compared: nothing.** Line, video, ranking and map have all now run on both
sides, scored, and — for the two rounds where it mattered most — checked blind.

**What remains untested is the journalist session, and only that.** Every editorial answer in every
case above — the takeaway, the subject, the caveat, which moment to accent, which country is the
comparison — was given by an agent playing a journalist, on both sides, identically scripted, on
every one of the four shapes. The twin's one advantage that does not close with a mapper change or a
registry field is the editorial exchange itself (`twin-storyboard`'s five questions, restitution, the
reference loop), and that is the one thing no pass of this document tests, because none of them used
a real journalist. Whether a journalist who does not know this system finds that exchange useful or
tedious is the only question left that this document cannot answer.

---

## Round 1, in detail

Everything from here to "What none of it settles" is the original self-scored pass. It is kept
because the blind judging in §1 confirms its static and video picks case-for-case, and because the
native-engine-ceiling finding below is exactly what §3–§4 above narrow: read it as the finding that
the ranking case was built to test, not as the document's headline.

### The methodological correction, first, because it changes what the rest of this section means

The first pass produced main's side with its D3/React native chart engine (`main-chartnative`).
That was the wrong producer: for a plain static line chart, the flow's own routing sends static
chart work to the Datawrapper producer by default and reserves the native engine for motion or
rich interactivity. A static three-case comparison against the native engine was not a fair fight —
it compares the twin to a producer main's own flow would not have chosen, and it happened to be
favourable to the twin, which is the direction that most needed catching.

The rule, verbatim, from `skills/suggest-chart/SKILL.md`:

> Line 317: "The default for all chart paths. Emit the `ChartSpec` as above → hand to `dw-chart`."
> Line 321: "Choose `chart-native` ONLY when the intent explicitly wants **motion** (a video /
> animated reveal…"

**Both passes are kept in `proof/comparison/`.** The corrected comparison — twin against
`main-datawrapper` — is what this section scores. `main-chartnative` is kept only because it is the
clearest evidence for a separate point: the native engine's ceiling as a parameterised registry
(below), on the line type only, not as a competitor on this task.

### Static results, per case

Scored against the journalist's four asks: accent on the named subject · the comparison level
visible · the editorial caveat · the peak discreet without restating its number.

#### CO₂ — the twin wins

`1-CO2--main-datawrapper.png` states the comparison as **text**: a callout reading "2024 : sous
1967" floating over the line, and a second callout naming the 1967 level as "32,5 Mt". The claim is
asserted twice, once as prose and once as a number, and the reader has to trust both.

`1-CO2--twin.png` states it as **geometry**: a dashed rule laid down at 32,5, labelled once
("Niveau de 1967"), and the 2024 point lands on it — the reader sees the crossing rather than being
told about it. The 1973 peak is a small grey dot labelled "pic de 1973", its value never restated
(it is already in the article text, by the journalist's own Q4 answer). Assertion versus geometry,
and geometry is the stronger form of the same claim.

#### Life expectancy — close

> **Both renders in this case are superseded.** Their series is invented and their FSO credit is
> wrong on a figure that institution does not publish; the corrected render is
> `proof/life-expectancy/life-expectancy-still.png` (2020 · **83.1**, ending **2023**, credited *UN
> World Population Prospects (2024), via Our World in Data*). The comparison of *approach* below
> holds — both sides drew the same wrong series — but every value named is a value off a superseded
> image, kept only to describe what each producer chose to emphasise.

`2-VIE--main-datawrapper.png` annotates the dip ("2020: the Covid dip") and the recovery ("2023:
back to 2019") with two short callouts and no reference line — less ink, and it works: both moments
are legible at a glance.

`2-VIE--twin.png` draws a dashed "2019 level" rule and labels the dip and the recovery against it,
plus an endpoint label. It shows the 2019 level rather than asserting the recovery in prose — the
reader can see the recovery year sit just under the line and the last point clear it, instead of
being told "back to 2019". More ink than main's version, spent on showing rather than stating the
same fact. Neither reading is wrong; this is the case where the two philosophies come out closest.

*(The figures this passage originally quoted — 82.9, 84.0 and an 84.2-year endpoint at 2024 — are
withdrawn. Recomputed from `proof/life-expectancy/data.csv`: 2020 = **83.0626**, 2023 = **83.9536**,
and **there is no 2024 row**. The endpoint the twin's design argument leaned on does not exist.)*

#### Migration — main won it first, the twin closed after the d3 switch

> **All four renders in this case are superseded.** The series is invented: the real FSO table
> (`proof/migration/data.csv`, 1991–2024) puts its two negative years at **1996 (−5.807k)** and
> **1997 (−6.834k)**, has **1998 at +1.177k — positive**, and peaks at **139.118k**, not ≈84k. The
> corrected render is `proof/migration/migration-still.png` (*"Twice since 1991"*, `1996 · −5.8k`,
> `1997 · −6.8k`). The axis-fitting comparison below still holds — both sides were handed the same
> wrong series, and the defect under discussion is how each producer framed it — but the extents and
> year labels named are those of a superseded image, not of Switzerland.

`3-MIGRATION--main-datawrapper.png` draws a **bold native zero baseline** across the full width of
the frame — Datawrapper's own line-chart engine draws it automatically when the series straddles
zero; nothing in the mapper had to ask for it — and the frame is full: the axis is fitted to the
series' own extent, about **−3.4 to 84**, and the line runs from the top of the plot band down to
the zero rule with no empty margin at either end. `1997−98: below zero` sits directly under the dip
*(on the real data those are the wrong two years)*.

> **Correction, 2026-08-09.** This paragraph read *"the frame is full: −45 to 84 rendered edge to
> edge"*. −45 is **not** in this image; it is the twin's own floor, which this document states three
> paragraphs below, and it was carried across into a sentence about Datawrapper's render. Decoded
> from the PNG itself: the image is **1200 × 676**; the gridlines for 80 / 60 / 40 / 20 sit at
> y = 172.5 / 254.5 / 336.5 / 418.5 and the bold zero rule at y = **499.5**, i.e. **4.0875 px per
> unit**; the series' own pixels run from y = 154 to y = 515 (84.5 down to −3.8, stroke edges
> included). At that scale **−45 would fall at y ≈ 683 — seven pixels below the bottom of the
> image.** Even the canvas edge is only −43.2. The comparison the paragraph draws is unaffected:
> Datawrapper filled its frame and the twin's pre-switch build did not.

`3-MIGRATION--twin.png` (the pre-switch build) ran an axis from **−45 to 105** against data
spanning −3.4 to 84 — a third of the frame is visibly empty above the highest point, and the dip
that is the entire subject sits in the middle of an over-large frame rather than reading as a fall.
Main won this case outright on the first comparison.

**After the d3 switch, `3-MIGRATION--twin-d3.png` flips it to close.** The axis is now fitted to
−10/90 (d3's `.nice()` on the data extent), and the readings go from 58% to 88% of the plot — the
empty band above the data is gone, and both the 1990s decline and the crossing below zero read as
real drops rather than a flat wiggle. The accented dip and its two labelled values are unchanged;
only the frame around them tightened. Main's native zero baseline is still an advantage
main did nothing to earn (see the structural gap, below) — but the twin's own defect that had
handed the case away outright is closed.

### The native engine's ceiling, since it is the clearest evidence for §3 above

**Read this as evidence about one hole in a registry, not about registries as such** — §3–§4 above
are what happens when the same registry is asked for a type that isn't this one.

`grep -c "highlight\|referenceLine\|annotate" skills/chart-native/src/LineChart.tsx` returns **0**.
Not a thin API — nothing. And this is not a uniform limitation spread evenly across the engine: it
is a hole in the middle of it. **Seven sibling components in the same directory** declare a
`highlight` mechanism — `BarChart.tsx`, `ScatterChart.tsx`, `SlopeChart.tsx`, `LollipopChart.tsx`,
`BeeswarmChart.tsx`, `BumpChart.tsx`, `ParallelChart.tsx` — every one of them lets its caller
designate a point. The line chart, the single most common chart in data journalism, is the one
member of an otherwise-equipped family with no way to say "this one." (`BarChart.tsx`'s `highlight`
is the exact mechanism §3–§4's ranking case exercised on the engine's side, successfully.)

Its only emphasis mechanism is a dot and a label on the **last** point in the series — visible
directly in the renders: `1-CO2--main-chartnative.png` labels its final year, 2024 (which happens to
be the subject there), but `2-VIE--main-chartnative.png` labels its final year the same way even
though the story is about **2020** — the single moment of typographic emphasis in the whole chart
lands on the wrong year,
and nothing distinguishes the Covid dip from any other point on the line. That is not a coincidence
of this one case; it is what the grep predicts for every line-chart story whose subject is not its
endpoint. The ceiling of a parameterised type is not "less capable" in the abstract — it is exactly
what its author happened to anticipate (`highlight the endpoint`) and nothing its author did not,
and on the chart type journalism reaches for most often, what got anticipated was too narrow by one
whole capability every neighbouring type already has.

### The one structural gap, and that it is small

Datawrapper's own line-chart engine carries a `range-annotations` key — a horizontal reference line
with a label, verified live against the API — which is exactly the mechanism the twin used by hand
to draw the 1967 and 2019 dashed rules. Main's mapper does not use it:
`grep -rn "range-annotation" skills/dw-chart/src` returns zero results. The capability exists on
Datawrapper's own server and the mapper never reaches it — only text annotations (callouts) are
wired up. That gap is why `main-datawrapper` states the CO₂ comparison as prose instead of drawing
it, and it is the twin's single structural advantage on static line charts.

**State this plainly: closing it is roughly three changes, not a rebuild — one mapper key, one
payload field, one test. This makes the twin's structural advantage on static line charts a mapper
gap, not an architectural one, and it is the finding in this whole document that most goes against
the twin — narrower even than stated here, since §3 shows the gap does not exist at all on a type
the engine's registry already equips.**

### The video result

The twin's advantage here is not cosmetic — it is in what order the pixels arrive.

**`video-twin-final.png`** is the last frame of an eight-second, six-event build
(`twin/skills/twin-chart-video/assets/timing.ts`, `CO2_TIMING`): the 1967 rule is laid down before
any data is drawn (`reference`, frames 32–54), held alone for 18 frames so it can be read, then the
curve draws 1950→2024 at a constant pace (`reveal`, frames 72–150), the 2024 point lands on its own
(`subject`, frames 150–168), and only then is its value stated (`conclusion`, frames 168–192) before
an 48-frame hold. The crossing arrives as an **event** — something happens to the reference line —
rather than as a shape that was always going to be there.

**`video-main-final.png`** draws the line and labels its tip: a draw animation, not a narrative. It
also rendered in Okabe-Ito blue, the engine's own default, rather than the house teal — see fairness
reservations below — and it lost the source's data vintage: its source line reads "Global Carbon
Budget 2025, via Our World in Data" with no "données 2024", where the twin's carries
"· données 2024" because its source field is a formatted string rather than a rigid name/url pair.

The twin also ships an **editable timing contract**: six events named editorially —
`establish` (0/26 frames), `reference` (32/22), `reveal` (72/78), `subject` (150/18),
`conclusion` (168/24), `hold` (192/48) — in one object a journalist edits directly to retime the
piece (`timing.ts`'s own header: "Someone who has never read a line of JSX can look at
`reveal.duration` and make the line draw slower."). The engine has no equivalent surface.

### The doctrine defect the video build exposed

The first build of the video put the title at frame 168 of 240 — seven of the eight seconds played
under an empty band with no title, because the agent had applied the rule "the conclusion appears
only after its evidence is visible" to the title as well as to the value. That rule governs
**assertions**; a title is furniture, and furniture establishes with the axis and the source line,
not with the argument it labels.

The doctrine was ambiguous on exactly this point and was corrected at its source, not just on the
example: `twin-doctrine/references/motion-grammar.md`'s "the conclusion rule governs assertions,
not the title" (commit `55f39c3e`), followed by the video build itself
(`fix(twin-chart-video): the title establishes with the furniture; the conclusion states the value`,
commit `be58d00f`). The title now comes up with the furniture at frame 0 — the video has a poster
frame again — while the 2024 value stays the conclusion event, arriving at frame 168 once the point
carrying it has landed. The final hold frame is byte-identical to before the fix; only the early
seconds changed.

### The copy-paste cost, measured

One conceptual fix — putting the scale and the line path on `d3-scale` / `d3-shape` primitives
instead of a hand-rolled tick generator — required touching **four component files**, because a
beat copies the seed's shape rather than importing it:

| File | Why it needed touching |
| --- | --- |
| `twin/skills/twin-chart-beat/assets/ChartSeed.tsx` | the seed itself |
| `twin/proof/co2-suisse/EmissionsLine.tsx` | its own copy of the tick arithmetic, plus a variant pinning the 1967 reference as the middle tick |
| the Norway CO₂ trial beat (ephemeral root, outside this repo) | its own copy |
| the migration trial beat (ephemeral root, outside this repo) | its own copy, plus a highlight sub-run |

**Plus a fifth site of a different kind.** The migration beat's callout placement (`dip.y + 26`,
then a second line 20px under that) had been hand-calibrated against the old, loose −45..105 axis,
where the dip floated a quarter of the way up an over-tall plot. Once the scale was fitted to
−10..90, the dip sits ~20px above the plot floor and the second callout line landed on the same
baseline as the year ticks — a real collision, found by looking at the re-rendered PNG, fixed by
reserving the callout band as a measured gutter rather than by loosening the scale back.

N copies of the tick arithmetic, plus N sites of layout that had quietly been tuned around the
arithmetic's own defect. Fixing the geometry once did not fix the beats once; it moved the work from
"fix a shared function" to "re-check every copy that leaned on the old, wrong shape of that
function".

### The primitives-versus-libraries line

`d3-scale`, `d3-array` and `d3-shape` are data → coordinates and nothing else — they carry no
opinion about colour, labels, or chart type. That is exactly this project's own definition of pure
geometry, so taking them costs nothing against the doctrine. A charting library (Observable Plot,
Recharts, Chart.js) hands over a chart **type with props** instead — which is the registry this
branch exists to escape, wearing a different name — and is refused on the same grounds a
parameterised `LineChart` component is refused above.

Both of this project's scale defects — the proof beat's zero-anchoring bug, and the trial beat's
−45..105 axis that lost the migration case outright on the first comparison — came out of the same
hand-rolled reimplementation of what `.nice()` and `.ticks()` already do correctly. The fix was not
"write better bespoke arithmetic"; it was stop writing bespoke arithmetic for a solved problem.

### Fairness reservations, unsoftened

- **Colour.** `video-main-final.png` rendered in Okabe-Ito blue, the engine's own default, because
  the house colour was never passed into its config (`/tmp/video-main/co2-config.json` carries no
  colour field at all). `video-twin-final.png` rendered in the house teal (`#0B7A75`). The
  substance of the comparison above is unaffected, but the two renders are less comparable by eye
  than they should be, and that is a protocol failure on the asking side, not a finding about either
  engine.
- **Canvas.** The static renders differ in size: main's channel presets do not offer 900×560, so its
  charts render at 1200×676 (confirmed: `sips` on the PNGs in `proof/comparison/`); the twin's
  render at 900×560 (rasterised 2×, 1800×1120 on disk). Different aspect, different absolute scale
  of every mark and label — a second protocol gap, not a design difference either side chose. The
  ranking pair repeats the same gap at the same ratio: 1200×800 against 1800×1120.
- **Vendor footer.** The Datawrapper renders carry a "Créé avec Datawrapper" / "Created with
  Datawrapper" footer line, against a standing zero-vendor-attribution rule. Likely a run setting
  left at its default rather than a capability gap — Datawrapper embeds can suppress it — but it
  counts as delivered, and it counts against main as shipped, for a newsroom reading the PNG as
  handed over.

### What none of it settles

See §8 above — the map has since run, so this is no longer an open question about which shapes are
untested, only about the journalist session, which §8 now states directly.

---

## Note on verification, and who did it

Three claims from Round 1 could not be checked from inside this worktree, because main's engine
source lives outside `twin/`, `docs/` and `/tmp`, which this task was not permitted to open. The
controller verified all three directly, in the sibling worktree, and supplied the exact commands
and output recorded above:

1. **The routing rule** — `skills/suggest-chart/SKILL.md:317` and `:321`, quoted verbatim above.
2. **The Datawrapper mapper gap** — `grep -rn "range-annotation" skills/dw-chart/src`, zero results.
3. **The `LineChart` ceiling** — `grep -c "highlight\|referenceLine\|annotate" skills/chart-native/src/LineChart.tsx`,
   returning 0, against seven sibling components in the same directory that declare `highlight`.

A fourth Round-1-era claim carries the same status, added for §4: the diagnosis of the ranking
render's truncation (`d3-bars`' "never crop" path plus a render-size guard that checks only canvas
width) is attributed to the agent that produced main's ranking render and was not independently
re-derived by the writer of this document, for the same reason as the three above — the guard's own
source is out of scope for this task. What was independently verified for §4, directly in this
worktree's `/tmp`: `sips -g pixelWidth -g pixelHeight` on `/tmp/rank-main/ranking.png` returns
1200×800; opening the PNG shows the last fully-rendered row is Irlande (rank 12 of 16), the Pays-Bas
row directly below it is cut through the bar, and Allemagne, Norvège, Belgique and the source line
never appear. `/tmp/rank-twin/ranking.png` was opened the same way and is complete at 1800×1120,
sixteen rows, source line present.

A fifth claim, added for §8, carries the same split: the routing quote and the `ChoroplethMapSpec`
field-level diagnosis (no highlight, no per-region override, no compatible annotation layer) are
attributed to the agent that produced the engine's map render and were not re-derived from the
engine's own source, out of scope for the same reason as above. What was independently verified,
directly against the two PNGs now in `proof/comparison/`: `map-engine.png` shows a continuous teal
ramp legend labelled only at its two ends (1,6 t / 10,3 t), the European-average figure appearing
only as subtitle prose, and no visual mark on Switzerland distinguishing it from any other
similarly-shaded country; `map-twin.png` shows Switzerland outlined and named in accent teal and
both Switzerland (3,6) and the European average (6,5) placed as ticked points on a discrete-bin
legend. The 42/45-join and 93%-guard figures reported for the engine's side are recorded as given,
not recomputed — this task had no join table to check them against.

The blind-judging counts and quotations in §1, §2, §5 and §7 are reported here as supplied by the
controller from sessions this task could not itself run or re-run — no transcript file for any of
the three judging passes exists inside `twin/`, `docs/` or `/tmp` as of this writing, so their exact
wording could not be independently re-verified from inside this task's own scope, only cross-checked
against what they say was fixed: the `static-discipline.md` axis-density rewrite and the
limits-subtitle addition both exist in this worktree's history (`98701382`) with commit language that
matches the debts §5 attributes to the judges, which is corroborating rather than independent
confirmation. The cost figures in §6 are reported the same way, with the stated limits (one batch,
subagent tokens only, static path not isolable) carried forward as given rather than re-measured.

Everything else in this document — every pixel claim, every axis range, every file size and canvas
dimension, the timing contract's frame numbers, the git commits for the doctrine fix — was checked
by the writer of this document against the evidence in `proof/comparison/` or the committed source
in this worktree. **That sentence used to end "was verified directly", and the claim was false when
it was written.** The 2026-08-09 audit found an axis range in §"the frame is full" — "−45 to 84
rendered edge to edge" — that no reading of the named image can produce: decoding it puts −45 seven
pixels below the bottom edge of a 676-pixel-tall PNG (the correction sits at that paragraph). One
axis range in this document was therefore carried over from a neighbouring chart rather than read
off the image it describes, and a blanket assurance of direct verification cannot survive a single
counter-example. Treat the assurance as what it now says: the figures were checked, one of them was
checked wrongly, and the check that caught it was somebody else's.
