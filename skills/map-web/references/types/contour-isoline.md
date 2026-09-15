# Contour / isoline — in web

Worked example: `proof/web-contour-europe-distance` (2026-09-15), from `proof/static-contour-europe-distance`.
Vocabulary: `skills/map-web/assets/live-contour.ts`.
**The gesture**: the reader chooses THE STEP between the lines, because the step decides how much of the continuous surface survives into the picture, and it is the only decision on the page a reader cannot see.

- **State what each step costs in the field's own units**: too fine and the lines are drawn to a precision the measurement does not have
  (this field is a 7 km mesh, so a 50 km step draws texture the reader will take for information); too coarse and the headline's own figure
  falls inside the first band. A still, a video and a scrolly each pick one step and can only say that they did.
- **Keep the pointer's answer MEASURED, not banded**: the same point reads "entre 100 et 150 km" under one step and "entre 0 et 400 km" under
  another without moving a pixel, because the measured distance travels beside whichever band the chosen step put it in.
- **No `radius` at all**: the field, its bands and its isolines are `fill` and `line` layers, so none of `live-map.mjs`'s three radius
  behaviours applies. Print each break ON its line as a MapLibre marker in the page's own embedded faces — a symbol layer would fetch glyphs
  from a second host in a typeface nobody here chose.
- **Print what Mercator costs THIS subject**: measure the field on an equal-area grid (`camera.ts`, LAEA / EPSG:3035) and only DRAW it on
  Mercator, so no printed number moves — but the PICTURE does, and a contour map is read as a picture of how much land is far from the sea.
  Derive the cost every render and put it in the caveat in the reader's own words.
