# Beat — Germany generated 143 fewer terawatt-hours in 2024 than 2015

**Type:** waterfall. **Medium/genre:** chart / web. **Channel:** article web.

Web sibling of `proof/static-germany-electricity-bridge` — same claim, same frozen data, a fresh
component written for this genre's two-layout / baked-in-interaction shape, with its own
step-hit interaction script that deliberately does NOT cover the two total bars (see below).

## Claim

Germany's total electricity generation fell from 639 TWh in 2015 to 496 TWh in 2024 — a net drop
of 143 TWh — because the nuclear phase-out (-92 TWh) and a falling fossil share (-154 TWh)
outweighed renewables growth (+103 TWh). The bridge is replayed arithmetically in `render-web.mjs`
before rendering (opening + every step = closing, exactly) — `references/types/waterfall.md`'s own
non-negotiable check.

## Data

- Source: Ember & Energy Institute, Statistical Review of World Energy (2025), via Our World in
  Data, `electricity-mix` grapher.
- `data.csv`: copied from the already-verified static sibling's own frozen fetch (Germany, 2015 and
  2024) and re-verified here independently — row count (2) and the balanced bridge both asserted in
  `render-web.mjs` before the component ever sees the data.

## What interaction adds — and what it deliberately doesn't touch

Every bar already prints its own signed delta (or, for the two endpoint bars, its own absolute
total) directly above itself, unconditionally — nothing about a printed value is gated behind
interaction here. What the static frame cannot show without a reader doing arithmetic by eye is the
RUNNING LEVEL each delta bar produces: the sheet's own warning is that the chart implicitly asserts
the closing total equals the opening total plus every signed step, and a reader has no way to check
that from any single bar. So only the three DELTA bars (Renewables, Nuclear, Fossil fuel) carry a
hit target; hovering one reveals its own signed value AND the exact running total Germany's
generation reached immediately after that step. The two TOTAL bars deliberately get no hit
target at all — they already state everything they have to state, and an added tooltip on them
would only repeat the printed label, which `web-discipline.md` names as the thing this genre must
never do.

## Source line

`Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in
Data · extracted 8 August 2026`
