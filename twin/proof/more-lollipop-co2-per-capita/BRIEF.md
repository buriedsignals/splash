# Beat — Switzerland's per-capita CO2 emissions, 3rd-lowest of 15 European peers

**Type:** lollipop. **Medium/genre:** chart / static. **Channel:** article web, 900 x 800 (taller
than the 900x560 default — a per-story FRAME choice, 15 country rows need more vertical room than
the default gives, mirroring the same reasoning `static-swiss-age-pyramid` used for its 21 age
bands).

## Claim

Switzerland's 2024 per-capita CO2 emissions were the 3rd-lowest of these 15 European countries, at
3.6 tonnes — less than half of Belgium's 7.3 tonnes.

Computed from the frozen data, not assumed: sorting all 15 countries' 2024 readings descending
puts Switzerland at rank 13 of 15 (3.5946856 t, printed at full precision by `render.mjs`'s own
console table), i.e. 3rd-lowest. Belgium is highest at 7.2798314 t. Switzerland's value is 49.4%
of Belgium's — under half.

## Subject and accent

One accent, `#0B7A75` (this codebase's house teal), reserved for Switzerland's stem-and-dot only —
chosen because it is the newsroom's own country, not because it is the highest or lowest value in
the set (`references/types/lollipop.md`'s "one accent... not the maximum" rule, and
`static-discipline.md`'s "One accent"). Every other row is `muted`, derived from the ground, not a
second named hex. Rows are sorted by value, descending — the default ranking read this type asks
for, stated as a deliberate choice in `LollipopCo2.tsx`'s own prop comment, not re-sorted inside
the component.

## Source

Global Carbon Budget 2025, via Our World in Data · `co-emissions-per-capita.csv`, 15 European
countries (Switzerland, France, Germany, Italy, Spain, Poland, United Kingdom, Netherlands,
Belgium, Austria, Sweden, Norway, Denmark, Portugal, Greece), 2024 — the latest year every one of
the 15 requested countries actually carries a reading for in this dataset, verified per-country by
`render.mjs` before drawing (it throws if any country is missing a 2024 row, rather than silently
falling back to an earlier year for some and not others).

## What went wrong, caught by looking

The first render was geometrically correct but had a real legibility defect: the "4t" value-axis
gridline ran straight through the Switzerland and Sweden rows' own value labels (both readings
sit at ~3.6t, close enough to the 4t tick that the label "3.6 t" and the gridline shared the same
x position) — the vertical grey rule visibly bisected the label, landing right in the gap between
"3.6" and "t". Caught only by cropping and zooming into the rendered PNG, not by the render exiting
0.

Fixed by generalising this codebase's existing "drop the competing line" rule
(`static-discipline.md`'s treatment of a hand-placed reference annotation colliding with a regular
gridline) to every row's own value label: each vertical gridline is now cut into segments that
skip any row whose measured label span it would otherwise cross, rather than being thinned or
offset. Re-rendered and re-inspected at 3x zoom — the gap is clean, both "3.6 t" labels read
without a line through them, and no other row in the 15 was affected (only these two rows' values
sit close enough to a tick to have collided in the first place).

## `lollipop.md` — did it save a mistake?

Yes, twice, before any code was written:

1. It states the type inherits the bar's non-negotiable zero-baseline rule and explicitly warns
   against relaxing it "just because it looks thin" — without that framing it would have been easy
   to reach for the line chart's "fit the scale to the data" instinct on a chart running a narrow
   3.4–7.3 t range, which would have exaggerated every gap between countries. The value scale here
   is `scaleLinear().domain([0, maxValue]).nice()`, zero included, on purpose.
2. It names the exact previously-shipped defect this codebase had with lollipop value labels: an
   accent hue that read fine as a thin stem/dot measured under WCAG 4.5:1 as running text. Reading
   that before writing `LollipopCo2.tsx` meant the value-label colour was `ink` from the first
   draft, including on Switzerland's own row — there was never a moment where the accent teal was
   used for the "3.6 t" text, so this specific defect could not recur here.
