---
format: web
type: slope
---

# Beat — Les seize ont tous gagné de l'électricité bas-carbone, un seul a dépassé la France (web)

**Type:** slope (slopegraph). **Medium/format:** chart / **web**. **Frame:** fluid in width, fixed in
proportion.

## Claim

**All sixteen countries gained low-carbon electricity between 2000 and 2024 — and exactly one
overtook France.** Finland was **25,1 points below** France in 2000 and is above it in 2024 (95,3 %
against 94,9). Denmark made the largest gain, **+73,7 points** (15,5 % → 89,2 %).

**A crossing is derived, never eyeballed**: a pair crosses when the sign of their gap flips between
the rails. The beat throws if any country fell, or if the number that overtook the pivot is not
exactly one. **And so is WHERE it happens**: the crossing sits at `t = 0,984` of the way across, and
the height is read off BOTH lines and refused unless the two agree.

## The interaction, written before the code

The claim has two halves and they pull against each other. *All sixteen rose* needs all sixteen
drawn at once, which is exactly what makes *one overtook France* hard to see. And a still can hold
ONE pivot — France, because the headline names it. A reader arrives wanting something else: to
follow their own country through the tangle, or to ask who else crossed whom.

**What this page earns.** The pivot becomes the reader's. Any of the sixteen can be laid across both
rails, and the sentence that comes back names who that country passed and who passed it — the
fifteen readings a still and a video of the same claim have to choose to leave out.

| the reader's question | the gesture | what changes in the picture |
| --- | --- | --- |
| *"Cette ligne-là, dans l'enchevêtrement, c'est quel pays — et qu'est-ce qu'elle a traversé entre les deux rails ?"* | **ask a line** | The connector answers with what LINKS its two ends and neither end carries: the gain in points, the rank of that gain among the sixteen, and the name of every country passed on the way. |
| *"Tout est mesuré contre la France. Et contre MON pays, ça donne quoi — qui est passé devant lui, qui est passé derrière ?"* | **find your own case** | Two dashed rules cross the plot at the chosen country's 2000 and 2024 shares; its two dots take a ring and its name full ink while the fifteen others step back; a sentence gives its rank among the sixteen gains and names the countries it passed and those that passed it. |

Both are carried into the render as `interaction`, so `assertInteractionPlan` matches every declared
gesture against a control the markup ships and every shipped control against a declaration.

### The vocabulary is reused, and nothing was widened

`chart-web/assets/level.ts`, unchanged. **The two series a yardstick must name are the two rails**:
an option declares `{ series: "2000", y }` and `{ series: "2024", y }`, and `assertLevelDeclaration`'s
own refusal — *"a yardstick that reports one of 2 series answers half the question"* — is exactly the
right refusal on this shape, because a country's 2000 level without its 2024 level is half a slope.

The one thing this shape had to place carefully is what `data-col` goes on. `levelCss` takes the ring
off everything with `[data-col] { stroke: none }` before it lights one, and on a slopegraph a line's
ring IS its stroke — so the connectors carry no `data-col` and the END DOTS do. They are filled marks
with no stroke of their own, which is the case `the-subject-is-ringed-not-recoloured` was written
for, and it means no control on this page can take a connector off the plate.

## The catalogue trap, measured before anything was changed

`references/types/slope.md` warns that sixteen categories is where a naive label placement collides.
Measured on the committed render at five widths, and the answer is not the one the sheet predicts:

| width | left gutter | right gutter | worst overlap |
| --- | --- | --- | --- |
| 1600 × 800 | 6 of 120 pairs | 12 of 120 | 1,4 px |
| 1280 × 720 | 6 | 12 | 1,0 px |
| 1024 × 768 | 6 | 12 | 2,4 px |
| 768 × 1024 | 6 | 12 | 2,1 px |
| 375 × 812 | 0 | 0 | — |

**Those are BOUNDING-BOX overlaps, not glyphs.** Chrome's box for an SVG `<text>` is the font's line
box (≈1,34 em); `measureTextBand` — resvg's own ink box, the instrument this tree already ships —
puts the widest gutter string at **11,79 units of a 12-unit Open Sans**, against a 15-unit pitch. No
two labels' ink touched at any width, and the crops confirm it. The same ratio explains the last row:
the beat letterboxes, so everything scales together and the overlap count is a property of the
geometry rather than of any one width.

**What the pass was actually doing wrong is the other half of the same paragraph.**

1. **Its minimum was a literal.** `15`, tied to neither the face nor the size the direction chose, so
   nocturne's Montserrat and creme's Open Sans were held apart by the same constant. It is now
   `max(ink band, the register's own leading)` — **13,20 u** in creme and rapport, **12,00 u** in
   nocturne — and the build refuses a set of labels that cannot be seated inside the rail.
2. **It pushed labels off their marks and out of the rail.** The pass went top-down only, on the
   argument that sixteen labels 15 units apart are 240 units in a plot 400 tall. The arithmetic is
   right and the conclusion is wrong: the block does not start at the top of the plot, it starts at
   the topmost label's own value. Measured: **Pologne's label sat 21 units below its own dot and 13
   units below the END of the 2000 rail**, pointing at nothing. There is a second pass now, up from
   the rail's own end, and **no label in any direction is past it**.
3. **A moved label owed a leader line and had none** — the sheet says so outright. **9 of 32** labels
   are moved more than half a pitch and each now draws a hairline back to its own dot. The largest
   push is **20,5 u** (creme, rapport) and **14,5 u** (nocturne); the bottom four countries sit
   within 6 points of each other and no pitch can seat them where their dots are.
4. **The gutter is sized to the label rather than the label to the gutter.** `RAIL_PAD = 168` was a
   constant; the rails now stand at the widest measured string plus one gap — **108 / 107 / 104
   units** — which is the sheet's own fix ("the data is never allowed to be the thing that gives").

## What looking at the render found that no guard did

- **The ring was not on the crossing.** It was drawn at the plot's horizontal midpoint. The two
  lines meet at **98,4 %** of the span, so the page ringed empty air on the one thing a slopegraph
  exists to show. `t` is solved from the two gaps now, and the height is read off both lines and
  refused unless they agree — at the old midpoint they read 92,8 % and 80,4 %.
- **The rail headings were clipped.** `2000` and `2024` were drawn on a baseline 22 units above a
  plot top of 30, so their ascenders reached **y = −2,9** and were cut by the viewBox in all three
  directions. The heading's size comes from the value register and its ascent is measured against
  the room above the rails.
- **Fourteen of the sixteen lines were under the contrast floor.** The neutral was lifted to 3:1 and
  then drawn at `strokeOpacity={0.75}`, which reaches the reader at **2,19 / 2,19 / 2,23:1**. See
  `PALETTE.md`; the opacity is gone.
- **The page did not embed the face its own labels are set in.** Both font scanners read an SVG
  attribute by stopping at the first quote, so `font-family="&quot;Open Sans&quot;, …"` is invisible
  to them — and thirty-four of this page's forty font declarations are on `<text>`. rapport's
  dominant stack came out Merriweather on a count of 4 against 2 and `Open Sans 400` was never
  embedded: every country name and every value on the plate was drawn in Helvetica. The attributes
  carry the same stack unquoted now.
- **The control cost height the figure did not have.** Seventeen wrapped chips are 156 px at
  375 × 812, and with the plot already on its 120 px floor the figure overflowed its own 100dvh by
  **187 px in creme and 296 px in nocturne**. The row is one scrollable line (50–54 px) and the prose
  is shorter; all three fit in 812 px now. `min-inline-size: 0` on the fieldset is load-bearing —
  without it the row grew the DOCUMENT to **1351 px** wide in a 375 px window.

## Verification

Driven in a real browser, once per direction with scripting on and once off.

- `verify-web.mjs`: **118 / 111 / 112 passed**, 9 skipped. The 96 failures per direction are one
  artefact repeated: the checker reads a `level` radio group as a FILTER and asks each option to tag
  elements with `data-filter`. `proof/web-grouped-bar-wind-vs-solar`, the vocabulary's own worked
  example, fails the same way (18 = 6 options × 3 passes).
- **Hover, measured directly** — a real pointer at 20 %, 50 % and 80 % along each connector's own
  stroke: **46/48 at 1600 and 44/48 at 375** in creme, 46/48 and 42/48 in nocturne, 45/48 and 46/48
  in rapport. Every miss is a point where the second line passes within 0,5 px. `verify-web`'s own
  hover check reports 11/16 instead, because it asks `elementFromPoint` and takes the topmost
  transparent twin as the answer — which is precisely what `initLines` is written NOT to do.
- `splash/test/hoverable-line-answers.test.ts`: **48/48 probes at 1400 and at 375** in all three
  directions, with four probes at 375 exempted as true crossings at 0,15–0,52 px. That exemption is
  new: the file's header always said it did not cover resolution at a crossing, and its code did not
  implement it — no beat had a crossing at 25/50/75 % until sixteen lines did. It is bounded at one
  pixel, every exemption is printed with its distance, and blunting the resolver still turns it red
  (43,63 px and 22,97 px from the probe).
- **With JavaScript off**, in all three directions: the complete plate (93 strokes, 32 gutter labels,
  the ring), and the yardstick works — clicking a chip reveals that country's two rules, rings its
  two dots and prints its sentence, byte-identical to the scripted page.

## The limit this framing still has, stated rather than left

The beat letterboxes, so its type is NOT a fixed CSS size. At 1440 px a gutter label renders at
**14,3 CSS px** (creme) and **12,1** (nocturne); at 375 px the scale is 0,363 and 0,261, and the same
labels render at **4,00** and **2,61 CSS px**. Unreadable, and not fixable by de-collision: freeing
the type would mean moving all thirty-two labels into the HTML overlay, and sixteen labels at a fixed
13 px need 208 px of gutter in a plot the format floors at 120. Sixteen named ends and a phone do not
both fit; that is a fact about the data and the viewport, not about this composition.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2000 and
2024. `data.csv` is a byte-for-byte copy of `proof/static-slope-europe-lowcarbon/data.csv`.
