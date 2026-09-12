---
format: web
type: calendar-heatmap
---

# Beat — Genève a tenu 31 jours d'affilée à 20 °C ou plus en 2024 (web)

**Type:** calendar heatmap (month × day-of-month). **Medium/format:** chart / **web**.
**Frame:** fluid.

## Claim

Daily mean temperature in Geneva, every day of 2024 — **366 cells**. From **18 July to 17 August**
the daily mean stayed at or above 20 °C for **31 consecutive days**, the year's longest such run.
The warmest month was **August (22,2 °C), not July (20,9)**; the hottest day was 30 July at 26,4 °C,
the coldest 12 January at −1,3 °C.

The run is **found, not typed** — the longest sequence at or above the threshold is walked out of the
frozen file — and the beat throws if no run of at least twenty days exists.

## What the web adds, and it is exactly what this form pays on paper

A calendar grid shows a STREAK: 31 adjacent cells read as a shape rather than a plateau measured
against an axis. It pays for that by making **no single cell's value readable** — which is why the
static plate carries a binned key and stops there. Here every one of the 366 days answers with its
date, its mean, its maximum and the bin it fell in. The shape stays the argument; the number is no
longer lost.

## The pointer resolves by cell, and that is a change to the format's own machinery

Twelve months share every x on this grid. The shared interaction script resolves a pointer by **x
alone** — right for a series, where every reading owns a column, and **wrong for a grid**, where it
would answer confidently with whichever of twelve marks the markup happened to list first. A
confident wrong answer is the worst thing an interactive chart can give.

So `chart-web/assets/interaction.mjs` gained `nearestCell` and an opt-in: a beat that puts
`data-hit="cell"` on its own `<svg class="chart">` is resolved in both axes. **Nothing already
shipped changes** — without the attribute the new path is never taken.

## Treatments spent

- `a-sequential-grid-is-one-hue-cluster` — every filled cell is the direction's own accent against
  the direction's own ground at increasing strength, and the lightest step is lifted until it clears
  the non-text floor. A bin nobody can see is not a bin, it is the ground.
- `the-key-prints-its-breaks-in-the-data-s-units` — the key names its bins in °C.
- `a-missing-cell-is-drawn-as-missing` — 31 February and its four siblings are **impossible, not
  absent**: drawn hollow and dashed so the grid stays rectangular.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Open-Meteo (ERA5 reanalysis), daily mean and maximum 2 m temperature, Geneva (46,20 N · 6,14 E),
1 January – 31 December 2024. `data.csv` is a byte-for-byte copy of
`proof/static-calendar-heatmap-geneva/data.csv`.
