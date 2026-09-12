# `likert` (R package) — *Analysis and Visualization of Likert Based Items*

- url: `https://jbryer.github.io/likert/`
- archive: `search`
- harvested: 2026-09-08, browser, no consent dialog, no entry screen
- what was actually looked at: `graphic.png` — the `<img>` the landing page shows, 576 × 720 at
  `documentTop` 246, `nearTheTop: true`. A raster the package renders and publishes as its own
  front-page example.

## What it is

The front-page example of Jason Bryer's R package `likert` — the software implementation of
Heiberger & Robbins' *Design of Diverging Stacked Bar Charts for Likert Scales* (JSS, 2014). Like
the Vega-Lite entry it is a **specimen** rather than a news graphic, and it is the specimen with the
longest design lineage in this family.

Eleven statements about reading, each its own panel; three countries (United States, Mexico, Canada)
as three rows inside each panel; a **four-level scale with no neutral** — Strongly disagree,
Disagree, Agree, Strongly agree.

## What it does with information

- The centre is the **gap between disagree and agree**, not a straddled neutral. With no neutral
  level in the data, the anchor is the boundary itself, and the chart is honest about that by
  putting nothing on it.
- **The two totals are printed outside the bar, one at each end**: `50%` at the left margin, `50%`
  at the right, `70%` / `30%`, `74%` / `26%`. Total-disagree and total-agree — the two numbers a
  reader of a Likert chart actually wants — sit outside the ink, in the margin, where no segment can
  be too small to hold them. No number is placed inside a segment anywhere in this chart.
- **The x axis reads magnitude, not sign**: `100 · 50 · 0 · 50 · 100`, mirrored, titled
  `Percentage`. Nothing is labelled negative, because nothing is negative. This is the one thing
  this chart does that neither of the other two references in this family does.
- Each panel carries the **statement itself as its strip title** — "For me, reading is a waste of
  time." — so the row labels can stay as the three country names and nothing has to be looked up.
- Statements keep a given order, not an order derived from the result.
- One legend below the whole figure, labelled `Response`, naming all four levels once.

## What it does with style

Read from `record.pixel`, whose `routes.pixel.measuredFrom` is `graphic.png`:

- ground `#FFFFFF` at **55.981 %**, with `#F0F0F0` at **17.122 %** — the second is the panel fill
  and the strip bands. The plotting area sits on a light grey plate inside a white page, so the
  bars have an edge to end against.
- chromatic: `#D8B365` at 4.308 % and `#EBD9B2` at 6.355 % on the disagree side; `#5AB4AC` at
  2.022 % on the agree side, with `#ACD9D5` at 5.338 % filed under *neutral* because its chroma
  falls below the chromatic threshold — that pale teal is the fourth fill, the light Agree.
  Read as a ramp: `#D8B365` → `#EBD9B2` ‖ `#ACD9D5` → `#5AB4AC`. **Deep at the ends, pale beside the
  centre**, on a brown/teal axis rather than a red/blue one.
- `pixel.shape` is reported as **`diverging`**.
- The palette is ColorBrewer's `BrBG`, 4-class — a diverging scheme whose two arms stay
  distinguishable under the common red-green deficiencies, which red/blue does not guarantee at the
  pale end.

Type: `record.style.typeSource` is **"the page only — the graphic is a raster and carries no type
this route can read"**. The `Helvetica Neue` and `Menlo` families in the record are the pkgdown
site's furniture and **are not the chart's voice**; the chart's own labels were rendered by R and
this route cannot read them.

## What is transferable

- **The two totals belong outside the bar, at the ends.** They answer the question the chart is
  for, they never collide with a small segment, and they cost no ink inside the ramp.
- **A mirrored magnitude axis.** `100 · 50 · 0 · 50 · 100` says what the numbers mean; a signed axis
  under a count of people says something false.
- **The ramp deepens outward**, pale beside the centre — the same rule the Vega-Lite specimen obeys,
  on a different hue axis.
- **A diverging scheme chosen for CVD separation**, not for prettiness: brown/teal rather than
  red/blue.
- **The statement is the panel's title, the row label is the comparison** — one label system for
  what is asked, another for who was asked, never mixed.

## What was not verified

- Every type value in the record belongs to the pkgdown page. Nothing about the chart's typeface,
  size or weight is measured here, and none of it may be quoted as the graphic's.
- The exact fourth fill. `#ACD9D5` is filed as neutral by chroma, and is being read as the light
  Agree from the picture; the record does not label it as such.
- Whether each row sums to 100 %. The printed pairs (50/50, 70/30, 74/26) are consistent with it,
  but only the pairs were read, not the four segments.
- Contrast of any label against any fill — there are no in-segment labels to measure.
- This is a **package's own example**, published by its author. It is evidence of a design lineage,
  not of a newsroom's practice.
