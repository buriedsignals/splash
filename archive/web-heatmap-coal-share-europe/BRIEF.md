# web-heatmap-coal-share-europe — brief

Type: `heatmap` · format: web · static sibling: `proof/static-heatmap-coal-share-europe`
Type sheet: `skills/chart-web/references/types/heatmap.md`

## The takeaway

Coal's share of electricity fell in all twelve of the EU-27-plus-UK countries that burned the most
of it in 2010, and Poland is the only one still above half — but the fall was not a slide. At every
line a reader can draw above 5 %, some country that had already dropped below it came back.

## What the static frame had to omit

The still prints two columns of numbers, 2010 and 2024, out of fifteen. The thirteen columns
between them are colour only, and colour ranks — it does not measure. Three readings are therefore
unreachable on the plate:

- **every intermediate value** — 156 of the 180 cells carry no number at all;
- **the year each country crossed any given line**, which is a fact about the middle of the series
  and exists in no column the still labels;
- **the relapses.** Czechia is above half in 2010–2012, below in 2013–2015, and back above in 2016.
  The Netherlands is *under* 25 % in 2010 and climbs past it in 2014. On the still these are two
  shades of grey a reader has no way to convert into "it came back".

## The gesture, argued — BEFORE ANY CODE

**What the type has to spend to draw at all.** A heatmap spends its entire quantitative channel on
colour. There is no axis anywhere on the plate on which a value lives, so there is no coordinate at
which "25 %" could be drawn, and the reader's only frame of reference is a key with bins in it. What
that spend makes unreachable is *the line*: the still's author picked "more than half" and the grid
cannot say what the picture looks like at any other line.

**The gesture.** The reader moves the line — 50 %, 25 %, 10 %, 5 %, 2 % — and the grid outlines
every cell that is still above it. Because the columns are years, that outline is not a blob: it is
a **frontier in time**, one run per country per line, and its ragged right edge *is* the year each
country crossed. The reading the control buys back is the one the plate spends its whole channel to
make impossible.

**Why this gesture and not a neighbour's.** `references/types/heatmap.md`'s worked example
(`proof/web-heatmap-europe-electricity`) spends `filter.ts` in its threshold-as-named-bands form —
the marks under the floor *leave*. That is the wrong mechanism here, and `cutoff.ts`'s own header
says why in the type's own name: on a plate whose one channel IS the filtered variable, filtering on
it deletes the bottom of the ramp. It is also the wrong *question*: that grid's columns are nine
sources, an unordered set, so what survives a floor is a list. This grid's columns are fifteen
consecutive years, so what survives a line is a **shape with a right-hand edge**, and the edge is
the answer. Same family of mechanism, a question the neighbour's plate cannot ask.

**The vocabulary**: `skills/chart-web/assets/cutoff.ts`. Its spans are drawn once, where they
belong, and revealed by `:checked`/`:has()` — no script, so the line still moves with JavaScript off.
Its own refusal (two options selecting the same region) is exactly the risk here: 1 % and 2 % select
nearly the same frontier, and 1 % is not offered for that reason.

**What does NOT move, and each is a decision.**

- **The cells never change colour.** `cutoff.ts` outlines rather than recolours, and on this plate
  that is not taste: repainting the selected cells would spend the only channel the chart has.
- **The ramp and its key do not move.** A reader who raises the line is asking a question *about*
  the scale, not changing it; a rescaling ramp would make the two states incomparable, which is the
  whole point of a control.
- **The 2010 and 2024 printed values stay printed in every state.** They are the claim.
- **The rows keep their order** (2010 share, descending). Re-sorting per line was considered and
  refused: the staircase is only readable because the rows are in the order that makes the frontier
  monotone-ish, and a re-sort would hide the relapses the control exists to reveal.

**The default state.** The 50 % line, checked, with its own frontier drawn: Poland's full fifteen
years, Czechia's two runs, Greece's two, Bulgaria's single 2011 cell. Everything the title claims —
all twelve fell, Poland alone above half — is legible before anything is touched, and is the picture
a reader with no script never leaves.

**The sentence each option owes.** How many of the twelve were above that line in 2010 and how many
in 2024; and how many of them came back above it after having dropped below. That second number is
this beat's real finding and it is on no other channel: 3 countries at 50 %, 5 at 25 %, 3 at 10 %,
**none at 5 %**, 1 at 2 %.

## The readings

- **Hover / tap / Tab on any of the 180 cells** — country, year, exact share to one decimal, the
  change in points since that country's own 2010, and its rank among the twelve that year. The rank
  is derived in the runner from the frozen file; the browser formats nothing.
- **The cutoff's five options** — each reveals its own sentence into a `role="status"` row whose
  height is reserved in every state.
- **The frontier itself** — the picture, for a reader who is looking at it.

## The refusals

- `assertCutoffDeclaration` — a region off the frame, an option with no sentence, an accessible name
  that does not contain its visible label, and two lines selecting the same region.
- `assertRampIsReadable`-shaped checks, carried over from the static sibling: every ramp stop clears
  3:1 against this direction's own ground, and the ratio sequence never moves back on itself.
- A printed cell value is measured against the fill it really sits on and refused under 4.5:1.
- The runner re-derives all twelve countries, all fifteen years and every claim from the frozen file
  and throws before the render: a hole in the grid reads as a low value, so a gap is a stop.

## Verification

- `bun proof/web-heatmap-coal-share-europe/render-directions-web.mjs` — three directions, none refused.
- `bun skills/chart-web/scripts/verify-web.mjs --file proof/web-heatmap-coal-share-europe/renders/creme.html --shots --out <dir>`
- Then OPEN the shots and look. A script cannot see a collision, a clipped mark, or a squat plot.

## Two costs this beat does not hide

**Nocturne carries the tightest ramp.** The deep end's carry past the accent is searched per
direction against two floors at once — adjacent bands far enough apart to read, and every band with
headroom left to answer a pointer — and on nocturne the ink IS the light pole, so the second floor
caps the carry at 0,20 where creme takes 0,40 and rapport 0,45. Nocturne's six bands therefore sit
in a narrower range than the other two directions': legible, measured, and visibly more compressed.

**At 375 x 812 the grid is not readable, and that is the FORMAT's open question, not this beat's.**
Twelve rows of fixed-size type in a plot that is 120px tall at the floor is twelve labels in ten
pixels each. `verify-web.mjs` passes the page green — it measures fit, not collision — and the
committed worked example for this type (`proof/web-heatmap-europe-electricity`, seven rows) collapses
the same way at the same width. Nothing is hand-patched here: a matrix at phone width is a decision
about the frame's own proportions and it belongs to the owner, exactly as `chart-web/SKILL.md` says
filling the window does.
