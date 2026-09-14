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
3. **No end card** — the video ends on the whole stream, 2016 ruled through it, « Solaire · 3e » at its end; the credit on
   one line under the years.

## The choreography

The claim is a rank, and the stream hides it: hydropower and nuclear are so large that the race for third runs in bands
a few pixels thick. So the video **sets the giants aside** — they fade and close to nothing while the small sources close
in where they were, on the stream's own scale — **magnifies** what is left until it fills the frame, then **turns it into
lines from zero**, where rank is height. A cursor **races** the years with solar's rank riding its line — 7e, 5e, 4e —
and as solar passes oil the rank turns 3e and 2016 is ruled. Then **everything returns**: the lines become bands, the
magnification drops, the giants come back, and 2016 stays ruled through the whole stream.

The stream is drawn on a curve that passes through the readings, so the lines cross where the data cross.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | the years | — (furniture) | the year ticks | 25 complete years, one country |
| `reveal` | 25 years of Swiss electricity | **trace** | the stream flows left to right, linear in years; hydropower and nuclear named inside themselves once passed | — |
| `subject` | third since 2016 | **filter, magnify, transform, count** | the giants fade and close; the small stream magnified about 7×; the bands turn into lines from zero; the cursor races 2000 → 2024 with « Solaire · {rang}e »; oil named; 2016 ruled once passed | the giants hold ranks 1–2 every year; solar under oil in 2015, over it in 2016; first third in 2016; held since |
| `conclusion` | — | **pull back** | lines back to bands, the magnification drops, the giants return; the credit | — |
| `hold` | the stream | — | nothing | hold = conclusion |

## Write as little as the picture allows

No standfirst, no values, no value axis: the rank riding the line and the rule are the claim. Only oil — the source solar
overtakes — is named in the lines.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
