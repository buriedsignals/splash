---
format: video
size: landscape
type: hex-grid
---

# Beat — Par habitant, ce n'est pas l'Allemagne : la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants (video)

**Type:** hex grid (map). **Medium/format:** map / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen files (`../static-hex-grid-europe-protection/protection.csv` and `population.csv`), same designed
grid checked both ways and the same assertions as `proof/static-hex-grid-europe-protection`: Czechia leads per inhabitant
(36,1 per 1 000), the largest host by count (Germany) is not first, and falls past fifth (11th, 14,8).

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the hex grid on the frame, as large as the frame's height allows, a key column at the left: the
   measure, its bornes, the two countries' figures, the origin's swatch.
3. **No end card** — the video ends on the grid coloured per inhabitant, Czechia and Germany marked; the credit.

## The choreography

The still pairs with the flow map; the video can hold the pair on one grid. What only time can do here is **re-classing
the same cells**: the grid coloured by the count first, then every cell changing to its colour per inhabitant — the
ranking turning over in front of the viewer.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | one country, one cell | — (furniture) | the cells land, each with its code; Ukraine outside the count | grid ↔ data both ways |
| `reveal` | in number, Germany first | **reveal + name** | the cells take their class by count, lowest first; Germany ringed; « Allemagne : 1,25 M, 1re » | DEU largest by count |
| `subject` | per inhabitant, Czechia first; Germany 11th | **rescale + name** | every cell changes from its count class to its rate class, the key's bornes with it; Czechia ringed; « Tchéquie : 36,1 pour 1 000, 1re »; Germany's line becomes « 14,8 pour 1 000, 11e » | CZE leads per inhabitant; DEU rank > 5 |
| `conclusion` | — | — | the credit | — |
| `hold` | the grid per inhabitant | — | nothing | hold = conclusion |

## Write as little as the picture allows

No standfirst, no reading line, no note on the origin beyond « origine » in the key.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
