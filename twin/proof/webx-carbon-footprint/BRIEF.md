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
Because the fullest bins hold well over a hundred names, this beat's tooltip is WIDENED to 320px
(`render-web.mjs`'s own CSS override) — the one deliberate departure from the skill's default 220px
tooltip — and sized to its own content, so the whole list is visible at once.

**It does not scroll, and an earlier build of this brief said it did.** That build capped the
tooltip at 220px with `overflow-y: auto`; driven in Chrome at 1440×900 over the 0–4 t bin, the box
measured `clientHeight` 218 against `scrollHeight` 502 and `scrollTop` stayed 0 after a 200px
wheel — **56.6% of the 127 names were unreachable**, hidden behind the very sentence that promised
they were not. The scroll was dropped rather than repaired, because none of the three inputs this
beat's alt text names could ever have driven it: the tooltip is `pointer-events: none` (the genre's
stylesheet — it follows the pointer, so it must not swallow its own trigger's events), which sends
the wheel to the bin underneath; a keyboard reader's focus stays on the bin, never on the tooltip;
and a finger dragging inside a fixed overlay fights the page scroll. The tallest list renders 502px
tall, which sits inside the window at every viewport this genre targets, and
`skills/splash/test/interaction-promises-are-kept.test.ts` turns red if any delivered tooltip
hides content again — by scrolling or by running off the window.

## Source line

`Source: Global Carbon Budget (2025), via Our World in Data · co-emissions-per-capita, 2023 data,
extracted 8 August 2026`
