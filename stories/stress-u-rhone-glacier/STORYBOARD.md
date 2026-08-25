---
takeaway: "The Rhone glacier's area in 2025 is the lowest since 1990 — 0.61 square kilometres against 1.82, a loss of two thirds. The retreat paused once: the area recorded in 2005 is identical to the area recorded in 2000."
subject: "The Rhone glacier's own surface area, measured every five years from 1990 to 2025"
comparison: "2025 against 1990 — 0.61 km2 against 1.82 km2 — with every five-year reading in between, including the 2000-2005 pause the article explains"
limits: "Eight readings, one every five years: nothing here says what happened between two measurements, so the 2000-2005 pause is a pause in the RECORD, not a proven halt in the retreat. The monitoring network attributes it to heavy winters; the data cannot confirm that attribution. area_km2 and volume_km3 are two different quantities and the beat draws only the first; the volume fell further (0.094 to 0.019) because the ice thinned as well as retreated, and that reading is named in the prose but not plotted. No uncertainty or measurement error is recorded in the frozen table."
placement: "One beat, standing where the article's own third paragraph asks for it — the reader moves through the decades one step at a time and arrives at the 2025 figure."
credit: "Source: Swiss glacier monitoring network, measurements every five years 1990-2025"
effectiveDate: "2026-08-21"
grounding: "supported"
reference: "Australian Broadcasting Corporation, \"How Buddy Franklin scaled footy's Everest\" (26 March 2022) — a series read against a historical level; accepted for slot 1, with the gap named: no row in the reference set covers a monotone decline carrying ONE explained exception, which is this story's actual structure"
language: "en"
slots:
  - id: 1
    proves: "The Rhone glacier's area falls from 1.82 km2 in 1990 to 0.61 in 2025 — two thirds gone — with one five-year interval, 2000 to 2005, in which the recorded area does not move at all."
    medium: "chart"
    format: "scrolly"
    reachable: "yes"
    candidates: ["Line", "Slope (slopegraph)", "Waterfall (bridge)"]
    chosen: "Line"
---

## What was read in the article (restitution)

Three claims could become visual, and the frozen table can carry two of them:

1. **The area fell from 1.82 km2 in 1990 to 0.61 in 2025 — two thirds.** Stated, with both
   numbers, and both are in `area_km2`. This is the beat.
2. **The volume fell further, 0.094 to 0.019 km3, because the ice thinned as well as retreated.**
   Stated, and in `volume_km3`. It is a SECOND quantity on a second scale; plotting both on one
   frame would need two y axes, which is the cluttered frame this project refuses. It is carried in
   the beat's prose instead, at the step where it belongs.
3. **The 2000-2005 pause, attributed to a run of heavy winters.** The identical readings are in the
   table. The ATTRIBUTION is not — nothing in eight rows of area and volume can confirm why the
   number stopped moving. Recorded in `limits`, and the beat's own prose says the network is the one
   making that claim.

## Gate 1 — the takeaway, and what the data says about it

`resolveGrounding` was run against the frozen `source/data.csv`. Verdict `supported`, on this
evidence:

- `2025 is the lowest since 1990` — **supported**: "area_km2 in 2025 = 0.61 is less than every other
  year checked." This is the claim the verdict rests on, and it reads real rows.
- `1.82`, `2005`, `2000` — **consistent**: placed inside a column's range, which places the numeral
  and confirms nothing.
- `0.61` — reported **supported** as "equals the sum of column volume_km3 (0.482)". It does not.
  0.61 km2 is an AREA; 0.482 km3 is the sum of a volume column; they are 0.128 apart and the
  tolerance's absolute floor is 0.5, so on a table of small fractional numbers every value reads as
  every total. Recorded here as a false positive, not as evidence. See
  `NOTES-FOR-MAINTAINER.md`.
- The second sentence — the 2000/2005 equality the article states outright — produced **no claim at
  all**. The grounder decides "lower than" between two years and does not decide "identical to".

## Gate 2a — medium

`chart`. The evidence is eight numbers over time. There is no geography in the frozen table (no
coordinates, no region names) and no photograph, so `map` and `image` have nothing to draw from.

## Gate 2b — publication format

The journalist's own last line asks for it: *"We would like this as a scrollytelling piece — the
reader should move through the decades one step at a time and arrive at the 2025 figure."*
`proposeFormats({medium: "chart"})` returns all four formats reachable; `scrolly` is one of them and
`confirmFormatReachable` returns `yes`.

## Gate 2c — size

Not asked. `proposeSizes("scrolly")` returns an empty list: a scrolly has no single exported frame,
so this slot carries no `size`.

## The candidates, and why the chosen one won

- **Line** *(chosen)* — one reading a year-group, eight of them, and the argument is the SHAPE of
  the fall plus the one place it flattens. A line is the only one of the three that can show both
  the two-thirds loss and the pause in the same picture, and it is the only chart type in the survey
  with a scrolly proven on disk.
- **Slope (slopegraph)** — 1990 against 2025 and nothing between. It states the two-thirds loss more
  bluntly than a line does, and it destroys the pause, which is the article's second paragraph.
  Its own sheet refuses it here: "Two points only. The moment there's a third time point per
  category, this is no longer a slope chart."
- **Waterfall (bridge)** — each five-year interval as a signed step, so 2000-2005 would be a bar of
  zero height: the pause becomes the most legible thing on the frame. Rejected because the reader
  then never sees the trajectory, only the differences, and the takeaway is about the level in 2025.

No Datawrapper mapping exists for `chart` / `scrolly` / `Line` (`datawrapperMatch` returns `null`),
so the producer question was never asked and the slot carries no `producer` field.

## What the beat has to do

One picture, eight readings, and the reader's scroll walks it forward one measurement at a time. The
picture is a SCRUB, not a slideshow: the line draws itself between measurements as the reader moves,
and each year's mark declares itself reached when the narrative gets there.
