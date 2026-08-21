# Approved — 1-postes-du-budget (chart / web)

Opened `renders/postes-du-budget.html` in a real browser, drove it with
`skills/chart-web/scripts/verify-web.mjs` (54 checks passed, 0 failed, 7 skipped — every skip a
check this beat's shape does not have), and looked at the frames at 1600×800, 375×812 and on hover.
Approved.

## What the picture actually does

- **Seven bars, one shared zero, drawn from a domain of `[−104,6 · 412,5]`** — zero inside the plot,
  drawn in ink at full height and labelled `0 M€` below it. No truncated axis: a bar's length is the
  whole encoding.
- **The accent is spent once**, on `Recettes exceptionnelles`, the single line that runs the other
  way. The six expenditure bars are the furniture's own `muted`, derived from the ground. Direction
  and colour say the same thing, which is the case where a second encoding costs nothing — and the
  row it picks out is the row the takeaway is about.
- **The subject's row carries a tint** (the ground moved 10 % toward the accent) so its name, its
  bar and its value read as one thing even though its bar is the shortest on the chart.
- **Every word is drawn unconditionally**: title, caveat, seven names, seven amounts, the zero
  label, the source. Verified with scripting on AND with JavaScript disabled — 10 words checked in
  both states.
- **Hover, tap and keyboard focus add the SHARE** (`38,1 % du budget primitif`), the one reading the
  printed frame has no room for seven times. 7/7 marks answer a real pointer on their own mark and
  7/7 answer a pointer anywhere in their row, at 1600 px and at 375 px. The generic accessible table
  carries all seven readings linearly (`7 rows, 7 marks, 0 missing`).

## Two things corrected before this approval, both found by looking rather than by a check

1. **At 375 px the first render drew the plot five pixels wide.** The three measured gutters —
   name column, left value track, right value track — are FIXED pixel widths, and on a phone they
   summed to 322 of 375, leaving the `1fr` plot column with what was left. Seven bars became seven
   slivers. `verify-web.mjs` passed it: its own `the plot is still a chart, not a strip` reads
   `.chart-plot`'s box HEIGHT against a 100 px floor and never looks at the plot column's width.
   Fixed inside this beat by capping each track as a `min()` of its measured width and a percentage.
2. **The write-back's value label then collided with its own wrapped name.** Its bar grows LEFT, so
   its label wanted a second reserved track exactly where the name column already was. It is now
   anchored just RIGHT of the zero line, on the row's own tint — the one row whose whole positive
   half is empty — and the reserved left track is gone entirely. The minus sign (U+2212) carries the
   direction the position no longer does.

## Recorded rather than hidden

- **The beat fits the window; it does not fill it.** At 375×812 the figure ends at 522 px and the
  rest of the window is ground. That is this format's settled behaviour, not a defect
  (`chart-web/SKILL.md`, "A beat FITS the window").
- **The frozen `part_pct` column sums to exactly 100, and the chart does not say so.** It sums to
  100 only because −9,7 cancels 9,7 points of overshoot. Printing "the parts make 100 %" beside this
  picture would be true about a column and false about a budget. The caveat states the 109,7 %
  instead.
- **`grounding: unverifiable`.** The takeaway's own numerals are written in French
  (`1 188,3`, `104,6`, `1 083,7`) and `groundTakeaway` cannot read a decimal comma, so all four
  claims came back unplaced. Written up in `NOTES-FOR-MAINTAINER.md`, not shown to the journalist.

## The gate this stands in for

No journalist was present. G3 was answered by this run, standing in for them, and the decision is
recorded in `OUTPUT-REVIEW.json` beside this file, bound to the exact render digest above.
