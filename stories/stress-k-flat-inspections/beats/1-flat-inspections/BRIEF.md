---
size: landscape
type: bar-and-column
---

# Beat — Every region reported exactly the same number of failed inspections

**Type:** bar and column (horizontal bars, one per region, zero baseline). **Medium/format:**
chart / web. **Size:** fluid (this format has no fixed pixel size — see `chart-web/references/
web-discipline.md`).

## The data, and the trap

`source/data.csv`: six regions, one column, every value **7**.

| region | failed_inspections |
|---|---|
| North | 7 |
| South | 7 |
| East | 7 |
| West | 7 |
| Central | 7 |
| Islands | 7 |

Zero variance. `source/profile.json` confirms it mechanically: `"distinct": 1`, `"min": 7`,
`"max": 7`. `source/article.md` states the office's own explanation: "a coincidence of rounding in
its reporting threshold, not a quota."

## The decision, taken explicitly

Three honest answers were on the table: refuse the form entirely (a chart is the wrong medium for
one repeated number), draw it and let the flatness itself be the finding, or something else. **This
beat draws it, and the flatness is the point.**

Reasoning: the article's actual claim is not "the inspection count is 7" — a sentence would do
that — it is "**every one of six independent regions reports the same number**," which is a claim
about UNIFORMITY across a set, not about a single value. A reader has to see all six bars land at
the identical length, at a glance, to feel how improbable that looks before the caveat ("a
coincidence of rounding, not a quota") lands — a sentence stating "all six regions reported 7"
does not carry the same weight as six bars visibly, unmistakably level. Refusing the form here
would have thrown away the one thing a chart does better than prose: pattern recognition before
close reading.

What this beat does NOT do: invent a subject to highlight. `proof/web-co2-ranking/RankingWeb.tsx`
picks one bar (Switzerland) and mutes the rest, because its argument is a comparison. This series
has no comparison — nothing is more or less important than anything else — so all six bars carry
the SAME accent ink (`FlatInspectionsWeb.tsx`'s own header doc-comment states this explicitly).
Muting five of six would invent a distinction the data does not carry.

## The framing, measured before anything was drawn

`render-web.mjs` calls `framingMeasurement` (`chart-beat/references/static-discipline.md`,
`framing-serves-the-point`) before choosing any geometry. Printed, verbatim, by this beat's own
render:

```
framing: the takeaway's own spread is 0.0% of the plot's own 0-7 extent; the largest reading is
1.00x the group's median (7) — see BRIEF.md, "The decision", for the treatment kept and why
```

`spreadAgainstExtent: 0` and `largestAgainstMedian: 1` are the two numbers this discipline was
built to catch — a HIDDEN trend flattened by its own axis, or one mark dwarfing the rest. Neither
condition is what is happening here: there is no trend to hide, because there is no variance at
all. The zero is not the picture failing to show a real signal — it IS the signal. That is the one
case `framing-serves-the-point`'s own doctrine text does not name directly (its two worked examples,
`stress-c-vacant-homes` and `stress-a-energy-bills`, both concern a REAL spread the picture
under-represents), so this beat's own record is the first to note it: a printed `spreadAgainstExtent`
of exactly 0 is not itself a defect to correct — the treatment stays a plain zero-baseline bar
chart, unbroken, unscaled, because the "flattening" this discipline warns against never applies to
a series that has nothing to flatten.

## Whether anything divides by the zero range

Checked directly, not assumed — `render-web.mjs` prints a second line before rendering:

```
zero-range probe: this beat's own domain [0, 7] maps its one value to 640 of 640 user units — an
ordinary scale, not degenerate. The alternative a fitted line/dot treatment would have chosen,
domain [7, 7] (min === max here), maps EVERY input to 320 (the range's own midpoint, not NaN —
d3-scale's own guard) and its .ticks(5) collapses to [7] — a single tick, never thrown.
```

Two findings follow:

1. **This beat's own geometry never touches the degenerate case.** `bar-geometry.ts`'s
   `rankingGeometry` always builds its scale on `domain([0, maxValue])` — a bar's length is the
   whole encoding (`bar-and-column.md`: zero baseline, non-negotiable), never a scale fitted to the
   series' own `[min, max]` spread. With every reading equal, `maxValue` is still 7, not 0, so the
   scale this beat actually uses (`scaleLinear().domain([0, 7])`) is completely ordinary. Choosing
   the bar-and-column treatment for this data was, incidentally, also what kept this beat clear of
   the zero-range trap — a fitted-scale treatment (a line or a dot strip) would not have had that
   protection.
2. **d3-scale itself does not divide by zero on an equal-endpoint domain, checked directly.**
   `scaleLinear().domain([7, 7])` does not throw and does not return `NaN`: every input maps to the
   RANGE's own midpoint (320 of a 0-640 range), and `.ticks(5)` on that domain returns a single
   value, `[7]`, rather than throwing or returning an empty/infinite set. So even the treatment this
   beat did not choose would not have produced a visible NaN or a collapsed axis — it would have
   produced something subtler and arguably more misleading: a perfectly flat line drawn dead centre
   of the plot, with no gridline above or below it to give that centre any meaning, which is worse
   than this beat's own zero-baseline bars precisely because it looks like a real reading rather
   than an absence of one.

## Grounding check, run verbatim

`groundTakeaway` (`skills/storyboard/scripts/ground-claim.mjs`) against this beat's own confirmed
takeaway and `source/profile.json`:

```
takeaway: "Every one of the six regions recorded exactly the same number of failed inspections
last year, 7 — the office calls it a coincidence of its rounding threshold, not a quota."
=> [
  {
    "claim": "7",
    "verdict": "supported",
    "detail": "within the range of column \"failed_inspections\" [7, 7]"
  }
]
```

`supported`, correctly — 7 is the only value the frozen column carries, so the degenerate `[7, 7]`
range still resolves cleanly. `checkNumericRanges` does not choke on a min/max range of zero width
either, which is the same reassurance the zero-range probe above gives about the render path: a
degenerate range does not silently defeat this toolchain's own machinery, on this data shape,
checked rather than assumed.

## Subject and accent

No subject. All six bars carry the newsroom's own accent (`PALETTE.md` — `#D4A853` on `#16191B`,
8.01:1, `origin: newsroom`, no journalist present — see that file for the full unattended-run
record). Every bar prints its own value directly at its own end, so there is no legend and no
y-axis beyond the shared zero-baseline rule.

## Source

`Source: story intake, source/data.csv (frozen) · stress test fixture, no external source cited`

`source/article.md` names no data source for these figures — a further, separate gap in the input,
noted but not fixed (the frozen article is never edited).
