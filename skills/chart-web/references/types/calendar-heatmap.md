# Calendar heatmap — in web

Worked example: `proof/web-calendar-heatmap-geneva` (2026-09-12), from `proof/static-calendar-heatmap-geneva`.

- **The gesture**: the reader moves the threshold that defines the streak, and watches which end of the
  headline holds.
- **Start from the line the author drew.** "31 days in a row" is a reading off the data AND a line at
  20 °C: 78 days at 16 °C, 43 at 18, 31 at 20, 13 at 22, 4 at 24. Move it and the run's START slides
  from 14 July to 5 August while its END does not move at all — Geneva's summer did not taper, it
  stopped, and the headline is fragile at one end and anchored at the other.
- **Build it with `chart-web/assets/cutoff.ts`**, and ring the run rather than repaint it. On this type
  colour already carries the whole quantity; a control that recoloured cells would spend the chart's
  one channel.
- **The pointer resolves by CELL, not by column** — twelve months share every x, so the shared
  script's nearest-by-x default would answer confidently and wrongly. `data-hit="cell"` in
  `chart-web/assets/interaction.mjs` is the opt-in for this shape. A missing cell is drawn as missing:
  31 February and its four siblings are impossible, not absent, and keep the grid rectangular.
- **Refused: lifting each ramp step independently.** Two colours calibrated onto the same floor against
  the same ground come out identical — measured, bins 0 to 3 adjacent at 1,004 / 1,007 / 1,001 to one,
  four real levels under a key printing seven. Lift the LOW POLE once and interpolate the ramp from
  that pole to the accent; five bins then spend the whole budget at a worst adjacent pair of 1,195,
  and a sixth drops it to 1,150 for no reading gained.
