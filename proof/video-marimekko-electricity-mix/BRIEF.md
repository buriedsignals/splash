---
format: video
size: landscape
type: marimekko
medium: chart
grounding: supported
---

# Beat — Le charbon, 12 % de l’électricité de six pays, tient dans deux colonnes (video)

**Type:** marimekko (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-marimekko-electricity-mix/data.csv`, Ember and Energy Institute via Our World in
Data) and the same assertions as `proof/static-marimekko-electricity-mix`: six 2024 electricity mixes, 1 637,5 TWh; each
column's bands sum to its own total; coal is 200,9 TWh, 12,3 % of the six, and 99,5 % of it is in Germany and Poland; the
narrowest column (Switzerland) stays wide enough to encode its width. (The static BRIEF.md prose says 99,2 %; its own frozen data gives 199,83 of 200,85 TWh = 99,5 %, the figure asserted here.) Column width is TWh on one scale, band height a share of
100 % on one scale, so a band's area is TWh — in every shot.

## The argument

A marimekko's band is an area, so the video pours coal out of the columns keeping every area: the whole 1 638 TWh splits into
six countries, each fills with its mix, then every coal cell drops out of its column and reshapes — area kept — into one strip
across all six: 12,3 % high, and almost all of its length is Germany's and Poland's.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the columns across the frame, their names over them, their totals under them, the nine source names in the
   right gutter under « 2024 ».
3. **No end card** — the video ends on the whole marimekko, Germany's and Poland's coal ringed; the credit on one line. 20 s.

## The choreography

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | the whole, and its members | **split** | one neutral block, « 1 638 TWh » under it; gaps open and it parts into six columns, widths kept; the names arrive over them, each total under its brace | the six widths sum to the whole's, one px per TWh |
| `reveal` | each country's mix | **reveal in order** | column after column the nine bands grow up from the foot (linear), coal first; the source names arrive in the gutter | every column's bands sum to 100 % of its height |
| `subject` | coal: how much, and whose | **filter + pour** | every band but coal steps back, the totals go; each coal cell drops out of its column (leaving its hole) and reshapes, area kept, into one strip under the columns, tiled in column order across the whole width; « Allemagne », « Pologne » in their pieces, « 12,3 % » at the strip's end | strip height = 12,3 % of 100 %; each piece's area = its cell's; Germany + Poland = 99,5 % of the strip |
| `conclusion` | the whole chart | **pull back + name** | the strip's words go, each piece flies back into its hole, area kept; the bands and totals return; Germany's and Poland's coal ringed; the credit | — |
| `hold` | the answer | — | nothing | hold = conclusion |

## Write as little as the picture allows

« 1 638 TWh », the six names, the six totals, « 2024 », the nine source names, « Allemagne », « Pologne », « 12,3 % ». No
standfirst, no reading line, no share printed in a cell.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
