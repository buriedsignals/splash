---
format: web
type: line
medium: chart
grounding: supported
derived: v1
---

# Beat — Le CO₂ suisse est repassé sous son niveau de 1967, 57 ans effacés (web)

**Type:** line. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Switzerland's annual CO₂ peaked at **46,2 Mt in 1973** and stands at **32,1 Mt in 2024** — **30,6 %
below the peak**, and **below its own 1967 level (32,5 Mt)**: 57 years erased.

The reference year is **found, not typed** — the last year before the peak still at or below today's
reading is 1966, so the crossing is 1967 — and the beat throws if today does not sit between those
two years' readings, or if the fall from the peak is not large.

## A line carries a rate, so it refuses a forced zero

`proof/web-area-swiss-co2` draws this same frozen file **filled**, and requires its zero: the moment
a series is filled, every clipped tonne becomes surface a reader integrates. Nothing here is measured
by its length from a baseline — the slope carries the reading — so the axis is fitted and the caveat
says so. **The two beats say opposite things about the same series, for stated reasons.**

## Treatments spent

- `the-target-is-named-on-the-line-that-draws-it` — the 1967 level is a rule across the whole frame
  with its name **on** it, so the crossing is visible where it happens rather than asserted in a
  title.
- `direct-end-label-in-the-series-colour` — the last reading is labelled at the end of the line, in
  the line's own colour: one series needs no legend.

## What the type sheet asked of it

Walked against `chart-beat/references/types/line.md`, rule by rule.

- **The zero.** The sheet's central warning is a forced zero flattening the very change the chart
  exists to show. It does not bite here, and for a stated reason rather than by luck: the series
  STARTS at 0,15 Mt in 1858, so its own extent already contains zero and a fitted axis lands on the
  same 0–50 a forced one would. The axis is typed rather than generated, and the component throws if
  any reading falls outside the ticks it was given, so a series that moves fails loudly instead of
  drawing outside its own frame.
- **The trap the sheet names for this type — colliding end-labels — cannot occur here.** It is a
  two-or-more-series failure: one series, one end-label, no hue anybody has to tell apart. Recorded
  as inapplicable rather than as passed.
- **A missing reading ends the run outright.** Guarded at the top of the runner: the series is
  asserted to be 167 consecutive years and throws naming the two years it skipped between. Nothing
  is bridged because nothing is missing.
- **No fill, no marker at every point.** The 167 `.pt` circles are `fill="transparent"` hit targets,
  not markers; the only two visible dots are the peak and the last reading, which are the two points
  the argument names.
- **Axis density derived from the span, not a fixed count.** Five ticks 40 years apart over 167
  years. The sheet's test — can a reader locate a point the chart itself annotates — is met on the
  frame rather than on the axis: both annotated points carry their own year in the annotation sitting
  at the point (`pic 1973 · 46,2 Mt`, `2024 · 32,1 Mt`), and the third named year, 1967, is a
  horizontal rule across the whole width, so it is read off the y-axis and not the x.

## The interaction, written before the code

### What this page earns

A still of this claim prints four of its 167 readings — the peak, the 1967 rule, the last year, the
title — and asserts **one** comparison: today against 1967. The reader has to take that one baseline
because it is the only one on the plate. This page hands the baseline to the reader: **any of the 167
years answers with how far today's Switzerland is from it, and how far back today's reading winds the
series** — the headline's own arithmetic, run on every year instead of on one. A still can state the
comparison and a video can play it; neither can let a reader choose which comparison to make.

### Control 1 — ask a mark

- **The reader's question.** *« Elle valait combien, cette année-là — et où en est-on par rapport à
  elle ? »* The Swiss reader arrives with a baseline of their own: 1990, the year every target is
  written against; the year they were born; the year they remember the motorway Sundays.
- **The gesture.** `ask-a-mark`. Pointer, tap and keyboard focus share one path; a pointer anywhere
  in the plot resolves to the nearest year by x, so no tap has to land on a 2 px circle, and
  Left/Right/Home/End step year by year from the keyboard without leaving focus.
- **What changes in the picture.** The hovered year lights and the tooltip prints four readings none
  of which is on the plate: the year's own value; how far under the 1973 peak it sat; for every year
  after the peak, **the pre-peak year the series has been wound back below, and how many years that
  erases**; and, for every year but the last, **where 2024 stands against it** — a percentage while
  today is more than double that year, where it becomes a multiple: 2024 is 219 times 1858, and
  "21 783 % plus haut" is an arithmetic result rather than a reading anybody can hold.

### The reading this replaced, and why

The beat previously answered with *« le niveau n'avait pas été aussi bas depuis N ans »* — the last
year, anywhere in the series, at or below this one. Measured on the committed render: **2024, the
year the whole beat is about, carried no such clause at all.** 2023 came in at 31,98 Mt, marginally
under 2024's 32,07, so the gap collapsed to one year and the clause was suppressed. The reading went
silent on exactly the phase the claim is about, and it was a *second* arithmetic for a question the
headline had already answered a different way.

It is now the headline's own arithmetic, from one function: **the last year BEFORE THE PEAK at or
below this reading.** `woundBackTo` computes the beat's reference year (1967, from 2024's 32,07 Mt)
and every year's own clause — one implementation, so the tooltip cannot disagree with the title.
On the post-peak limb it is stable where the old one was not: 2022 → 1968 (54 ans), 2023 → 1967
(56 ans), 2024 → 1967 (**57 ans — the title's own number, not a second copy of it**).

It is drawn only for years after the peak. Before the peak the series had never been that high, so
"wound back to" answers nothing: 1900's 5,7 Mt was last seen in 1946, on the way down through a war,
and printing that under a claim about decarbonisation would be an accident dressed as a reading.

### The controls considered and declined

- **Open the full table.** 167 rows of the same readings the hover answers with. It would fix a real
  targeting problem — at 375 px the plot is about 335 px wide and consecutive years are 2,0 px apart,
  so a reader cannot aim at 1990 — but the claim of this type is the SHAPE, and 167 rows of text is
  the shape destroyed. The targeting problem is answered on a channel that keeps the shape: the
  keyboard steps one year at a time, and the pointer resolves by nearest-x rather than by hit-testing
  a circle.
- **Brush a range / filter to eras.** Refused on the rule, not on taste. `directed-interaction.md`
  rule 5: nothing argument-bearing sits behind a control. Here the x-axis IS the encoded variable, so
  every option takes years off the frame — and two of the years it could take, 1973 and 1967, are the
  claim. A filter on a line's own time axis cannot obey that rule.

## Verification

`verify-web.mjs` on all three directions — creme **93 passed, 0 failed, 6 skipped**, nocturne and
rapport **87 / 0 / 5** each, across seven widths from 3440 to 375. The skips are this beat's own
shape: it ships no filter, so the filter's checks have nothing to drive.

Driven by hand on top of that, in a real Chrome at 1400×900 and at 375×812: a pointer on 1990's own
mark answers *« 1990 · 44,1 Mt de CO₂ · 4,5 % sous le pic de 1973 · aujourd'hui 27,4 % plus bas »*;
keyboard focus on the last mark answers with the title's own number, and Left/Left walks back to
2022; Home reaches 1858 and answers *« aujourd'hui 219 fois plus »*. At 375 the answer box measures
220×82 px and sits inside the frame — the same shape it had before this change, measured on both.

One thing the eye caught and the script could not, on an earlier pass: the top tick's label sat on
the caveat line, because this component mapped its own scale instead of using the shared `fitY` and
its headroom.

## Source

Global Carbon Budget 2025, via Our World in Data · Switzerland, 1858–2024, 167 consecutive readings.
`data.csv` is a byte-for-byte copy of `proof/co2-suisse/data.csv`.

## Precision

```json splash:precision
{
  "kind": "pointer",
  "rounding": null,
  "asserts": [],
  "values": {},
  "staticFloor": [],
  "onDemand": [],
  "unfound": [],
  "covers": {
    "claim-datum": null,
    "the-reference-year-is-found-not": null,
    "a-gap-breaks-the-line-rather": null,
    "every-revealed-reading-the-distance-from": null,
    "asserted-in-the-js-off-floor": null
  }
}
```

## The choreography

```json splash:choreography
{
  "kind": "pointer",
  "promiseSource": "slot",
  "controls": [
    {
      "order": 1,
      "gesture": "ask-a-mark",
      "input": "hover"
    }
  ],
  "keyboard": true,
  "degradesTo": "static-frame"
}
```
