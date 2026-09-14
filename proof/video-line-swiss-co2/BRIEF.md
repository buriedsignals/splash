---
format: video
size: landscape
type: line
---

# Beat — En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967 (video)

**Type:** line. **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen series (`../co2-suisse/data.csv`, Global Carbon Budget 2025 via Our World in Data) and the same
geometry (`../co2-suisse/crossing-geometry.ts`) as the static line beat: territorial CO₂, 1950–2024, peaking at 46,2 Mt in
1973, back under the 1967 level (32,5 Mt) at 32,1 Mt in 2024. Asserted: the peak is 1973, the 2024 reading is under the
1967 level, and the last year before the peak at or under today's reading is 1966.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the chart on the whole frame: three value ticks (floor, the 1967 level, top), decades along the bottom,
   the 1967 level a dashed rule named on itself.
3. **No end card** — the video ends on the whole line with 2024 named; the credit.

## The choreography

A line's argument is its shape through time. What only a video can do is **draw the time**: the line traces itself year
by year, linearly, with the year and its reading riding at its tip — the viewer sees the climb, the plateau and the fall,
and sees the line come back down through the rule.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | this is the level of 1967 | — (furniture) | the ticks and decades; the 1967 rule lands with « Niveau de 1967 » | — |
| `reveal` | 75 years of emissions | **trace** | the line draws 1950 → 2024, linear in years; the tip carries « {année} · {valeur} Mt »; the 1973 peak is marked « pic de 1973 » once passed | peak = 1973 |
| `subject` | 2024: 32,1 Mt, under 1967 | **name** | the end point is ringed; the tip label settles in the accent | 2024 < 32,5; the crossing year |
| `conclusion` | — | — | the credit | — |
| `hold` | the line, readable | — | nothing | hold = conclusion |

## Write as little as the picture allows

No standfirst (« émissions territoriales » is in the credit's source line), no era bands, no « sous le niveau dès 2023 »:
the line crossing the rule shows it.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
