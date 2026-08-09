# Beat — Switzerland's population bulges at ages 55-59

**Type:** population pyramid. **Medium/genre:** chart / static. **Channel:** article web, 900 x
820 (taller than the 900x560 default — a per-story FRAME choice, 21 age bands need more vertical
room than the default gives).

## Claim

Switzerland's widest age band in 2023 is 55-59 (669,962 people), not the youngest band: 0-4
year-olds total 434,030, well under the peak — the mark of an aging population, not an expanding
one.

## Subject and accent

Two CVD-safe hues, checked as a pair, one per sex (`references/types/population-pyramid.md`) — the
mirrored position already carries the group distinction, colour reinforces it. Age bands keep
their natural sequence, oldest at the top, never sorted by value. One ink annotation names the
peak band, found by the render script (not asserted), on the same shared, mirrored, zero-anchored
magnitude scale as every other band.

## Source

UN, World Population Prospects (2024), via Our World in Data · `male-population-by-age-group.csv`
and `female-population-by-age-group.csv`, Switzerland, 2023 (the latest year both files carry),
21 five-year bands from 0-4 to 100+.

## What went wrong, caught by looking

Checked the two source files summed to the same total population OWID's own `population.csv`
reports for Switzerland 2023 (8,870,564): the 21 age bands sum to 8,870,560, four people off from
rounding across two independently-modelled series — close enough to trust, and printed in the
render script's own console output rather than asserted silently.
