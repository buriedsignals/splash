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

## The map: the live MapTiler map of the scrolly pilot (2026-09-15)

The owner (2026-09-15): the map videos are produced « comme dans scrolly » — `docs/splash/2026-09-15-map-videos-through-maptiler-spec.md`.

- **The plan** is the validated scrolly pilot's own (`plan.mjs`, `seats.json`, copied byte-identical from
  `quality/scrolly` fdec7bbd and pinned in `shared/map-beat/COPIED-FROM.json`): MapTiler dataviz style, flat Web
  Mercator, every country of the world drawn by the basemap, the class fills read from MapTiler Countries and drawn
  beneath the basemap's water, one fill layer per class, the six, Albania and three seas as map symbol layers,
  Albania's ring a circle layer, the regions' borders (Countries level 1) arriving with the close-up. `map-plan.mjs`
  gives it the video's cameras (the static plate's frame fitted on both axes of 1920 × 1080; the close-up 2.3 zoom
  levels in, centred on Albania), colours and faces.
- **The frame drives it** as the scroll drives the pilot: `mapStateAt(props, frame)` is a camera in Web Mercator
  numbers (centre and zoom linear in the eased travel) and the bound fields `classes`, `filter`, `top`, `zoom`, `odd`.
  `useLiveMap` (`skills/map-beat/assets/live-map.ts`) mounts the map once, `jumpTo`s and sets the bound paints each
  frame, and releases a frame only once the map is idle with every tile loaded.
- **The words outside the map** (the panel, the close-up's labels and gauges, the credit) stay SVG, placed in Bun from
  `measured.json`: the real map measured once per fixed camera (`measure.mjs` → `measureLiveMap`), projected seats and
  a grid of cell colours; a plan changed since the measurement is refused.
- **The key** reaches the map only through the local proxy (`skills/map-beat/scripts/maptiler-proxy.mjs`), which keeps
  a keyless tile cache outside the repository; `no-key.live.test.ts` holds every output to it. Renders use
  `--gl=swangle --concurrency=1` and an empty `--env-file` (`renderVideoMap`).
- **The credit** carries MapTiler's attribution on one line. The spec's form (« Source : Ember, via Our World in Data ·
  © MapTiler © OpenStreetMap ») is wider than the open sea the whole map leaves: creme and rapport set « Ember, via
  OWID · © MapTiler © OpenStreetMap », nocturne (tracked) « Ember · © MapTiler © OpenStreetMap » — provisional, the
  owner to rule.

## The picture — shots, not a page (1920 × 1080)

The owner (2026-09-14): « Le layout vidéo ne doit pas être comme les autres, genre premier plan le titre en
premier puis ensuite tout un storytelling ». The video is cut into shots:

1. **The title card** (`establish`, from frame 0, 1.5 s) — the eyebrow and the short title that names
   Albania, alone on the direction's ground, as large as the display register draws, wrapped to a reading
   measure (72 % of the content width, at most three lines), the block centred on the frame's height.
2. **The story** (`reference` → `conclusion`) — the map on the whole frame, edge to edge; the camera is the
   viewBox. The count and the key sit in ONE PANEL, seated by measurement where it covers the least land
   under the overview camera and none of the seven's; it comes with the classes and leaves for the close-up.
   The map carries **the still's anatomy** (below).
3. **No end card — the video ends on the map** (end of `conclusion`, then `hold`). The owner (2026-09-14): « la
   vue finale doit être la map et pas le titre à nouveau ». The last picture is the overview with every class,
   the seven named, Albania ringed and the three lowest named; the source is set at the type floor (30 px, the
   axis voice — smaller than every other word) **on one line** (the owner, 2026-09-14: « tes crédits/sources sur
   trois lignes alors que le tout pourrait tenir en une ligne »). One line is wider than any sea corner this camera
   leaves, so the credit is seated first, in the highest row from the top-left whose line crosses no studied
   country (it may cross Greenland), and the panel hangs under it — one block, the credit over the count and the key.

## Write as little as the picture allows

The owner (2026-09-14), on the second cut: « l'objectif dans les vidéos c'est de réussir à faire comprendre en
écrivant le moins possible de texte explicatif ». So: no standfirst, no callout, no unit line; the count is
« 7 pays » alone — the cursor on the bornes says above what; the key's absence is « sans donnée »; the panel
has no plate, its words stand in their halo on the sea; the claim does not repeat the neighbours the close-up
counted — and there is no end card to restate it: the final map is the claim. What a sentence said, the
choreography shows.

## The still's anatomy, redrawn in the frame

The owner (2026-09-14), on the first cut: « Il n'y a qu'un fond de carte et rien d'autre » — and on the
basemap: « Vectoriel + anatomie statique ». The map words are the still's (`static-choropleth-europe-lowcarbon`),
set in SVG over the vector map:

- **Names in capitals, haloed.** `area` is the axis register tracked to at least 0.8 px of the still (× k);
  `feature` — the seven the claim is about — is that at 700 (`mapRegistersOf`, after the still's
  `mapRegistersFor`). The halo is the still's stroke, `max(2.5, ascent × 0.34)` (× k for the floor), struck
  in the colour of the country under the word's centre — and it follows that colour frame by frame, since the
  floor steps countries back under the words.
- **The ink is measured against every cell the word crosses**, in every state the word is seen in (the six
  at the floor and at the close, the rest with every class in): the accent walked to 7:1 for a feature, the
  muted ink to 4.5:1 for an area (the still's `inkFor`). A position no ink reads on is refused.
- **Whole inside, or led.** A word lies wholly inside its own country (both ends, both quarters, the middle
  of its line) or stands clear of its seat and is led to it by a line and a dot, the still's rule; the leader
  is struck on its word's halo so it reads over a dark country. Albania's names are exempt: the ring says
  which country they name, and the overview name leads from the ring.
- **Context names**: the three lowest shares — Chypre, Malte, Moldavie — as the still names them.
- **Seas in italic** (`water`: the axis in italic, untracked, haloed in the sea), searched within two and a
  half leads of their declared centres, in open water, inside the margins, clear of names and panel; no
  abbreviation. The still's three seas do not fit the video's camera (the North Sea and the Baltic are too
  narrow for the word at 36 px, the Mediterranean's centre sits on the bottom margin beside Malta), so the
  video declares the waters its camera carries — Océan Atlantique, Mer de Norvège, Mer Noire — and keeps
  whichever the search can hold.
- **The close-up frames what it shows**: Albania's ring and its neighbours' names, centred on their extent
  (each name as wide as it is drawn), the ring whole with a frame margin of air — not Albania at the centre
  with half the shot on the Adriatic.

## The copy (French)

| slot | text | register |
| --- | --- | --- |
| eyebrow | Énergie · Europe | eyebrow |
| title | « Le bas-carbone européen est au nord-ouest — et en Albanie » · « Le bas-carbone européen, et son exception » — the first that holds three lines of the measure; a form may step its size down, never to or under the next largest register | display |
| counter | « 40 pays » → « 32 pays » → 26 → 20 → 12 → « 7 pays » | value |
| key | 40 % · 55 % · 70 % · 85 % · 94 % · sans donnée | axis |
| names, north-west | ISLANDE · SUÈDE · NORVÈGE · FINLANDE · FRANCE · SUISSE | feature |
| names, lowest | CHYPRE · MALTE · MOLDAVIE | area |
| names, close-up | ALBANIE · 100 % · MONTÉNÉGRO · 59 % · MACÉDOINE DU NORD · 39 % · GRÈCE · 49 % · KOSOVO, HORS DONNÉES — no name but Albania's may sit on Albania's box; the neighbours placed in the order that keeps them nearest their seats | value as a feature (Albania), area |
| names, pull back | the six · ALBANIE · the three lowest — the share was counted at the close-up; Ukraine's fill is the key's « sans donnée » | feature, area |
| seas | Océan Atlantique · Mer de Norvège · Mer Noire (and the still's Mer du Nord · Mer Méditerranée · Mer Baltique where they fit) | water |
| source | « Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · contours Natural Earth 50 m » down to « Source : Ember, via Our World in Data » (Natural Earth asks for no credit) — the longest one-line form that finds a row, set on the final map | axis |
| gauges | none — each measured share at the close-up carries a bar under its words, 0–100 % over one width, the 94 % floor notched in the accent | — |

## The choreography — the scrolly's six cards, told with what only a video has

The owner (2026-09-14): « la manière de présenter les données entre static, scrolly et web interactif et video c'est pas du tout pareil. Donc utilise à bon escient le fait que ce soit une vidéo ». Two gestures only time can make: the FLOOR RISES — the filter is a cursor travelling the key while the count steps down with it — and the close-up MEASURES AGAINST THAT FLOOR: every measured share fills a gauge on one scale with the 94 % floor notched on it, so the exception is seen, not read — Albania's gauge crosses the notch, its neighbours' stop near half (the owner, 2026-09-14: « vraiment chercher à proposer plus que simplement faire apparaître les données »). Brisk: 19.3 s, a 2 s hold.

The timing contract's events carry the cards in order. The scrolly's cards 3 and 4 share `reveal`:
the filter and the count run first, and the six names arrive only once the filter has landed.

| event | card | what the shot says | gesture | what the viewer sees move, in order inside the event | derived value asserted |
| --- | --- | --- | --- | --- | --- |
| `establish` | 1 | Europe in 2024, before any value | — (furniture) | Europe's land and sea are drawn from frame 0 at the overview camera, every studied country bare land, Ukraine in the « non rapportée » fill; the eyebrow, title, key frame (label and « non rapportée » swatch) and source come up once and never move again | reported `value.size` = 40; unreported = 1 (Ukraine) |
| `reference` | 2 | the colour is a class, from under 40 % to 94 % and more | **reveal in order** | the title card gives way to the map; the panel comes up with « 40 pays »; the six classes take their fill one after another, < 40 % first, ≥ 94 % last — each class's swatch and its borne arriving with it; once the lowest class has landed, CHYPRE, MALTE, MOLDAVIE are named | class counts low → high = 8 · 6 · 6 · 8 · 5 · 7, summing to 40 |
| `reveal` | 3 + 4 | above 94 %, only seven remain — six are north or west | **the floor rises** (filter as time), then **name** | a cursor travels the key borne by borne — 40, 55, 70, 85, 94 % — and each class it passes steps back to bare land, its swatch fading with it, while the counter steps down « 40 pays » → « 32 pays » → 26 → 20 → 12 → « 7 pays »; the three lowest names step back as the floor passes 40 %; once the floor stands at 94 %, Islande, Suède, Norvège, Finlande, France, Suisse are named | counts at or above each borne = 40 · 32 · 26 · 20 · 12 · 7; stepped back = 33; named = 6, each north or west of Albania |
| `subject` | 5 | the seventh is Albania, 100 %, and its three measured neighbours are all under 60 % | **zoom + measure** | the six names leave; every class returns as the camera travels, eased, onto the Balkans, Albania at the centre of the close-up; once the camera has settled: Albania ringed and named, its share **counting up** from 0 to « 100 % » as its gauge fills past the 94 % notch, then « Monténégro », « Macédoine du Nord », « Grèce », each share and gauge counting up to 59, 39 and 49 % — stopping far short of the notch — and « Kosovo, hors données », with no gauge | Albania ∈ `above` at 100 %; measured neighbours = 3, the highest Monténégro 59.5 % < 60; Kosovo = the one ring-neighbour without a row |
| `conclusion` | 6 | Europe again, with what was learned still marked | **pull back** + **name** | the close-up names leave; the camera returns to the overview; once it has settled: every class on the map, the six named, Albania ringed and named, the three lowest named; then the source on the sea | conclusion camera = establish camera |
| `hold` | — | the final map, readable | — (stillness) | nothing | hold state = conclusion state; hold ≥ 60 frames |

Rules the composition keeps:

- **A name appears only once its gesture has arrived**: the six after the filter has landed, the
  close-up names only after the camera has settled at the close-up, the pull-back names only after
  it has settled at the overview. Nothing is named while the camera moves.
- **The counter stays once counted.** In the scrolly it leaves with the filter at card 5; with no card
  to say « sept », the counter is the only words that state the count, so the video keeps it from
  `reference` to the hold.
- **The camera is eased, the class reveal is linear across the classes in value order**, each class
  easing its own arrival.
- **Every event but the hold changes the state** (`assertEventStates`).

## Video constraints

- Every word at 30 px or more at 1920 × 1080 — the scrolly's 12–14 px pills become the video
  registers (`videoRegistersOf`, one factor k). The rendered markup of every event's last frame is
  held to `assertTypeFloor`.
- Names are placed once per camera, in Bun, for the full set that camera ever shows, so no name moves
  when another arrives; each box is the word and its halo's reach, kept apart and inside the stage. A
  name that would touch another steps to the nearest clear position that keeps it against its country,
  or — led — up to three of its heights off; at the overview that position also prefers sea and its own
  land over a neighbour's, a named country's land counted four times. At the overview Albania's ring is
  kept clear, so its name sits beside the ring and leads from it.
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
