# Beat — Switzerland is the outlier: solar beats wind

**Type:** grouped bar. **Medium/format:** chart / web. **Channel:** article web.

Web sibling of `proof/static-wind-vs-solar` — same claim, same frozen data, a fresh component
written for this format's two-layout / baked-in-interaction shape, with its own hit-target
interaction script rather than the skill's nearest-point one (see `GroupedBarWeb.tsx`'s own
header comment for why).

## Claim

Switzerland is the only one of six countries where solar generates a larger share of electricity
than wind; in France, Germany, Norway, Poland and Sweden, wind's share is the larger of the two.
Verified in `render-web.mjs`: exactly one country (Switzerland) has solar > wind in the 2024 slice.

## Data

- Source: Ember & Energy Institute, Statistical Review of World Energy (2025), via Our World in
  Data, `electricity-mix` grapher.
- `data.csv`: copied from the already-verified static sibling's own frozen fetch (12 rows, six
  countries x two years) and re-verified here independently — row count (12), the 2024 slice (6
  countries), and the single-reversal claim are all asserted in `render-web.mjs` before the
  component ever sees the data.

## What interaction adds

The printed value on each bar is a rounded one-decimal SHARE of that country's own total
generation — the chart is deliberately about share, not absolute output (`BRIEF.md`'s claim is a
share comparison, and the countries' total generation differs by more than 50x). Nowhere on the
static frame is the absolute terawatt-hour figure behind that share: Germany's 141.6 TWh of wind
and Switzerland's 0.2 TWh of wind can both print as small-looking bars without a reader being able
to tell the two apart. Hover, tap or keyboard focus on any of the twelve bars reveals its exact
share to two decimals AND the absolute TWh behind it — detail the static frame genuinely omits,
never a number repeated for effect.

## Source line

`Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in
Data · 2024 generation, extracted 8 August 2026`
