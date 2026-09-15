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

**This file used to say something else, and what it said was about another beat.** It was one of
forty byte-identical copies (md5 `f8f2ea8b…`) reasoning about *"the emissions before and after the
year the cumulative total reaches its midpoint"* and spending
`two-states-of-one-measure-are-one-hue-at-two-chromas`. This page has no midpoint year, no two
halves of one area and no second chroma. What follows is its own reasoning, measured against the
colours it actually delivers.

## What this page has to colour, and why it is four inks and not two

A facet grid drawn once is two inks: a neutral for the panels, the accent for the subject. This one
is drawn in two states, and the second one puts **two shapes inside one frame** — the panel's own
line, and the silhouette of the country the reader carried in. So there are four things to keep
apart, and each is measured against the thing that actually touches it, which is the panel's paper
and not the page's:

| what | creme | nocturne | rapport | measured against | reading |
| --- | --- | --- | --- | --- | ---: |
| panel paper `mix(ground, ink, 0.05)` | `#f2efe2` | `#1d1c4d` | `#f2f2f2` | the page ground | 1,12:1 |
| carried silhouette | `#8c8a82` | `#6b6a8b` | `#8c8c8c` | the panel paper | **3,00 / 3,06 / 3,00** |
| the five neutral lines | `#464642` | `#bdbdcc` | `#464646` | the panel paper | **8,23 / 8,54 / 8,43** |
| the two accent lines | `#1755b2` | `#53e1c1` | `#1e5a88` | the panel paper | **6,12 / 9,74 / 6,53** |
| panel names, values | `#000000` | `#ffffff` | `#000000` | the page ground | 20,41 / 17,78 / 21,00 |
| verdicts, baselines | `#5f5e58` | `#a7a6b9` | `#5f5f5f` | the page ground | 6,32 / 7,45 / 6,39 |

## The trap this page walked into, and the number that got it out

**Two colours calibrated independently onto the same floor against the same ground come out the
same colour.** The first pass took the neutral line to the non-text floor (`mix(ground, ink, 0.42)`
adjusted to 3:1) and the silhouette to the non-text floor as well. Measured, line against
silhouette:

- `creme` **1,068:1** · `rapport` **1,067:1** · `nocturne` **1,200:1**

Two shapes nobody could tell apart, in the one state of the page where telling them apart is the
whole reading. The fix is not a second hue — the accent is spoken for, it belongs to the subject
and rule 5 of `directed-interaction.md` says no control may take it away. The fix is to stop
calibrating both onto one number: the line is mixed at 0,72 and held to a **5:1 floor**, which it
clears outright at **9,21 / 9,58 / 9,44** on the three grounds, while the silhouette stays at the
3:1 its own area needs.

## And the casing, which is the sixth ruling taken literally

Even at those inks, a line crossing the silhouette is not measured against the page. It is measured
against **the mountain it is crossing**, and that reads:

- neutral over silhouette: `creme` 2,74:1 · `nocturne` 2,79:1 · `rapport` 2,81:1
- **accent over silhouette: `creme` 2,04:1 · `nocturne` 3,18:1 · `rapport` 2,17:1**

Two of the three are under the non-text floor, and `creme`'s 2,04:1 is exactly the shape of the
defect the owner named twice — an ink nobody measured against the fill really behind it. So every
line is drawn twice: once in the **panel's own paper**, 2,6 geometry units wider, and once in its
own ink on top. The colour immediately adjacent to any line is then the panel paper, at 8,23:1 or
better, in every state of the control and over every silhouette. Nothing on the page relies on a
pair of greys being told apart.

## What is deliberately not measured, and why

The wash under each panel's own line (`mix(panelGround, line, 0.16)` — `#d6d4c8` / `#373661` /
`#d6d6d6`) reads 1,27 to 1,43:1 against the paper and carries **no reading**: the line carries it,
and the wash is gone entirely the moment a country is carried in. It is the one colour here held to
nothing, and it is stated rather than quietly exempted.

## Solid fills, never an opacity

Every colour above is a hex the page paints. The transition into and out of a carried state is done
with `opacity` on elements that are always rendered, so the **resting** state — the only one a
contrast measurement means anything about — is the value in the table. An opacity baked into a fill
after a calibration has already delivered 1,75:1 and 2,19:1 on two beats in this tree; nothing here
repeats it.

Nothing else on the page is chromatic. The baselines and the panel paper are steps off the
direction's own ground, computed by `deriveFurniture` at render time and never written here as a
literal.
