---
format: video
size: landscape
type: scatter
medium: chart
grounding: supported
---

# Beat — Au-delà de 30 000 $ par personne, l'espérance de vie tient dans une bande 3 fois plus étroite (video)

**Type:** scatter (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-income-life-expectancy/data.csv`) and the same assertions as
`proof/static-income-life-expectancy`: 165 countries in 2021, GDP per capita (log scale) against life expectancy at
birth; no reading under 35 years; the break the beat declares at 30 000 $; below it 124 countries across 41 years of life
expectancy, above it 41 countries across 14 — a band 3 times narrower (the ratio rounds to 3 within 0,15, the static
title's own rule). The cloud in one neutral, the accent spent on the break and its two spans, never on a country.

## The argument

The 165 life expectancies start as one column — every country at its own age, no income yet; they unfold along income,
poorest first, each keeping its height, into the cloud; the break is drawn and the cloud folds back against it into two
columns, each measured by a bar on the same age scale; the short bar of the rich is copied onto the long bar of the rest
and fits three times.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — « Espérance de vie » and « 30 000 $ » on the head row, the count at its right while the countries land;
   the plot with its age gridlines; the income ticks under it; « PIB par habitant » at the right of the bottom row.
3. **No end card** — the video ends on the whole cloud, the break drawn, the two spans barred against it with « 41 ans »
   and « 14 ans », the credit on one line at the left of the bottom row.

## The choreography — an argument, not a reveal

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | 165 countries, from 40 to 85 years | — (furniture) | the age gridlines and ticks, the income ticks, one column of 165 dots at the plot's left, each at its own age | each dot at its life expectancy; no two dots overlapping in the column |
| `reveal` | income sorts them | **unfold + count** | poorest first, each dot flies horizontally to its income (an arrival, eased) keeping its height; « {n} pays » climbs as they land | a dot's height never changes; 165 counted |
| `subject` | beyond 30 000 $ the band is 3 times narrower | **filter + fold + stack** | the break rule drawn down at 30 000 $; the cloud folds against it into two columns, each dot keeping its height; a bar grows beside each column over its span, « 41 ans », « 14 ans »; three copies of the short bar fly one after another onto the long bar and stack; « 3 fois » | 124 / 41 on each side; bar heights = the spans on the age scale; copy height = the short bar's; three copies = the rounded ratio |
| `conclusion` | the whole cloud | **pull back** | the dots unfold back to their incomes, the copies and « 3 fois » go; the credit | nothing stepped back, every dot on its seat, the bars and their values still there |
| `hold` | the cloud | — | nothing | hold = conclusion |

## Write as little as the picture allows

The ticks, two axis names, « 30 000 $ », the count, « 41 ans », « 14 ans », « 3 fois ». 20 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
