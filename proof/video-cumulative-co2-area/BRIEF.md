---
size: landscape
type: area
---

# Beat — more than half of Switzerland's all-time CO2 has been emitted since 1986

**Size:** landscape (1920 × 1080). The front matter above is the record that counts — `render.mjs`
reads it with `readPinnedSize`, and `Root.tsx` registers one composition per row of the table. The
prose used to be the only record of gate 2c's decision, checked by nothing, while the component
carried its own `const FRAME` and `Root.tsx` repeated the same two numbers.

**Why landscape and not the square this beat used to draw at.** An area's x axis is a continuum and
its argument is the shape of an accumulation, so it has no twin form to transpose into
(`type-at-size.mjs`) and no aspect range has ever been measured for it at a tall or square frame.
The old 1080 × 1080 was not a decision, it was a default; `formForSize` refuses square and portrait
by name, and the composition still exists at both so the refusal is a sentence a journalist can read
rather than a missing id.

**Proves:** more than half of every tonne of CO2 Switzerland has ever emitted (since records begin
in 1858) has been released since 1986.

**Medium / genre:** chart / video. **Type:** area (single series) — a genuinely cumulative quantity
(a running total can only ever go up), so the fill is the correct claim here, not a style choice:
the shape being drawn IS an accumulated stock. Zero baseline, non-negotiable.

## Data

- Source: Our World in Data, `cumulative-co-emissions` grapher (Global Carbon Budget 2025 / Global
  Carbon Project, via Our World in Data), Switzerland only.
- Fetched: `https://ourworldindata.org/grapher/cumulative-co-emissions.csv?csvType=filtered&country=~CHE`
  — verified single-entity (data.csv contains only `Switzerland` in column 1).
- `data.csv`: 167 rows, 1858–2024, monotonically non-decreasing (a running total cannot fall).

## Exact values — verified 2026-08-08

- 2024 cumulative total: 3,158,062,000 t CO2 (≈ 3,158 Mt).
- Half of the all-time total: 1,579,031,000 t.
- First year the running total is ≥ that half: **1986**, at 1,582,955,300 t (crosses between 1985
  and 1986 — 1986 is the first full year the cumulative line is above the half-line).
- 1950 cumulative: 473,220,400 t (≈ 15% of the eventual 2024 total).

## The motion problem

The claim is about a THRESHOLD CROSSING inside a monotonically rising fill — structurally the same
shape as `co2-suisse`'s crossing (a reference level, drawn first, that the series later crosses),
except here the reference level is derived FROM the series' own final value (half of the last
reading), not an external fact, and the series never goes back down — it is a filled area, not a
line re-crossing a rule. Sequence: establish the frame → draw the reference rule at the half-total
level (labelled, e.g. "half of all emissions since 1858: 1,579 Mt") → reveal the filled area
1858→2024 in chronological order (the fill visibly thin for a century, then steepening) → the
moment the filled area's leading edge passes the reference rule (1986) gets the subject emphasis →
conclusion holds on the finished fill with both the 1986 crossing and the 2024 total legible.

## Anti-patterns for this case

- Zero baseline is non-negotiable for an area fill (the AREA is what a reader measures).
- Do not silently bridge or smooth — there is no gap in this series, but if there had been one, the
  discipline is to break the fill, not invent a value across the hole.
- The reference rule's label must state what "half" means in words ("half of Switzerland's own
  all-time total"), not just a bare number — an unexplained horizontal line at an oddly specific
  value reads as arbitrary.
- Do not round 1986 into "the mid-1980s" in the on-screen claim — the frozen data supports the exact
  year; use it.

## Source line

`Source: Global Carbon Budget (2025), via Our World in Data · data through 2024`
