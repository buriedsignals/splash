---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The newsroom's house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md`. **Every colour on this plate is derived
from the direction's own three — ground, ink, accent — and nothing is imported.** That took three
attempts, and the two failures are worth keeping because each one was a different mistake.

## First attempt: one grey ramp

Nine sources as steps of a grey between the ground and the ink; the accent on the single band the
headline is about. The evidence was the IEA's four cost curves and Visual Capitalist's smoking
plate — *grey field, chromatic argument*, two publications against Ferdio's one.

Rémy: the breakdowns are almost all black and white. **The error was methodological**: those two
publications draw a SINGLE-SERIES variable-width chart — a cost curve with one highlighted interval
and nothing to tell apart — while this is a stacked composition nine bands deep, which is Ferdio's
construction and Ferdio's rule (*"cell labels carry the share only; colour carries identity"*). Two
publications outweigh one only when all three answer the same question.

## Second attempt: the grounded conventions

Each family took a convention out of `skills/palette/scripts/palette.mjs` — `#1B7F4B` for
renewables, `#3A3A3A` for fossil — with the house accent for nuclear, which no convention covers.

Rémy: the colour compositions do not go together. **True, and the convention table says why**: it
returns exactly ONE convention, as the chart's single accent, and states it — *"a story about
coal-fired power replacing hydro is not two accents, it is a choice the journalist makes"*. Three
imported hexes beside a direction's own accent is not a palette; it is four palettes on one plate,
and it fought whichever direction had set the fourth.

## What is drawn now: one hue, nine steps, all of them the direction's

The nine sources are **ORDERED** — fossil at the foot, then nuclear, then the renewables — and an
ordered set takes a sequential ramp, not a categorical one. The ramp runs between two poles built
from the direction itself: `mix(accent, ink, 0.62)` at the coal end and `mix(accent, ground, 0.74)`
at the wind end. One hue family, so it cannot clash with the direction that set it; nine measured
steps, so the bands are told apart by more than a legend.

Its behaviour on a dark ground falls out of the same expression rather than being special-cased: on
`nocturne` the "dark" pole is the light one, the ramp inverts, and the coal band stays the most
contrasted thing on the plate — which is what the beat is about.

The accent is therefore not available as a highlight here; it is the hue of the whole field. The
tracked band is named in ink and set bold in the gutter, and its emphasis comes from sitting at the
high-contrast end of the ramp. Every cell's own number is set in whichever page ink actually clears
the floor against that cell's fill, measured with `contrast()` rather than picked by index.
