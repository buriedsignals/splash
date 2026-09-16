---
format: video
size: landscape
type: choropleth
---

# Beat — coal fell in all twelve, Poland still above half (video)

**Type:** choropleth. **Medium/format:** map / **video**. **Size:** landscape (1920 × 1080).

The twelve countries of the EU-27 plus the United Kingdom where coal supplied the largest share of electricity in
2010 (`../static-heatmap-coal-share-europe/data.csv`, Ember via Our World in Data, 180 rows). Asserted in
`subject.mjs` from the rows: coal's share fell in all twelve; three were at or above half in 2010 (Czechia, Greece,
Poland) and one in 2024 (Poland, 54 %); Czechia crosses the half, Germany never reaches it. The caveat travels with
the key: the countries outside the twelve are bare land, « hors des 12 » — this is a map of coal's decline, not of Europe.

## The picture — shots, not a page

The title card from frame 0. Then the live map on the whole frame, the key on the Atlantic west of Iberia (the year,
the count at or above half, five class swatches with the half's borne in the accent, the land outside the twelve).
One close-up on Poland with Czechia and Germany. No end card: the last shot is the whole map, Poland outlined and
named, the credit on one line at the bottom.

## The choreography

The argument: a map the viewer reads at once (2010), run forward to show the fall everywhere, then magnified on the
one country that stays over the half — the map rewinds under the camera and replays while three gauges, on one
0–100 scale notched at half, count their shares down: Czechia's crosses the notch, Germany's was always under it,
Poland's stops above it.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the claim | — | the title card | twelve countries, all fell, only Poland above half |
| `reference` | where coal stood in 2010 | reveal in order | the twelve fill class by class, lowest first; the key arrives, year 2010 | classes per country from the 2010 rows |
| `reveal` | coal fell everywhere | trace in time | the years run 2010 → 2024 (ten frames a year), every fill stepping down; the count 3 → 1 | count at or above half per year |
| `subject` | Poland stays above half | zoom / magnify, rewind, count down | the key steps back, the camera closes on Poland as the fills rewind to 2010; three names over gauges; the years replay, gauges counting down past the notch | Czechia crosses, Germany always under, Poland 54 % |
| `conclusion` | the whole map, the lesson marked | pull back, name | the camera returns, the key returns at 2024, Poland outlined and named, the credit | Poland the only one at or above half |
| `hold` | — | — | nothing | hold = conclusion |

## The owner's rules — checked before the render

- [x] The title card from frame 0, no longer than 1.5 s; the final frame held at least 60 frames; 18 to 22 s in all.
- [x] Every event but the hold changes the picture; the hold changes nothing.
- [x] The video follows the scrolly's picture and choreography, without its cards.
- [x] A documentary argument — transform, magnify, morph — not marks toggled on.
- [x] As little text as the picture allows: no sentence, no standfirst; a close-up names only what it frames.
- [x] A close-up centres its subject on both axes.
- [x] No end card: the video ends on its picture, the credit on one line.
- [x] No word under the type floor at any event's end; every word drawn at its measured width.
- [x] ONE art direction, composed from the newsroom's identity (NEWSROOM.md) — never the three filed demo directions.
- [x] The no-break space written as the `\u00A0` escape in the scripts, never typed.
- [x] Looked at before the mp4: every event's last frame and the middle of each gesture.

## Direction

One — the design base's best composed candidate for the newsroom and this beat's text
(`render-directions-video.mjs`): `renders/<label>.mp4`, `renders/<label>-final-frame.png`, `renders/<label>-props.json`.
