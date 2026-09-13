---
format: scrolly
type: bar and column
---

# Beat — La Chine a émis plus de CO2 en 2024 que les cinq pays suivants réunis (scrolly)

**Type:** bar and column (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic,
from a phone to a wide desktop.

The `bar and column` type in the scrolly format, drawn once per filed direction from the same data,
ranking search, French names and words as `static-bar-top-emitters-2024`.

## The choreography

The static plate is the floor — ranking, search, French names, colour rules. The scroll tells the subject
with its own gestures (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | what is measured: the ten largest emitters of 2024 | — | ten names on an empty baseline |
| 2 | from the tenth, Germany (0,57), to the second, the United States (4,9) | **reveal in order + count** | the columns rise one by one from the tenth, each value counting up |
| 3 | then China: 12,3 — 2,5 times the United States | **reveal + count** | China rises last, its value counting to 12,3 |
| 4 | the next five together: 11,7 — less than China alone | **reorder / stack** | the five slide onto the second slot and stack, block by block, under China's level; the rest steps back |
| 5 | the ten are 69 % of the world total; territorial accounting | **pull back + compare** | the columns return; a bar shows the ten's share of the world |

The world share is computed from the frozen world row and asserted in the runner.

## Precision

- **Names are never rotated or cut**: columns when every name fits in two lines, rows otherwise; the
  stack works in both — stacked vertically on the second slot, end to end along the second row.
- **The stack is built from the marks themselves**, measured on every resize; each block keeps a seam
  of the ground so the pile reads as five countries; its sum sits at its top.
- **The title steps down a ladder of three forms.**

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
