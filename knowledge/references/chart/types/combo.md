---
id: combo
engines:
  chart-native: combo
intent: [change-over-time]
shape: wide
limits: { minPoints: 4 }
formats: [static, interactive, video]
bestFor:
  - "an AMOUNT and a RATE moving together over time — units sold against gross margin, generation against carbon intensity, arrivals against the acceptance rate — where the two are in different units and the story is that they move together (or apart)"
notFor:
  - "two series in the SAME unit — two scales for one measurement invites a height comparison that is not true; plot both on one axis (grouped columns, or two lines). The engine refuses this outright"
  - "asserting a CORRELATION between the two series — the scales are the author's choice, so any apparent co-movement is partly manufactured; if the relationship IS the claim, use a connected scatter (time as the path) or say the correlation in words"
  - "a rate that barely moves — a zero-suppressed axis turns a fraction of a percent into a full-height trend; state the number, or show the zero"
  - "an audience or a channel where the reader gets one glance — two scales need two axis labels and a legend to decode; on social-vertical, ship the amount alone and put the rate in the caption"
---

# Line + column combo (dual axis) — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "Line + Column: a good way of showing the
> relationship over time between an **amount** (columns) and a **rate** (line)", filed under both
> *Change over Time* and *Correlation* —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (the two-axis caveat) · Lisa Charlotte Rost, "Why not to use two axes, and what
> to use instead", Datawrapper blog, 2018 — the standing case against the form · credited.
> Inherits: `global/dataviz.md` (L0) and the cartesian bar/line layers (L1).

A combo draws ONE series as **columns** against the left axis and ONE series as a **line** against
an independent right axis, over a shared x. It answers **"did this amount and this rate move
together?"** — a quantity you can count and a rate you cannot, in one frame.

## Read the case AGAINST this chart first

This is the part of the chart vocabulary that misleads readers most often, and the objection is
not a matter of taste. **The second axis's scale is the author's free choice.** Rost's
demonstration is the one to hold in mind: the same two series, drawn against different second
axes, tell opposite stories — one framing shows two lines rising in step, another shows one
pulling away. Nothing in the data changed. A 2011 study she cites found superimposed dual-axis
charts performed poorly on both accuracy and time, with readers calling them confusing.

So a combo is honest only when it is **not** being used to assert a relationship. The FT's own
gloss is the safe reading — *the relationship between an amount and a rate* — but the moment the
takeaway becomes "X causes Y" or "they are correlated", the form is doing work it cannot support.

**When two charts are the better answer** — and they usually are:

- **The claim is the correlation** → a **connected scatter** (`connected-scatter.md`) puts one
  variable on each axis and time in the path. It can state the relationship; a combo can only
  hint at one.
- **The two series share a unit** → one axis. Grouped columns, or two lines. (Refused here.)
- **The reader needs both trends precisely** → two stacked charts sharing an x axis. Nothing is
  lost but the false crossing.
- **Both are quantities and the question is relative growth** → **index both to a common base**
  (100 at the first period) and plot two lines on ONE axis. This is the alternative Rost
  recommends most often, and it is honest in a way a second axis cannot be.
- **One series is context, not story** → plot the story series alone and annotate the other.

## Correctness "de base" (combo-specific)

1. **Columns = the amount, line = the rate.** The FT rule, and the engine's. Columns encode
   LENGTH from a zero baseline, so a rate drawn as column length claims a magnitude it does not
   have; a count on a zero-suppressed axis loses the zero that gives it meaning. Getting this
   backwards inverts the chart while it still looks correct.
2. **Which series is which is DECIDED, never guessed.** `comboLine` names the line explicitly and
   always wins. Failing that, exactly one `%`-marked header is accepted as the line — the one
   marker that means the same thing in every language the engine ships and can never mean a
   count. Anything else is **refused at the gate**, naming both candidates. There is deliberately
   no magnitude, integer-ness or header-word heuristic: each of those inverts silently.
3. **The left (column) axis includes 0.** Length encoding, no exceptions. → `checkComboConformance`
4. **Both series state their unit, and the two units DIFFER.** Same unit ⇒ refused, at the gate
   and again at produce. → `checkComboConformance`
5. **BOTH axes are labelled, and each axis is coloured to its own series** (column hue on the left
   ticks and left title, line hue on the right) — the only cue telling the reader which series
   reads against which. The house colour tints the furniture, never these two marks.
6. **The line never crosses the column tops.** The two scales are in different units, so the
   crossing point is a property of the domains — movable anywhere by the author, and read as an
   overtake that never happened. The geometry gives the columns the bottom band of the frame and
   the line the top band, with a gutter between; the guard refuses any layout where they meet.
   Co-movement still reads; the manufactured event cannot occur.
7. **A suppressed zero on the right axis must be legible** — at least two labelled ticks, so the
   reader can see where the scale starts. A truncated rate axis is legitimate; an invisible
   truncation is not.
8. **No mountain out of noise.** A line varying by less than 1% of its own level has no trend for
   a zero-suppressed axis to stretch to full height. → `checkComboConformance`
9. **Say the takeaway in the title.** "Sales climbed all year, but the margin kept slipping" — the
   reader should not have to decode two scales to find out what happened.

## data-to-viz / Datawrapper caveats (credited)

- The scales of a dual-axis chart are arbitrary and can therefore, deliberately or not, mislead
  readers about the relationship between the two series. (Rost, Datawrapper.)
- The one genuinely safe second axis is an **alternative scale of the same data** (°C and °F), not
  a second series — that use is not this chart type.
- Where both series share a unit, indexing to a common base and using one axis shows relative
  change without inventing a comparison.

## Motion grammar (how a combo *builds*)

See `formats/video.md`; the gesture:

- chrome first — both axis titles, both sets of ticks in their own hue, the legend;
- the **columns grow up from the baseline**, staggered left → right, so the amount lands as a
  series of arrivals;
- the **line wipes in left → right** across the top band, its dots riding the wipe.
Both are pure functions of `progress`, so frame N is reproducible.

The two bands mean the video never shows the line "overtaking" the columns mid-build — the
crossing is impossible in the layout, not merely absent from this dataset.
