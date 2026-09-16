---
format: scrolly
type: streamgraph
---

# Beat — En 2016, le solaire est devenu la troisième source d'électricité suisse (scrolly)

**Type:** streamgraph (silhouette offset, inside-out order). **Medium/format:** chart / **scrolly**. **Frame:** the
whole graphic, from a phone to a wide desktop.

The `streamgraph` type in the scrolly format, drawn once per filed direction from the same readings, layer order,
claim and assertions as `static-streamgraph-swiss-electricity`.

## The choreography

A streamgraph hides a thin layer's story under its thick ones; the scroll draws the whole stream, withdraws the two
giants so the thin layers fill the frame, marks the crossing, then gives the giants back
(`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | Switzerland's generation by source, 2000–2024; a band's thickness is its production | **trace** | a playhead draws the stream, the year counting in the header |
| 2 | hydropower and nuclear make most of it: 44.9 and 24.0 of 78.4 TWh in 2024 | **trace** | the stream reaches 2024, the bands named |
| 3 | the two giants withdrawn: the small sources fill the frame | **filter + rescale** | hydropower and nuclear thin to nothing, the scale fits what is left |
| 4 | in 2016 solar passes oil, 1.33 against 1.28 TWh, and stays third | **mark** | a rule at 2016, both values written |
| 5 | in 2024 solar makes 5.7 TWh, 4.6 times oil; 0.01 in 2000 | **mark** | a rule at 2024 |
| 6 | the reading line; 2025 excluded, a partial year | **pull back** | the giants return: the static plate |

## Precision

- **Laid out in the reader's pixels**: a silhouette stack in d3's inside-out order, computed once in node, its
  outline smoothed through every year; each band named inside itself at the year it is thickest, when it is thick
  enough to hold its name; no value axis.
- **The crossing is written to the precision it needs**: at one decimal solar and oil both read 1,3 in 2016, so the
  mark and the card write two decimals, and the script asserts the lead survives that rounding.
- **Every sentence is asserted**: only Switzerland in the file, every year present, solar reaching rank 3 in 2016 and
  holding it, oil the one source it passed that year, hydropower and nuclear the two largest sources every year,
  solar more than four times oil in 2024.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
