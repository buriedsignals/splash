# Beat — Germany generated 143 fewer terawatt-hours in 2024 than 2015

**Type:** waterfall. **Medium/genre:** chart / static. **Channel:** article web, 900 x 560.

## Claim

Germany's total electricity generation fell from 639 TWh in 2015 to 496 TWh in 2024 — a net drop
of 143 TWh — because the nuclear phase-out (-92 TWh) and a falling fossil share (-154 TWh)
outweighed renewables growth (+103 TWh).

## Subject and accent

Three roles, three colours per `references/types/waterfall.md`: increase (blue), decrease
(vermillion) — deliberately not red/green — and total (the page's own muted ink, not a third
saturated hue). Value labels float above each bar's growing edge in ink, never set inside a bar in
white, the sheet's own named defect on narrow bars.

## Source

Same `electricity-mix.csv` pull as the other electricity beats, Germany only, 2015 and 2024. The
bridge's three steps are each source group's own change (2024 minus 2015), not independent
readings — computed once in `render.mjs` and replayed/verified before the component ever sees
them (opening total + every step = closing total, exactly).

## What went wrong, caught by looking

This beat's first draft used a Swiss demographic bridge (births/deaths/migration on a population
base) — arithmetically exact (verified: 8,792,180 + 83,702 - 73,789 + 68,471 = 8,870,564 exactly),
but the render showed the three floating bars as barely-visible slivers, because the deltas were
about 1% of the ~8.8M opening total. Correct, but the whole point of a waterfall — walking the
bridge and seeing what drove the change and by how much — was invisible at that scale. Replaced
with this beat, whose three steps are 15-25% of the total: the shape is now genuinely legible.
