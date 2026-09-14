---
format: video
size: landscape
type: calendar-heatmap
---

# Beat — 31 jours d'affilée au-dessus de 20 °C à Genève en 2024 (video)

**Type:** calendar heatmap (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-calendar-heatmap-geneva/data.csv`, Open-Meteo ERA5 daily mean at 2 m) and the
same derivation as `proof/static-calendar-heatmap-geneva`: one cell a day, one row a month, six quantile bins in one hue.
Asserted: every day of 2024 present and in order, the longest run at or above 20 °C is 31 days (18 July – 17 August),
59 warm days in all, five distinct breaks.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — first the year as its daily temperature over a dashed 20 °C line; then the calendar across the frame,
   the counts at the left and the key at the right over it, no plate.
3. **No end card** — the video ends on the whole calendar in colour with the run outlined; the credit on one line.

## The choreography — an argument, not a reveal

A calendar heatmap is a temperature curve rolled up. The video **shows the roll**: the year drawn as a curve — the warm
days rising over the 20 °C line, counted — then every day falling from the curve into its cell, taking its colour, until
the curve has become the calendar; then the run.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | Geneva's 2024, day by day | **trace + count** | the daily temperature drawn 1 January → 31 December over the dashed 20 °C line, linear in days; the days over it in the accent; « {n} jours au-dessus de 20 °C » climbs to 59 | 59 warm days |
| `reveal` | the same days as a calendar | **transform** | every day falls from its place on the curve into its cell, one after another, growing into it and taking its bin's colour; the curve and its line go; the months, day ticks and key come in | — |
| `subject` | the run | **filter + trace + count** | the days under 20 °C step back; the outline runs along the run a day at a time; « {n} jours d'affilée » climbs to 31 | 31 days, 18 July – 17 August |
| `conclusion` | the year | **pull back** | the colours come back — the whole calendar — the run still outlined; the credit | — |
| `hold` | the picture | — | nothing | hold = conclusion |

## Write as little as the picture allows

« 20 °C », the counts, the months, the day ticks, the key's breaks. A brisk rhythm: 20,7 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
