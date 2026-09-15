# Diverging bar — in web

Worked example: `proof/web-diverging-bar-eu-per-capita` (2026-09-12), from `proof/static-diverging-bar-eu-per-capita`.

- **The gesture**: the reader chooses the zero, and all twenty-seven bars re-aim at once — each
  shortening, lengthening, or crossing the rule and coming out the other side in the other sign's
  colour.
- **Start from the only zero in the bar family that was CHOSEN.** A plain bar's zero is arithmetic;
  this one is editorial, and the type sheet names the failure it guards — "the domain must genuinely
  straddle zero" — which this beat lives one country away from: twenty-six bars left, one 0,03 t right.
  Against the 2024 median it is 13 above and 13 below, and the subject changes sides.
- **Build it with `chart-web/assets/datum.ts`** — the vocabulary for what the picture is measured
  FROM, subtracted from every mark before anything is drawn. Native radios plus build-time CSS.
- **Fix the rows and fix the axis.** Rows sort by 2024 level in every state, so a reader can watch
  Luxembourg hold the top row while its bar travels edge to edge. The axis is ONE span, ±21 t, taken
  from the widest option and never recomputed — which is where a third reading lives: the fan of where
  they stand today is visibly a fifth of the wedge of how far they have come. A per-option rescale
  would have drawn both at the same width. The readings sit ON the zero rule at their row's height, so
  `nearestCell` reduces to "which row"; `assertDatumRest` refuses the beat if they ever drift.
- **Refused: re-ranking the rows per reference.** Three times over — `interaction.mjs` reads `cx`/`cy`
  once at init, so a re-ranked row answers for the country whose slot it landed in; twenty-seven names
  re-sorting is the owner's first ruling at twenty-seven times the scale; and the fixed order is the
  better argument. Sign is carried by the SIDE of the rule, with hue allowed only to double it.
