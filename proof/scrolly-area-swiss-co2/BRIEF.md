---
format: scrolly
type: area
---

# Beat — La moitié du CO₂ suisse depuis 1858 a été émise après 1986 (scrolly)

**Type:** area (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a
phone to a wide desktop — the geometry stretches, the type never does.

The `area` type in the scrolly format, and the first **directed** scrolly beat: drawn once per filed
direction, through the direction's own registers, from the same data, claim and words as
`static-area-swiss-co2`.

## The choreography

The static plate is the floor — data, claim, assertions, colour rules. The scroll tells the subject with
its own gestures (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | the height is the rate of one year | **trace** | the curve draws itself year by year from 1858 |
| 2 | 46,2 Mt at the 1973 peak, 32,1 Mt in 2024 | **name** | both readings named on the curve, each once the trace has reached it |
| 3 | the surface is the stock, 3 158 Mt | **fill + count** | the surface fills left to right while the stock counts up |
| 4 | half the stock is reached in 1986: 129 years carry 50,1 % | **split** | the rule, the earlier half turning to its tint, named |
| 5 | the 38 later years average 41,5 Mt, none under 30 Mt, against 12,3 before | **rescale** | the x window closes onto 1987–2024; the recent years fill the frame |
| 6 | the 38 years carry 49,9 %: two surfaces of one size; the plate's reading line | **pull back** | the whole series again, both halves named |

The recent and earlier yearly means, and the 30 Mt floor, are derived and asserted in the runner.

## Precision

- **The rescale is a window**: the SVG's viewBox travels, every word maps its year through the same
  window, a word whose year leaves the window fades; one tick set at a time, the last year kept.
- **A word waits for its own line**: the peak and the last reading appear only once the trace reaches
  them.
- **The window opens after the midpoint**, so the midpoint rule is never pressed against the frame edge.
- **Each half is named inside itself where it fits**, re-seated in the current window; the midpoint year
  sits above the highest stretch of curve under its own width; the last reading in a measured gutter.
- **The title steps down a ladder of three forms.**

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`. The
interligne follows the design base's adaptive leading once `rerender/static-corpus` is merged; until
then it is the scaffold's own.
