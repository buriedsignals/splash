---
format: web
type: donut
medium: chart
grounding: supported
derived: v1
---

# Beat — En 2000, États-Unis 24,4 % du CO₂ mondial et Chine 14,7 % ; en 2023, l'inverse (web)

**Type:** pie and donut (paired concentric rings). **Medium/format:** chart / **web**.
**Frame:** fluid, except the angle.

## Claim

In 2000 the United States emitted **24,4 %** of the world's CO₂ and China **14,7 %**; in 2023 China
emits **32,9 %** and the United States **13,3 %**. They swapped. Meanwhile the world's total went from
**24,7 to 37,0 Gt — up 50 %.** The beat refuses if the two did not swap or if the whole did not grow
by at least a third.

## Why two rings and not two pies side by side

A pie answers one question well: what share is this, of that whole. **Two pies side by side quietly
answer a second one they cannot support** — did the whole change — because nothing says the two
circles stand for different totals. Concentric rings share a centre and an angular scale, so a
wedge's angle is comparable between them, and the two totals are **written in the hole** rather than
drawn. The hole is not decoration: it is where the whole is stated.

`conservation-is-kept-visible` — each ring is closed: six named wedges plus "tous les autres" make the
whole, and the remainder is a wedge like any other rather than a gap.

## The type sheet's trap, checked against what this beat draws — both halves applied

`chart-beat/references/types/pie-and-donut.md` sets two. On six of the seven types this corpus has
taken through the web genre the literal form was absent and only the reason applied. **Here both the
literal form and the reason apply, and the second half was a shipped defect.**

### The slice ceiling: 7 > 5, and it is refused by arithmetic rather than by taste

Each ring draws **seven** wedges — six named countries plus the remainder — against the sheet's
*"more than about five wedges and the angles blur"*. Measured spans on the 2023 ring: Chine 118,4°,
tous les autres 129,8°, États-Unis 47,9°, Inde 29,8°, Russie 16,9°, **Japon 9,6°, Iran 7,7°**. The
last two are the slivers the sheet names.

The count is **not** reduced, and the reason is not convenience: the six are the same computed rule
the static sibling and `proof/static-lollipop-co2-per-person` use — the largest 2023 totals — and
dropping Japan and Iran to reach five would make the web beat's whole a different whole from the
still's, which is the one thing "the same subject across formats" forbids. What is answered instead
is the sheet's own *reason*: **the angles blur because angle is the only channel carrying identity.**
So identity was taken off the angle, off the tone ramp, and put on the gesture.

### The labelling failure — the shipped defect, measured

The sheet: *"a dropped label leaves a wedge that is differentiated from its neighbours by COLOUR
ALONE, with no share value printed anywhere near it."* This page never dropped a label; **it never
drew one.** Fourteen wedges carried no name and no share, and the only differentiator was a
**seven-step ramp of one hue**. Measured on the committed build, adjacent tones, in every filed
direction:

| direction | tone 3 ↔ 4 | tone 4 ↔ 5 | tone 5 ↔ 6 |
| --- | --- | --- | --- |
| creme | **1,007:1** | 1,044:1 | **1,007:1** |
| rapport | 1,049:1 | 1,040:1 | **1,001:1** |
| nocturne | 1,004:1 | 1,052:1 | — |

Russie, Japon, Iran and **tous les autres — the largest wedge on both rings** — were four tones a
reader cannot tell apart, with nothing else on the plate to recover them from. That is the sheet's
accessibility trap in full: *"reusing a hue for two different slices makes them indistinguishable
outright."*

**Why it was not a bug in the ramp but an impossibility in it.** Every tone must clear the non-text
floor of 3:1 against the ground, and the top of the ramp is the accent's own contrast. On a light
ground the whole range is therefore `contrast(accent, ground) / 3` — 2,21 on creme, 2,36 on rapport,
3,60 on nocturne. Spread geometrically over *n* tones the adjacent step is that range to the power
`1/(n-1)`: at **n = 7** it is **1,14 / 1,16 / 1,25**, and the old ramp did worse still because
`adjustToContrast` clamped its bottom four steps onto the same 3:1 line. At **n = 4** it is
**1,30 / 1,33 / 1,53**. *Seven distinguishable tones of one hue above the non-text floor do not
exist in these directions.* The ramp is rebuilt in contrast space at four tones, and
`assertRampIsSeparable` refuses the render if any adjacent pair falls under 1,25:1.

Four tones, and the grouping is the claim: **Chine · États-Unis · les quatre suivants · tous les
autres.** Colour now carries only what it can carry — the two protagonists of the swap, the rest of
the named six, and the remainder.

### The label the sheet asks for, refused with the measurement

*"Label each slice with both its name and its share, placed just outside the arc at the slice's own
midpoint angle … on narrow layouts where outside labels would collide, fall back to a legend below
the circle rather than cramming labels that don't fit — but … only take this fallback when there is
genuinely no room, not as a default layout choice."*

Measured, not assumed. Arc length at each wedge's own mid-radius, against the ~38 px a share label
takes at the axis register: on the 2000 ring (r = 85) **four of seven wedges are under 33 px** — Inde
21, Russie 32, Japon 27, Iran 8 — and outside the 2000 ring there is no outside, the 2023 ring is
there. Placing them outside the 2023 ring instead puts Japan's and Iran's anchors 9,6° and 7,7°
apart, 29 px and 23 px of arc at r = 175, under the stack a two-line outside label needs. **Eight of
fourteen wedges cannot hold their own label.** So the fallback is taken — and it is taken with this
measurement rather than as a layout preference.

What replaces it is not silence. **All seven names are printed in the default state**, under the four
swatches they share; every wedge answers a hover, a tap or a keyboard focus with its name and its
share; and the gesture below prints a labelled share **on the ring itself**, at the chosen country's
own angle, which is the one place the sheet wanted a label and eight of fourteen wedges could not
hold one.

## The interaction, declared before the code

**What this page earns:** a still can draw two rings and assert that two countries swapped. It cannot
let the reader ask *which* of the seven swapped, or by how much, or in which direction the tonnes
went while the share moved the other way. Here the reader lays one country's share from the other
year onto the ring in front of them and sees the two arcs miss each other.

### Control 1 — "Ce pays-là, il pesait combien l'autre année ?" · `find-your-own-case` · `level.ts`

**The reader's question, in their own words:** *« La Chine et les États-Unis ont échangé, d'accord.
Et la Russie ? Et l'Inde ? Et ce gros morceau gris qui ne nomme personne ? »*

**The gesture:** the yardstick vocabulary, `skills/chart-web/assets/level.ts` — radios plus generated
CSS, no script, works with JavaScript off. Seven options: the six named countries and the remainder.

**What changes in the picture:** the chosen country's **two** wedges — one on each ring — take the
ring (`the-subject-is-ringed-not-recoloured`), which is the first time the pair can be found at all:
the wedges are laid out in 2023 order, so the same country sits at a different angle on each ring and
the eye has no way to walk from one to the other. Then, on each ring, a **dashed ghost arc** is laid
from that country's own wedge start, spanning the share it held in the **other** year. China's 2023
wedge overshoots its ghost by two thirds of a turn's worth of share; the United States' falls short of
its own by the same amount, in the opposite direction. And the sentence under the control carries the
four readings no arc can draw: both shares, both totals in Gt, the multiple between them, and the
rank the country moved from and to.

**Why `level.ts` and not `filter.ts`:** a filter takes marks away, and on a part-to-whole every wedge
is part of the whole — narrowing is the one thing this form cannot survive, because the ring stops
summing to the world. `filter.ts`'s own rule says to reach for it when the part is **orthogonal** to
the encoded variable; here nothing is. `stack.ts` draws an addition that is already drawn. The
yardstick is the one of the three whose shape is this question: choose a datum, and the plot is
measured against it — and its own refusal, that an option must lay a reference on **every** series
the beat draws, is exactly the pairing this beat needs.

**What was widened, and why.** `LevelMark` accepted `{ series, y }` (a reference laid flat) and
`{ series, x }` (the same reference stood up). A donut has neither: a horizontal band at one `y`
names **two** wedges, mirrored about the vertical axis, so declaring a `y` here would be the
half-answer `assertLevelDeclaration` already refuses one axis over. Added a third variant,
**`{ series, angle }` — a reference laid *around* the plot**, in the geometry's own radians clockwise
from the 12 o'clock anchor this form fixes, bounded against a `turn` the beat passes the same way it
passes `width` for an `x`. The declared angle is where the ghost arc **ends**, and the component
refuses the render if the arc it draws ends anywhere else — the same seam-versus-rule assertion
`proof/web-area-swiss-co2` makes.

### Control 2 — "Cette part-là, elle vaut combien en tonnes ?" · `ask-a-mark`

**The reader's question:** *« 32,9 % de quoi, au juste ? »* A share says nothing about the whole it
is a share of, and this is the form where a reader can be wrong about it and stay silent: **la part
de la Russie tombe de 6,0 à 4,7 % pendant que ses tonnes montent de 1,5 à 1,7 Gt**, because the whole
grew by half.

**What changes:** every wedge — including the remainder — answers with its country, its share of its
own year's world total, the tonnes behind it, and what the same country held in the other year. An
angle is the least readable encoding on this list: a reader can rank wedges and can barely measure
one.

## Two decisions the render forced

- **The angle cannot stretch.** Like the pictogram, this beat sets `xMidYMid meet`: stretching the box
  turns every angle into a different angle, which is the one thing this form cannot survive.
- **The wedge separators left the wedges.** `levelCss` clears `stroke` from every `[data-col]` before
  it rings the chosen one — so a hairline carried on the wedge path itself would have vanished from
  all fourteen the moment a reader chose a country. The separators are drawn as their own radial
  spokes, and the wedge's stroke is left free for the ring.

## Verification

`bun proof/web-donut-world-co2-share/render-directions-web.mjs` renders all three filed directions.
`verify-web.mjs --file renders/<direction>.html` drives a real browser at several widths, script on
and off: **creme 141/0, rapport 135/0, nocturne 135/0.**

### What driving it found, and what looking at it found

- **The harness read the picture mid-fade.** `checkLevel` clicked an option and slept 80 ms, but
  `levelCss` fades a chosen option's references in over `revealMs` — 220 ms across the corpus — so
  computed `opacity` was **0,65** and the check reported "the words were never drawn". It had gone
  green on the only committed beat that ever reached it (`proof/web-area-swiss-co2`) because that
  beat's one revealed element carries `data-axis` as well and its opacity never transitions at all.
  Fixed in `verify-web.mjs` by settling on `document.getAnimations()` instead of guessing a sleep.
- **The build embedded the wrong face.** Moving the legend's `font-weight` out of the inline style
  and into a custom property on the figure split family from weight, and the build-time scan then
  embedded Open Sans at 400 only while carrying a Merriweather 500 nothing sets — so seven country
  names were drawn in the fallback. The weight went back beside its own family; only the **colour**
  leaves the inline style, because that is the one property the yardstick changes.
- **`nocturne` did not fit its own window.** The added control cost 123 px and the longest display
  register ran the headline to eight lines at 375 px, pushing the source line 98 px off screen. The
  headline was shortened to the static sibling's own ending, and the caveat and reading line with it.
- **Two sentences were wrong, and only looking at the render said so.** "Tous les autres" named its
  largest member off the frozen file's `entity` and printed **"Indonesia"** in a French sentence — now
  refused at build time unless a French name is filed, as the six named wedges already were. And the
  remainder is first on both rings, so the note read "elle passe du **1er au 1er** rang" — a movement
  that is not one. It now says "elle reste au 1er rang".

### Mutations run

1. The declared angle drifted 0,1 rad from the band the component draws → refused, naming both.
2. The ramp asked for **seven** tones, as the build this replaced did → refused at 1,135:1 between
   tones 0 and 1, with "7 do not fit above the non-text floor on this ground".
3. One option laid its reference on one ring of the two → refused by `assertLevelDeclaration`'s own
   half-answer rule, which is the reason this vocabulary was the right one.

## Source

Global Carbon Budget 2025 · populations 2000 and 2023, via Our World in Data. `data.csv` is a
byte-for-byte copy of `proof/static-donut-world-co2-share/data.csv` — 213 rows, so "tous les autres"
is 207 countries.

## Precision

```json splash:precision
{
  "kind": "pointer",
  "rounding": null,
  "asserts": [],
  "values": {},
  "staticFloor": [],
  "onDemand": [],
  "unfound": [],
  "covers": {
    "claim-datum": null,
    "wedge-angles-sum-to-the-same": null,
    "the-beat-refuses-if-the-two": null,
    "the-measured-span-of-every-wedge": null,
    "asserted-in-the-js-off-floor": null
  }
}
```

## The choreography

```json splash:choreography
{
  "kind": "pointer",
  "promiseSource": "slot",
  "controls": [
    {
      "order": 1,
      "gesture": "find-your-own-case",
      "input": "hover"
    },
    {
      "order": 2,
      "gesture": "ask-a-mark",
      "input": "hover"
    }
  ],
  "keyboard": true,
  "degradesTo": "static-frame"
}
```
