---
format: web
type: parallel-coordinates
medium: chart
grounding: supported
derived: v1
---

# Beat — 5 pays sur 16 tirent plus de 25 % de leur électricité du nucléaire, 10 plus de 20 % de l'éolien (web)

**Type:** parallel coordinates. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Of sixteen European countries in 2024, **five** draw more than 25 % of their electricity from nuclear
and **ten** draw more than 20 % from wind; **two do both — Finland and Sweden.** The correlation
between the two shares across the sixteen is **−0,44**, computed here, not asserted.

## The axis order is the argument — and that is exactly what the web undoes

**On a plate, only adjacent axes show a relationship.** A crossing between two neighbours is a real
inverse; a line that rises three axes later is nothing. So nuclear sits beside wind — the crossing
between them *is* the claim — and the order is stated in the reading line rather than left to be
inferred.

Which means a static parallel-coordinates plate can carry **exactly one relationship**: the pair the
author put side by side. Seven axes make twenty-one pairs; the plate draws six of them and the
fifteen others are unreadable by construction. That is not a defect of this drawing — it is what the
form *is*. It is also the thing this page is built to take away from it.

`each-rail-is-headed-by-what-it-is` — every axis carries its own name and **its own ceiling in its own
units**. A plate with one shared scale is a lie about seven different quantities; one with seven
unlabelled scales is a picture.

## The interaction, written before the code

**What this page earns** (`directed-interaction.md`, rule 3). A still of these sixteen mixes can
assert the nuclear/wind trade-off and can draw it, once, for the one pair its axis order allows. A
video and a scrolly can *brush for* the reader — at the band the author picked, in the order the
author chose. This page is the only one of the three where **the reader picks the band**, on any of
three axes, and reads what that set does on an axis the plate cannot put next to it. Two of its five
bands ask a question about a **non-adjacent pair** (hydro against gas, coal against hydro); on the
plate those two readings do not exist.

### Control 1 — ask a vertex

- **The reader's question:** « Cette ligne, c'est quel pays, et elle vaut combien sur les sept
  sources ? »
- **The gesture:** `ask-a-mark`.
- **What changes:** the vertex answers with the country's name, its seven shares and its total
  generation — eight readings the plate prints nowhere. Sixteen lines over seven axes is a tangle and
  the plate cannot isolate one: a reader following Finland has to trace it by eye through fifteen
  crossings.

**The hit target is the vertex, not the line, and the verifier forced that.** `.line-hit` exists in
the shared stylesheet and `initLines` wires it. But every check `verify-web.mjs` makes probes a mark
**at the centre of its bounding box** — which for a path spanning seven axes is empty space. Built
that way, this page reported **47 failures that were not defects and no failure that was one**. A
vertex is a mark with a centre; each carries its whole country's row, so hitting any of the seven
answers the same thing, and `data-hit="cell"` resolves in both axes because sixteen vertices share
every x.

### Control 2 — brush a band on an axis

- **The reader's question:** « Les pays qui misent gros sur *cette* source-là, ils sont où sur les
  autres ? »
- **The gesture:** `brush-a-range`. **The corpus ships it nowhere** — `directed-interaction.md`'s
  repertoire lists it with "none" in the right-hand column, next to "**costs a script** for the same
  reason; named bands (`filter.ts`, 'a threshold as named bands') give most of it with none".
- **What changes:** the chosen band is **drawn on the axis it cuts**, as a filled span between its
  two bounds, so the reader sees *where* they cut and on which of the seven rails. Every line whose
  vertex falls inside that span steps **forward** — a measured step deeper in the neutral, a heavier
  stroke, and a ring on each of its seven vertices — while every line outside it stays exactly as the
  plate drew it. And one sentence appears under the control with the count and the **cross-axis
  reading**: *« Nucléaire élevé, plus de 25 % : 5 pays sur 16 · éolien : 15,2 % en moyenne, contre
  26,4 % pour les 11 autres. »*

Five bands over three axes, and **why it is not one axis**. A brush restricted to the nuclear rail
answers "who is high on nuclear, and where are they on wind" — which is half of a correlation
presented as though it were all of it, word for word the half-answer `assertLevelDeclaration` already
refuses when an option lays a rule on one of two series. *Nuclear ≥ 25 %* and *wind ≥ 20 %* are two
different questions with two different answers (15,2 vs 26,4 one way; 10,6 vs 24,9 the other), and a
reader who can only ask the first is being told the second rather than finding it. So the bands are
**per-axis and curated**, each one earning its place on the data:

| band | the bound, stated in the sentence | keeps | the cross-axis reading it reveals | adjacent? |
| --- | --- | --- | --- | --- |
| Nucléaire élevé | plus de 25 % | 5 / 16 | éolien 15,2 % vs 26,4 % | yes |
| Éolien élevé | plus de 20 % | 10 / 16 | nucléaire 10,6 % vs 24,9 % | yes |
| Éolien faible | sous 10 % | 3 / 16 | nucléaire 36,2 % vs 11,3 % | yes |
| Hydraulique élevée | plus de 30 % | 3 / 16 | gaz 7,2 % vs 21,1 % | **no — axes 3 and 6** |
| Charbon élevé | plus de 15 % | 3 / 16 | hydraulique 3,2 % vs 15,5 % | **no — axes 7 and 3** |

**The pill carries the band's NAME; the sentence carries its bound.** The labels used to be the
bands' own arithmetic — « Nucléaire > 25 % », « Éolien < 10 % » — which is precise and is also six
mathematical expressions in a row at 13 px, read left to right before the reader has chosen
anything. A band has a name: the rail, and whether the cut is at the top of it or the bottom. The
bound has not gone anywhere. It opens the sentence the band reveals, and it is inside what a screen
reader hears (« Éolien faible, sous 10 % — 3 pays sur 16 »), both of which have room for it and
neither of which the reader has to scan six of. The names are written by hand, one per band, because
French agrees its adjectives and a rule deriving « Hydraulique élevée » from « hydraulique » would be
a grammar engine; what is checked rather than trusted is that a band's name OPENS WITH THE RAIL IT
CUTS, so a pill cannot name one rail while the wash appears on another.

### The two decisions inside the gesture, and the measurement behind each

**The inside steps forward; the outside does not step back.** The repertoire's own words for this
gesture are "everything outside it steps back", and this page does the opposite relation. The reason
is a floor, not a preference: the fourteen context lines are already drawn at the **non-text contrast
floor** against the direction's ground (`thread`, clamped by `adjustToContrast`), so there is no
step back available that leaves them legible — and *a line receding must still be measured where it
crosses what it crosses*. Receding them with an `opacity` would be the defect this codebase has
already shipped twice: a colour measured before the opacity was applied, reaching readers at 1,75:1
and 2,19:1. So nothing on this plate is ever painted below the floor it was measured at. The
selected set rises instead, by a step measured in both directions (`brush.ts` refuses a declaration
whose two states do not clear it), and the relation a reader sees is the same one.

**Weight on every line, value only where colour is free.** Finland and Sweden carry the accent
because they are the claim's subject, and `web-discipline.md` says no control on the page may take
that away. So the brush moves **weight** on every line it selects and **value** only on the lines
whose colour is not already carrying the argument — `the-subject-is-ringed-not-recoloured`, applied
one vocabulary over. Membership is read off the ring and the stroke, which are uniform across all
sixteen; identity stays on the hue, which the control never touches.

### The control has an edge on every option, and that is a divergence

**Measured on the committed page**: six options at 13 px, five of them `#61605a` on the cream ground
with **no border and no fill**, next to one black pill. Only the chosen option read as a control at
all; the other five read as a row of grey words. The words themselves were never the problem —
`--muted` measures 6,13:1 on creme, 7,28:1 on nocturne, 6,19:1 on rapport, all well over the text
floor. **Affordance is not contrast**: what was missing was an edge.

**What the two beats the owner validated actually carry, measured rather than remembered.**
`proof/web-bar-top-emitters-2024` and `proof/web-grouped-bar-wind-vs-solar` draw ONE rounded outline
around the whole row of options and leave each option bare — `render-web.mjs`'s `.chart-filter`
block, `.options { border: 1px solid var(--grid) }` and nothing on `label`. `brushChromeCss` was a
deliberate copy of it and was already in that family, byte for byte. So the family is the defect, not
the remedy: this control leaves it, and the divergence is stated here rather than hidden. The group's
frame comes off, a real gap goes between the options, and **every option carries its own outline.**

**The outline is measured, and `--grid` is the colour it may not be.** A hairline at `--grid` reads
**1,52:1** on creme, **1,53:1** on rapport and **1,70:1** on nocturne — a border a reader cannot see
is not an affordance. The beat mixes its own from the direction's ink and holds it to the non-text
floor, the way `thread` and `deep` are held, and `assertBrushDeclaration` now refuses a declaration
whose control is under its floor. Four readings, each against the ground it ACTUALLY sits on — which
for the chosen option's words is the ink fill under them, not the page:

| state | creme | nocturne | rapport | floor |
| --- | --- | --- | --- | --- |
| words at rest, on the ground | 6,13:1 | 7,28:1 | 6,19:1 | 4,5 |
| the 1 px outline, on the ground | 3,33:1 | 4,40:1 | 3,36:1 | 3 |
| hovered words, and the 2 px focus ring | 20,41:1 | 17,78:1 | 21,00:1 | 4,5 |
| chosen words, on the fill under them | 20,41:1 | 17,78:1 | 21,00:1 | 4,5 |

The chosen pill's own fill measures the same as the row above it against the ground (20,41 / 17,78 /
21,00), because hover, focus and the chosen fill are all the direction's `--ink`; the accent is never
borrowed, for the reason the generated stylesheet gives.

**The outline costs no page height, and that was measured too.** The pill's vertical padding drops
from 5 px to 4, so an option's outer box is the same 25,6 px it was before it had a border — still a
24 px touch target, which is what the 5 px was protecting. The row gap and the column gap are set
separately (`gap: 2px 6px`): 6 px across is what separates two outlines on one row, 2 px down is all
a wrapped row can afford, because at 375 px this control wraps to three rows on the direction that
sets its display in 32 px uppercase, where the page has **no pixels to spare** and every one of them
is paid for out of the plot.

### The control a reader with no script gets

All of it. Five bands plus « Toutes les lignes » are native radios in a real `<fieldset>`; the whole
mechanism is `:has()` on the figure plus `:checked` on the radio, generated at build time. No
listener, no state, not one byte of JavaScript. A continuous drag — the canonical brush — would cost
a script and would leave a scriptless reader with a plate and a dead control; named bands are the
version of the gesture this format can promise.

### Why no `interaction` prop travels with the render

`interaction-plan.ts`'s `ControlKind` has five terms — `ask`, `table`, `filter`, `stack`, `level` —
and none of them is a brush. `shippedControls` discovers a control by the shape of its markup
(`chart-filter-*`, `chart-stack-*`, `chart-level-*` radios), so this vocabulary's radios are
invisible to it, exactly as `withdraw.ts`'s are. Declaring `brush-a-range` in a plan the checker
cannot match would be refused ("the plan declares a brush-a-range control and the page ships none");
declaring a plan that omitted the brush would be a plan that lies about its own page. Being
discovered by writing `data-filter` is not available either — `assertOneVocabulary` refuses that
attribute outright on a beat that declares no filter, which is right: **this control does not
narrow.** Nothing leaves the picture. So the plan is written here, in full, as rule 1 asks, and
`brush.ts` carries its own render-time refusal (`assertBrushChangesThePicture`) against the same
definition the format already holds.

## The new vocabulary, and what it owns

`skills/chart-web/assets/brush.ts` — the fourth thing a reader can do to a picture without a script.
`filter.ts` says what may **leave**, `stack.ts` what may **move**, `level.ts` what may be **laid
across**, `withdraw.ts` what may be **taken out of a sum**. This one says **what may be selected on
an axis, and what the rest of the plot then reads as**.

It is not a filter and could not be one. A filter's own doctrine is that the narrowed set is
*orthogonal* to the encoded variable, "so narrowing can never hide the claim"; a brush selects **on**
the encoded variable, which is why its members must stay drawn — the whole reading is *these, against
all of them*. And `filter.ts` overturned dimming for removal on the record, for two reasons, the
second of which is decisive here: "two formats cannot mean two things by one word". So: a different
word, a different file, a different attribute (`data-brush`), and one refusal `filter.ts` has no
reason to make — that the two states of a selected mark clear a **measured** contrast step against
each other and both clear the floor against the ground.

## The plot insets by the room its own marks need

**Measured at 1400x900 on the committed page: 32 of 112 vertices crossed the `<svg>`'s own edge** —
every vertex on the first rail and every vertex on the last, cut in half by the frame, plus every
vertex of a country sitting at 0 % on a rail, cut by the floor. The first rail sat ON the frame's
left edge, the last ON its right, and a vertex sits ON its rail. A mark half-drawn at the frame's
edge reads as a rendering fault, and on this type the outermost rails carry the two variables the
axis order makes most prominent.

**The remedy is room, never a smaller mark.** Both scales now run edge to edge of an INSET drawing
area: `x` from `MARK_INSET` to `FRAME.width − MARK_INSET`, `y` from `FRAME.height − MARK_INSET` to
`MARK_INSET`. Everything that sits at those edges moves with them — the rails now start and stop at
the inset, each ceiling label sits at the top of the rail it names rather than at a percentage
nothing is drawn at any more, and the x labels anchor from the rail rather than from the frame.

**How much room, measured at both ends of the range rather than assumed.** A vertex is `r = 4` in the
geometry's own units and scales with the viewBox, so 4 units of inset would hold it at every width.
Its brush RING does not: that stroke is `non-scaling`, a constant 1,8 px however squeezed the box is,
so its half-width costs MORE of the geometry's units the narrower the page gets. At 1400 px this
880x340 box is drawn 1352x544 and the ring's 0,9 px is 0,6 units across; at 375 px it is drawn 327x99
and the same 0,9 px is **2,4 units across and 3,1 down**. So the inset a ringed vertex needs is 6,4
units at the narrow end, not 4,6 — **8 holds it at both**, and 8 is also half `BAND_WIDTH`, which is
what lets every band centre on its own rail instead of being clamped inside the frame beside it.

**Counted in a real browser, with a band selected so the rings are on: 0 of 133 marks cross the
plot's edge**, at 1400x900, at 375x812 and at 320x700, in all three directions, with the script on
and with it off.

**And it is guarded rather than reasoned about.** `MARK_INSET` is a number, and a number can be
lowered by somebody who has not measured what it holds — so the component walks the vertices it is
about to write and refuses one whose `r` would cross the frame. `verify-web.mjs` cannot do this: its
own header says it reads text, geometry, opacity and colour and that *a clipped mark is not reachable
from here*. What the guard cannot see either is the ring's overhang, which is in reader pixels while
the guard is in geometry units; that stays a measurement, stated above.

## Verification

`verify-web.mjs`, all three directions: **creme 99 passed / 0 failed / 6 skipped · nocturne 93 / 0 / 5
· rapport 93 / 0 / 5.** The five skips on every direction are this beat's own shape (it ships no
filter); the sixth on creme is the build-time font scan attributing a weightless `font-weight` to the
body family.

**Nocturne was red before this pass and is green now, and that is worth recording**: at 375x812 the
committed page ran 854 px into an 812 px window (12 failures), because one direction sets the display
register in 32 px uppercase and this beat's headline wrapped to ten rows there. The brush's own
chrome added 119 px on top of that. Both were paid out of prose rather than out of the plot — a
shorter headline (the subject it drops is carried by the eyebrow, the caveat and the source), a
caveat and a reading line cut to what the page still needs now that the control's own sentence
carries the adjacency argument. The plot is at its 120 px floor at that width either way.

A real browser driven once per direction with JavaScript **on** and once with it **off**, operating a
different band each time (creme: nuclear, nocturne: low wind, rapport: coal), reading back the
computed `stroke`, `stroke-width`, the band's opacity, the note's `display` and every state of the
control. **Every reading is identical in both runs** — the control is radios and generated CSS, and
there is nothing for a script to do. Captured with `Page.captureScreenshot` over CDP, never
`page.screenshot()`, which fires `pointerleave` and lies.

**Every band operated at 375x812, in all three directions, against the same page before this pass.**
The bound moving from the pill into the sentence makes that sentence about twenty characters longer,
and on this page twenty characters is a third row where there is no room for one — so the words it
displaced come back out of the ones that were saying the same thing twice (« leur éolien vaut X % »
says nothing « éolien : X % » does not, beside a count that has just named whose). Measured on this
beat's own note element at 375 px: **108 characters is two rows, 113 is three.** Overflow past the
window, band by band, before → after:

| band | creme | nocturne | rapport |
| --- | --- | --- | --- |
| Toutes les lignes | 0 → 0 | 0 → 0 | 0 → 0 |
| Nucléaire élevé / Éolien élevé / Éolien faible | 0 → 0 | 0 → 0 | 0 → 0 |
| Hydraulique élevée | +28 → **0** | +45 → **+28** | 0 → 0 |
| Charbon élevé | +28 → **+7** | +45 → **+43** | 0 → 0 |

Nothing regressed and four cells improved. The two remaining cells are **pre-existing**: the two
non-adjacent bands carry a second clause the other three do not, the plot is already at its 120 px
floor at that width, and there is nothing left for the note to grow into. Named here rather than
quietly left — it is a prose budget, not a defect this pass introduced.

Four mutations on the first pass, then four more aimed at the guards this pass added. **Two of the
first four found something**, which is the only reason to run them:

| mutation | what must go red | what happened |
| --- | --- | --- |
| a band's floor dropped so it keeps all sixteen lines | the band that keeps everything is the untouched view under a second name | red |
| the runner's `keys` for one band given one extra country | the component's cross-check of the declared set against the set its own geometry puts inside the band | red |
| `deep` mixed at 0,40 instead of 0,92 | `assertBrushDeclaration` — the measured step between the two states of a selected mark | red, at 1,02:1 |
| `brushAttrsFor` dropped from every vertex, left on every line | `assertOneBrushVocabulary` — a datum drawing part of itself outside the vocabulary | **green, and that was the finding** |
| `MARK_INSET` 8 → 2 | the component's own walk of the vertices it is about to write | red — *Autriche's vertex on nucléaire is centred at 2.0,338.0 with r=4* |
| `MARK_INSET` 8 → 4 (room for the mark, none for its band) | `assertBrushDeclaration`'s frame refusal | red — *band "Nucléaire élevé" spans −2.0-10.0* |
| the pill outline painted in `--grid` instead of a measured mix | `assertBrushDeclaration` — `tone.pillOutlineOnGround` | red, at 1,52:1 / 1,53:1 / 1,70:1 |
| a band's name moved to a rail it does not cut | the runner's check that a name opens with its own rail | red — *Charbon élevé … does not open with the rail it cuts (charbon)* |

**The fourth passed silently, and closing it is the real work this pass did on the guard.** Nothing
was half-tagged: a whole *kind* of element had simply stopped existing as far as a scan for
`data-brush-key` is concerned, and `filter.ts` names that exact hole for its own version of the
function ("neither half can see an element drawn from a datum that carries NO attributes at all"),
leaving it to a guard that drives a browser. `assertOneBrushVocabulary` now takes an optional
`perKey` — how many elements one datum draws, a number only the beat knows. This beat passes
`1 + axes.length` (one polyline, one vertex per rail) and the mutation goes red at 1 instead of 8.

**And a second finding, from watching the mutations rather than from the guards.** Three of the four
threw *inside* the render loop, where this runner's own `try/catch` turns a refusal into a printed
line — and the process still exited **0**, leaving the last good renders on disk. A red sentence and
a green build. `process.exitCode = 1` on any refusal is now the last thing the runner does, and the
mutation that was exiting 0 exits 1.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of
`proof/static-parallel-coordinates-electricity-mix/data.csv`.

## The choreography

The declaration below is this beat's own `const interaction`, in the shape
`chart-web/scripts/choreography.mjs` cuts out of a source. It lives here rather than in
`render-directions-web.mjs` because this beat's controls are built by a vocabulary of its own that
`shippedControls` cannot see, so no plan travels with the render — the reason the section above
already records. The block under it is what the parser reads out of it.

```js
const interaction = {
  earns:
    "A still can draw the nuclear/wind trade-off once, for the one pair its axis order allows; a " +
    "video and a scrolly brush for the reader, at the band the author picked. This is the only one " +
    "of the three where the reader picks the band, on any of three axes, and two of the five bands " +
    "ask about a non-adjacent pair the plate cannot put side by side.",
  controls: [
    {
      question: "Cette ligne, c'est quel pays, et elle vaut combien sur les sept sources ?",
      gesture: "ask-a-mark",
      changes:
        "The vertex under the pointer answers for its whole country — the name, the seven shares " +
        "and the total generation, eight readings the plate prints nowhere — and sixteen lines over " +
        "seven axes stop being a tangle a reader has to trace through fifteen crossings.",
    },
    {
      question: "Les pays qui misent gros sur cette source-là, ils sont où sur les autres ?",
      gesture: "brush-a-range",
      changes:
        "The chosen band is drawn on the axis it cuts, as a filled span between its two bounds, so " +
        "the reader sees where they cut and on which of the seven rails; every line inside it comes " +
        "forward and the rest steps back without leaving, because this control does not narrow.",
    },
  ],
};
```

```json splash:choreography
{
  "kind": "pointer",
  "promiseSource": "slot",
  "controls": [
    {
      "order": 1,
      "gesture": "ask-a-mark",
      "input": "hover"
    },
    {
      "order": 2,
      "gesture": "brush-a-range",
      "input": "tap"
    }
  ],
  "keyboard": true,
  "degradesTo": "static-frame"
}
```

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
    "each-axis-keeps-its-own-fixed": null,
    "the-correlation-the-claim-reports-is": null,
    "each-band-membership-and-what-that": null,
    "asserted-in-the-js-off-floor": null
  }
}
```
