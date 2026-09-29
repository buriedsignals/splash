---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`skills/splash/assets/root-template/NEWSROOM.example.md`.

`palette`'s proposal was run for this beat's own subject line — *"carbon dioxide emitted per
person across 41 European countries in 2023"* — and returned **one** option, the house theme.
`matchConvention` fires on none of the four grounded conventions: `renewable`, `coal|fossil|oil`,
`water` and `heat|temperature|warming` are all absent from a subject about how much carbon each
country's population accounts for. (Phrasing the same indicator as *"from fossil fuels and
industry"* does match `fossil` and offers a near-black grey; it is refused here for the reason the
sibling `scrolly-chart-eu-carbon` records — the `fossil` convention is a material's colour, for a
series drawn AGAINST another fuel, and nothing here is drawn against anything.)

**The ramp is the quantity; the accent is the subject** — `geo-discipline.md` rule 8. So the two
colours do two different jobs on this beat and neither is a palette. **But the quantity is drawn in
the newsroom's own hue, and until 2026-08-10 it was not:** the ramp ran `ground → furniture.ink`,
computed between the background and the ink, so the one thing on this plate a reader reads a number
off was the one place the recorded accent never reached. Rendered twice under two deliberately
different recorded answers, this map came out the SAME GREY EUROPE both times — 0 pixels moved
(`scripts/two-palette-proof.mjs`). It now runs `ground → dataRampEnd(accent, ground)`, the same
function the other choropleth beats take, and the same two runs move **269,318 pixels, 32.8% of its
ink**: a teal Europe under one answer and a warm-red Europe under the other, with every word, axis,
legend tick and no-data patch byte-identical between them.

`assertRampReads` then measures the finished classes — monotone, neighbours ≥0.02 apart in relative
luminance, top class over the 3:1 mark floor — because a ramp derived between two arbitrary colours
can fold back, and a ramp toward an accent that is itself dark has nowhere to go on a dark ground.

| What | Colour | Where it comes from |
| --- | --- | --- |
| the six classes of the choropleth | a sequential ramp `ground → the accent, walked toward the far pole` | `sequentialRamp(ground, dataRampEnd(accent, ground), 6, 0.14, 0.92)`, derived — no hue is picked for a class |
| the outline of whatever a step is about | the house accent | `readPalette`, this file |
| water on the plate | `#AAC9E0` | `geo-choropleth.ts`, `WATER_FILL` — basemap doctrine (rule 7: water is a blue tint, never grey), baked into the plate at capture time, not a choice this beat makes |
| no data | `#B9B9B9` | `geo-choropleth.ts`, `NO_DATA_FILL` — rule 7 again: a distinct mid-grey outside the ramp, fixed rather than derived so a no-data reading stays recognisable on any newsroom's ground |

The ramp's low end is `0.14` of the way from ground to ink rather than `0.10`: measured against a
white ground and `#1A1A1A` ink, `0.10` sits 5.24 ΔE76 from bare land and 16.85 from the no-data
grey, and `0.14` sits 8.41 from land and 13.68 from no-data. A choropleth has a no-data colour to
stay clear of at BOTH ends, and the low class has to read as a class rather than as unpainted
ground.

Measured on this ground, the accent is **5.18:1** — clear of the 3:1 floor a graphical object has to
hold (WCAG 2.2 SC 1.4.11). It carries no text: every word on this frame is `ink` (21:1) on an opaque
chip of the ground, so a reader never has to read type in the mark's own colour.

`render.mjs` and `MapFrame.tsx` name no hex of their own. Both colours arrive through `readPalette`;
`ink`, `muted` and `grid` are derived from the ground by `deriveFurniture` and handed to the frame
as props.
