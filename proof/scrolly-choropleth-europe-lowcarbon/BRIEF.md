---
format: scrolly
type: choropleth
---

# Beat — Sept pays européens dépassent 94 % d'électricité bas-carbone — six au nord-ouest, et l'Albanie (scrolly)

**Type:** choropleth (map). **Medium/format:** map / **scrolly**. **Frame:** the whole graphic, from a phone
to a wide desktop.

The `choropleth` type in the scrolly format, drawn once per filed direction from the same data, claim,
derived neighbours, north-west measurement, ramp and plate tints as `static-choropleth-europe-lowcarbon`.
Each direction keeps its own palette and faces.

## The choreography

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | the low-carbon share, 40 reporting countries | — | Europe, empty: sea and land in the plate's tints |
| 2 | the colour is a class, from under 40 % to 94 % and more | **reveal in order** | the classes arrive one by one, lowest first, with the key |
| 3 | above 94 %, only seven remain | **filter + count** | every country under the floor steps back to bare land; "7 pays au-dessus de 94 %" counts |
| 4 | six are north or west | **name** | Iceland, Sweden, Norway, Finland, France, Switzerland named |
| 5 | the seventh is Albania, 100 %, and its three neighbours are all under 60 % | **zoom + name** | the camera travels onto the Balkans; Albania ringed, Montenegro, North Macedonia and Greece named with their shares |
| 6 | Ukraine has no reported production; Russia and Turkey coloured on their national share | **pull back** | Europe again, every class, the seven and Ukraine named |

## Precision

- **A live MapTiler globe, driven by a plan** (`plan.mjs`, addendum 2026-09-15 §2–§3). Style `dataviz`, projection
  `globe`, no controls, `interactive: false`; the scroll owns time: each card carries its camera
  (`camX/camY/camZoom`, `shared/map-beat/scrolly.mjs`) and every paint is bound to the card's state, applied per frame
  with transitions at 0. Everything inside the map is a MapLibre layer; the counter, the key and Albania's lifted chip
  with its leader stay outside it.
- **Fills from MapTiler Countries, joined by ISO A2.** Source layer `administrative`, fields `level` and `iso_a2`
  (measured 2026-09-15, maxzoom 11). Every country is present, drawn by the basemap; the 41 study countries are
  painted from level-0 polygons on the basemap's own coast, the unreported one (Ukraine) in the neutral outside the
  ramp. The runner asserts in the browser that every study code is served at the whole-map camera. Malta has no
  level-0 polygon below tile zoom 4, so it is painted from its level-1 units below zoom 4 (absent from tiles at zoom ≤ 1).
  The fills are split into one layer per class and kept/filtered group, so every bound opacity is data-constant: a
  binding that read `iso_a2` made MapLibre reload every tile on every frame (`validateScrollyPlan` refuses it now).
- **Names as symbol layers at the beat's seats.** `seats.json` freezes, in [lon, lat], the most interior point of each
  country's largest Natural Earth ring (the SVG version's own seats, matched to 0.001 frame units; provenance at the top
  of the file, written by `seats.mjs`). Faces are the ones MapTiler really serves, each compared with the Noto Sans
  fallback at render: creme Open Sans Medium (axis) / Merriweather Italic (seas), rapport Open Sans Regular / Open Sans
  Bold, nocturne Montserrat Regular / Montserrat Medium. The six names take the accent walked to 7:1 on the top class
  they sit on, with a halo in that fill; the close-up and Ukraine names a halo in the land tint.
- **Cameras from the beat's own facts**, authored for a reference stage of 1280 × 973 (the static plate's 1000 × 760
  aspect): the whole map puts the window's 67° of longitude across it, centred 10° E 52° N; the close-up comes 2.3
  levels in, centred on Albania's seat on both axes, no padding. A stage keeps the reference ground on both axes
  (`zoomShiftFor`): a phone is fitted by its width, a desktop by its height, so Iceland stays on the card that names it.
  Names show only at rest or once the camera has arrived, as the SVG driver decided.
- **One frozen image per card** (`fallback/<direction>-<card>.png`, 1168 × 566 at 2x, the stage at 1280 × 800), baked
  from the same plan with the card's camera and state, shown `object-fit: cover` (cropped on other stages, never
  stretched) when there is no key, no script, or until the live map has warmed; re-baked only when the plan's hash
  changes (`fallback/<direction>.json`, which also carries Albania's pixel seat per card for the chip). The committed
  pages carry `__MAPTILER_KEY__`.
- **The live guards** (`skills/scrolly/scripts/verify-live-map-scrolly.mjs`): no frame with a missing tile at 30, 120
  and 400 px per frame on 1280 × 800 and 375 × 812 in all three directions; no undrawn canvas at 375 × 812. At
  1280 × 800 the whole-map cards (1–4, 6) show the space around the globe's limb (212–254 of about 2,500 sampled
  points; the stage paints it in the water tint): holding Iceland on a wide stage in globe projection needs that zoom.
  Owner decision pending (zoom further in and lose Iceland, Malta and Cyprus, or keep the space).

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
