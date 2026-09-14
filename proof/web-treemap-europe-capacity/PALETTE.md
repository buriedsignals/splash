---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; the delivered page is drawn in
whichever direction governs it, never in this one.

## Two fills, and the second one is an argument

This page paints exactly two colours on its geometry, and they do not mean "more" and "less" — a
treemap already says that with area. They mean **which side of the claim a country is on**:

- **the field** — every country whose low-carbon fleet is still mostly water and atom. A step off
  the direction's own ground, `mix(ground, ink, 0.3)`, raised to the non-text floor if that step
  lands under it.
- **the thread** — the eight countries where wind and sun are already more than half the fleet. The
  direction's own accent, calibrated against that direction's ground.

`accent-marks-the-thread`, and the rule is spent rather than quoted: the largest cell on the plate
is France, France has not tipped, and France stays in the field. A treemap's largest cell already
shouts by being large; spending the accent on it would say nothing twice.

**And the thread survives the descent.** The accent marks the same eight countries inside every
view, which is what turns the headline's assertion into something a reader can see: measured on the
frozen file, the tipped hold **5,8 %** of the frame inside the atom, **5,9 %** inside the water,
**31,3 %** inside the sun and **54,8 %** inside the wind. Re-assigning the accent per branch would
have thrown that away for a prettier picture.

## What the page actually paints, measured on the three filed directions

Not `#0B7A75` on `#FFFFFF` — those are the newsroom's recorded answer, and the delivered page is
drawn in a direction. These are the colours a reader receives, read back from the render:

| | creme | rapport | nocturne |
| --- | --- | --- | --- |
| ground | `#FFFCEE` | `#FFFFFF` | `#111044` |
| field fill | `#939089` | `#939393` | `#626284` |
| field vs ground | 3,10:1 | 3,07:1 | 3,05:1 |
| thread fill | `#1755B2` | `#1E5A88` | `#53E1C1` |
| thread vs ground | 6,85:1 | 7,31:1 | 10,93:1 |
| field vs thread | 2,21:1 | 2,38:1 | 3,59:1 |
| label on field | 6,59:1 | 6,84:1 | 5,83:1 |
| label on thread | 6,85:1 | 7,31:1 | 10,93:1 |

Every fill clears the WCAG non-text floor against its own ground, and every label clears the 4,5:1
text floor against **the exact fill it is printed on**.

## The type's own filed trap, and where it is spent

`chart-beat/references/types/treemap.md` files one accessibility failure for this type: white label
ink picked by a naive brightness rule landing on a mid-toned fill and measuring under 4,5:1, while
the same white cleared comfortably on a darker cell in the same chart. Nothing here picks ink by
luminance. `inkOnFill` measures both candidates against that exact fill and takes whichever wins,
which is why the field's label is dark ink on `nocturne` — a dark-ground direction — while
everything else on that page is light.

## The ring is the label's own ink, and that was measured after it was wrong

The cell under the pointer takes a ring rather than a new fill, because **a treemap cell's fill IS
its group**: repainting it would answer "which side is this country on" by destroying the answer.
The ring's colour is that cell's own label ink, for the same reason the label's is — the direction's
raw ink drawn on `nocturne`'s mint thread measures **1,63:1**, a ring nobody sees, while the label
sitting inside that same cell was already at 10,93:1.

The first version of this did what the rest of the corpus does — a lift off the fill, mixed toward
the ink and calibrated against the ground — and measured **1,77:1 / 1,74:1 / 1,20:1** against the
fill it was supposed to be lifting off. Calibrating two colours independently against the same floor
against the same ground makes them the same colour; that is written down elsewhere in this branch
twice, and it happened here again.

## Nothing else is chromatic

The cell edges are the direction's own ground. The control's pills, its legend, the branch
sentences, the caveat and the source line are steps off that ground, computed by `deriveFurniture`
at render time and never written here as a literal.
