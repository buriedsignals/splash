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
| 6 | Ukraine has no reported production; Russia and Turkey coloured on their national share | **pull back** | Europe again, every class, the six named and Albania ringed; Ukraine in the neutral of the key, with no word on the map (owner, 2026-09-15) |

## Precision

- **A live MapTiler map, flat Web Mercator, driven by a plan** (`plan.mjs`, addendum 2026-09-15 §2–§3, §7.1 as amended
  after the owner saw the globe pilot). Style `dataviz`, projection `mercator`, no controls, `interactive: false`; the scroll owns time: each card carries its camera
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
  they sit on, with a halo in that fill; the close-up names a halo in the land tint. No word names Ukraine on the map: the key's "donnée non rapportée"
  swatch names its neutral fill, and card 6 says it.
- **Cameras from the beat's own facts**, authored for a reference stage of 1280 × 973: the whole map is the static
  plate's own fit (bounds [-25, 34] → [42, 68] in 1000 × 760, scaled to 1280 wide, centred on the bounds' Mercator
  middle, 8.5° E 54.4° N); the close-up comes 2.3 levels in, centred on Albania's seat on both axes, no padding. A stage
  keeps the reference ground on both axes (`zoomShiftFor`): a phone is fitted by its width, a desktop by its height, so
  Iceland, Malta and Cyprus stay in the frame (Cyprus 7 px above the bottom edge at 1168 × 563, as on the plate).
  Names show only at rest or once the camera has arrived, as the SVG driver decided.
- **One frozen image per card, at two densities** (`fallback/<direction>-<card>.webp` at 2x and
  `fallback/<direction>@1x-<card>.webp` at 1x, 1168 × 566, the stage at 1280 × 800), baked from the same plan with the
  card's camera and state, shown `object-fit: cover` (cropped on other stages, never stretched) when there is no key, no
  script, or until the live map's first view is drawn; re-baked only when the plan's hash changes
  (`fallback/<direction>.json`, which also carries Albania's pixel seat per card for the chip). A 1x screen gets the 1x
  bake, so the map's words keep their weight when the live 1x canvas replaces the picture. The density is chosen by a
  `<picture>` media query (`min-resolution: 1.5dppx`), not by `srcset`'s `2x`: Chrome treats an inlined data URI as
  already cached and always takes the densest candidate. The bakes are written by the browser as PNG and kept as
  lossless WebP (`cwebp -lossless`, the same pixels in about 40 % of the bytes): a page with both densities weighs
  2.6 MB, against 3.5 MB with the 2x PNGs alone. The committed pages carry `__MAPTILER_KEY__`.
- **The first paint is card 1.** The markup is card 1's state (its image, no counter, no key), because the page's
  scripts come after megabytes of images and a browser paints before they run; a reader without a script gets the last
  card, with its counter and key, through `<noscript>` rules.
- **The first scroll is read on a live map.** The runtime shows a live map as soon as it has drawn the reader's state at
  the stage's own camera with every tile of that view loaded (about 2.5–3 s after load on an Apple M2 Max, cold profile;
  no visible refresh at the reveal or at the handover, recorded frame by frame) and runs the camera warm on a second, hidden map that replaces it once
  warm (12.9 s). Before, the only map stayed hidden through the warm (reveal at 11.1 s) and a first scroll stepped
  through the frozen card images without a class ever arriving.
- **The live guards** (`skills/scrolly/scripts/verify-live-map-scrolly.mjs`) hold on 1280 × 800 and 375 × 812 in all
  three directions: no frame with a missing tile at 30, 120 and 400 px per frame, no undrawn canvas at any card.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
