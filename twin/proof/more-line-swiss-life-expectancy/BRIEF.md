# Beat — Life expectancy in Switzerland rose 15 years since 1950

**Type:** line. **Medium/genre:** chart / static. **Channel:** article web, 900 x 560 (the default
frame — a single series over 74 years needs no extra vertical room).

## Claim

Life expectancy in Switzerland rose by 15.0 years between 1950 and 2023, from 68.9 to 84.0,
crossing 80 in 2001. Every number in that sentence is computed by `render.mjs` from the frozen CSV
itself, not asserted from the brief's own approximation — the delta and the crossing year both
came out slightly different from the task's ballpark ("about 15 years", "early 2000s") and the
wording follows what the data actually says.

## Subject and accent

One series, one accent: `#0B7A75` (this codebase's house teal), reserved for the line and its 2023
end-point — the only coloured mark on the frame. No legend; the series is named where it ends,
directly at the last point, per `references/types/line.md`'s "direct end-label" rule. The y-axis
is fitted to the readings' own extent (`scaleLinear().domain(extent(readings)).nice()`) and starts
well above zero — a line encodes the 15-year climb by slope, and anchoring 69-84 at a zero floor
would put four-fifths of the frame under the actual readings.

## Source

UN, World Population Prospects (2024), via Our World in Data ·
`https://ourworldindata.org/grapher/life-expectancy.csv?country=~CHE&csvType=filtered` ·
Switzerland, 1950–2023, extracted 8 August 2026.

## What went wrong, caught by looking

Nothing in the render itself — the axis was fitted (not zero-anchored), the end label
("Switzerland 84.0 (2023)") sat clear of the frame edge, the title/source read correctly, and
neither the two COVID-era dips (2020, 2022) nor the tick labels overlapped anything. The one thing
`references/types/line.md` did catch before any drawing happened: its "Where it goes wrong"
section names zero-anchoring a line's y-axis as the specific, opposite-of-bars mistake this type
invites — worth naming explicitly because the sibling proof beat this one's file layout follows
(`static-swiss-age-pyramid`) is a *magnitude* type that correctly zero-anchors its own mirrored
scale, so copying that beat's scale logic by habit, instead of reading the line type's own sheet
first, is exactly the kind of cross-type mistake the doctrine's per-type reference files exist to
prevent.
