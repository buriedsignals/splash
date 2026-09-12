# MoneyHub NZ — *Wage and Salary Distributions for Individuals* (a Figure.NZ plate re-published)

`https://www.moneyhub.co.nz/wage-salary-distributions.html` · harvested 2026-09-08 · archive
recorded as `url-list` (found by search, not drawn from the url list file).

## What it is

A **real histogram**, drawn horizontally, reached inside a third-party article. The record's graphic
is an `img` 587 × 881 at `documentTop` 2882 — `nearTheTop: false`, the only record in this family
whose graphic the page does *not* lead with — and `routes.pixel.measuredFrom` is `graphic.png`.

The plate is titled *People earning wages and salaries in New Zealand*, subtitled *By taxable income
band, year ended March 2024, NZD billions*, credited *Provider: Inland Revenue*, and carries the
`figure.nz` wordmark top right. **The graphic is Figure.NZ's; the page is MoneyHub's.** The record's
url host is `moneyhub.co.nz` and the corpus's independence guard reads publications off the host, so
this record and `figure-nz-chart-9uo8rkrqhpwm7va4` would count as two — and they must not. They are
one design author. Any evidence line that cites both is citing one publication twice.

It is filed anyway, because it shows the same house's plate under a *different* subject and a
different colour, and because the contrast between the two is the only thing in this corpus that
says the Figure.NZ bar fill is per-chart rather than house.

## What it does with information

- Forty-five bins, labelled as closed intervals at both ends — `$1-$10,000`, `$10,001-$20,000` —
  and an open top bin named in words, `$1m and over`. Identical convention to the sibling record.
- Value axis `0 → 400`, repeated at the head and the foot of the plate.
- The same unequal-bin fault: bands are $10,000 wide to $300,000, then $50,000 wide, then unbounded,
  and every band is drawn as one bar of equal thickness. The `$300,001-$350,000` bar is visibly
  taller than its neighbours above and below precisely *because* it is five bins' worth of people
  in one bar — a bump that is an artifact of the binning, not of the data.
- The subtitle says *NZD billions* while the title says *People earning*. The record cannot resolve
  which the bars count; the discrepancy is recorded here rather than papered over.
- The page around it repeats the same data as an HTML table — `style.type` carries
  `Arial | 15 | 400` ×182 with the sample `"1 to 10,000"` and a header `"Taxable Income Band ($)"`.
  The chart is not the article's only rendering of the series.

## What it does with style

Measured on `graphic.png`:

| role | measured |
| --- | --- |
| ground | `#FFFFFF` at 84.62 % |
| bar fill | `#4DB7C5` at 4.570 %, with `#51B9C6` 0.729 %, `#43B3C2` 0.480 %, `#3DB1C0` 0.351 % as its edges |
| wordmark | `#5461C8` at 0.390 % |
| frame / rules | `#F3F4F5` 0.604 %, `#EBEBEC` 0.536 %, `#A3ACBB` 0.224 %, `#9BA4B4` 0.216 % |
| palette shape | `sequential`, one cluster at hue 187 |

The bars here are **chromatic teal** where the sibling chart's are a near-black plum
(`#351D3B`, filed as neutral). One publisher, two charts, two unrelated bar colours — so nothing in
this corpus supports a claim that Figure.NZ has a histogram bar colour.

The only thing the two plates share chromatically is `#5461C8`, the wordmark, at 0.39 % here and
0.52 % there.

Bars are gapped, measured: at column x = 176 the runs of `#4DB7C5` are
`139-150 154-165 169-180 …` — 11–12 px bars with a **3–4 px gap**, the same roughly one-third ratio
the sibling plate holds at a larger size. The gap is proportional, not fixed.

Type in `style.type` is **MoneyHub's article furniture, not the chart's**: `Arial` for the body and
the table, `Karla | 30 | 700` for the article headline, `GFS Didot | 30 | 700` for the section head
`"Figure.NZ Data - Wage and Salary Distributions for the Tax Y…"`, `PT Sans` for the site nav. The
page's own declared ground is `rgb(33, 33, 33)`, which is the *site's* dark chrome and has nothing to
do with the plate's white. The chart is a raster `img`, so it carries no `graphicFrame` and its own
lettering was read by neither route — the sibling record is the only place in this corpus where the
Figure.NZ typography is actually measured.

## What is transferable

- **The interval label and the open top bin**, as in the sibling record — this is the second sighting
  of the convention, but not a second *publication* of it.
- **A gap that scales with the bar.** Bar 11–12 px / gap 3–4 px here, bar 15–16 px / gap 5–6 px on
  the larger plate: the same ratio at two sizes, which is what a chart engine does and a hand-set
  chart usually does not.
- **A binning artifact reads as a finding, and a reader cannot tell.** The `$300,001-$350,000` bump
  is the single most transferable *warning* in this family: the label says the bin is five times
  wider, the bar does not, and the eye reads the bar.
- **A publisher's page ground and a plate's ground are different objects.** `style.ground` here is
  `rgb(33, 33, 33)`; the plate is `#FFFFFF` at 84.62 %. A direction derived from the page-level field
  would be a reading of MoneyHub's site chrome.

## What was not verified

- **What the bars count.** Title and subtitle disagree (*People earning* vs *NZD billions*).
- **The chart's own type.** Raster `img`, no `graphicFrame`.
- **Whether this plate is the same vintage as the sibling.** This one says *year ended March 2024*;
  the sibling says *2025*. They are different charts of a related series, not two renderings of one.
- **Independence.** Repeated because it matters: same design author as
  `figure-nz-chart-9uo8rkrqhpwm7va4`, different url host. The host-based guard cannot see that.
