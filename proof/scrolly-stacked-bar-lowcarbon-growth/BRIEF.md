---
format: scrolly
type: stacked-bar
---

# Beat — L'Espagne a ajouté plus d'électricité bas-carbone que la France depuis 2000 (scrolly)

**Type:** stacked bar. **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a wide
desktop.

The `stacked bar` type in the scrolly format, drawn once per filed direction from the same twelve rows, [level, growth]
stack, claim and assertions as `static-stacked-bar-lowcarbon-growth`.

## The choreography

A stack shows a level and what was added to it; the scroll puts down the levels first, then lets the additions change
the ranking (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | low-carbon electricity in 2000 in the twelve largest adders; France far ahead at 483 TWh | **reveal** | the level segments, ordered by level |
| 2 | what each added by 2024; the total at the end of each bar | **grow** | the growth segments grow onto the levels, the totals written |
| 3 | ordered by what was added: Spain first, France seventh | **reorder** | the rows travel to their new slots |
| 4 | the additions alone on one start line: Spain 119, France 50 | **detach** | the levels leave, the growth segments slide to the baseline, the scale fitted to them |
| 5 | France produced 5 times Spain's in 2000; Spain added 2.4 times France's; France is still first at 533 TWh | **filter** | the pair alone, the rest stepping back |
| 6 | the reading line | **pull back** | the static plate |

## Precision

- **Laid out in the reader's pixels**: names in a left column, totals in a right one, one scale between; detached,
  the scale fits the largest addition.
- **No segment is silent**: a number sits inside its own segment when it fits; a level too narrow writes both numbers
  past the bar as one run, `7 + 59`; a growth too narrow writes `+ 50` past the bar, or just inside the level's end
  where the totals column leaves no room.
- **Every sentence is asserted**: no country shrank, Spain added the most and more than France, France started at
  least four times higher and is still the largest producer, both are among the twelve, France leads the 2000 order.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
