---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them — electricity generation carries no
convention a reader already holds, so there was nothing of the subject's own to propose first. This
is the palette `composeDirections` reconciles the three filed directions against; the delivered page
is drawn in whichever direction governs it, never in this one.

**THREE ROLES, THREE FILLS, AND ONLY ONE OF THEM IS CHROMATIC.** `references/types/waterfall.md`
asks a bridge for three colours — increase, decrease, total — and warns that the up/down pair must
not be a red/green, because that is the pairing colour-vision deficiency confuses most. This page
does not solve that by picking two safer hues. It spends **one** accent and draws the other two roles
as steps off the direction's own ground:

| role | what it is | creme | nocturne | rapport |
| --- | --- | --- | --- | --- |
| rising step | the direction's own accent, floored | `#1755b2` 6,85:1 | `#53e1c1` 10,93:1 | `#1e5a88` 7,31:1 |
| falling step | ground → ink, 0,33 | `#939189` 3,07:1 | `#636285` 3,06:1 | `#939393` 3,07:1 |
| declared level | ground → ink, 0,55 | `#73716b` 4,74:1 | `#9493ab` 5,94:1 | `#737373` 4,74:1 |

Every one of them is taken to the **3:1 non-text floor against the ground it is actually painted on**
— computed at render time by `adjustToContrast`, per direction, never written here as a literal.

**WHY ONE ACCENT AND NOT TWO IS THE RIGHT READING OF THE RULE.** `sign-is-direction-and-hue-only-
doubles-it`: a step's direction is carried by the bar itself — it runs up from where the last one
ended, or it runs down — and colour only repeats what the geometry already says. A reader who cannot
separate two hues at all still reads this bridge correctly. What the accent is then free to do is
mark the one movement that runs against the claim: renewables are the only thing that GREW while the
total fell, and they are the only chromatic mark on the page.

**THE PAIR THIS PALETTE DOES NOT SEPARATE BY COLOUR, stated rather than hidden.** A declared level
and a falling step are 1,55:1 apart in creme and rapport (1,94:1 in nocturne) — two greys, differing
only in lightness. Nothing recovers that pair by contrast, and nothing here pretends to: they are
separated by the type's own grammar, which is that a level is drawn from zero and a step floats. Both
sit on the same axis, both are labelled, and the two levels carry the only bold names on the x-axis.

**THE TWO COLOURS THE CONTROL ADDED, and each is measured where it is painted.**

- **The hole.** A withdrawn contribution keeps its rectangle as a dashed outline rather than
  disappearing, so the reader can still see how big the thing they removed was. That outline is a
  mark and is held to the mark floor: ground → ink at 0,50 — `#807e77` (3,95:1), `#8888a2` (5,16:1),
  `#808080` (3,95:1).
- **A struck word.** The withdrawn step's own figure and its name under the band are struck through,
  not deleted, and they are still text: ground → ink at 0,78 — 11,57:1, 10,97:1, 11,73:1, asserted
  against the 4,5:1 text floor rather than assumed.

That second one closes this type's *accessibility* trap in the place the control moved it to. The
sheet records a value label drawn inside a bar in white landing on a bright decrease colour and
measuring under 4:1. Here a figure inside a tall bar takes `inkOnFill`'s ink **for that fill** — and
a withdrawn bar has no fill any more. The colour of a figure is therefore a custom property on the
figure, never an inline style: an inline style beats every generated rule there is, and the struck
number would have stayed white on the page's own ground.

**WHAT A MARK TAKES UNDER THE READER'S POINTER** is the same arithmetic in every direction and it is
not a `brightness()` filter: each fill is mixed **0,30 toward the direction's own ink**, which darkens
on a light ground and lightens on a dark one, so it can only raise a mark's contrast against the
ground. Measured over the four fills this page draws, in all three directions, the step ranges from
1,143:1 (nocturne's mint, its weakest) to 1,895:1, and the beat refuses any direction that leaves
less headroom than 1,1:1 rather than shipping a hover nobody can see.

Nothing else on the page is chromatic. The axis labels, the gridlines, the connectors, the zero
baseline and the control's own pills are steps off the direction's own ground, computed by
`deriveFurniture` at render time. The pills are deliberately **ink-on-ground and never the accent**:
the accent is what the argument is drawn in here, and a control that borrowed it would make the one
colour that means something also mean "you clicked this".
