---
format: video
size: landscape
type: cartogram
---

# Beat — Par pays 65,1 % ; au km² 44,9 % (video)

**Type:** cartogram (map). **Medium/format:** map / **video**. **Size:** landscape (1920 × 1080), pinned in
the front matter above.

The `cartogram` type in the video format. Same subject, same frozen data (`../static-cartogram-europe-lowcarbon/data.csv`),
same designed grid, same area computation and the same two assertions as `proof/static-cartogram-europe-lowcarbon`:
the country mean and the area-weighted mean are both true, twenty points apart, and a map can only show the second.

## The claim

**Counted by country, Europe's electricity is 65.1 % low-carbon; counted by square kilometre, 44.9 %.** Russia
takes 73 % of these countries' drawn territory at 35.9 %, and drags the area reading down. Asserted in `subject.mjs`:
the gap exceeds 15 points, and the country taking the most room is below the country mean.

## The map: the live MapTiler map while the countries are geography (2026-09-15)

The owner (2026-09-15): the map videos are produced « comme dans scrolly » — `docs/splash/2026-09-15-map-videos-through-maptiler-spec.md`;
the cartogram under the scrolly addendum's §5: a live map while the form shows geography, no basemap once it leaves it.

- **The plan** (`map-plan.mjs`): MapTiler dataviz style, flat Web Mercator, every country drawn by the basemap; the
  classes read from MapTiler Countries beneath the basemap's water, one fill layer per class and role (Russia apart,
  so the focus never touches it; the others stepped back by a bound opacity), each over the neutral it had before its
  class arrived; Ukraine hollow with a dashed edge; every national border; « RUSSIE · 36 % » a symbol layer. One
  camera: the window fitted "meet" in the content box. The equal-area claim is carried by the balance, whose weights
  are still the true areas.
- **The frame drives it** (`scene.mjs`, `mapStateAt`): the camera and the bound fields, from the same
  `geographyAt` the SVG reads. `useLiveMap` releases a frame only once every tile is loaded.
- **The handover** (subject, 8–14 %): once the others are back and the name gone, the SVG shapes — Natural Earth
  projected with the live camera, tested to lie on the measured fills — rise over the map, then the fills leave under
  them; only then does the morph start. A ground rect rises with the morph, so the tiles end on no basemap. Two small
  seams: the basemap's lakes (Ladoga, Finland's) and Crimea (Countries: Ukraine; Natural Earth: Russia) change at the
  handover.
- **Placed from `measured.json`** (`measure.mjs`, one frame after reference; stale plan refused): the key, in the top
  quarter over no studied country (Iceland stands in its column, so it keeps to Greenland and the sea, each word
  haloed in what lies under it); the balance's halos; Russia's name on its own fill. Credit « Ember, via OWID ·
  © MapTiler © OpenStreetMap », on the ground at the end. The key reaches MapTiler only through the proxy;
  `no-key.live.test.ts`.

## The picture — shots, not a page (1920 × 1080)

1. **The title card** (`establish`, from frame 0, 1.5 s) — the eyebrow and a short title.
2. **The story** — the live map on the whole frame (below, « The map »), then the same countries as equal tiles. At the left, on the Atlantic, in no plate: the class key at
   the top, and under it **the balance** — a 0–100 % beam on which every country is a column at its share, its
   height its weight; the tile grid is laid out to its right, so neither moves nor covers a tile.
3. **No end card** — the video ends on the cartogram, the balance struck at both means, the credit on one line in
   the bottom-left corner the tiles leave.

## The choreography

The claim is that the same data gives two means depending on what counts as one. A number cannot show why; a
balance can. Every country stands on the beam at its low-carbon share, **weighed by its territory**: Russia's
column is nearly three quarters of all the weight, at 36 %, and the pivot sits under 44,9 %. Then **the morph** —
every country travels into one equal tile, and in the same motion every column takes the same one-in-forty weight:
Russia's column melts, the small countries' grow, and a live pivot **slides** from 44,9 to 65,1 %, the first pivot
left where it stood. The same eased `m` carries the map and the weights, so the pivot is always under the balance
the columns strike (tested frame by frame).

| event | what the shot says | gesture | what the viewer sees move, in order inside the event | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card, alone on the ground from frame 0 | — |
| `reference` | a map of Europe's low-carbon shares, each country the size of its territory, each weighed by it | **reveal in order** | the title gives way to the map; the key and the beam come up; the five classes take their fill one after another, lowest first, each country's column rising on the beam with its class; Ukraine hollow, with no column | class counts low → high; one unreported country; the columns fill the beam's height |
| `reveal` | Russia is most of this map, and it is low: by km², 44,9 % | **focus + name + measure** | every country but Russia steps back, on the map and on the beam; RUSSIE is named with its share; the pivot is set under the area mean, « au km² 44,9 % » | Russia = the widest country, 73 % of the weight, below the country mean; pivot = the weighted mean |
| `subject` | give every country the same room: 65,1 % | **morph + rebalance** | the others return; every country travels into its equal tile while its column takes one in forty of the weight; a live pivot slides under the moving balance, « par pays {n} % », to 65,1 %; the codes land on the tiles | 41 tiles; the pivot equals the columns' balance at every frame; gap > 15 points |
| `conclusion` | — | — | the credit | — |
| `hold` | the cartogram, readable | — (stillness) | nothing | hold state = conclusion state |

## Write as little as the picture allows

No standfirst, no reading line, no note. The two pivots are a label and a number each (« au km² 44,9 % »,
« par pays 65,1 % »); the key is the bornes and « sans donnée »; RUSSIE's share is its only note; the beam has no
ticks — the pivots say where it stands.

## The copy (French)

| slot | text | register |
| --- | --- | --- |
| eyebrow | Énergie · Europe | eyebrow |
| title | « Par pays, 65,1 % de bas-carbone ; au km², 44,9 % » · « Une tuile par pays » | display |
| pivots | « au km² 44,9 % » · « par pays {n} % », every tenth between them measured | value |
| key | 40 % · 60 % · 75 % · 94 % · sans donnée | axis |
| subject | RUSSIE · 36 % | area (the still's map treatment) |
| tiles | the 41 codes, ISL … CYP | tile: the axis voice, as large as the tiles hold, never under 30 px |
| credit | the longest one-line form that holds the bottom-left corner: « Ember, via OWID · © MapTiler © OpenStreetMap », else « Ember · © MapTiler © OpenStreetMap » | axis at the type floor |

## Video constraints

- Every word at 30 px or more at 1920 × 1080; the markup of every event's last frame is held to `assertTypeFloor`.
- The tile must hold its own code (the still's rule): the tile register is sized to the widest code plus breath
  and refused under the floor.
- The lowest class and the hollow tile are floored at 3:1 against the ground (the still's rule).
- The first frame is the title card; the hold is at least 60 frames.
- Remotion directly: the still at `--frame=-1` first, then the mp4; `--concurrency=1`; an empty `--env-file` on
  every spawn.

## Precision and style

- Families resolved on this beat's own words; registers through `registerOf` → `videoRegistersOf`; the title card,
  the key and the credit from the skill's `shots.mjs`; faces embedded; every `<text>` carries the width Bun
  measured.
- Colours from the direction only; the composition types no size, weight, lead, tracking, family, style, case or
  colour.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`,
from `render-directions-video.mjs`.
