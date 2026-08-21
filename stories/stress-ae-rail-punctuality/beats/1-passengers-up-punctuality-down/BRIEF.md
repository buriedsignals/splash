---
size: landscape
type: line
---

# Beat — two readings of one railway, twelve years, opposite directions

**Type:** line, drawn as two stacked panels sharing one time axis. **Medium/format:** chart /
video. **Size:** landscape (1920 x 1080), 30 fps, **300 frames = 10.0 s**.

The size is in the front matter as well as in that sentence, and the front matter is the one that
counts: `render.mjs` reads it with `readPinnedSize` and renders the composition of that name.

## Claim

Rail passengers rose from **58.2 million in 2014 to 74.6 million in 2025** while punctuality fell
from **91.4 per cent to 81.6**. **2020 breaks both series, in opposite directions**: 28.1 million
passengers, the lowest reading in the table, and 94.6 per cent on time, the highest.

## Data

- `../../source/data.csv`, frozen. **12 rows**, `year,passengers_millions,punctuality_pct`,
  2014-2025, no gaps, no missing values, no duplicates.
- Nothing is reshaped here. The beat reads the frozen file directly; there is no story-local copy
  to drift from it.
- **Credit: none.** The article attributes these figures to nobody. `proposeCredit` recommended
  `none`, the journalist took it, and the frame prints `Source: not stated`.

## Exact values, read from the frozen table

| year | passengers (m) | on time (%) |
| ---: | ---: | ---: |
| **2014** | **58.2** | **91.4** |
| 2015 | 60.1 | 90.8 |
| 2016 | 62.7 | 89.2 |
| 2017 | 64.0 | 88.1 |
| 2018 | 66.9 | 86.7 |
| 2019 | 69.4 | 85.3 |
| **2020** | **28.1** | **94.6** |
| 2021 | 41.5 | 92.0 |
| 2022 | 58.8 | 87.4 |
| 2023 | 66.2 | 84.9 |
| 2024 | 71.0 | 83.1 |
| **2025** | **74.6** | **81.6** |

Derived in `render.mjs`, never typed into the title: passengers **+28.2%** over the period,
punctuality **-9.8 points**. 2020 is the minimum of `passengers_millions` and the maximum of
`punctuality_pct` — both extremes of the table fall in the same row, which is the fact the subject
event exists to land.

## The evidence hierarchy

1. The two trajectories, each on its own fitted scale, in its own panel.
2. 2020, in both panels at once, tied together so the reader sees it is one year.
3. The two end values at 2025, stated as numbers at the point they belong to.

## Why two panels and not two axes

This is the beat's one real design decision and it is a refusal.
`chart-beat/references/types/line.md` says it in its own words:

> never give two series their own, independently-scaled y-axis: a reader assumes one shared scale,
> so a "line went up" on the left axis and a "line went down" on the right axis can describe the
> same magnitude of change and still look like opposite stories. Index both series to a common
> base, or split the frame in two.

Of the two remedies it offers, indexing both series to 2014 = 100 would erase the four figures the
takeaway states — 58.2, 74.6, 91.4, 81.6 — and replace them with index points nobody reported. So
the frame is split in two. Each panel keeps its own honest fitted extent (a line encodes change by
slope; anchoring either at zero would flatten the very change this beat is about), each keeps its
real unit, and the shared time axis is what lets the reader read one year across both.

**This refusal is not reachable from the survey the exchange shows the journalist.**
`storyboard/references/type-survey.md` carries only the FIRST sentence of the Line sheet's "when
not to reach for it" paragraph, and the dual-axis prohibition is the fourth. It was found by
reading the sheet itself. Written up in `NOTES-FOR-MAINTAINER.md`.

## The reveal order, and the guard that decides it

Both lines draw **in lock-step, chronologically, 2014 to 2025, linear** — one shared head, one mark
per year, each at its own position on the visible time axis. Linear because the x axis is time:
easing it would make 2016 and 2017 occupy different amounts of screen time, which is a lie about
the pace of the data.

The two lines arriving together is **one event, not two layers animated at once**. The argument is
that these two readings are contemporaneous and disagree; drawing one and then the other would tell
the reader they are separate stories about separate periods, which is the opposite of the claim.

`staggerLacksAnOrder` (`chart-video/scripts/detect-reveal-order.mjs`) is run in `render.mjs` before
anything is rendered, twice, and both readings are printed:

- **12 marks at 12 distinct years** — the shared chronological head, which is what the reveal
  actually is. Earned.
- **24 marks at 12 years** — the same reveal enumerated one mark per series per year. Refused, as
  a snapshot would be.

Both readings are true statements about the same build. The refusal is recorded in
`NOTES-FOR-MAINTAINER.md`.

## The reference

The **2014 reading of each series**, laid down as a muted dashed rule across its own panel before
any line draws, and left alone for 24 frames (0.8 s) so it can be read. This is the comparison the
journalist named at movement 3: 2025 against 2014.

## The single accent, twice

`PALETTE.md` records two: `#D4A853` for passengers (8.01:1 on the ground) and `#5B8A8A` for
punctuality (4.58:1). They are never adjacent — one per panel, each panel named in its own colour,
so no reader has to tell two strokes apart on a shared plot. The house rule is one semantic accent
per argument; here there are two arguments in one frame, one per panel, which is what splitting the
frame means.

## The reference loop's lesson, applied

ABC News, *Conquering Mount Everest* — "a profile whose two dimensions disagree earns that
disagreement by giving each one its own honest reading, in sequence, with numbers." Each panel gets
its own fitted scale rather than being squeezed onto the other's, and every value the build asserts
is printed: 58.2, 91.4 at the reference; 28.1, 94.6 at the subject; 74.6, 81.6 at the conclusion.

## The anti-patterns of this case

- **A dual axis.** Refused above.
- **A title claiming "every year".** The article's own headline says passengers rose every year and
  trains got later every year. Both are false: 2020 and 2021 break both series, which is the beat's
  own subject. The title states the period change and the break, and its two figures are computed
  from the frozen table rather than typed.
- **Causation.** Nothing on the frame says crowding causes lateness. 2020 is the frame's own
  counter-example and it is drawn, not explained.
- **Repeating a year or a value.** 2014, 2020 and 2025 appear once each, as x-axis ticks. The
  reference, subject and conclusion labels carry values only.
- **Zero baselines on lines.** Refused; each panel is fitted to its own readings with every drawn
  tick labelled.
- **Furniture that moves.** Title, source, axis, panel names and gridlines come up once during
  `establish` and never move again.
- **A conclusion that repeats the title.** The conclusion states the two 2025 values at the points
  they belong to, which the title does not carry.
