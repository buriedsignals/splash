---
size: square
type: diverging-bar
---

# Beat — Hydro and nuclear supply seven in ten units of the country's electricity; the six reported shares fall short of the whole

**Type:** diverging bar (one row per source, signed values growing out of a zero line).
**Medium/format:** chart / video. **Frame:** 1080 × 1080.

## The trap, and the decision (not a default)

`article.md` states: "Hydro dominates the mix, followed by nuclear. Imports are counted as a
negative because the country exported more than it bought over the year... Together these make up
the whole of national supply." Checked against `data.csv` (`render.mjs` computes this, not
asserted by eye): the six reported shares sum to **95.2**, not 100 — `profile.json` already
recorded this (`"share_pct": { "sum": 95.2 }`) and nothing in the toolchain flagged the mismatch
against the article's own "the whole" claim before this render script summed the column and
compared it. One of the six, Imports, is **-4.1** — a genuine negative share, not a rounding
artefact, because the country exported more electricity than it imported that year.

**A part-to-whole treatment on this data would be a lie, and a negative slice is not drawable as
part-to-whole at all.** A pie or a 100%-stacked bar bakes "these wedges sum to the whole" into the
geometry itself — the wedge angles or the stack heights are computed as `share / total`, so the
chart asserts totality by construction, whether or not the source data supports it. Here it does
not: 95.2 of what the article calls "the whole" is reported, 4.8 points are simply missing from the
source (unexplained — no note in `article.md` or `data.csv` accounts for the gap), and a pie built
from these six numbers would silently rescale every wedge upward to close that gap, overstating
each source's true share of supply by roughly 5% relative, and reporting it as fact. A negative
wedge has no angle a pie's geometry can express at all — Datawrapper-shaped part-to-whole types
simply cannot take a negative row.

**Decision: draw six independent shares as a diverging bar, signed, on a zero baseline** — the same
family this corpus already ships for `webz-diverging-bar-eu-per-capita` /
`vidz-diverging-bar-eu-per-capita`, and the right fit for a reason that generalises past this one
beat: a diverging bar makes no totality claim by construction. Each bar's length is exactly its own
reported share; nothing about drawing Hydro at 41.2 depends on what Nuclear or Imports reported.
Imports' negative share draws naturally, growing left of zero exactly as any negative deviation
would on this type — nothing about the geometry has to special-case it. The chart proves what the
data actually supports (each source's own reported share, and which ones are net-negative) and
drops the part-to-whole claim the article makes and the data does not.

## The takeaway (decision, not a default)

The article's own sentence — "together these make up the whole of national supply" — does not
survive contact with the data and is not carried into this beat. In its place:

> Hydro and nuclear supply seven in ten units of the country's electricity; the six reported shares
> sum to 95.2%, not the 100% the article claims, and imports are negative at -4.1% because the
> country exported more than it bought.

**Grounded** with `groundTakeaway` (`skills/storyboard/scripts/ground-claim.mjs`), against a
profile built from `data.csv`'s own columns and rows:

```
[
  { "claim": "95.2", "verdict": "supported",
    "detail": "equals the sum of column \"share_pct\" (95.2)" },
  { "claim": "100", "verdict": "unverifiable",
    "detail": "could not be placed in any numeric column's range or total (\"share_pct\" [-4.1, 41.2], sum 95.2) — this check has no way to confirm or refute it" },
  { "claim": "-4.1", "verdict": "supported",
    "detail": "within the range of column \"share_pct\" [-4.1, 41.2]" }
]
```

No claim comes back `contradicted`. The check confirms the number this beat leads with (95.2, the
real sum) and correctly declines to either confirm or refute "100" — that number is not in the
takeaway as an assertion the data supports, it is the article's disproved claim being named and
corrected, which a range/sum check has no way to represent either way. That is read as the check
doing its job, not as a gap in it: nothing came back `supported` for the number this beat is
disputing.

"Seven in ten" for Hydro + Nuclear: 41.2 + 29.4 = 70.6, i.e. 70.6% — stated as "seven in ten" in the
title for readability, exact figures on the bars themselves.

## The palette decision this beat forced

See `PALETTE.md`. The subject-convention proposal recommended green for "renewables" (the subject
line mentions solar and wind); declined here because this type's one accent encodes SIGN, not
category — Hydro, Nuclear and Other are all positive and would all draw in whatever accent is
chosen, and colouring them green would teach the green-means-renewable code this table exists to
invoke and then contradict it on the same chart. The newsroom's own house colour leads instead.

## The edit

- **establish** — title, source, axis ticks/gridlines come up at frame 0 (never faded in — a poster
  frame with no title is a corpus-wide named defect).
- **reference** — the zero line, swept top to bottom, drawn ON TOP of the bars once they exist (a
  bar's own fill must never be able to cover it).
- **reveal** — the six bars grow out of zero, top to bottom in sorted order (Hydro, Nuclear, Solar,
  Wind, Other, Imports): positive fill in the recorded accent, Imports alone in the furniture's own
  muted, so colour marks the sign the moment each bar lands.
- **subject** — Imports gets its own emphasis: a highlight wash behind its row and a ring at its
  bar's end, arriving once every bar is already on screen. It is the one row that breaks the
  reader's part-to-whole instinct, so it is the one row singled out.
- **conclusion** — the sentence nothing on screen has stated yet: the six shares sum to 95.2%, not
  100%, with the shortfall named in points.
- **hold** — the finished chart, 48 frames.

## Verification

Rendered `--still-only` first and looked at; then the mp4, with frames extracted at the timing
contract's own event boundaries and looked at again. See `render.mjs`'s own console output for the
exact frame numbers used.

## Source line

`Source: national electricity registry, as reported in the frozen dataset for this story · shares as published, not rescaled to sum to 100`

## Alt text

Computed by `render.mjs` and written to `ALT.txt` beside the render.
