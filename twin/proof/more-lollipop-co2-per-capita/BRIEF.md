---
size: landscape
type: lollipop
---

# Beat — Switzerland's per-capita CO2 emissions, 3rd-lowest of 15 European peers

**Type:** lollipop. **Medium/genre:** chart / static. **Size:** landscape (1920 x 1080).

The size is in the front matter above as well as in that sentence, and the front matter is the one
that counts: `render.mjs` reads it with `readPinnedSize`. The per-story `900 x 800` frame this beat
used to state in prose is gone — it was a third statement of a size nothing downstream read, beside
the component's own `const FRAME` and the two literals in the render script.

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

## The three export sizes — one ships, two are refused, and the refusal is measured

Rendered at all three and opened. **Landscape 1920x1080 is what this beat delivers.** Portrait and
square are refused by `assertRowsFit`, not by a preference:

| size | frame the credit and header may use | title | credit | value axis | left for 15 rows | one name's ink |
|---|---|---|---|---|---|---|
| landscape | 910 px | 53 px x 3 lines = 251 | 31 px x 1 = 53 | 75 | **531 px → 35.4 px pitch** | 29.5 px |
| square | 936 px | 72 px x 7 lines = 702 | 42 px x 3 = 192 | 102 | **−60 px** | 39.9 px |
| portrait | 979 px (Meta's safe band) | 72 px x 7 = 702 | 42 px x 3 = 192 | 102 | **−17 px** | 39.9 px |

At the phone's 36 px legibility floor the header, the credit and the value axis take the whole band
**before a single row is drawn**, and the fifteen country names need 599 px of ink between them.
Removing the credit and the axis entirely, and setting the title on one line, still leaves 570 px
against 599 — so this is not a header that could be trimmed, it is a row count a 360 dp reading
width cannot hold. Rung **R8** (carry fewer rows and say so) is the rung above the refusal and it is
not available here: the claim *is* "3rd-lowest **of 15**", so dropping rows drops the claim —
exactly the loss `type-at-size.mjs` records against R8 for a ranking. So **R9**: the beat ships
landscape, and the journalist is offered it by name.

**What landscape cost.** The 900 x 800 frame this beat was tuned at is 1.13:1; landscape is 1.78:1
and its type is 2.2x. Fifteen rows that sat 39 px apart under 14 px names now sit 35.4 px apart
under 31 px names — legible, and 6 px from the refusal. That margin is the finding: this frame is at
its row limit, and `assertRowsFit` is where a sixteenth row arrives.
