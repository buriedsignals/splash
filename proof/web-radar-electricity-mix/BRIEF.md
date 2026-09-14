---
format: web
type: radar
---

# Beat — France et Allemagne produisent presque autant d'électricité et n'ont presque aucune source en commun (web)

**Type:** radar (spider). **Medium/format:** chart / **web**. **Frame:** fluid in width, fixed in
proportion — a radial geometry cannot stretch, so this page letterboxes.

## Claim

In 2024 France generated **562 TWh** and Germany **496** — within **12 %** of each other — from mixes
that share almost nothing: nuclear **67,7 % against 0**, wind + solar **12,5 % against 43,5 %**, coal
**0,2 % against 21,4 %**. The beat throws if the two totals are not within a fifth of each other or
if the nuclear gap is under 50 points.

## The catalogue's trap, and why this page does not dress it up

`references/types/radar.md` does not warn about a decoration on this type. It says the type itself
misreports:

> a polygon's AREA (the thing a reader's eye actually judges at a glance) is sensitive to axis order
> and count in a way the underlying numbers aren't … this is the type's structural weak point, not a
> bug to be fixed in code.

and, in the accessibility section, that it ships with **no mechanical guard at all** behind that
problem. The static sibling ANSWERS the trap the only way a still can: it picks one ordering by
family, states the ordering on the plate, and asks the reader to trust it. That is the honest
maximum of a still. It is not the maximum of this format.

**So this page's gesture is the lie itself, made operable.** Measured on the frozen file, by
enumerating all 5 040 ways of arranging these eight axes around the circle (2 520 distinct shapes,
each also appearing as its own mirror — reversing an ordering leaves every area untouched):

| | France's polygon | Germany's polygon | Germany ÷ France |
| --- | --- | --- | --- |
| the plate's own order | 1,80 % of the disc | 2,61 % | **1,45×** |
| sorted on France's shares | 2,37 % | 2,51 % | **1,06×** |
| sorted on Germany's shares | 1,68 % | 3,24 % | **1,92×** |
| the order most flattering to France | 3,44 % | 2,06 % | **0,60×** |
| across all 5 040 orderings | 0,50 % … 3,45 % (**×6,95**) | 1,55 % … 3,81 % (×2,46) | **0,60 … 6,83** |

Not one of the sixteen numbers changes between any two rows. The eye's answer to the only question a
radar invites — *who covers more of the circle?* — is a free parameter of the layout, and on this
data it can be turned all the way round.

Two of those four orderings are not adversarial constructions. **Sorted on France's own shares** and
**sorted on Germany's own shares** are the same banal rule applied to the two countries, the sort any
spreadsheet hands you, and they alone move the ratio from 1,06 to 1,92.

## The interaction, control by control

### 1. Ordre des axes — `sort-or-reorder`

- **The reader's question:** *« Si les axes étaient rangés autrement, est-ce que je lirais la même
  chose ? »*
- **The gesture:** four native radios, one per ordering, plus CSS generated at build time. No
  script.
- **What changes in the picture:** the eight spokes keep their places and their labels move between
  them; both polygons are redrawn at their own values in the new order; the readout on the plot and
  the sentence under the control both state the two areas this ordering produces and the ratio
  between them, against the plate's own 1,45×.

The option that reverses the reading (`0,60×`) is **labelled as what it is** — found by enumeration,
chosen by nobody for an editorial reason. Passing it off as a fifth defensible ordering would be the
same dishonesty one level up.

### 2. Asking a vertex — `ask-a-mark` (kept from the plate, unchanged)

- **The reader's question:** *« Cette pointe, elle vaut combien exactement ? »*
- **What changes:** the vertex answers with the country, the source, its share to one decimal, the
  TWh behind it, and **what the other country has on the same axis**. These sixteen strings are
  identical in every ordering — they are the part of the page the reordering cannot touch, which is
  the editorial point restated on a second channel.

### What this page earns over a still, a video and a scrolly

A still shows one ordering and must ask for trust. A video could animate between two, but the
viewer never gets to ask *what about this one instead* — and a sequence the author controls is an
argument the author is still making. A scrolly has the same problem one gesture down. **Only here
does the reader get to run the manipulation themselves and watch their own takeaway invert while
every number on the page stays put.**

## What must NOT sit behind the control, and does not

The claim is the two mixes, not the two shapes. Every ordering draws **both** polygons at **all
sixteen** values, every axis named, and the caveat — nuclear 67,7 against 0, wind + solar 12,5
against 43,5, the two totals — is printed unconditionally in every state. **The full measured span
(0,50 % … 3,45 %, ratio 0,60 … 6,83) is printed on the plate too**, not behind a gesture: the lie is
the page's own finding and a reader who touches nothing must still be told it. The control only lets
them watch it happen.

## The vocabulary

**`fold.ts` was read first and is REFUSED here, with the measurement.** A fold lays one profile over
another so a difference stops being an inference. On a mirrored type that is a real gain — two
lengths run in opposite directions from a shared zero. A radar's two polygons are **already**
concentric, on one shared radial scale, at the same angular frame: laying France's profile over
Germany's produces the polygon the plate already draws. The resulting state equals the default state,
which is the one thing `directed-interaction.md` refuses outright. `level.ts`, `stack.ts`,
`filter.ts`, `withdraw.ts`, `brush.ts` and `trace.ts` were checked too: none of them has a vocabulary
for *the same values at a different place in a cyclic sequence*.

**Written instead: `skills/chart-web/assets/reorder.ts`** — the eighth mechanism, the same radios +
generated CSS. What it owns that no other file does is the arithmetic of the refusal: the **shoelace
area of a closed polygon on evenly spaced spokes**, so an ordering whose area equals another's is
caught before it is offered (an ordering that only rotates or mirrors another draws the same shape
and would be a control the reader operates while nothing moves).

## The mechanism, and one defect it had to design around

The alternative orderings are **not** drawn by transforming the default. `interaction.mjs` resolves
the mark under a pointer from `cx`/`cy` read once at init, which no CSS transform ever changes — and
a `.pt` hidden by `opacity` stays in that hit test and answers for a vertex the reader cannot see.
So **each ordering is a complete `<svg class="chart">` of its own**, drawn once at its own real
coordinates, stacked in the same grid cell, and revealed with `display`. `initAll` wires every
`svg.chart` separately, so the three unchosen ones receive no pointer event, hold no tab stop, and
are excluded from `verify-web.mjs`'s probe by its own zero-box filter. Nothing is transformed and
nothing moves.

## What looking at the three renders showed, and what it changed

**The control works and the reversal is visible.** Between the plate's order and
`au plus flatteur pour la France`, France's polygon goes from a thin spike inside Germany's blob to
the larger of the two shapes, and the readout on the plot says 3,44 % against 2,06 %. Between
`trié sur la France` and `trié sur l'Allemagne` — the same banal rule applied to the two countries —
the ratio goes 1,06 to 1,92 with nothing else on the page moving.

**And an honest complication the render made obvious.** Even in the ordering most flattering to
France, "France covers more" is not something the eye reports confidently: a tall thin wedge and a
squat lumpy pentagon are hard to compare by area at all. That is the same indictment one notch
stronger — a radar's area is not only order-dependent, it is barely readable — and it is why the
page PRINTS the two areas on the plot rather than leaving them to be judged. It is the type sheet's
own remedy ("every spoke's number is printed rather than judged by eye") applied to the one quantity
the reader was going to judge anyway.

Five things changed because of what the renders showed:

1. **The plot moved when the reader pressed a pill** — measured at 15 px at 1280. The notes wrap to
   different heights, so revealing one with `display` grew the row. On a control whose whole product
   is comparing one arrangement with another, a picture that jumps is the defect. The sentences are
   now stacked in one grid cell and revealed with `visibility`, so the row is always as tall as the
   longest of them. Re-measured: `.chart-plot` top is 195 px in all four states, script or no script.
2. **The readout was three wrapped lines of tracked uppercase** in `nocturne` and `rapport`, whose
   annotation register is set that way. It was carrying the ordering's own name, which the chosen
   pill already says. Cut to the two areas and the ratio, and widened to 58em — one line on a laptop,
   wrapping on a phone, where it should.
3. **A hovered French vertex turned the neutral that means Germany.** Measured and fixed; the
   numbers and the mechanism are in `PALETTE.md`, "The defect this pass found".
4. **The beat did not fit a 375 x 812 window** — 946 px of content against 812, because the control
   costs a fieldset and a reserved sentence row. The headline was the largest single item at 429 px
   (eleven wrapped lines of the `nocturne` display register for one sentence), and it was a 100-
   character rendering of the static sibling's own 71-character claim. It now says that claim at that
   length. All three directions measure exactly 812.
5. **`fold.ts` was read before any of this and refused**, with the measurement recorded above.

## The vocabulary's own refusals, verified by mutation

`assertReorderDeclaration` and `assertReorderChangesThePicture` were each fed a page that should be
refused, and one that should not:

| mutation | outcome |
| --- | --- |
| an option that rotates the plate's order by one spoke | REFUSED — "draws the same polygon as la plaque" |
| an option that reverses the plate's order (its mirror) | REFUSED — same, and invisible to any element-by-element comparison |
| an option that rearranges the spokes and lands on the same area | REFUSED — "moves no series' area by 0.5 %" |
| an option whose note and readout only repeat the printed caveat | REFUSED — "reveal a sentence the page already prints" |
| the same page with one number the caveat does not print | ACCEPTED — so the check discriminates rather than refusing everything |
| an option that puts one axis on two spokes | REFUSED |
| a pill whose accessible name drops its own visible words | REFUSED — WCAG 2.5.3 |
| the REAL runner, with one option swapped for a rotation of the plate | all three directions REFUSED, `process.exitCode` 1 |

**One finding worth recording rather than hiding.** On this beat's own data the area refusal is
unreachable: no ordering among the 5 040 is both a different shape and within half a percent of the
plate's area on BOTH countries, so the cyclic check always fires first. It was exercised on a single
series, where such an ordering does exist, and it fired. The guard is live; it is simply not the
binding one here.

## Verification

- `verify-web.mjs` on all three filed directions: **creme 101 passed / 0 failed / 7 skipped**,
  **nocturne 89 / 0 / 7**, **rapport 89 / 0 / 7**.
- The control driven with a real pointer **with the script and with the script disabled**: identical
  in both, one plate shown per state, one sentence, and `.chart-plot` at 195 px throughout.
- Every vertex answers a real pointer on its own mark, 16 of 16, at both verified widths — the three
  unchosen orderings contribute no probe, no tab stop and no hit target, which is what drawing each
  ordering as its own `<svg>` buys.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of `proof/static-radar-electricity-mix/data.csv`.
