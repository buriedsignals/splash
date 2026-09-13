---
format: web
type: line
---

# Beat — Life expectancy in Switzerland rose 15 years since 1950 (web)

**Type:** line. **Medium/format:** chart / **web**. **Channel:** article web. **Frame:** fluid.

Web sibling of `proof/more-line-swiss-life-expectancy` (the static beat) — same claim, same frozen
data, a fresh component written for this format's fluid-frame / baked-in-interaction shape, not a
port of the static file.

## Claim

Life expectancy in Switzerland rose by **15.0 years between 1950 and 2023**, from 68.9 to 84.0,
**first passing 80 in 2001**. Every number in that sentence is computed by `render-web.mjs` from the
frozen CSV, never asserted from this file's own approximation.

## Data

- Source: UN, World Population Prospects (2024), via Our World in Data, `life-expectancy` grapher.
- `data.csv`: copied from the already-verified static sibling's own frozen fetch (148 rows,
  1876–2023, Switzerland only) and re-verified here independently — entity check (every row reads
  "Switzerland"), row count (148), and the 1950-filtered span (74 readings, 1950–2023) all asserted
  in `render-web.mjs` before the component ever sees the data.
- Original fetch: `https://ourworldindata.org/grapher/life-expectancy.csv?country=~CHE&csvType=filtered`.

## What the type sheet asked of it

Walked against `chart-beat/references/types/line.md`, rule by rule, on this render and not on the
static sibling's.

- **The zero.** The sheet's central warning is a forced zero flattening the very change the chart
  exists to show, and it is the rule this beat spends. The readings run 68.9–84.0, so
  `scaleLinear().domain(extent(readings)).nice()` lands on 68–84 and four fifths of the frame is
  never drawn. A zero floor would leave the whole 15-year climb inside the top fifth of the plot.

- **The trap the sheet names for this type DID apply, in a form its own wording does not cover, and
  the sheet's remedy is what fixed it.** Measured first: this beat draws **one** series —
  `data.csv` carries one entity and one value column, `chartGeometry` emits one `path`, and the page
  ships one accent. So the literal trap (two lines' end-labels landing within a label's height of
  each other, with colour no fallback for a colour-blind reader) cannot occur, and the previous pass
  on the sibling line beat recorded it as inapplicable for exactly that reason.

  What does occur is the same collision between the two DIRECT LABELS a single series still has: the
  crossing note at 80.3 and the end label at 84.0 sit **22.4 % of the plot's height apart**, a
  constant, while both labels are a fixed pixel height — so the gap closes as the plot shrinks.
  Measured on the rendered file at five widths: clear by 11 px at 480 and 4 px at 414, then
  **overlapping by 1 px at 375, 3 px at 360 and 8 px at 320**. The 375 case is the standing finding
  pinned against this beat in `splash/test/web-annotation-clears-its-marks.test.ts` since it was
  written; it is now struck there.

  The sheet's remedy transfers exactly: *nudge the labels apart — up and down, not sideways off the
  line's actual endpoint.* Below 480 px the crossing note flips to sit UNDER its own point instead of
  above it. Both placements stay on the mark; neither slides the label off the point it annotates.
  The switch is a media query and not a build-time constant on purpose — the component knows its
  canonical 760×400 box and can never know the rendered height, so any pixel it chose would be
  correct at one width and wrong at all the others, which is the class of defect this beat's own
  `minGridlineGapFraction` already exists to avoid one rung down.

- **The sheet's "can a reader locate the point the chart names" test — failed, and fixing the
  collision is what fixed it.** The note used to read "first year past 80" and named no year at all,
  while the x-axis carries decade ticks (1950…2020), so the one point the chart annotates in the
  middle of the run could not be located on the axis. It now reads **"past 80 in 2001"**. Shorter to
  say and it states its own year, which is what the end label ("Switzerland 84.0 (2023)") already
  did at the other end.

- **A missing reading ends the run outright.** Nothing is bridged, because nothing is missing: the
  74 readings are consecutive years, checked in the runner's own parser (span asserted 1950–2023,
  count asserted 74).

- **No fill, no marker at every point.** The 74 `.pt` circles are `fill="transparent"` hit targets,
  not markers. The only two visible dots are the 2001 crossing and the 2023 end — the two points the
  argument names.

- **Axis density derived from the span, not a fixed count.** Eight x ticks a decade apart over 74
  years. On y the fitted scale's own ticks are 70/75/80, and 70 is dropped because its label would
  print inside 9 % of the plot's height of the 1950 reference rule's own label — a collision measured
  at 375, where "68.9" printed straight through "70". The top of the scale (84) carries no tick; the
  end label states that reading directly, in the series' own colour, which is what this type's sheet
  asks for instead of a legend.

## The interaction, written before the code

`chart-web/references/directed-interaction.md`. The same declaration is carried into the render as
`interaction`, so `assertInteractionPlan` holds this prose against the markup the page actually
ships.

### What this page earns

A still of this claim prints **three of its 74 numbers** — 68.9 on the axis at the 1950 rule, the
crossing, and 84.0 at the end — and it draws the distance between any other year and that 1950 rule
as *pixels a reader has to eyeball*. This page answers with that distance as a number, and with the
**share of the whole 15.0-year climb already banked** by the year the reader is pointing at: the
headline's own arithmetic, run on all 74 years instead of on one. A still can state the climb and a
video can play it; neither can be asked *how much of it had happened by 1985*.

### Control 1 — ask a mark

- **The reader's question.** *"How much of the climb had already happened by the year I am looking
  at?"* A reader arrives with a year of their own: the year they were born, the year a parent was,
  2001 because the chart names it, 2020 because they lived it.
- **The gesture.** `ask-a-mark`. Pointer, tap and keyboard focus share one path; a pointer anywhere
  in the plot resolves to the nearest year by x, so no tap has to land on a 5-unit circle, and
  Left/Right/Home/End step year by year from the keyboard without leaving focus. Every reading
  carries the same string on `aria-label`, separators turned into commas, so a reader who never sees
  the tooltip gets the whole answer and not a thinner half of it.
- **What changes in the picture.** The year under the pointer lights, and the tooltip prints up to
  four readings the plate does not hold: that year's own value; **how far it stands above the 1950
  rule**; **what share of the whole climb that is**; and, for the nine years the series actually
  fell, how far it fell and that it is one of only nine such years in the run.

  `2001 · 80.3 years · +11.3 since 1950 · 75% of the whole climb` — three quarters of the century's
  gain was already banked the year the chart's own marker sits on.
  `2020 · 83.1 years · +14.1 since 1950 · 94% of the whole climb · 0.7 below 2019, one of only 9
  years since 1950 that fell`.

### The reading this replaced, and why

The beat previously answered with `1997 · 79.2 years` — the year and its value, and nothing else.
That is the **weak form** `directed-interaction.md` warns against by name: the reading the mark's own
position already encodes, handed back as text. It cleared the mechanical refusal (the plate prints
only three of the 74 values, so 71 of the answers were new strings) and it still taught a reader
nothing they could not have read off the axis with a ruler. Rule 4 is the standard it failed:
*a derived reading is allowed, and it is asserted* — `web-beeswarm-co2-per-person` answers with the
share of humanity that emits less, not with the value its own position already carries.

### The two readings considered for the clause and declined

- **"The last year the series was this low."** Refused on the data, not on taste: this series is
  near-monotone — 64 of its 73 year-on-year steps do not fall at the precision the page prints — so
  for most years the answer is "last year", and
  for the nine falling years it is a year or two back. A clause that reads *last this low in 2019* on
  a chart about a 15-year climb is arithmetic dressed as a reading.
- **"Years to gain the next full year of life."** A real second reading — the PACE of the climb, not
  its total — and the reason it is not here is that the claim is the total. Two rates in one tooltip
  is two arguments, and this beat has one.

### The controls considered and declined

- **Open the full table.** 74 rows of the readings the hover already answers with. The claim of this
  type is the SHAPE, and 74 rows of text is the shape destroyed. It would fix a real targeting
  problem — at 375 px the plot is 293 px wide and consecutive years are about 4 px apart — but that
  problem is answered on a channel that keeps the shape: the pointer resolves by nearest x rather
  than by hit-testing a circle, and the keyboard steps one year at a time.
- **Brush a range / filter to decades.** Refused on the rule, not on taste. `directed-interaction.md`
  rule 5: nothing argument-bearing sits behind a control. Here the x-axis IS the encoded variable, so
  every option takes years off the frame — and three of the years it could take (1950, 2001, 2023)
  are the claim. A filter on a line's own time axis cannot obey that rule.

## What is NOT interactive, and stays drawn

The title, the caveat, the 1950 reference rule and its label, the crossing marker and its note, the
end label and the source line are drawn unconditionally and no control can remove them
(`web-discipline.md`, "What must not become interactive"). With JavaScript off, the whole plate is
still there — every word, the whole curve, the subject and its label — and every one of the 74
readings is still `tabIndex={0}` with its full answer on `aria-label`, because both were baked in at
build time. What does not survive is the tooltip box itself.

## Verification

`verify-web.mjs` on this page: **75 checks passed, 0 failed, 5 skipped**. The skips are this beat's
own shape — it ships no filter, so the filter's checks have nothing to drive.

Driven by hand in a real Chrome on top of that, at 1400, 768 and 375, and the overlay geometry
re-measured at six widths (320, 375, 479, 480, 768, 1400): no two labels collide at any of them,
which is the finding that had been pinned against this beat since the annotation census was written.
At all three widths a real pointer on 1985 answers `1985 · 76.9 years · +8.0 since 1950 · 53% of the
whole climb`; Tab reaches a reading and announces the whole answer on `aria-label`, End reaches 2023
and answers with the title's own number, three ArrowLefts reach 2020 and its fall clause, Home
reaches 1950 and the baseline sentence.

**Two things the eye caught that no check could.** The answer box is 220 × 48 px, which at 375 is 59 %
of the frame's width — so on a phone, hovering a mid-series year lays it over the end label and the
crossing note. Accepted rather than fixed: the box is the format's own `#tooltip`, it stays inside
the window, and it is up only while the reader is actively pointing, so no argument is hidden behind
a control. And the capture itself lied for two rounds — `page.screenshot()` toggles the viewport
override, which fires a `pointerleave` that clears the tooltip before the frame is painted (measured:
`hidden:false` immediately before the call, `hidden:true` immediately after, at 375 and 768 alike), so
the phone panel came back with no tooltip on a page whose tooltip was working. Captured through
`Page.captureScreenshot` directly instead, which touches no emulation.

## Source line

`Source: UN, World Population Prospects (2024), via Our World in Data · Switzerland, 1950–2023,
extracted 8 August 2026`

## Out of scope, and named rather than left quiet

- **This beat ships one page, not three filed directions.** Every `webx-*` beat does: none of the six
  has a `renders/` directory or a `render-directions-web.mjs`, and this one's component takes no
  `direction` prop. Giving it the three directions means writing a directed component against the six
  registers and the arbiter's treatments — the *directed* pass, a different chantier from this one
  (its own palette record, its interaction argued). Recorded here so the gap is a decision and not an
  oversight.
- **The beat stays on `ENTRANCE_PENDING`.** Its entrance is an editorial call about which of its own
  marks is the subject and where the reveal's head sits — named as exactly that in
  `splash/test/web-entrance-is-an-addition.test.ts`, and not something this pass decides in passing.
