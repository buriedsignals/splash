---
format: video
size: landscape
type: dot-density
---

# Beat — 72 réacteurs sur 8 900 centrales bas-carbone, et un tiers de la puissance (video)

**Type:** dot density (map). **Medium/format:** map / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen register (`../static-dot-density-europe-stations/stations.csv`, WRI Global Power Plant
Database v1.3.0) and the same assertions as `proof/static-dot-density-europe-stations`: 8 900 low-carbon stations, 72
nuclear — under 1 % of the sites — carrying over 30 % of the capacity, nuclear the most concentrated fuel per site.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — Europe on the whole frame in the sibling maps' equal-area projection, one dot one station where the
   station is; the key — the counts and what a dot and a ring are — standing on the Atlantic.
3. **No end card** — the video ends on the stations drawn by their weight, the credit in a sea corner.

## The choreography

A dot map gives two readings a bar chart cannot: the count of places and the weight of each. Time can give them one
after the other on the same dots — the gesture only a video has is **the dots growing into their weight**, their area
carried linearly. So the viewer does not have to compare two percentages in words, **one bar measures both**: the
nuclear share of the weights, a sliver while every station counts one, widening to a third as the dots take their
capacity. Brisk: 17.4 s, a 2 s hold; the credit on one line, in the lowest corner clear of every station.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card alone | — |
| `reference` | 8 900 low-carbon stations, each where it is | **reveal in order + count up** | the land; fuel by fuel, from the most sites to the fewest, the dots arrive; « centrales » counts up to 8 900 | 8 900 stations |
| `reveal` | 72 of them are nuclear: 0,8 % of the sites | **filter + name + measure** | every other dot steps back; the 72 are ringed; « 72 nucléaires · 0,8 % », and under it a 0–100 % bar where their share is a sliver | 72 sites, share < 1 % |
| `subject` | and they carry a third of the power | **rescale + measure** | the others come back; every dot's area grows to its capacity — the rings swell, the solar field stays dust; on the bar the nuclear segment widens from its 0,8 % sliver to 34,4 %, carried with the dots; « 34,4 % de la puissance » counts up; a size reference lands in the key | share > 30 %; nuclear the highest MW per site; the bar's share = the weights' share at every frame |
| `conclusion` | — | — | the credit is set | — |
| `hold` | the weighted map, readable | — | nothing | hold = conclusion |

## Write as little as the picture allows

No standfirst, no reading line, no note on the database's coverage. The key is three counts, « une centrale », « nucléaire »
and one size reference.

## Video constraints, precision and style

As every directed video beat: the shots from `skills/map-beat/scripts/shots.mjs`, the 30 px floor on every event's last
frame, faces embedded, widths agreed (every text a count can show measured in Bun), colours from the direction only
(the land and the sea `plateTints`, the dots the accent), rings clipped not clamped, an empty `--env-file`.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
