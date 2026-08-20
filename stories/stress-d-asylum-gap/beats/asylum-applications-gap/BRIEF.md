---
size: web
type: line
---

# Beat — Applications fell every year from 2008 to 2011, then the registry went dark for two years — and came back higher than where it left off

**Type:** line. **Medium/format:** chart / web. **Frame:** fluid, one continuous width.

## The trap, and the decision (not a default)

`article.md` states applications "rose across the period" and that "the registry was not
published for 2013 or 2014." Checked against `data.csv` (`render-web.mjs` computes this, not
asserted by eye): the series is not a steady climb at all. It **fell every year from 2008 (1,487)
to 2011 (1,211)**, ticked up slightly to 2012 (1,217), and then the registry published **nothing**
for 2013 and 2014 — not zero, not interpolated, simply absent. When it resumes in 2015 the count is
2,100, a **72.6% jump over the 2012 reading** the registry left off at, and rises further to 2,310
by 2017. "Rose across the period" is technically true end-to-end (1,487 → 2,310) but it erases the
four-year decline that came first and the two-year silence that separates the decline from the
recovery — the shape a reader needs, not the two endpoints alone.

**The real trap: a line chart drawn the ordinary way — one `<path>` through eight points in data
order — draws a smooth rising line straight from 2012 to 2015.** Nothing in `d3-shape`'s line
generator, in `chart-web`'s seed, or in any check this toolchain runs stops that: `ChartWebSeed.tsx`
and `proof/co2-suisse/EmissionsWeb.tsx` both connect every consecutive pair of readings with one
continuous path, because every beat before this one has a series with no missing years in the
middle. Nothing in the toolchain — not `profile.json`, not the seed, not `verify-web.mjs` — flags
that 2013 and 2014 are missing FROM THE MIDDLE of a series rather than simply short. `profile.json`
records `"year": { "min": 2008, "max": 2017, "distinct": 8 }`: eight distinct years across a span
that would hold ten if it were complete, but nothing states outright that two specific calendar
years in the middle are absent — that has to be inferred by counting, the same shape of omission
`stress-a-energy-bills`'s duplicate-row finding already named for a different profile field. A
component that fed these eight points to one path, the way every prior beat in this corpus does,
would draw exactly the false claim `article.md`'s own gap sentence exists to prevent: a smooth rise
through two years the registry never reported.

**Decision:** the x-axis is a genuinely continuous year scale (not index-based), so the true
three-year gap between 2012 and 2015 is already spatially honest — it occupies three times the
width one normal year-to-year step does, before anything else is drawn. On top of that, the line is
split into two separate `<path>` elements (2008–2012, 2015–2017) with nothing — no solid line, no
dashed connector, nothing implied — drawn across the gap, and the empty space itself carries a
shaded band and an explicit label ("No data for 2013–2014"), drawn unconditionally, in the same
overlay layer as the reference rule and the end label — never gated behind hover. See
`AsylumGapWeb.tsx`'s own doc-comment for the full reasoning.

## Why this beat is WEB, not static

`article.md`: "Readers should be able to explore each year themselves." A static frame has to
choose which of the eight years get a printed number; this format gives every one of them, exact,
on hover, tap or keyboard focus (`data-detail` baked at build time, so the same population of marks
is reachable with the inline script absent entirely). No filter: this beat fails the format's own
filter test (`chart-web/SKILL.md`, "When to use") — there is no reader-chosen dimension to narrow
to here, the gap is structural, not a subset to explore in or out of.

## The takeaway (decision, not a default)

> Applications fell every year from 2008 to 2011, then the registry went dark for two years — and
> came back 73% higher than where it left off.

**Grounded** with `groundTakeaway` (`skills/storyboard/scripts/ground-claim.mjs`), against a
profile built from `data.csv`'s own columns and rows:

```
[
  { "claim": "2008", "verdict": "supported",
    "detail": "within the range of column \"year\" [2008, 2017]" },
  { "claim": "2011", "verdict": "supported",
    "detail": "within the range of column \"year\" [2008, 2017]" },
  { "claim": "73", "verdict": "unverifiable",
    "detail": "could not be placed in any numeric column's range or total (\"year\" [2008, 2017], sum 16098, \"applications\" [1211, 2310], sum 13407) — this check has no way to confirm or refute it" }
]
```

No claim comes back `contradicted`. "73" is honestly `unverifiable` rather than `supported` — it is
a derived percentage (`(2100-1217)/1217`), not a raw column value or a column total, and the check
correctly declines to confirm a number it cannot place rather than rubber-stamping it. `render-web.mjs`
also asserts, at render time, that applications fell every single year through 2012 and that the
missing years are exactly 2013 and 2014 — the render throws rather than shipping a stale claim if a
future data refresh changes either fact.

## The palette

See `PALETTE.md` — no subject convention applies to an asylum-statistics story, so the newsroom's
own house colours lead, unopposed.

## Verification

Rendered with `render-web.mjs`, then driven with `chart-web/scripts/verify-web.mjs --shots`, and the
screenshots opened and looked at directly — see the story's own render notes for what was found.

## Source line

`Source: national asylum registry, as reported in the frozen dataset for this story`

## Alt text

Computed by `render-web.mjs` and baked into the rendered page's own `<desc>`.
