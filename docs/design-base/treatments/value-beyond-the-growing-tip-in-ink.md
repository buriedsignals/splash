# value-beyond-the-growing-tip-in-ink

- kind: imported
- name: Every value sits beyond its bar's tip, in the page ink, never in the bar's own fill
- applies: the beat's values fall on both sides of zero and every bar can carry a printed value
- draws: value
- priority: 7
- evidence: statista-com-chart-15723-the-neat-seat-loss-gain-by-the-presidents-par
- evidence: ourworldindata-org-grapher-annual-change-forest-area
- detect: every value label's anchor lies beyond its bar's end, and its fill is the page ink rather
  than the bar's own

## The rule

Put the number past the tip, in ink. A diverging bar grows both ways and the tip is the only place a
label means the same thing on both sides.

## The evidence

**Statista** puts `−63` and `+5` outside every tip, in dark navy.

**Our World in Data** puts `-1.92 million ha` outside every tip in `rgb(91, 91, 91)` — and the detail
worth copying is that it puts the **category name immediately in front of the value**, so
`Brazil -1.92 million ha` travels outward with the negative bar while `China` stays by the zero line
with `1.94 million ha` beyond its tip. One phrase, both directions, no second rule for negatives.

## Stated as a floor, not a law

The third publication answers differently. **Datawrapper flips the label inside the fill in white
where the bar can hold it and outside in ink where it cannot** — applied per cell rather than per
row (`0.5 %` in `xFO0J`, `0.3 %` in `d8VDj`).

`references/types/diverging-bar.md` names only the ink-outside answer and warns that a label in the
bar's own accent hue has failed contrast here before. Datawrapper's inside label is **white on the
fill**, not the fill's hue on the ground, so it is not that failure — it is a fourth position the doc
does not describe, and it is worth naming before a renderer meets it.

## What limits it

**Past a certain row count nothing can be labelled**, and the plate falls back to an axis; the floor
this shares with `value-on-the-mark` is measured against the filed evidence.

**And "in ink" is not "in the accent".** A label in the bar's own hue on the ground is the failure
the type sheet warns about, and it is a different thing from Datawrapper's white-on-fill.

## A limit found at a row count the evidence never reached — 2026-09-08

Both publications under this rule label between four and sixteen rows in ONE column. Applied to
twenty-seven rows sorted by size and packed into two columns
(`proof/static-diverging-bar-eu-per-capita`), following each bar's own tip produced **twenty-seven
right edges, no two of them aligned** — a staircase of numbers down the plate. Nothing overlapped,
nothing was dropped, and no guard could see it: it is an alignment defect, and the collision checker
only knows about ink sharing a box.

What the rule is FOR survives and is kept: the value is outside its mark, in page ink, never in the
bar's own fill, which is this family's named contrast failure. What is dropped is the position. Each
number now sits right-aligned in the gutter this layout already reserved for it, beside the name it
belongs to, so the plate reads as two columns of text and a panel of bars.

**The threshold, stated so the next beat does not have to rediscover it:** follow the tip while the
rows fit one column and the reader can hold them in one look; give the values their own gutter once
the plate is packed into columns or sorted so that adjacent tips differ by a few pixels. And the
saving is not only typographic — with no value hanging off the tips, the zero rule moved to the
column's own edge and every bar got 55px longer.
