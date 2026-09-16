---
format: video
size: landscape
type: hex-grid
medium: map
grounding: supported
---

# Beat — Par habitant, ce n'est pas l'Allemagne : la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants (video)

**Type:** hex grid (map). **Medium/format:** map / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen files (`../static-hex-grid-europe-protection/protection.csv` and `population.csv`), same designed
grid checked both ways and the same assertions as `proof/static-hex-grid-europe-protection`: Czechia leads per inhabitant
(36,1 per 1 000), the largest host by count (Germany) is not first, and falls past fifth (11th, 14,8).

## The map: the live MapTiler map while the countries are geography (2026-09-15)

The owner (2026-09-15): the map videos are produced « comme dans scrolly » — `docs/splash/2026-09-15-map-videos-through-maptiler-spec.md`;
the hex grid under the scrolly addendum's §5: a live map while the form shows geography, no basemap once it leaves it.
The grid had no geography before; it now leaves it on screen, in `reference`, before the validated classing starts.

- **The plan** (`map-plan.mjs`): MapTiler dataviz style, flat Web Mercator, every country drawn by the basemap; the
  hosts in the neutral, read from MapTiler Countries beneath the basemap's water (Malta and Liechtenstein from their
  level-1 units below tile zoom 4); Ukraine hollow with a dashed edge; every national border. One camera: the hosts'
  window fitted "meet" in the grid's own box, so the map and the grid stand in one place.
- **The frame drives it** (`scene.mjs`, `mapStateAt`): the camera and `fills`, from the same `geographyAt` the SVG reads.
- **The handover** (reference, 28–36 %): the SVG shapes — Natural Earth (the cartogram's frozen extract) projected with
  the live camera, tested to lie on the measured fills — rise over the map, the fills leave under them; then each
  country travels from its mainland's box into its hexagon (36–86 %), the shape giving way to the hexagon, and a ground
  rect rises with the travel, so the cells end on no basemap. The codes land after it.
- **Placed from `measured.json`** (`measure.mjs`, the frame the shapes start rising; stale plan refused): the key column,
  at the left margin over no host, as near the middle as that allows — on the Atlantic, Greenland's tip and Labrador,
  its words haloed in what lies under them. Credit on one line « Eurostat, 2026-06 · population via OWID · © MapTiler
  © OpenStreetMap », on the ground at the end. The key reaches MapTiler only through the proxy; `no-key.live.test.ts`.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the live map of the hosts, then the hex grid on the frame, as large as the frame's height allows, a key column at the left: the
   measure, its bornes, the two countries' figures, the origin's swatch.
3. **No end card** — the video ends on the grid coloured per inhabitant, Czechia and Germany marked; the credit.

## The choreography

The still pairs with the flow map; the video can hold the pair on one grid. What only time can do here is **re-classing
the same cells**: the grid coloured by the count first, then every cell changing to its colour per inhabitant — the
ranking turning over in front of the viewer.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | one country, one cell | **morph** | the map of the hosts, the key column; every country travels from its shape into its cell, the basemap fading; the codes land; Ukraine outside the count | grid ↔ data both ways; every country lands on its hexagon |
| `reveal` | in number, Germany first | **reveal + name** | the cells take their class by count, lowest first; Germany ringed; « Allemagne : 1,25 M, 1re » | DEU largest by count |
| `subject` | per inhabitant, Czechia first; Germany 11th | **rescale + name** | every cell changes from its count class to its rate class, the key's bornes with it; Czechia ringed; « Tchéquie : 36,1 pour 1 000, 1re »; Germany's line becomes « 14,8 pour 1 000, 11e » | CZE leads per inhabitant; DEU rank > 5 |
| `conclusion` | — | — | the credit | — |
| `hold` | the grid per inhabitant | — | nothing | hold = conclusion |

## Write as little as the picture allows

No standfirst, no reading line, no note on the origin beyond « origine » in the key.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
