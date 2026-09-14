---
format: video
size: landscape
type: slope
---

# Beat — Les seize pays ont tous gagné du bas-carbone depuis 2000 ; un seul a doublé la France (video)

**Type:** slope chart (two dated rails). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-slope-europe-lowcarbon/data.csv`) and the same assertions as
`proof/static-slope-europe-lowcarbon`, against all sixteen: every country rose between 2000 and 2024, Finland was under
France in 2000 and is above it in 2024, and it is the only country to pass France. No value axis: the slope carries the
direction, the end labels the level — so every drawn line carries both its numbers.

## Why the video draws all sixteen

The still draws six: at its size a rail holds six end labels. The video's frame holds all sixteen at the axis register's
pitch, so the first half of the title — « les seize pays ont tous gagné » — is shown rather than asserted on a subset. If a
direction's registers cannot seat sixteen on a rail, the render refuses.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — two rails, 2000 and 2024, sixteen lines between them; names and 2000 values on the left, 2024 values on
   the right, pushed apart to a legible pitch, never dropped.
3. **No end card** — the video ends on the sixteen lines with France and Finland picked out; the credit.

## The choreography

A slope's argument is the change between two dates. What only a video can do is **make the change happen**: every line
travels from its 2000 value to its 2024 value together, the order on the right rail assembling — then the one swap the
claim is about is picked out and its crossing ringed.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | sixteen countries in 2000 | — (furniture) | the rails; each country's 2000 dot, name and value | — |
| `reveal` | all sixteen rose | **trace** | every line draws from 2000 to 2024 together; each 2024 value lands on arrival | all 16 rose |
| `subject` | Finland passed France, and only Finland | **filter + name** | every other line steps back; France and Finland in the accent; their crossing ringed | the one crossing of France |
| `conclusion` | — | — | the credit | — |
| `hold` | the slope | — | nothing | hold = conclusion |

## Write as little as the picture allows

No standfirst, no reading line, no deltas: the lines show the rise, the rails print the levels.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
