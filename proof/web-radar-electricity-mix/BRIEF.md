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
- **What the page says BEFORE the gesture:** the reserved row under the pills is not empty at rest.
  It carries one sentence — *« Les boutons ci-dessus déplacent les huit sources autour du cercle :
  les intitulés changent de rayon, les deux formes sont redessinées, aucune valeur ne bouge. »* —
  between the control and the circle it changes. This is the owner's first reading, taken as written:
  he looked at `renders/rapport.html` and asked *« pourquoi les labels changent d'ordre au filtre ? »*.
  The gesture was doing exactly what it is for; nothing on the page said so where he was looking. A
  legend names what a reader is CHOOSING, not what choosing DOES, and every other sentence this
  control owns is a counterfactual that does not exist until an option has been taken. So the warning
  is now the state the page ships in, and `reorder.ts` refuses a declaration that has none.
- **What changes in the picture:** the eight spokes keep their places and their names travel between
  them; each spoke's two vertices slide in or out to the reading of the source that lands on it, and
  both outlines are redrawn through them; the readout on the plot and the sentence under the control
  both state the two areas this ordering produces and the ratio between them, against the plate's own
  1,45×.
- **And the change is a TRAVEL, not a swap** — the owner's second reading, and the harder of the two.
  See "The mechanism" below for what had to be measured before it could be had at all.

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

**And it grew a second half on this pass, for the owner's two readings.** `noneNote` is the sentence
the control owes a reader who has not pressed it yet, required rather than optional. `ReorderMotion`
+ `reorderMotionCss` + `reorderAreaPaths` are the travel: where every moving thing sits in every
state, the stylesheet that moves it, and the outline BUILT from those same numbers rather than stated
beside them. `reorderMarkLiftCss` is what the split cost — the lift the format's script used to carry
inside one `<svg>`, written as a `:has()` rule that crosses between two. Nothing in any of them names
a colour or computes a coordinate; the radial arithmetic is still the beat's.

## The mechanism, and the two defects it had to design around

The owner asked for the change to be animated — *« le graph pourrait changer en lerp smooth au lieu
de saccader en changement direct »* — the vertices travelling to their new spokes rather than one
picture being swapped for another. The page as first shipped could not: every ordering was a whole
`<svg>` revealed with `display`, and `display` cannot be transitioned.

**The three triggers CSS has, each driven in Chrome 151 rather than assumed:**

| trigger | what it measured |
| --- | --- |
| a CSS *animation* on a plate being revealed | `display: none` does **not** restart an animation on the hidden element's DESCENDANTS — the plate's vertices ran their whole 3 s animation while hidden, from page load. By the time a reader presses the pill there is nothing left to play. |
| `@starting-style` + `transition-behavior: allow-discrete` | the starting style fired **once, at load**, for the hidden plate too. A `display: none` element's descendants still have a computed style, so they are never "newly rendered" and the reveal re-triggers nothing. |
| a property changing on an element that is **always rendered** | works. And it decides the architecture: the drawing cannot be one `<svg>` per ordering any more. |

**Which runs straight into the defect the first mechanism existed to avoid, and it has not gone
away.** `interaction.mjs` resolves the mark under a pointer from `cx`/`cy` read once at init, which
no CSS transform ever changes; a `.pt` hidden by `opacity` stays in that hit test and answers for a
vertex nobody can see. **A drawing that moves cannot be the thing that answers.** So the two jobs are
split rather than merged:

- **one drawing**, always rendered, `aria-hidden`, `pointer-events: none` — rings, spokes, both
  areas, sixteen dots, eight names. Its dots and names move on `transform`, its areas morph on `d`,
  both on one 420 ms clock. Nothing in it answers anything.
- **four hit plates**, one per ordering, transparent, holding only the sixteen points that answer and
  the overlay that resolves them. Still swapped with `display`, still one wired `svg.chart` each,
  still zero-box and out of the tab order when unchosen. **The marks that answer never move**: each
  plate's points are baked at its own ordering's coordinates and jump to them.

The stated cost: for the travel's own 420 ms the hit layer is already at the destination while the
drawing is still in the air, so a reader who points DURING the flight is answered about the vertex
that is arriving. Nothing is ever answered from a position no vertex will occupy, which is the
failure the split exists to prevent. Driven in the reordered state: **16 of 16 vertices answer with
their own reading**.

### The defect the first driven frame found, and what it changed

A `<path>`'s `d` interpolates its point *i* to the other path's point *i* — and point *i* is **slot**
*i*. So a corner slides along its own spoke as the reading landing on that spoke changes. The first
version named its dots by SOURCE, so a dot flew round the circle to its new spoke while its corner
slid radially: **two different journeys between the same two endpoints.** Measured mid-flight, the
dots stood up to **5,47 user units** clear of the outline they belong to, and the captured frame read
as a broken drawing.

A dot is now the vertex **at a spoke**, not the vertex of a source. It interpolates between the same
two points its corner does, along the same line, on the same clock. Re-measured across the flight:
worst gap **0,012 user units**, which is the two-decimal rounding of the path string and nothing
else. And the polygon is no longer something the beat states at all — `reorderAreaPaths` BUILDS it
out of the same `home + move` the dot is built from, so the disagreement is not expressible rather
than merely refused.

What travels round the circle is now the eight **names**, which is exactly the thing the owner's
first question was about.

### The lift crossed a boundary and is CSS now

`interaction.mjs` carries `.mark-active` to `[data-mark]` found **inside the same `<svg>`**. The
split put the visible dot in the drawing and the point that answers in a hit plate, so that lookup
finds nothing. The lift is a generated `:has()` rule on `.chart-plot` instead, keyed on the point,
painting the dot in the colour the beat measured on the dot itself — and with `:focus` in the
selector, so a reader tabbing the vertices **with the script absent** now gets a lift the script used
to be the only source of. Driven: 16 of 16 dots paint their own declared `--mark-active`.

### And nothing here needs the animation to be correct

Under `prefers-reduced-motion: reduce` the geometry is set outside the query and the transitions are
inside it, so the picture **snaps**: `document.getAnimations()` empty, the new geometry already in
place at the first sample. With JavaScript disabled the travel is byte-for-byte the same, because
nothing in it is script. And on an engine with **no CSS `d` property** the areas fall back to one
baked `<path>` per ordering swapped with `display`, behind `@supports not` — the first mechanism, one
level down, so an engine this page has never been driven in gets a correct picture that does not
travel rather than a travelling picture that is wrong.

## What looking at the renders showed, and what it changed

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

**What the mid-flight frames showed.** Captured at 170 ms of the 420 ms travel, script on and script
off, in all three directions: the eight names are strung between their old spokes and their new ones,
each spoke's two vertices are part-way in or out, and both outlines pass exactly through their own
dots. Two names momentarily overlap when they swap sides (measured in `rapport`: *hydraulique* over
*éolien*), which lasts the length of the flight and is the picture of two labels changing places.
The first version of this frame is what found the detached-dot defect above.

Changes the renders forced, in order:

1. **The plot moved when the reader pressed a pill** — measured at 15 px at 1280. The notes wrap to
   different heights, so revealing one with `display` grew the row. On a control whose whole product
   is comparing one arrangement with another, a picture that jumps is the defect. The sentences are
   now stacked in one grid cell and revealed with `visibility`, so the row is always as tall as the
   longest of them. Re-measured with the warning sentence added: `.chart-plot` top is 195 px in
   creme, 233 in nocturne, 190 in rapport, identical at rest, mid-flight and settled, script or no
   script.
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
5. **The warning sentence's first draft cost the phone 16 px.** At 228 characters it was the longest
   sentence in a row sized by its longest sentence, and `nocturne` went to 828 px against 812 — a
   vertical scroll inside the visual, and the source line off screen. Cut to 157 and the three
   directions are back to 101 / 89 / 89 checks passed and 812 px exactly.
6. **The dots came off the outline mid-flight.** Above, in "The mechanism".
7. **`fold.ts` was read before any of this and refused**, with the measurement recorded above.

## The vocabulary's own refusals, verified by mutation

`assertReorderDeclaration`, `assertReorderMotion` and `assertReorderChangesThePicture` were each fed
a page that should be refused, and one that should not:

| mutation | outcome |
| --- | --- |
| an option that rotates the plate's order by one spoke | REFUSED — "draws the same polygon as la plaque" |
| an option that reverses the plate's order (its mirror) | REFUSED — same, and invisible to any element-by-element comparison |
| an option that rearranges the spokes and lands on the same area | REFUSED — "moves no series' area by 0.5 %" |
| an option whose note and readout only repeat the printed caveat | REFUSED — "reveal a sentence the page already prints" |
| the same page with one number the caveat does not print | ACCEPTED — so the check discriminates rather than refusing everything |
| an option that puts one axis on two spokes | REFUSED |
| a pill whose accessible name drops its own visible words | REFUSED — WCAG 2.5.3 |
| **no sentence for the state the page ships in** | REFUSED — "nothing on the page says what this control will DO before it is pressed" |
| **a ships-in sentence that is only whitespace** | REFUSED — same, so the check is on the words and not on the key |
| **an ordering with no travel table of its own** | REFUSED — "its drawing would stay at the plate's own coordinates while its words said otherwise" |
| **an ordering that travels a different set of things** | REFUSED — "one of them would be left behind on its old spoke" |
| **the untouched state offset from the drawing it is baked at** | REFUSED — the one state that may not move |
| **an ordering that moves nothing at all** | REFUSED — "press it and watch the picture stand still" |
| **an ordering that moves the NAMES and not one corner** | REFUSED — the two shapes would be the ones already on screen |
| **an outline walked through a corner nothing carries** | REFUSED — the exact shape of the detached-dot defect, made unsayable |
| **an outline walked through two corners** | REFUSED — "closes nothing" |
| the page as it ships, through both asserts | ACCEPTED |
| **the REAL runner, with the ships-in sentence deleted** | all three directions REFUSED, `process.exitCode` 1, **0 files written** |
| **the REAL runner, with the drawing baked 6 units off the plate** | all three REFUSED — `"FRA-slot2" by (6, 0)` — `process.exitCode` 1, 0 files written |

**And one claim that is structural rather than refused.** A vertex moved by hand takes its corner
with it, because `reorderAreaPaths` builds the outline out of the same `home + move` the dot is
drawn at: `M 200 140 L 240 200 L 200 210 L 180 200 Z` became
`M 200 140 L 240 200 L 217 201 L 180 200 Z` with no second edit. The disagreement that produced the
broken mid-flight frame is not a thing a declaration can say any more.

**What this still does not catch, named rather than implied.** The `corners` list says which vertices
an outline is walked through and in what order; nothing measures that the order is the ring's own
neighbours. A beat that walked its outline through the right dots in the wrong sequence would draw a
star, consistently, with every dot on it.

**One finding worth recording rather than hiding.** On this beat's own data the area refusal is
unreachable: no ordering among the 5 040 is both a different shape and within half a percent of the
plate's area on BOTH countries, so the cyclic check always fires first. It was exercised on a single
series, where such an ordering does exist, and it fired. The guard is live; it is simply not the
binding one here.

## Verification

- `verify-web.mjs` on all three filed directions: **creme 101 passed / 0 failed / 7 skipped**,
  **nocturne 89 / 0 / 7**, **rapport 89 / 0 / 7** — the counts this beat had before the travel, with
  nothing newly skipped.
- The control driven with a real pointer **with the script and with the script disabled**, at 1280 x
  800 and 375 x 812, captured at rest, at 170 ms of the flight and settled: identical in both, one
  drawing, one hit plate shown per state, one sentence, and `.chart-plot` never moving.
- **The travel measured, not watched:** `document.getAnimations()` 23–27 during the flight and 0 at
  rest; the areas' `d` interpolating point by point; every dot within 0,012 user units of its own
  corner at every sample. Under `prefers-reduced-motion: reduce`, 0 animations and the destination
  geometry already in place at the first sample after the press.
- Every vertex answers a real pointer on its own mark, **16 of 16 in the reordered state** as well as
  at rest — the three unchosen orderings contribute no probe, no tab stop and no hit target, which is
  what keeping one transparent `<svg>` per ordering buys.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of `proof/static-radar-electricity-mix/data.csv`.
