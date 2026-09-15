# Diverging stacked bar — in web

Worked example: `proof/web-diverging-stacked-electricity` (2026-09-15), from `proof/static-diverging-stacked-electricity`.

- **The gesture**: the reader moves the CUT — where the ordered scale stops meaning one thing and
  starts meaning its opposite — and nothing is added, removed or re-measured.
- **Start from the judgement the type is built on.** The neutral has to be NAMED rather than defaulted
  to the middle of the array. On a Likert form that decision is printed on the questionnaire; on an
  electricity mix it IS the argument — the renewable directive counts biomass and not nuclear, the
  taxonomy counts nuclear. Four cuts, one frozen file: France goes from +89,8 points of right lean to
  −45,6 left, and under two cuts leans further left than coal-fired Poland. Not one number changed.
- **Build it with `chart-web/assets/side.ts`.** Every barreau keeps its exact share, every row its own
  100 %, the axis its five graduations and words, the rows their alphabetical order. One thing changes:
  which side of the centre a band is drawn on. The centre is at the same place in every cut by
  construction — `sideAt` is the one mapping and it has no cut in it.
- **One thing travels**: a thin HTML net-lean tick per row, ALWAYS rendered, its `left` generated per
  cut and transitioned. The plates themselves must cut, because `interaction.mjs` reads coordinates
  once at init and a band animated across the centre would answer for the side it left. `display` does
  not interpolate; a property on an element that is always there does.
- **Refused: a colour ramp per side.** The sheet asks for one — but here the camp is what the reader
  just chose, so a colour encoding it would repaint every band the moment the boundary moved, and the
  one thing that must stay recognisable across four plates would be the one that did not. Colour
  belongs to the barreau, side to position. The rule is still met where it is checkable: under the
  default cut, two ink tones are the left camp and two accent tones the right, neutral between.
