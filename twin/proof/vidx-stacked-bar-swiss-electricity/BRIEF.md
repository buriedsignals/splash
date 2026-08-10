---
size: landscape
type: stacked-bar
---

# Beat — solar and wind went from almost nothing to 7% of Switzerland's electricity

**Size:** landscape (1920 x 1080). The front matter above is the record that counts — `render.mjs`
reads it with `readPinnedSize`, and `Root.tsx` registers one composition per row of the table. The
prose used to be the only record of gate 2c's decision, checked by nothing, while the component
carried its own `const FRAME` and `Root.tsx` repeated the same two numbers.

**Why landscape, and what the other two sizes would cost.** A stacked bar's category axis is
nominal, so `formForSize` answers `transpose` at a square or tall frame — four stacked columns
become four stacked rows, a redraw this beat does not carry. Both refuse loudly, naming ladder
rung R0, rather than squeezing four columns into 1080 px and clipping nothing. The 1080 x 1080
this beat used to draw at was not a decision, it was a default.

**Proves:** solar and wind supplied barely a hundredth of a percent of Switzerland's electricity
generation in 2000 (0.01 TWh of 66.1 TWh) — by 2024 they supplied 7.5% of a larger total (5.84 TWh
of 78.4 TWh), a composition shift visible across four snapshots (2000, 2010, 2020, 2024).

**Medium / genre:** chart / video. **Type:** stacked bar — one column per year, three segments
summed into each (`references/types/stacked-bar.md`: "how the composition itself shifted... is this
shape, not a grouped comparison"). Solar & wind sits on the shared zero baseline — the ONE band
every column can be compared against by eye — because it is the series the claim is actually about;
hydropower and "nuclear & other" stack above it, in a stacking order identical across every column.

## Data

- Source: Our World in Data, `electricity-prod-source-stacked` grapher (Ember & Energy Institute,
  via Our World in Data), filtered to Switzerland.
- Fetched:
  `https://ourworldindata.org/grapher/electricity-prod-source-stacked.csv?csvType=filtered&country=~CHE`
  — verified effective (1 entity only, not the full ~200-country set).
- `data.csv`: **26 data rows** (27 lines with the header — corrected 2026-08-09, the file has no
  trailing newline so `wc -l` reports one fewer line than it holds), 2000–2025, Switzerland only,
  one row per year, columns `Other renewables`,
  `Bioenergy`, `Solar`, `Wind`, `Hydropower`, `Nuclear`, `Gas`, `Oil`, `Coal` (TWh). The beat draws
  four snapshot years — 2000, 2010, 2020, 2024 — bucketing the nine raw columns into three: **Solar
  & wind** (`Solar` + `Wind`), **Hydropower** (unchanged), **Nuclear & other** (`Nuclear` +
  `Bioenergy` + `Other renewables` + `Gas` + `Oil` + `Coal`) — filter and bucket at render time,
  never re-fetch.

## Exact values (TWh) — verified 2026-08-08

| Year | Solar & wind | Hydropower | Nuclear & other | Total |
| --- | --- | --- | --- | --- |
| 2000 | 0.01 | 36.83 | 29.28 | 66.12 |
| 2010 | 0.13 | 36.06 | 29.86 | 66.05 |
| 2020 | 2.75 | 37.87 | 27.88 | 68.50 |
| 2024 | 5.84 | 44.94 | 27.59 | 78.37 |

Solar & wind's share of the total: 0.015% (2000) → 0.197% (2010) → 4.01% (2020) → **7.45%** (2024).
The baseline segment is the only band comparable across columns by eye (`stacked-bar.md`'s own
rule) — which is exactly the segment this claim is about, so the type's one structural limitation
is not in play here.

## The motion problem

Columns arrive in their own chronological order — 2000, 2010, 2020, 2024, left to right, the data's
own order (`motion-grammar.md`: "a reveal follows either the data's own order... or the argument's
order") — each column's three segments stacking bottom-to-top together as that column's own arrival
event, so a column reads as one event, not three. The reference (2000's own total, 66.1 TWh) draws
before any column grows, so later columns' larger totals are visible against it even though the
core claim is about composition, not total growth. The subject — solar & wind's SEGMENT, not a
whole column — cannot get its ring and highlight until every column has finished stacking; its
conclusion states the 2024 share against the 2000 share, which is only true once both are on screen.

## Anti-patterns for this case

- Solar & wind on the shared zero baseline, not floating mid-stack — `stacked-bar.md`'s own rule
  that only the bottom segment supports an honest across-column comparison, and that comparison IS
  this beat's claim.
- Stacking order identical in every column (solar & wind, then hydropower, then nuclear & other) —
  reordering per column would shift every segment above the swap and break the "same colour, same
  series" contract even worse than a grouped bar's equivalent mistake.
- Column totals printed atop each finished stack (`stacked-bar.md`: "worth printing... whenever the
  total itself is part of the claim" — supply grew too, legitimate context, never contradicting the
  composition claim).
- Segment/value labels always in page ink, never in a segment's own hue (`stacked-bar.md`'s named
  trap: a prior beat in this codebase shipped exactly the inverse and failed WCAG contrast outright).

## Source line

`Source: Ember & Energy Institute, via Our World in Data · 2000, 2010, 2020 & 2024 data`
