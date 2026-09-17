---
size: landscape
type: gantt
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — Six countries have never left the world's top ten emitters since 1990

**Type:** gantt (positioned spans on a shared date axis). **Medium/format:** chart / **static**.
**Size:** landscape (1920 x 1080), pinned in the front matter above.

## Claim

Between 1990 and 2024, **sixteen countries** held a place in the world's ten largest CO₂ emitters at
least once. **Six of them held it every single year** — China, the United States, India, Russia,
Japan, Germany — and the other ten arrived, left, or both. Two rows are interrupted rather than
continuous: Italy left for a year in 1991 and returned, South Korea left for two years in 1998–99.
Kuwait appears for a single year, 1991.

Every span is computed in `render-directions.mjs` from the frozen `data.csv` — the same ranking the
bump beat next door draws, read as tenure rather than as position — and the counts in the headline
and the standfirst are asserted before the render.

## Why a gantt rather than the bump chart beside it

`proof/static-bump-emitter-rank` draws the same membership as RANK over time: it answers "who was
above whom". It cannot answer "how long", because a reader tracing one line has to count years by
eye, and the lines that stop are the hardest to read of all. A gantt drops the rank entirely and
draws the tenure. The two are the same data answering different questions, which is why both exist
and neither is a redraw of the other.

## What the harvest gave it

Seven references and an unusually clean split: three are **not** positioned-span gantts at all
(duration bars on a zero-anchored axis), which the records say plainly, and two are — Threestory's
sitting justices and USAFacts' seats. Two rules two publications agree on are filed: both dates in
the row label, and an open span notated as open. This plate takes BOTH answers to the second one,
because they cost nothing together: every open span ends flush at the axis's present edge, and its
label carries a trailing dash.

## Source

Global Carbon Budget (2025), via Our World in Data · annual CO₂ emissions by country, fossil fuels
and industry, frozen beside this beat as `data.csv` (a copy of the file
`proof/static-bump-emitter-rank` uses, per this corpus's "duplicate, do not link" ruling).

## The choreography

The six accented rows at the top are a block before they are six rows, and that block IS the
claim — it can be counted off the picture without reading a single date. Everything below it is
there to make the block mean something: rows that arrive, rows that leave, and two rows with a
real hole in them, drawn as a hole rather than closed over. Kuwait's single year is what makes
"at least once" concrete, a bar barely wider than the stroke around it. The dates are written into
the row labels, so the axis is only ever a check.

**The eye enters at** `the unbroken block`. **The claim lands at** `establish`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the unbroken block` | — |
| reference | `the interrupted rows` | `the unbroken block` |
| reveal | `the single-year row` | `the unbroken block` |
| conclusion | `the span labels` | `the unbroken block` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the unbroken block",
  "stations": [
    {
      "station": "establish",
      "carries": "the unbroken block",
      "subordinateTo": null
    },
    {
      "station": "reference",
      "carries": "the interrupted rows",
      "subordinateTo": "the unbroken block"
    },
    {
      "station": "reveal",
      "carries": "the single-year row",
      "subordinateTo": "the unbroken block"
    },
    {
      "station": "conclusion",
      "carries": "the span labels",
      "subordinateTo": "the unbroken block"
    }
  ],
  "claimLands": "establish"
}
```

## Precision

- **Six is a count off the spans** — how many countries never left is the number of rows whose span covers every year from 1990 to 2024, computed from the yearly ranks.
- **Every span is computed from the ranks** — no start and no end is typed: a span is a maximal run of years in which the country sat in the top ten.
- **The two holes are found, not listed** — Italy's 1991 and South Korea's 1998-99 are gaps the search returned, and the reading line says the holes are real.
- **No span may run backwards** — a span whose end precedes its start throws rather than drawing as a zero-width bar nobody would notice.
- **Thirty-five years on one axis** — every row is read against the same date axis in the same frame, which is the only way the top block reads as continuous.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "six-is-a-count-off-the",
    "every-span-is-computed-from-the",
    "the-two-holes-are-found-not",
    "no-span-may-run-backwards",
    "thirty-five-years-on-one-axis"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "six-is-a-count-off-the",
    "every-span-is-computed-from-the": "every-span-is-computed-from-the",
    "interruptions-are-found-not-listed-and": "the-two-holes-are-found-not",
    "no-span-may-be-inverted": "no-span-may-run-backwards",
    "asserted-in-the-one-frame": "thirty-five-years-on-one-axis"
  }
}
```
