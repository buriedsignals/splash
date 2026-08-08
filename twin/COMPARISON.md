# Head-to-head: the twin against the established engine

Run 2026-08-08. Three static-chart cases and one video case, same data, same confirmed takeaway,
same journalist answers on both sides. The agents producing the established engine's ("main's")
side were forbidden from reading this worktree, forbidden from hand-editing any output or working
around the producer, and equally forbidden from sandbagging. Nothing here is a rehearsal; both
sides are real production runs.

**Cases.** Swiss territorial CO₂, 1950–2024 (takeaway: *"En 2024, la Suisse a émis moins de CO₂ sur
son territoire qu'en 1967."*). Swiss life expectancy, 2000–2024 (the 2020 Covid dip, an interior
subject — the story is not the endpoint). Swiss net migration, 1990–2024 (crosses zero; the subject
is 1997–98, not the peaks). Video: the CO₂ case, 1080×1080, 240 frames, 30fps both sides.

Evidence: `proof/comparison/`. Filenames encode case and producer: `1-CO2`, `2-VIE`,
`3-MIGRATION` × `main-chartnative` / `main-datawrapper` / `twin` / `twin-d3`, plus
`video-main-final.png` and `video-twin-final.png`.

---

## The methodological correction, first, because it changes what the rest of this document means

The first pass produced main's side with its D3/React native chart engine (`main-chartnative`).
That was the wrong producer: for a plain static line chart, the flow's own routing sends static
chart work to the Datawrapper producer by default and reserves the native engine for motion or
rich interactivity. A static three-case comparison against the native engine was not a fair fight —
it compares the twin to a producer main's own flow would not have chosen, and it happened to be
favourable to the twin, which is the direction that most needed catching. (This routing rule is
stated in main's own orchestration code, in the repo this comparison is forbidden from opening; it
is recorded here as given, not independently re-grepped for this document — flagged below.)

**Both passes are kept in `proof/comparison/`.** The corrected comparison — twin against
`main-datawrapper` — is what the rest of this document scores. `main-chartnative` is kept only
because it is the clearest evidence for a separate point: the native engine's ceiling as a
parameterised registry (below), not as a competitor on this task.

---

## Static results, per case

Scored against the journalist's four asks: accent on the named subject · the comparison level
visible · the editorial caveat · the peak discreet without restating its number.

### CO₂ — the twin wins

`1-CO2--main-datawrapper.png` states the comparison as **text**: a callout reading "2024 : sous
1967" floating over the line, and a second callout naming the 1967 level as "32,5 Mt". The claim is
asserted twice, once as prose and once as a number, and the reader has to trust both.

`1-CO2--twin.png` states it as **geometry**: a dashed rule laid down at 32,5, labelled once
("Niveau de 1967"), and the 2024 point lands on it — the reader sees the crossing rather than being
told about it. The 1973 peak is a small grey dot labelled "pic de 1973", its value never restated
(it is already in the article text, by the journalist's own Q4 answer). Assertion versus geometry,
and geometry is the stronger form of the same claim.

### Life expectancy — close

`2-VIE--main-datawrapper.png` annotates the dip ("2020: the Covid dip") and the recovery ("2023:
back to 2019") with two short callouts and no reference line — less ink, and it works: both moments
are legible at a glance.

`2-VIE--twin.png` draws a dashed "2019 level" rule and labels 2020 (82.9) and 2023 (84.0)
against it, plus the 84.2-year endpoint. It shows the 2019 level rather than asserting the
recovery in prose — the reader can see 2023 sit just under the line and 2024 clear it, instead of
being told "back to 2019". More ink than main's version, spent on showing rather than stating the
same fact. Neither reading is wrong; this is the case where the two philosophies come out closest.

### Migration — main won it first, the twin closed after the d3 switch

`3-MIGRATION--main-datawrapper.png` draws a **bold native zero baseline** across the full width of
the frame — Datawrapper's own line-chart engine draws it automatically when the series straddles
zero; nothing in the mapper had to ask for it — and the frame is full: −45 to 84 rendered edge to
edge. `1997−98: below zero` sits directly under the dip.

`3-MIGRATION--twin.png` (the pre-switch build) ran an axis from **−45 to 105** against data
spanning −3.4 to 84 — a third of the frame is visibly empty above the highest point, and the dip
that is the entire subject sits in the middle of an over-large frame rather than reading as a fall.
Main won this case outright on the first comparison.

**After the d3 switch, `3-MIGRATION--twin-d3.png` flips it to close.** The axis is now fitted to
−10/90 (d3's `.nice()` on the data extent), and the readings go from 58% to 88% of the plot — the
empty band above the data is gone, the 1990s decline and the 1997–98 crossing below zero both read
as real drops, not a flat wiggle. The accented dip and its two labelled values (−1.9, −3.4) are
unchanged; only the frame around them tightened. Main's native zero baseline is still an advantage
main did nothing to earn (see the structural gap, below) — but the twin's own defect that had
handed the case away outright is closed.

---

## The native engine's ceiling, since it is the clearest evidence for the whole premise

`main-chartnative`'s `LineChart` has no `highlightIndex`, no reference line, no annotation array
and no caveat field. Sibling chart types in the same registry (bar, for instance) carry `highlight`;
the line component does not. Its only emphasis mechanism is a dot and a label on the **last** point
in the series — visible directly in the renders: `1-CO2--main-chartnative.png` labels 2024 (which
happens to be the subject there), but `2-VIE--main-chartnative.png` labels 2024 the same way even
though the story is about **2020** — the single moment of typographic emphasis in the whole chart
lands on the wrong year, and nothing distinguishes the Covid dip from any other point on the line.
That is the ceiling of a parameterised type: it does exactly what its author anticipated
(`highlight the endpoint`) and nothing its author did not. (The absence of `highlightIndex` /
reference line / annotation / caveat props on `LineChart` is stated as verified by grep in the
source material for this comparison; this document did not re-run that grep, for the same
path-restriction reason noted above — flagged below.)

---

## The one structural gap, and that it is small

Datawrapper's own line-chart engine carries a `range-annotations` key — a horizontal reference line
with a label, verified live against the API — which is exactly the mechanism the twin used by hand
to draw the 1967 and 2019 dashed rules. Main's mapper does not use it: a search for
`range-annotation` in its mapper source returns nothing; only text annotations (callouts) are
wired up. That gap is why `main-datawrapper` states the CO₂ comparison as prose instead of drawing
it, and it is the twin's single structural advantage on static charts.

**State this plainly: closing it is roughly three changes, not a rebuild — one mapper key, one
payload field, one test. This makes the twin's structural advantage on static charts a mapper gap,
not an architectural one, and it is the finding in this whole document that most goes against the
twin.** (The `range-annotations` API check and the mapper grep are, again, source-side verification
this document did not re-run — flagged below.)

---

## The video result

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

---

## The doctrine defect the video build exposed

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

---

## The copy-paste cost, measured

One conceptual fix — putting the scale and the line path on `d3-scale` / `d3-shape` primitives
instead of a hand-rolled tick generator — required touching **four component files**, because a
beat copies the seed's shape rather than importing it:

| File | Why it needed touching |
| --- | --- |
| `twin/skills/twin-chart-beat/assets/ChartSeed.tsx` | the seed itself |
| `twin/proof/EmissionsLine.tsx` | its own copy of the tick arithmetic, plus a variant pinning the 1967 reference as the middle tick |
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

---

## The primitives-versus-libraries line

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

---

## Fairness reservations, unsoftened

- **Colour.** `video-main-final.png` rendered in Okabe-Ito blue, the engine's own default, because
  the house colour was never passed into its config (`/tmp/video-main/co2-config.json` carries no
  colour field at all). `video-twin-final.png` rendered in the house teal (`#0B7A75`). The
  substance of the comparison above is unaffected, but the two renders are less comparable by eye
  than they should be, and that is a protocol failure on the asking side, not a finding about either
  engine.
- **Canvas.** The static renders differ in size: main's channel presets do not offer 900×560, so its
  charts render at 1200×676 (confirmed: `sips` on the PNGs in `proof/comparison/`); the twin's
  render at 900×560 (rasterised 2×, 1800×1120 on disk). Different aspect, different absolute scale
  of every mark and label — a second protocol gap, not a design difference either side chose.
- **Vendor footer.** The Datawrapper renders carry a "Créé avec Datawrapper" / "Created with
  Datawrapper" footer line, against a standing zero-vendor-attribution rule. Likely a run setting
  left at its default rather than a capability gap — Datawrapper embeds can suppress it — but it
  counts as delivered, and it counts against main as shipped, for a newsroom reading the PNG as
  handed over.

---

## What none of it settles

**Maps** — untested on either side, and the most expensive comparison left to run.

**The journalist session.** Every editorial answer in every case above — the takeaway, the subject,
the caveat, which moment to accent — was given by an agent playing a journalist, on both sides,
identically scripted. The twin's one advantage that does not close in three changes is the
editorial exchange itself (`twin-storyboard`'s five questions, restitution, the reference loop) —
and that is the one thing nothing in this document tests, because nothing here used a real one.

---

## Note on verification limits

Two claims above (the native engine's missing `highlightIndex` / reference-line / annotation /
caveat props on `LineChart`, confirmed by grep; and the `range-annotations` gap in main's
Datawrapper mapper, confirmed by grep plus a live API check) come from the source material handed
into this comparison, not from a grep this document re-ran — main's engine source lives outside
`twin/`, `docs/` and `/tmp`, which this task was explicitly not permitted to open. The routing rule
that static chart work defaults to Datawrapper is reported on the same basis. Everything else in
this document — every pixel claim, every axis range, every file size and canvas dimension, the
timing contract's frame numbers, the git commits for the doctrine fix — was verified directly
against the evidence in `proof/comparison/` or the committed source in this worktree.
