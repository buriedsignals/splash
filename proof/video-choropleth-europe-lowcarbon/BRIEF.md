---
format: video
type: choropleth
size: landscape
---

# Beat — Sept pays européens dépassent 94 % d'électricité bas-carbone — six au nord-ouest, et l'Albanie (video)

**Type:** choropleth (map). **Medium/format:** map / **video**. **Size:** landscape (1920 × 1080),
pinned in the front matter above — watched on a phone turned sideways, so every word, map names
included, is drawn at 30 px or more.

The picture and the choreography of `proof/scrolly-choropleth-europe-lowcarbon` — the scrolly's six
cards, told in time, **without the prose cards** — then the video's own constraints, then precision
and style. Version 1 of this beat (a text panel beside a live MapLibre map, commits
bff3f146..e67f8787) was rejected by the owner as a static poster; this version replaces it.

## The claim

**Seven European countries drew more than 94 % of their 2024 electricity from low-carbon sources.
Six of them are north or west of the seventh — and the seventh is Albania, whose every measured
neighbour is under 60 %.**

## Data, shapes and modules: read, not copied

- The subject: `loadSubject({ dir: "../static-choropleth-europe-lowcarbon" })`
  (`proof/static-choropleth-europe-lowcarbon/beat.mjs`) — the frozen `data.csv` and
  `shapes.geojson` (byte-identical to the scrolly's copies), the claim asserted on load: seven above
  `FLOOR` 94, Albania among them, its measured neighbours under 60, the other six north or west.
- The map: the scrolly's vector geometry — `cameraFor` and `choroplethGeometry`
  (`proof/scrolly-choropleth-europe-lowcarbon/choropleth-geometry.mjs`) on the static plate's bake
  bounds and 1000 × 760 camera. Its rings are CLAMPED to the margin; the video clips them first
  (Sutherland–Hodgman, the contour beat's `clipRing`) so no clamped ring can fold over the west.
- The camera and the reveal arithmetic: `fitViewBox`, `clamp01`, `lerp`, `ease`
  (`skills/scrolly/assets/reveal.mjs`); the painting rules of `choropleth-drive.mjs` (fill = class ×
  reveal × filter, names at each country's most interior seat, a later name stepping clear of an
  earlier one) re-expressed as a pure function of the frame, because the drive reads the DOM.
- The colours: `rampFor` (class fills, the missing fill — the scrolly's own construction) and
  `plateTints` (sea, bare land); inks walked to the text floor from the direction.

No MapLibre, no MapTiler, no key, no proxy.

## The picture (1920 × 1080)

Between `frameInsetFor("landscape")` on the sides (85 px) and the same rule read on the frame's height at
the top and bottom (`max(round(40/900 × 1080), 2 × 30)` = 60 px), laid out from both ends so the map takes
every pixel the words do not need:

1. **Header** (top-down) — the eyebrow, then the title on ONE line. **The counter** « 7 pays au-dessus de
   94 % », right-aligned, its room reserved from frame 0: on the title's line when title and count hold one
   line, else on the eyebrow's line, else on a row of its own. With the title that names Albania no direction
   can hold both on the title's line (creme would need the title at 39 px, under the 45 px count), so the count
   sits on the eyebrow's line in all three.
2. **Map stage** — exactly the height between the header and the key, the full width between the insets; the
   camera's box is fitted in it and the view widened to the stage (`fitViewBox`), the geography drawn past the
   frame so no side is bare. Sea and bare land in the plate's tints.
3. **Key** (bottom-up) — two lines: the six class swatches; under them the five bornes, the key's label
   « part bas-carbone de la production » straight after « 94 % », and the « donnée non rapportée » swatch and
   words (after the label when the line holds them, else after the swatches).
4. **Source** — one line at the bottom margin; beside the key when it fits there (it does not, in any
   direction, without cutting a credit).

No prose card, no conclusion sentence, no side panel. The counter and the key are never over the map.

## The copy (French)

| slot | text | register |
| --- | --- | --- |
| eyebrow | Énergie · Europe | eyebrow |
| title | the scrolly's three forms, longest first: « Sept pays européens dépassent 94 % d'électricité bas-carbone — six au nord-ouest, et l'Albanie » · « Le bas-carbone européen est au nord-ouest — et en Albanie » · « Le bas-carbone européen, et son exception » — the longest form that holds one line; a form may step its size down, never to or under the next largest register | display |
| counter | « {n} pays au-dessus de 94 % », n counting 0 → 7 | value |
| key | 40 % · 55 % · 70 % · 85 % · 94 % · part bas-carbone de la production · donnée non rapportée | axis |
| names, north-west | Islande · Suède · Norvège · Finlande · France · Suisse | axis |
| names, close-up | Albanie · 100 % · Monténégro · 59 % · Macédoine du Nord · 39 % · Grèce · 49 % · Kosovo, hors données — no name but Albania's may sit on Albania's box | value (Albania), axis |
| names, pull back | the six · Albanie · 100 % · Ukraine · donnée non rapportée | axis — Albania in the figures voice only in its close-up, where it is the whole shot; at the overview a 45 px pill pushed France and Switzerland off their countries |
| seas | Mer du Nord · Méditerranée · Baltique — drawn at the overview only, and only where the whole word lies over sea and touches no name. At 39 px the scrolly's three sea names, at the scrolly's centres, all run onto land (Denmark, Sweden, Sicily), so none is drawn in any direction | annot |
| source | « Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · contours Natural Earth 50 m », shortened to the longest of its forms that holds one line | axis |

## The choreography — the scrolly's six cards, told with what only a video has

The owner (2026-09-14): « la manière de présenter les données entre static, scrolly et web interactif et video c'est pas du tout pareil. Donc utilise à bon escient le fait que ce soit une vidéo ». Two gestures only time can make: the FLOOR RISES — the filter is a cursor travelling the key while the count steps down with it — and the close-up's SHARES COUNT UP once the camera has settled.

The timing contract's events carry the cards in order. The scrolly's cards 3 and 4 share `reveal`:
the filter and the count run first, and the six names arrive only once the filter has landed.

| event | card | what the shot says | gesture | what the viewer sees move, in order inside the event | derived value asserted |
| --- | --- | --- | --- | --- | --- |
| `establish` | 1 | Europe in 2024, before any value | — (furniture) | Europe's land and sea are drawn from frame 0 at the overview camera, every studied country bare land, Ukraine in the « non rapportée » fill; the eyebrow, title, key frame (label and « non rapportée » swatch) and source come up once and never move again | reported `value.size` = 40; unreported = 1 (Ukraine) |
| `reference` | 2 | the colour is a class, from under 40 % to 94 % and more | **reveal in order** | the six classes take their fill one after another, < 40 % first, ≥ 94 % last — each class's swatch and its borne arriving with it | class counts low → high = 8 · 6 · 6 · 8 · 5 · 7, summing to 40 |
| `reveal` | 3 + 4 | above 94 %, only seven remain — six are north or west | **the floor rises** (filter as time), then **name** | a cursor travels the key borne by borne — 40, 55, 70, 85, 94 % — and each class it passes steps back to bare land, its swatch fading with it, while the counter steps down « 40 pays » → « 32 pays au-dessus de 40 % » → 26 → 20 → 12 → « 7 pays au-dessus de 94 % »; once the floor stands at 94 %, Islande, Suède, Norvège, Finlande, France, Suisse are named | counts at or above each borne = 40 · 32 · 26 · 20 · 12 · 7; stepped back = 33; named = 6, each north or west of Albania |
| `subject` | 5 | the seventh is Albania, 100 %, and its three measured neighbours are all under 60 % | **zoom + name** | the six names leave; every class returns as the camera travels, eased, onto the Balkans, Albania at the centre of the close-up; once the camera has settled: Albania ringed and named, its share **counting up** from 0 to « 100 % », then « Monténégro », « Macédoine du Nord », « Grèce », each share counting up to 59, 39 and 49 %, and « Kosovo, hors données » | Albania ∈ `above` at 100 %; measured neighbours = 3, the highest Monténégro 59.5 % < 60; Kosovo = the one ring-neighbour without a row |
| `conclusion` | 6 | Europe again, with what was learned still marked | **pull back** + **name** | the close-up names leave; the camera returns to the overview; once it has settled: every class on the map, the six named, Albania ringed and named, « Ukraine · donnée non rapportée » | conclusion camera = establish camera |
| `hold` | — | the claim, readable | — (stillness) | nothing | hold state = conclusion state; hold ≥ 60 frames |

Rules the composition keeps:

- **A name appears only once its gesture has arrived**: the six after the filter has landed, the
  close-up names only after the camera has settled at the close-up, the pull-back names only after
  it has settled at the overview. Nothing is named while the camera moves.
- **The counter stays once counted.** In the scrolly it leaves with the filter at card 5; with no card
  to say « sept », the counter is the only words that state the count, so the video keeps it from
  `reveal` to the hold.
- **The camera is eased, the class reveal is linear across the classes in value order**, each class
  easing its own arrival.
- **Every event but the hold changes the state** (`assertEventStates`).

## Video constraints

- Every word at 30 px or more at 1920 × 1080 — the scrolly's 12–14 px pills become the video
  registers (`videoRegistersOf`, one factor k). The rendered markup of every event's last frame is
  held to `assertTypeFloor`.
- Names are short pills at each country's seat (its most interior point), kept apart, and kept
  inside the stage; the pills for one camera are placed once, in Bun, for the full set that camera
  ever shows, so no name moves when another arrives. A pill that would touch another steps to the
  nearest clear position that keeps it against its country; at the overview, where a name is wider
  than most countries, that position also prefers sea and its own land over a neighbour's, a named
  country's land counted four times, so « Suisse » does not sit on France. In the close-up every
  country is larger than its name and each name keeps its seat unless another name is in the way. At the
  overview Albania's ring is kept clear, so its name sits beside the ring rather than over it.
- The first frame is not empty; the hold is at least 60 frames; the whole is at least 12 s.
- Remotion directly: the still at `--frame=-1` first, then the mp4; `--concurrency=1`; an empty
  `--env-file` on every spawn.

## Precision and style

- Families resolved on this beat's own words; registers through `registerOf` → `videoRegistersOf`;
  text cased with `applyCase` in Bun; faces embedded (`wantedOf` + `writeRenderProps`); every
  `<text>` carries the width Bun measured (`data-width`) and Chrome's width must agree.
- Colours from the direction only: `rampFor`, `plateTints`, `deriveFurniture`, `adjustToContrast`.
  The composition types no size, weight, lead, tracking, family, style, case or colour.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`,
`renders/<id>-props.json`, from `render-directions-video.mjs`.
