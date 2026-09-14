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

## The picture — shots, not a page (1920 × 1080)

The shot rules every type follows (`skills/chart-video/references/directed-type-choreography.md`, « The shots,
and how little to write »):

1. **The title card** (`establish`, from frame 0, 1.5 s) — the eyebrow and a short title.
2. **The story** — the map on the whole frame, Lambert azimuthal equal-area (so the ink a country takes IS its
   territory), then the same countries as equal tiles. The KEY — the two counts over the class key — stands on
   the Atlantic at the left, in no plate; the tile grid is laid out to its right, so the key never moves and never
   covers a tile.
3. **No end card** — the video ends on the cartogram, the source a credit in a free corner.

## The choreography — the scrolly's six cards, told with what only a video has

The scrolly's picture (`proof/scrolly-cartogram-europe-lowcarbon`): the reader watches the map become the
cartogram. What only time can do here is **the morph** — every country shrinking or swelling into one equal tile,
Russia melting while Malta swells — and **the counts climbing** as the reading they belong to arrives.

| event | card | what the shot says | gesture | what the viewer sees move, in order inside the event | derived value asserted |
| --- | --- | --- | --- | --- | --- |
| `establish` | — | the question | — | the title card, alone on the ground from frame 0 | — |
| `reference` | 1 + 5 | a map of Europe's low-carbon shares, each country the size of its territory | **reveal in order** | the title gives way to the map; the key comes up; the five classes take their fill one after another, lowest first; Ukraine hollow | class counts low → high; one unreported country |
| `reveal` | 2 | Russia is most of this map, and it is low: by km², 44,9 % | **focus + count up** | every country but Russia steps back; RUSSIE is named with its share; « au km² » counts up to 44,9 % | Russia = the widest country, 73 % of the territory, below the country mean |
| `subject` | 3 | give every country the same room | **morph** | the others return; every country travels from its territory into its equal tile, Russia shrinking, Malta swelling; the sea and the context land fade; once the tiles have landed, every tile's code is set on it | 41 tiles, the grid and the data agreeing both ways |
| `conclusion` | 4 | one tile, one vote: 65,1 % | **count up + compare** | « par pays » counts up to 65,1 % under « au km² 44,9 % »; the credit is set in a free corner | gap > 15 points |
| `hold` | — | the cartogram, readable | — (stillness) | nothing | hold state = conclusion state |

Rules the composition keeps:

- **A name appears only once its gesture has landed**: RUSSIE once the others have stepped back, the tile codes
  once the tiles have landed. Nothing is named while the countries travel.
- **The counts stay once counted** — they are the claim.
- **The morph is eased per country, the class reveal is linear across the classes**, each class easing its own
  arrival; the camera does not move.
- **Every event but the hold changes the state** (`assertEventStates`).

## Write as little as the picture allows

No standfirst, no reading line (« la disposition est dessinée »), no note. The counts are a label and a number
(« au km² 44,9 % », « par pays 65,1 % »); the key is the bornes and « sans donnée »; RUSSIE's share is its only
note; the tile codes are the still's.

## The copy (French)

| slot | text | register |
| --- | --- | --- |
| eyebrow | Énergie · Europe | eyebrow |
| title | « Par pays, 65,1 % de bas-carbone ; au km², 44,9 % » · « Une tuile par pays » | display |
| counts | « au km² 44,9 % » · « par pays 65,1 % », each counting up from 0 | value |
| key | 40 % · 60 % · 75 % · 94 % · sans donnée | axis |
| subject | RUSSIE · 36 % | area (the still's map treatment) |
| tiles | the 41 codes, ISL … CYP | tile: the axis voice, as large as the tiles hold, never under 30 px |
| credit | the source's shortest form that holds three lines | axis at the type floor |

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
