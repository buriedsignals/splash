# Beat — China emitted more CO₂ in 2024 than the next five countries put together

**Type:** bar and column (ranking, vertical columns). **Medium/genre:** chart / static.
**Channel:** article web, 900 x 560 (the default frame — ten columns fit it without crowding).

## Claim

Of the ten countries that emitted the most CO₂ in 2024, China's 12.3 billion tonnes is more than
the United States, India, Russia, Japan and Indonesia added together (11.7 bn t), and 2.5 times
the United States' 4.9 bn t on its own. The ten together account for 69% of the world total.

Every one of those figures is **computed in `render.mjs` from `data.csv` and printed to the
console before the render** — none is typed into the title, the subtitle, the callout or the alt
text. In particular:

- **The ten members and their order** are computed by ranking the frozen file, not listed by hand.
  OWID ships its own aggregates (World, continents, income groups, trade blocs) in the same file;
  the beat keeps only rows whose `Code` is a bare ISO-3166 alpha-3, which is what stops "Asia"
  from topping a chart of countries. 215 country rows kept, 32 aggregates dropped, both counts
  printed.
- **"the next five"** is a search, not an assertion. `render.mjs` adds the countries below the
  subject one at a time and stops at the first one that would carry the running total past the
  subject's own: US + India + Russia + Japan + Indonesia = 11.65 bn t, still under China's 12.29;
  adding Iran (0.79) passes it. If the data moved so the answer were three, the headline would say
  three, and the beat throws rather than draw the comparison if fewer than two countries qualify.
- **"69% of the world total"** is the ten summed over the `OWID_WRL` row of the same frozen file
  (38.6 bn t) — a figure OWID itself publishes, not a world total assembled by hand.

## Its sibling in the video genre

The **video** genre carries the same claim, in `proof/vidz-bar-column-top-emitters/`, written
independently and in parallel by another hand from the same public dataset. Neither imports the
other's files: this beat has its own frozen CSV, its own geometry and its own component, per
`twin-chart-web/SKILL.md`'s "duplicate, do not link" ruling and the precedent
`weby-dumbbell-life-expectancy-gains` already sets for a claim drawn in two genres.

The two are worth reading side by side precisely because they are the same argument in two media,
and they solve the comparison differently: the video introduces the five-country sum as a rule the
viewer watches cross the leading column, while a static frame has no "afterwards" — so this beat
draws the rule and the caption at once, and moves the caption clear of the subject's own label
instead. That difference is the genre, not a disagreement.

## Subject and accent

The subject is **China**, named by the claim. This is the one case
`static-discipline.md`'s "One accent" rule warns about — the subject is also the tallest column —
so the beat does not let the colour carry the argument on its own: the comparison the claim
actually makes is **drawn**, as a dashed rule at China's own level running across every other
column, captioned with the computed sum. A reader who ignores the colour entirely still sees the
argument.

Every other column is muted. The value axis starts at **zero**, non-negotiable for a length
encoding (`references/types/bar-and-column.md`, "Where it goes wrong").

## Why there is no value axis

Every column carries its own value printed above it, which the type sheet requires
("every bar carries its own value, printed directly outside the bar"). `static-discipline.md`
states its axis-density rule as one test — *a reader must be able to locate, on the axis, any
point the chart itself annotates or names* — and here every point is named at the mark. A
gridline set beside ten printed numbers is the same decoding work done twice, which is what
"every layer earns its place" removes. The zero baseline stays, because that is the floor the
lengths are measured from, not decoration.

The value labels are printed **outside** the columns, in ink. That side-steps this type's own
accessibility trap entirely: a label inside a coloured fill needs its contrast measured against
that exact fill, and the naive luminance rule mis-picks white on a mid-toned hue. Outside the
mark, the only contrast that has to hold is ink against the ground, which `deriveFurniture`
already guarantees.

## Number format

One decimal above 1 bn t, two below it. At one decimal, ranks 9 and 10 (0.584 and 0.572) both
print `0.6` — two identical numbers in a chart whose whole job is a ranking.

## Category labels

Wrapped on **measured** width to at most two lines ("United States", "Saudi Arabia", "South
Korea"), never rotated. The wrap width is the band width, so the labels cannot outgrow their own
column.

## Colours

`PALETTE.md`, `origin: newsroom` — the house ground and accent. `twin-palette`'s subject option
had nothing to offer: none of the four grounded conventions fires on "CO₂ emissions", and
inventing a fifth for one beat would be a colour that feels right rather than one a reader
already holds. `render.mjs` names no hex; both values arrive through `readPalette`.

## Source

Global Carbon Budget 2025, via Our World in Data ·
`annual-co2-emissions-per-country.csv?csvType=full`, frozen as `data.csv` filtered to the 2024
rows only (247 rows, all entities including `OWID_WRL`) · extracted 9 August 2026.

The full CSV was taken deliberately rather than a `country=`-filtered one. The claim is a
**global ranking**, so it cannot be established from a hand-picked shortlist — a shortlist would
mean the top ten had been decided before the data was read. The `country=` filter parameter is
also unreliable on this endpoint family
(`twin-intake/references/ourworldindata-csv-filter-trap.md`); a filtered fetch of a twenty-country
shortlist was tried first and, separately, an `electricity-mix` fetch with the same parameter
returned the entire world, which is exactly why the freeze keeps a full year rather than a
selection.

## What went wrong, caught by looking

The first render put the callout's opening words straight on top of China's own value label —
"China's 12.3 bn t" printed over "12.3" — because the caption was anchored at the plot's left
edge, which is precisely where the subject's column and its label already are. Nothing failed:
the exit code was zero and the numbers were all correct. It was found by opening the PNG. The
caption now starts clear of the subject's column, measured from that column's own right edge, and
the redundant "China's 12.3 bn t —" opening was dropped since the column beneath it already says
so.
