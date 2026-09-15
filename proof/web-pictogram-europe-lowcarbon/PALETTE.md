---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; the delivered page is drawn in
whichever direction governs it, never in this one. Every number below is measured on the colour the
rendered page **actually paints**, read back out of `renders/*.html`, not on the formula that
produced it.

## Three tones, because the field is partitioned in three, and the middle one is sought

The page draws one field of squares cut into three blocks — at least 75 % low-carbon, 60 to 75 %,
under 60 % — and the blocks are the beat's whole partition. So colour belongs to the BLOCK. It could
not belong to the country: this page's control makes a square stand for a hundred terawatt-hours
instead of a country, and under that unit a square has no country and no share to be shaded by. The
static sibling ramps every square by its own country's share and is right to; that reading cannot
survive this control, and a plate that repainted itself under a control pressed for a different
reason is the first standing arbitrage exactly.

Only the two ends are calibrated against the ground. **The middle is searched**, because two colours
calibrated independently against the same floor on the same ground come out identical by
construction — 1,023:1 measured on this branch, 1,000:1 on a lollipop. The middle tone is the first
mix of the accent into the ground that clears the non-text floor against the ground **and** a stated
1,35:1 separation from **both** neighbours; no mix clearing all three is a refusal, not a fallback.

| direction | ground | ≥ 75 % | 60–75 % | < 60 % |
| --- | --- | --- | --- | --- |
| creme | `#FFFCEE` | `#1755b2` · **6,852:1** | `#3c70bc` · **4,818:1** | `#94928a` · **3,029:1** |
| rapport | `#FFFFFF` | `#1e5a88` · **7,309:1** | `#3e7199` · **5,215:1** | `#949494` · **3,033:1** |
| nocturne | `#111044` | `#53e1c1` · **10,926:1** | `#48c0ad` · **7,972:1** | `#626184` · **3,015:1** |

And the separations between them, which is the measurement the three-block partition actually rests
on — a floor each tone clears on its own says nothing about whether a reader can tell two blocks
apart:

| direction | ≥75 % / 60–75 % | 60–75 % / <60 % | ≥75 % / <60 % |
| --- | --- | --- | --- |
| creme | 1,422:1 | 1,591:1 | 2,262:1 |
| rapport | 1,402:1 | 1,719:1 | 2,409:1 |
| nocturne | 1,370:1 | 2,644:1 | 3,623:1 |

The two accented tones are the closest pair everywhere, at 1,37 to 1,42:1, and that is the honest
ceiling of a three-step ramp between one accent and one ground — the same finding this branch
records as *"a ramp built inside contrast(accent, ground)/3 does not carry many levels."* Three
carries. The beat does not ask for a fourth: the blocks are also separated by a gap wide enough to
count across and each one is named in the plot's own gutter, so the hue is the third cue and not the
only one.

## What a square becomes under the pointer, and why "darker" is the wrong word for it

A fixed dose was refused by the owner at 1,104:1 on `nocturne`, and a dot plastered on top of a mark
was refused three times over. So the square itself moves off ITS OWN fill by the smallest step of the
direction's own ink that clears 1,14:1, and the result is then measured **against the ground**:

| direction | ≥ 75 % | 60–75 % | < 60 % (the least headroom) |
| --- | --- | --- | --- |
| creme | `#144999` · 8,356:1 | `#3460a2` · 6,109:1 | `#7f7e77` · **3,961:1** (rest 3,029) |
| rapport | `#1a4d75` · 8,889:1 | `#356184` · 6,574:1 | `#7f7f7f` · **4,004:1** (rest 3,033) |
| nocturne | `#87ead4` · 12,485:1 | `#69cbbc` · 9,200:1 | `#787795` · **4,123:1** (rest 3,015) |

On `nocturne` the step LIGHTENS, which is why the verb matters. That direction's ground is `#111044`
and its neutral block is reached by going lighter than the ground, so a step toward black would walk
the square the reader is pointing at back toward the ground and out through the non-text floor. It
does not, because `deriveFurniture` gives that direction an ink of `#FFFFFF`. That is a property of
the derived ink and not of the arithmetic, so the component **asserts** it rather than assuming it:
a direction whose ink stopped being the pole its ground is not refuses here instead of shipping a
plate whose answering square is its faintest mark. Mutated — the step made to walk toward the ground
instead — and all three directions refuse, naming the measured value (1,627:1, 1,617:1, 2,032:1).

## Nothing else on this page is chromatic

The block names and their figures in the gutter are the direction's own text ink against its own
ground (`#000000` at 20,411:1 on creme, `#000000` at 21,000:1 on rapport, `#FFFFFF` at 17,775:1 on
nocturne), computed by the register ladder at render time. There is no axis, no gridline and no
baseline on this beat: a pictogram has no value axis at all, which is the whole reason it counts.

## The one thing this page refuses to spend a colour on

A ghost square for the empty seats of the grid. The grid is sized by the widest option — 17, 6 and
29 cells — so under « 100 TWh fossile » the ≥ 75 % block would show 1,5 inked squares against 15,5
ghosts. A ghost is a denominator, and there is none: the capacities are a fact about the widest
unit, not about the data. Empty seats draw ink of width zero and say nothing at all.
