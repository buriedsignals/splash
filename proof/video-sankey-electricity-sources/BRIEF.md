---
format: video
size: landscape
type: sankey
---

# Beat — Le nucléaire de ces six pays est français à 84 % (video)

**Type:** sankey (chart, bipartite: source → country). **Medium/format:** chart / **video**. **Size:** landscape
(1920 × 1080).

Same subject, same frozen file (`../static-sankey-electricity-sources/data.csv`, Ember / Energy Institute via Our World
in Data, 2024) and the same assertions as `proof/static-sankey-electricity-sources`: six countries, nine sources, 54
flows, 1 637,5 TWh; conservation on both rails (every node's total is the sum of its own ribbons); nuclear the largest
source (455,1 TWh); France holding at least four fifths of it (380,5 TWh, 83,6 %).

## The argument, in one sentence

The six countries' electricity is one bar that splits into its nine sources and pours into the six countries on one
scale — and the whole nuclear bar, carried along its widest ribbon and laid against France, lines up with France's own
nuclear band for 84 % of its length.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the sankey takes the frame: the nine sources on the left rail, the six countries on the right, each
   node's name and total beside it; the credit on one line under it.
3. **No end card** — the video ends on the whole sankey, every ribbon back, the nuclear → France ribbon in the accent
   with « 84 % » on it; the credit.

## The choreography — an argument, not a reveal

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | the six countries make 1 638 TWh | **grow + count** | one bar grows down the left rail, its height the running total, « 1 638 TWh » counting beside it | bar height = total × scale |
| `reveal` | the whole is nine sources, and each source goes to countries | **split → pour** | gaps open in the bar, cutting it into the nine sources (heights kept), name and total arriving; the ribbons pour to the right, source after source, each country's node filling as its ribbons land, its name and total arriving when full | node heights = totals × one scale; the right rail's fill = the sum of landed ribbons; every node = the sum of its ribbons |
| `subject` | nuclear is 84 % French | **filter → trace → slide + compare** | every ribbon but nuclear's steps back; the nuclear → France ribbon fills with the accent from left to right; a copy of the nuclear bar detaches, travels to France's node and lands beside it, its French part level with France's nuclear band, the rest overhanging; a bracket over the aligned part, « 84 % » | the copy keeps its height (455,1 × scale) all the way; its French part = the landing band (380,5 × scale); 380,5 / 455,1 = 84 % |
| `conclusion` | the whole sankey, the lesson marked | **slide back + pull back + name** | the copy slides back into the nuclear node, the other ribbons return; « 84 % » on the accent ribbon; the credit | nothing stepped back; the copy home |
| `hold` | the sankey | — | nothing | hold = conclusion |

## Write as little as the picture allows

The nodes' names and totals, « 1 638 TWh », « 84 % ». A brisk rhythm: under 22 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
