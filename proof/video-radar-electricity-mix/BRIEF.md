---
format: video
size: landscape
type: radar
medium: chart
grounding: supported
---

# Beat — La France et l’Allemagne produisent presque autant d’électricité, avec des mix opposés (video)

**Type:** radar (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-radar-electricity-mix/data.csv`) and the same assertions as
`proof/static-radar-electricity-mix`: in 2024 France generated 561,8 TWh and Germany 496,0 TWh (within 25 % of each
other); nuclear is more than half of France's mix and nothing of Germany's; Germany draws a larger share from wind and
solar than France. Nine spokes, one per source, ordered by family clockwise from twelve o'clock (renewables, nuclear,
fossil); every spoke a share of the country's OWN generation, one radial scale, the ceiling the next round ten above the
largest share (70 %). France in the accent, Germany in the neutral.

## The argument

Two bars on one TWh scale show the two countries make nearly the same electricity; Germany's bar stretches to France's
length — each bar becomes its own country's whole, 100 % — and gaps cut both into their nine sources; source after
source, each pair of parts swings onto its spoke keeping its length on the one px-per-% scale the wheel is drawn in, the
two outlines joining tip to tip — France's pulled toward nuclear, Germany's toward wind, solar and coal — and the video
ends on the radar, nuclear's pair ringed.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The two wholes** — two bars across the middle of the frame, the country's name before each, its total after.
3. **No end card** — the video ends on the radar centred in the frame, rings and spokes, the two filled outlines, each
   spoke's name and both shares at its end, the two names as the key in the top-left corner, nuclear's two shares
   ringed, the credit on one line.

The one rescale (Germany's bar stretching by its 1,13 ratio) is the share's denominator shown rather than written: from
that frame on, every length is a share on one scale — the bars' and the spokes' px per % are the same number.

## The choreography — an argument, not a reveal

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | they make nearly as much | **grow** | France's bar and Germany's bar grow from the left on one TWh scale; « France », « Allemagne » before them, « 561,8 TWh », « 496,0 TWh » after | lengths ∝ TWh on one px-per-TWh scale; France's bar is 100 % long on the wheel's scale |
| `reveal` | each is its own whole, cut into nine sources | **rescale + split** | Germany's bar stretches to France's length, its total giving way to « 100 % » as France's does; gaps open in both bars at the source boundaries, spoke order | both bars' px per % = the wheel's; every part's length = share × that scale; parts sum to 100 % |
| `subject` | the two mixes are opposite shapes | **pull back + carry + trace** | the camera pulls back from the bars (seen magnified until now) as the rings and spokes fade in; the names travel to the key; source after source, both parts swing onto their spoke, inner end at the centre, length kept, thinning to a line; each tip joins the tip before it; the spoke's name and two shares arrive as it lands | a part's length = share × px per % × the camera's zoom at every frame; each lands with its tip at the share's radius; an edge only between two landed tips |
| `conclusion` | the whole radar, nuclear marked | **close + name** | both outlines close and fill, the parts give way to the outlines' vertices; nuclear's two shares ringed; the credit | no bar or part left, every spoke labelled |
| `hold` | the radar | — | nothing | hold = conclusion |

## Write as little as the picture allows

Two names and two totals, « 100 % » twice; then per spoke its name and the two shares; the ceiling's « 70 % ». About 18,5 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
