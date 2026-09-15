# Beeswarm — in web

Worked example: `proof/web-beeswarm-co2-per-person` (2026-09-15), from `proof/static-beeswarm-co2-per-person`.

- **The gesture**: the reader chooses the UNIT the swarm is thick in — people, countries, tonnes — and
  the same 213 marks at the same 213 values re-pack around the answer.
- **Start from the width, not the position.** A beeswarm has one axis of data; the other is the room
  the packing needs and encodes nothing. What that spend buys is the swarm's WIDTH at each value — and
  that width is a count of whatever the marks are SIZED by, which no plate can say out loud.
- **Build it with `chart-web/assets/weigh.ts`**, native radios plus build-time CSS: no script, no
  listener, the full plate with a working control when JavaScript is off. Each weighting is its own
  `<svg class="chart">`, drawn once at its own packing and revealed by the stylesheet.
- **The packing is deterministic and stated**: marks placed in descending radius, each at the y closest
  to the axis that clears every circle already placed. No force simulation, no seed — that is what
  makes the picture a measurement rather than a rendering.
- **Refused: animating the marks.** The three swarms CUT. `interaction.mjs` reads `cx`/`cy` once at
  init, so a mark morphed into a new place would keep answering for the place it left. What travels is
  the one element whose movement is the argument — the caret at the centre of mass. No text moves.
