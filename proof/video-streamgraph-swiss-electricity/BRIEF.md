---
format: video
size: landscape
type: streamgraph
---

# Beat — En 2016, le solaire est devenu la troisième source d'électricité suisse (video)

**Type:** streamgraph (silhouette offset, inside-out order). **Medium/format:** chart / **video**. **Size:** landscape
(1920 × 1080).

Same subject, same frozen file (`../static-streamgraph-swiss-electricity/data.csv`) and the same assertions as
`proof/static-streamgraph-swiss-electricity`: every year 2000–2024 present (2025 is partial and excluded), Switzerland
only, solar's rank computed year by year, first third in 2016 and third every year since. The same stack: silhouette
offset, inside-out order, no value axis.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the stream on the whole frame, years along the bottom, no value axis (a free baseline has none).
3. **No end card** — the video ends on the whole stream, solar named with its rank; the credit.

## The choreography

The claim is a rank changing over time. What only a video can do is **carry the rank along the time**: the stream flows
from 2000 to 2024, linear in years, and solar's name rides the front of its own band with its rank that year —
« Solaire · 7e », then 5e in 2014, 4e in 2015, 3e in 2016 — and holds 3e to the end.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | the years | — (furniture) | the year ticks | 25 complete years, one country |
| `reveal` | 25 years of Swiss electricity, solar climbing | **trace + count** | the stream flows left to right; the two large bands are named inside themselves once passed; « Solaire · {rang}e » rides solar's band at the front | solar's rank per year |
| `subject` | third since 2016 | **filter + name** | every band but solar steps back; the 2016 rule lands with its year | first third in 2016; held since |
| `conclusion` | — | — | the others return; the credit | — |
| `hold` | the stream | — | nothing | hold = conclusion |

## Write as little as the picture allows

No standfirst, no reading line, no totals, no start and end values: the rank riding the band is the claim.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
