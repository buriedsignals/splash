# Beat — Life expectancy in Switzerland rose 15 years since 1950

**Type:** line. **Medium/format:** chart / web. **Channel:** article web.

Web sibling of `proof/more-line-swiss-life-expectancy` (the static beat) — same claim, same frozen
data, a fresh component written for this format's two-layout / baked-in-interaction shape, not a
port of the static file.

## Claim

Life expectancy in Switzerland rose by 15.0 years between 1950 and 2023, from 68.9 to 84.0,
crossing 80 in 2001. Computed by `render-web.mjs` from the frozen CSV at render time, not asserted.

## Data

- Source: UN, World Population Prospects (2024), via Our World in Data, `life-expectancy` grapher.
- `data.csv`: copied from the already-verified static sibling's own frozen fetch (148 rows,
  1876–2023, Switzerland only) and re-verified here independently — entity check (every row reads
  "Switzerland"), row count (148), and the 1950-filtered span (74 readings, 1950–2023) all asserted
  in `render-web.mjs` before the component ever sees the data.
- Original fetch: `https://ourworldindata.org/grapher/life-expectancy.csv?country=~CHE&csvType=filtered`.

## What interaction adds

The static frame prints exactly three numbers: the 1950 reference (68.9), a muted marker on the
year life expectancy first passed 80 (silent about its own value, same restraint as the seed's own
peak marker), and the 2023 end label (84.0). The other 72 annual readings between 1950 and 2023 —
including both real COVID-era dips, 2020 and 2022 — have no printed value anywhere on the frame.
Hover, tap or keyboard focus on any of the 74 points reveals that exact year's own figure, one
decimal, on demand — detail the static frame genuinely had no room to print, never a number
repeated for effect.

## Source line

`Source: UN, World Population Prospects (2024), via Our World in Data · Switzerland, 1950–2023,
extracted 8 August 2026`
