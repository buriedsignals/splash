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
2. **The story** — the calendar across the frame; over it, the two counts at the left and the key (swatches and their
   breaks in °C) at the right, no plate.
3. **No end card** — the video ends on the whole year in colour with the run outlined; the credit.

## The choreography

What only a video can do is **let the year happen**: the calendar fills day by day, linear in days, and the summer arrives
as a band of the darkest bin before any word points at it.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | a year, a cell a day | — (furniture) | the empty calendar, months, day ticks, the key | — |
| `reveal` | Geneva's 2024 | **reveal in order + count** | every day takes its colour, 1 January to 31 December; « {n} jours au-dessus de 20 °C » climbs as each warm day fills | 59 warm days |
| `subject` | the run | **filter + trace + count** | the days under 20 °C step back; the outline runs along the run a day at a time; « {n} jours d'affilée » climbs to 31 | 31 days, 18 July – 17 August |
| `conclusion` | the year | **pull back** | the colours come back with the run still outlined; the credit | — |
| `hold` | the picture | — | nothing | hold = conclusion |

No zoom: at 1920 × 1080 a day is a 50-pixel cell and the run reads at the overview's scale — the close-up the scrolly
needed on a phone buys nothing here.

## Write as little as the picture allows

No standfirst, no dates written out, no monthly means, no extremes: the counts and the outline carry the claim.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
