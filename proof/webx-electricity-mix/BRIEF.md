# Beat — Norway ran its grid on 99% renewables; Poland leaned on fossil fuel

**Type:** stacked bar (100%-stacked). **Medium/format:** chart / web. **Channel:** article web.

Web sibling of `proof/static-electricity-mix-source` — same claim, same frozen data, a fresh
component written for this format's two-layout / baked-in-interaction shape, with its own
segment-hit interaction script.

## Claim

Norway generated 99% of its electricity from renewables in 2024, the highest share of six
countries compared here; Poland leaned hardest on fossil fuel, at 69% — the highest fossil share
of the six.

## Data

- Source: Ember & Energy Institute, Statistical Review of World Energy (2025), via Our World in
  Data, `electricity-mix` grapher.
- `data.csv`: copied from the already-verified static sibling's own frozen fetch (6 rows, one per
  country, 2024) and re-verified here independently — row count (6), and Norway/Poland leading
  renewables/fossil respectively, both asserted in `render-web.mjs` before the component ever sees
  the data.

## What interaction adds — the task brief's own worked case

A stacked bar's non-bottom segments float on a moving baseline: only the bottom band (renewables,
here) shares a genuine common reference line across countries; the nuclear and fossil bands above
it start from a different, country-specific point each time, so their own thickness is genuinely
hard to measure by eye (`references/types/stacked-bar.md`, "The one thing that goes wrong"). The
static frame rounds each segment's label to the nearest whole percent, and only prints a label at
all when the band is tall enough to hold one — several countries' smallest segments (nuclear-free
Norway and Poland's near-zero nuclear share) get no printed value whatsoever. Hover, tap or
keyboard focus on any of the eighteen segments (six countries x three roles) reveals its exact
share to two decimals AND the absolute terawatt-hours behind it — recovering a precise reading for
exactly the bands the static baseline can't give one, never repeating what the printed label
already states.

## Source line

`Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in
Data · 2024 generation, extracted 8 August 2026`
