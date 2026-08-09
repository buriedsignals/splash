---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`skills/splash-twin/assets/root-template/NEWSROOM.example.md`.

`twin-palette`'s proposal was run for this beat's own subject line — *"every earthquake recorded
worldwide in 2024, drawn three different ways"* — and returned **one** option, the house theme:
`matchConvention` fires on none of the four grounded conventions. An earthquake is not a warming
story, and reaching for the `heat` convention's warm red because a quake feels violent is exactly
the move `twin-palette/references/subject-conventions.md` refuses. When no convention applies, the
house theme wins. (`proof/mapgen-symbol-web` recorded the same answer for the same reason on the
same catalogue.)

Measured against this ground: **5.18:1**, comfortably clear of the 3:1 floor a graphical object has
to hold (WCAG 2.2 SC 1.4.11). The accent carries no text; the words on this beat clear 4.5:1 through
`deriveFurniture`, from the same ground.

**The density ramps are NOT the accent, and that is the decision worth writing down.** Both hex
frames shade from `ground` toward `ink` — `sequentialRamp(ground, ink, n, 0.14, 0.82)`, the one
legitimate gradient on a map (`geo-discipline` rule 8), derived rather than picked, and the same
ends `proof/mapgen-hexgrid-web` measured for a hex field with no no-data colour to stay clear of.
Two consequences, both wanted:

- The accent stays free for the one job the prose needs it for — **ringing the cells a paragraph
  names**. A ring in a colour no shade on the map can be confused with is what stops this beat
  repeating the defect logged against `map-quake-density`: a hexagon highlighted with nothing said
  about it. Here the ring and the sentence arrive together, and neither exists without the other.
- **Both hex frames share one ramp language**, so the change a reader sees between step 2 (count)
  and step 4 (strongest event) is a change in the DATA, not a change in the chart. Two different
  hues would have made the same shift look like two unrelated maps.

The dots in step 1 and the circles in step 3 are the accent, at 55% opacity — they are the subject,
and there is no second category on either frame to separate them from.

`render.mjs`, `MapFrames.tsx` and `quake-encodings.ts` name no hex of their own. Both colours arrive
through `readPalette`; `ink` and `muted` are derived from the ground by `deriveFurniture` and handed
to the frames as props.
