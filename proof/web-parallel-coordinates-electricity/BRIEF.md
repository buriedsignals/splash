---
format: web
type: parallel-coordinates
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
  reading**: *« Nucléaire ≥ 25 % — 5 pays sur 16. Leur éolien : 15,2 % en moyenne, contre 26,4 % pour
  les onze autres. »*

Five bands over three axes, and **why it is not one axis**. A brush restricted to the nuclear rail
answers "who is high on nuclear, and where are they on wind" — which is half of a correlation
presented as though it were all of it, word for word the half-answer `assertLevelDeclaration` already
refuses when an option lays a rule on one of two series. *Nuclear ≥ 25 %* and *wind ≥ 20 %* are two
different questions with two different answers (15,2 vs 26,4 one way; 10,6 vs 24,9 the other), and a
reader who can only ask the first is being told the second rather than finding it. So the bands are
**per-axis and curated**, each one earning its place on the data:

| band | keeps | the cross-axis reading it reveals | adjacent? |
| --- | --- | --- | --- |
| Nucléaire ≥ 25 % | 5 / 16 | éolien 15,2 % vs 26,4 % | yes |
| Éolien ≥ 20 % | 10 / 16 | nucléaire 10,6 % vs 24,9 % | yes |
| Éolien ≤ 10 % | 3 / 16 | nucléaire 36,2 % vs 11,3 % | yes |
| Hydraulique ≥ 30 % | 3 / 16 | gaz 7,2 % vs 21,1 % | **no — axes 3 and 6** |
| Charbon ≥ 15 % | 3 / 16 | hydraulique 3,2 % vs 15,5 % | **no — axes 7 and 3** |

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
computed `stroke`, `stroke-width`, the band's opacity and the note's `display`. **Every reading is
identical in both runs** — the control is radios and generated CSS, and there is nothing for a script
to do. Captured with `Page.captureScreenshot` over CDP, never `page.screenshot()`, which fires
`pointerleave` and lies.

Four mutations, each one aimed at a guard this beat added rather than at the picture. **Two of them
found something**, which is the only reason to run them:

| mutation | what must go red | what happened |
| --- | --- | --- |
| a band's floor dropped so it keeps all sixteen lines | the band that keeps everything is the untouched view under a second name | red |
| the runner's `keys` for one band given one extra country | the component's cross-check of the declared set against the set its own geometry puts inside the band | red |
| `deep` mixed at 0,40 instead of 0,92 | `assertBrushDeclaration` — the measured step between the two states of a selected mark | red, at 1,02:1 |
| `brushAttrsFor` dropped from every vertex, left on every line | `assertOneBrushVocabulary` — a datum drawing part of itself outside the vocabulary | **green, and that was the finding** |

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
