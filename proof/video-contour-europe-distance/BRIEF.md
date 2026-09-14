---
format: video
size: landscape
type: contour
---

# Beat — La moitié de l'Europe est à moins de 132 km de la mer (video)

**Type:** contour / isoline (map). **Medium/format:** map / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen shapes and study area, same field and the same assertions as
`proof/static-contour-europe-distance`: an exact distance transform on a 6 km grid in Lambert equal-area, median 132 km,
42 % within 100 km, 89 % within 400 km, the farthest point 682 km from the sea, in Belarus. The field is the scrolly's
`contour-field.mjs`, run once in Bun.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — Europe on the whole frame, the camera still. The land bare, the land outside the measurement (Russia,
   which the frame cuts) fainter; the key — the count and « hors mesure » — standing on the Atlantic.
3. **No end card** — the video ends on every line with its number and the farthest point marked; the credit on the sea.

## The choreography

What only time can do here is **the sweep**: a fill advancing inland from every coast at once, its front an edge, each
line left where the front passed it, the count climbing with it.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card alone | — |
| `reference` | every point of the land is some distance from the sea | — (furniture) | the title gives way to the land; the key comes up | 40 countries measured, Russia out |
| `reveal` | from every coast at once, to half the land: 132 km | **sweep + count** | the fill advances inland from 0 to 132 km, linearly; the 100 km line is left where it passes; the count climbs to « 50 % à moins de 132 km »; the median line lands in the accent with its number | within(100) = 42 %, within(132) = 50 % |
| `subject` | on to the last point: 682 km, in Belarus | **sweep + name** | the fill carries on to 682 km, leaving the 200, 300, 400 and 500 km lines; the count reaches « 100 % à moins de 682 km »; the farthest point is marked with its number once the front has passed it | deepest = 682 km in BLR; within(400) = 89 % |
| `conclusion` | the lines are the reading | **withdraw** | the fill withdraws, every line with its number stays; the credit is set | — |
| `hold` | the contour map, readable | — | nothing | hold = conclusion |

The sweep's traversal is linear in kilometres (a measured axis); everything that arrives eases.

## Write as little as the picture allows

No standfirst, no reading line. The count is a number and a distance; the key is « hors mesure »; every line carries its
number; the farthest point carries « 682 km ».

## Video constraints, precision and style

As every directed video beat: 30 px floor on every event's last frame, the title at frame 0, faces embedded, widths
agreed, colours from the direction only (the scrolly's measured land step, the fill a tint of the accent, lines and
numbers floored against both the land and the fill), an empty `--env-file` on every Remotion spawn.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
