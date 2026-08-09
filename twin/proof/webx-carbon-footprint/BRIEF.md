# Beat — six in ten countries emit under 4 tonnes of CO2 per person

**Type:** histogram. **Medium/genre:** chart / web. **Channel:** article web.

Web sibling of `proof/static-carbon-footprint-spread` — same claim, same frozen data, a fresh
component written for this genre's two-layout / baked-in-interaction shape, with its own bin-hit
interaction script and a widened, scrollable tooltip (see below).

## Claim

127 of 213 countries (60%) emitted under 4 tonnes of CO2 per person in 2023; the distribution is
heavily right-skewed, with a handful of oil and gas producers as far out as the top bin. Median:
3.1 t/capita. Computed by `render-web.mjs` from the frozen CSV at render time.

## Data

- Source: Global Carbon Budget (2025), via Our World in Data, `co-emissions-per-capita` grapher.
- `data.csv`: copied from the already-verified static sibling's own frozen fetch (213 countries,
  2023) and re-verified here independently — row count (213) asserted in `render-web.mjs`, and
  every country's bin membership accounted for exactly once (matching the static sibling's own
  total-accounting check). Bins are 4 tonnes wide, 10 bins, 0–40, the last bin open-ended on the
  right (Qatar's 2023 reading, 40.13 t/capita, sits fractionally past the nominal ceiling).

## What interaction adds — the task brief's own worked question

"What does hovering a bin reveal that the bars do not already show?" A histogram's bar height
already states a bin's count as a shape, and the axis lets a reader estimate it — what it
structurally cannot state is MEMBERSHIP: a reader looking at the rightmost bar sees "a handful of
countries" with no way to know which ones without leaving the chart. Hover, tap or keyboard focus
on any of the ten bins reveals its exact count AND the full, sorted list of every country in it,
straight from the frozen CSV's own `Entity` column — never fabricated, never the count restated.
Because the fullest bins hold well over a hundred names, this beat's tooltip is widened and made
internally scrollable (`render-web.mjs`'s own CSS override) rather than truncating the list — the
one deliberate departure from the skill's default 220px, no-scroll tooltip.

## Source line

`Source: Global Carbon Budget (2025), via Our World in Data · co-emissions-per-capita, 2023 data,
extracted 8 August 2026`
