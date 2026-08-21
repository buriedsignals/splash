---
takeaway: "Alcanede fires fewer kilns in 2026 than in 1980: the count fell from 42 to 1 and the workforce fell from 1860 to 18."
subject: "The Alcanede lime-kiln site itself — one place, read three ways: its record, its two photographs, and where it is"
comparison: "1980 against 2026, with 1990-2020 kept in between so the reader sees the steepening after 2010 rather than only the endpoints"
limits: "Six observations, one per decade to 2020 plus 2026 — nothing between them. The frozen file carries no closure dates, no ownership, no output tonnage, and no wage data, so nothing here explains WHY the decline steepened after 2010. The two photographs are of the site, not of any one kiln in the count. The coordinates are a single point for the whole site and are identical in every row."
placement: "After the second paragraph of article.md, as the piece's one scroll-driven sequence"
credit: "unattributed"
effectiveDate: "2026-08-21"
grounding: "supported"
reference: "none — no row in the doctrine reference set covers one place argued across three kinds of evidence in a single scroll; live research was not available in this session"
language: "en"
slots:
  - id: 1
    proves: "The Alcanede kiln site went from 42 kilns and 1860 workers to one kiln and 18, at a place the reader can see and locate. The article says the decline steepened after 2010; recomputed from the frozen rows it did not, in kilns lost per year — 1.2 a year in the 1990s against 0.6 after 2010 — so the beat states the proportional reading, which is the one the data supports."
    medium: "chart"
    format: "scrolly"
    reachable: "yes"
    candidates: ["Mixed scrolly (chart, then two photographs, then a locator map)", "Line", "Photograph sequence"]
    chosen: "Mixed scrolly (chart, then two photographs, then a locator map)"
---

## Slot 1 — One kiln left, in three kinds of evidence

The article asks for the three media in a fixed order: the chart, then the two photographs, then
the map. The scroll carries the reader through them as one sequence, and each leg says something
the other two cannot.

| Steps | Medium | What only this can say |
| --- | --- | --- |
| 1 | **Chart** — workers per year, each column labelled with its kiln count, 1980 → 2026 | The RATE, and the shape of it. Two photographs cannot say that the yard lost roughly two thirds of what was left in each of the last two intervals, and a map cannot say it at all. |
| 3–4 | **Two photographs** — the site in 1980 and in 2026 | What 42 kilns and one kiln LOOK like. There is no number for the difference between a working yard and an empty one; the reader does that comparison from the pixel that changed. |
| 5 | **Map** — the site's own coordinates | WHERE this is. The chart has no place and the photographs have no scale; a reader outside Portugal cannot otherwise put Alcanede anywhere. |

### Candidates considered

1. **Mixed scrolly (chart, then two photographs, then a locator map)** — chosen. It is the only
   candidate that carries all three kinds of evidence the article actually names, in the order the
   article names them.
2. **Line** — the kiln and worker series alone, as a single static or web chart. Says the rate
   precisely and cheaply, and drops both photographs and the location. Rejected because the
   article's own request is for the three together.
3. **Photograph sequence** — the two frames alone, as a scrolly. Carries the change a reader can
   see and none of the record behind it; the 1990–2020 rows would go unused.

### One claim in the article the frozen data does not support

The article states: *"The decline was steady until 2010 and then steepened."* Recomputed from the
frozen rows, kilns lost per year runs 1.1 · 1.2 · 1.0 · 0.6 · 0.33 across the five intervals — the
absolute decline is fastest in the 1990s and SLOWEST after 2010, which is the opposite of what the
sentence says. Read proportionally it is true: each interval takes roughly a quarter, then two
fifths, then half, then two thirds, then two thirds again of what was left. The beat states the
proportional reading and never repeats the sentence as written. `groundTakeaway` returned
`unverifiable` on that sentence — it recognises no shape for it — so nothing in the toolchain
would have stopped the claim reaching the page; it was caught by computing the rates by hand.

### Where the contract could not say what this beat is

`medium` is recorded as `chart`, and that is a compromise, not a reading. A slot carries exactly
one medium, `FORMAT_CATALOG` is keyed on one medium/format pair, and there is no `mixed` medium in
it — so the storyboard has no way to record that this beat is a chart AND two photographs AND a
map. `chart` is written because the chart is the first and longest leg. The story's own report
names this as a defect.

### Reference

No row in `doctrine/references/reference-set.md` covers this argument structure — one place argued
across three kinds of evidence inside a single scroll. Live research was not available in this
session, so the reference loop closes as `none` with the gap stated rather than a loosely-related
row borrowed to fill it.

### Palette

- Ground `#16191B`, accent `#D4A853` (8.01:1 against the ground), second house accent `#5B8A8A`
  (4.58:1). Recorded in `PALETTE.md` beside this file, `origin: newsroom`.
- The accent is spent on ONE idea across all three media — the kilns still firing — because an
  accent that means one thing on the chart and another on the map is two vocabularies in one piece.

### Credit

The article attributes nothing. `proposeCredit` recommended `unattributed`, and that is what is
recorded: the delivered beat prints `Source: not stated` where a credit goes, so a desk reading a
proof sees the gap instead of a plausible sentence nobody can check.
