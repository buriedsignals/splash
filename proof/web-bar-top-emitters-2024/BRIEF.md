---
format: web
type: column
---

# Beat — La Chine a émis plus de CO₂ en 2024 que les 5 pays suivants réunis (web)

**Type:** bar and column (ranking, vertical columns). **Medium/format:** chart / **web**.
**Frame:** fluid. **Static sibling:** `proof/static-bar-top-emitters-2024` — its frozen data, its
claim, its words and its colour rules are the floor this page starts from.

## Claim

Of the ten countries that emitted the most CO₂ in 2024, China's **12,29 Gt** exceeds the next
**five** added together (**11,65 Gt**), and is 2,5 times the United States' 4,90 Gt. The ten
together carry **68,9 %** of the world total.

Every figure is computed in the runner from the frozen file and printed before the render. The ten
members and their order are a ranking, not a list: 215 rows whose `Code` is a bare ISO-3166 alpha-3
are kept and 32 OWID aggregates dropped, both counts printed, which is what stops "Asia" from
topping a chart of countries. **"the next five" is a search**: countries below the subject are added
one at a time and the count stops at the last one still under its total. If the data moved so the
answer were three, the headline would say three; fewer than two and the beat throws rather than draw
the comparison.

## The interaction, written before the code

`chart-web/references/directed-interaction.md`, rule 1. The same declaration is carried into the
render as `props.interaction`, so `assertInteractionPlan` checks this promise against the markup the
page actually ships and the two cannot drift apart.

**What this page earns.** A still of this ranking prints ten numbers and a sum. It cannot say what
any one of those columns is worth *against the world* — the plate draws only the ten, which are
68,9 % of the total, so a column's height is silent about the other 31,1 % — and it cannot run the
headline's own arithmetic on anything but the subject. This page answers both, for all ten.

### Control 1 — ask a mark

- **The reader's question:** « Cette colonne, elle pèse combien dans le total mondial — et combien de
  pays faut-il additionner, plus bas dans le classement, pour l'égaler ? »
- **The gesture:** `ask-a-mark` — hover, tap or keyboard focus on a column.
- **What changes in the picture:** the column's own mark lights, and the answer box prints two
  readings the plate holds nowhere: **that country's share of the world total** (12,7 % for the
  United States, against China's 31,8 %) and **how many countries below it in the full 215-country
  ranking must be added together before they match it** (2 for the United States, 3 for India, 6 for
  China). The second is the headline's own arithmetic asked of every rank instead of only of the
  subject; it is computed over the whole ranking, not over the ten drawn, which is why the answers
  for the bottom ranks name countries that are not on the plate — the reading line says so.

Both readings are derived in the runner from the frozen file, asserted there, and baked into the
answer server-side. The browser never formats a number.

### What was considered and is not shipped, with the measurement

- **The cumulative share through this rank** ("les 2 premiers pèsent 44,5 % du total"). A genuine
  ranking reading, invisible in a bar chart, and it was refused on composition: the format's answer
  box is `max-width: 220px` and the two readings above already set **five lines** in the direction's
  own body size at 375 px. A third reading is a sixth and seventh line for a number the caveat
  already states at rank 10 (68,9 %).
- **"×2,5 les États-Unis", the ratio to the next column.** Refused as the weak form
  `directed-interaction.md` names outright: it is the ratio of two lengths both drawn, side by side,
  on a shared zero baseline — precisely the reading a bar chart's encoding is best at. The headline
  already states it once, in words, for the one pair it is about.
- **A filter.** This beat declares none and `verify-web.mjs` skips its five filter checks
  accordingly. A ranking of ten carries no dimension orthogonal to the encoded variable, so any
  narrowing would take marks out of the ranking the claim is made over.

Everything the plate states is drawn unconditionally and survives with JavaScript off: the ten
columns, their printed values, the bracket and its sum, the caveat, the reading line and the source.

## Treatments spent

- `every-bar-labelled-lets-the-axis-go` — each column prints its own number, so the page carries a
  **zero baseline and a stated unit instead of a value axis**. A length encoding still needs its
  zero and has one; what it does not need is a ruler nobody reads once every bar is written.
- `accent-marks-the-thread` — one column is the subject and carries the direction's accent; the
  other nine are one neutral step off the direction's own ground, taken to the non-text floor. A
  ranking where every bar shouts has no subject.

The bracket is drawn where the comparison is made, spanning exactly the columns it adds up, so a
reader can count the bars under it rather than trust a sentence. It is **HTML in the overlay, not a
path in the `viewBox`** — see below.

## This type's own trap, and the form it takes here

`references/types/bar-and-column.md` names one trap: a value label printed inside or against a
coloured bar needs its contrast measured **against that exact fill**, and a naive luminance
threshold mis-picks white on a mid-toned hue.

**Its literal form is absent, and deliberately so.** Every value is printed *outside* its column, on
the ground, which is the same side-step the static sibling records. Nothing on this page sits on a
fill, so `inkOnFill` — the repertoire's own implementation of the trap's remedy, which measures both
poles against the fill and takes the higher — is not reached for and is not claimed.

**Its reason survives, and it was open.** The trap's reason is *a rule standing in for a
measurement*, and this page had three places where the accent was used as **type** on the strength of
the direction having chosen it: the eyebrow (crème's `eyebrow` register reads its ink from the
accent), the subject's value label, and the subject's own name on the x-axis. An accent is picked to
be legible as a mark — a 3 : 1 floor — and 11-px type is held to 4.5 : 1. Nothing measured the
difference. Measured now, at build time, against each direction's own ground: crème **6.64 : 1**,
nocturne **10.80 : 1**, rapport **7.09 : 1**. All three pass, so nothing on the page changes; what
changes is that a fourth direction whose accent does not pass stops the render instead of shipping
type a reader cannot read. The assertion is `assertLegible(accent, ground, { role: "text" })` and it
is measured, never adjusted: `adjustToContrast` walks a colour 2 % toward a pole even when it already
passes, so adjusting here would darken three accents that are correct.

## The bracket's clearance, and why a `viewBox` constant could not hold it

The bracket used to be an SVG `path` placed **26 `viewBox` units** above the tallest column it spans.
The `<svg>` carries `preserveAspectRatio="none"`, so a constant in geometry space is not a constant
in reader pixels: 26 units is 42 CSS px on a 682 px plot and **8.5 CSS px on the 137 px plot a 320 px
window produces**. The caption rides on the bracket, and the value label it has to clear is a fixed
CSS height the direction decides — so the two collided at every width at or below 480 px, measured
on the delivered files at **21.5 px of overlap on crème at 480, 28.7 px at 375, 27.1 px at 320**, and
the same on the other two directions.

The remedy is the one the corpus already learned on the line beat: the clearance a reader sees must
be stated in the reader's own pixels. The bracket is now **HTML in the overlay** — three borders on
a positioned `div`, drawn at `direction.stroke.rule` width exactly as the path was — anchored by `%`
to the tallest spanned column's own top and lifted by `leadOf(value) + 2 + 4 + 8 px`: that
direction's own value-label box, the offset the label already stands off its column, and one gap. It
is the same distance at 320 px and at 1600 px, in every direction, because it is never scaled by the
`viewBox` at all. Measured on the delivered files: the bracket sits **8.0 px above the value label
it has to clear at 320 px and 8.0 px above it at 1400 px**, against 8.5 px and 42 px before.

The caption moved with it, and had to change twice. Centred over the bracket's middle it **wrapped**
— `noteAnchor` caps a label at `min(46%, 24em)` so it cannot run off the frame — and at 320 px the
two-line box was taller than the room between the bracket and the top of the plot, so it climbed OUT
of the plot and landed on the subject's own value label (4.2 × 20.0 px on crème). It is now anchored
to the bracket's **left end**, held to one line, and the horizontal safety `noteAnchor`'s cap was
providing is re-established as a **build-time refusal**: the caption must fit, on one line, in what
is left of the narrowest plot this format is verified at. Measured across the three filed directions
it sets 182.5 px (crème, 13 px Merriweather), 144.5 px (nocturne, uppercase and 1.8 px-tracked) and
148.9 px (rapport) against 240 px of room.

Measured after, on the delivered files: **zero caption/label collisions at 360, 375, 414, 480, 768,
1024, 1400 and 1600 px in all three directions**, and `document.scrollWidth` equal to the viewport at
every one. At 320 px one remains and it is the comb below, not the placement: crème's and rapport's
"12,29" sets 46.4 px in a 27 px band, spills 19 px past its own column into the next one, and reaches
the caption's left edge by 4.4 px and 3.9 px.

## What is still wrong at phone widths, and why it is not closed here

**The plate is a comb below roughly 500 px, and it is the type's own density limit, not a placement
bug.** At 320 px the plot is 272 px wide and ten bands are 27 px each, while one value label sets
46.4 px and one country name ("Corée du S.") sets 61 px in the direction's own registers. Measured
on the delivered files, counting only label-on-label overlaps:

| width | crème | nocturne | rapport |
| ---: | ---: | ---: | ---: |
| 320 | 17 | 19 | 17 |
| 375 | 16 | 17 | 16 |
| 480 | 3 | 5 | 3 |
| 768 and above | 0 | 0 | 0 |

Eight value labels overlapping their neighbours and eight or more country names overlapping theirs,
in every direction.

No arrangement of upright labels fits: ten labels at their real widths need ~400 px of a 272 px
plot. `references/types/bar-and-column.md` gives exactly three remedies for a comb — group the tail
into "Other", filter to what the headline is about, or transpose — and the first two would change
the claim, which rests on *the top ten* being 68,9 % of the world. So the remedy is the **transpose**
the static sibling has already designed and written up: rows down the frame, each country's name
horizontal in a gutter sized to the widest label present, the value to the right of its bar, and the
comparison redrawn as a **mark across the subject's own bar at the point the next five add up to**
(`static-bar-top-emitters-2024/BRIEF.md`, "What the other sizes do"). That beat refused it only
because a pinned 1080 px-tall portrait frame left 38,5 px per row against a 39 px floor — an
arithmetic a fluid web page does not have.

That is a second plate, not a placement fix, and it is a form decision this beat's siblings share.
It is named here with its numbers rather than half-solved.

## Verification

`verify-web.mjs --file renders/<direction>.html` — creme **99 passed, 0 failed, 5 skipped**,
nocturne **93 / 0 / 5**, rapport **87 / 0 / 5** (the counts differ by direction because the typeface
probe runs once per face the page embeds). Every skip is the filter's; this beat declares none.

Every control was driven in every direction at 1400 x 900: a real pointer over all ten columns
answers **10 distinct readings** in each, and Tab walks all ten in ranking order, each `.pt` carrying
its own `aria-label` and the answer box announcing through `aria-live="polite"`.

A tap is verified as a real touch sequence, not as a pointer: `touchStart → 150 ms → touchEnd →
500 ms` at 390 × 844 through CDP. Before the patch in `render-directions-web.mjs`, the answer
appeared on the touch and **vanished when the finger lifted** — the page's own reading line promises
« survolez, touchez ou tabulez » and the middle third was false. Chrome fires `pointerleave` up the
whole chain when a touch pointer is destroyed, and the format's shared `interaction.mjs` clears on it
unguarded; the patch restricts that clear to mouse and pen, which leaves a touch reader's answer up
until they tap elsewhere.

## Source

Global Carbon Budget 2025, via Our World in Data · 2024. `data.csv` is a byte-for-byte copy of
`proof/static-bar-top-emitters-2024/data.csv`, re-parsed independently here.
