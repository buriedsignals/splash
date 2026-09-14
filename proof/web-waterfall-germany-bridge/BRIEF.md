---
format: web
type: waterfall
---

# Beat — L'électricité allemande a perdu 143 TWh entre 2015 et 2024 (web)

**Type:** waterfall (bridge). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Germany's total electricity generation fell from **639 TWh in 2015 to 496 in 2024 — a net −143** —
because the nuclear phase-out (**−92**) and a falling fossil share (**−154**) outweighed renewables
growth (**+103**).

## The interaction, written before the code

### The reader's question

**« Et sans le nucléaire, l'Allemagne aurait produit combien ? »**

That is the question a bridge invites and the one no still can answer. A waterfall's whole subject is
**contributions composing into a total**: it fixes one order, one set of contributors, and asserts
the arithmetic. A reader who accepts the arithmetic immediately wants to run it again with one term
taken out — and the answer depends on **which** term they pick, so it is not a number an author can
pre-draw. A video cannot answer it either, and neither can a scrolly: both are sequences the author
chose, and this is three different arithmetics, one per reader.

### The gesture: the reader takes a contribution out

**`toggle-a-comparison`** in the repertoire's vocabulary, but the comparison here is between the
bridge as measured and the bridge **without one of its own terms**. Four radios: the complete bridge
(the default, and the plate), then one per group of sources.

### What changes in the picture

Choosing a group does four things at once, and every one of them is arithmetic the reader performs
rather than emphasis an author added:

1. **The chosen bar leaves, and the hole stays.** Its rectangle empties to a dashed outline in its own
   band — the size of what was taken out, still measurable against the axis. Its name on the x-axis and
   its signed value are struck through. *Disappearing and being accounted for*, not hidden.
2. **Everything downstream re-steps.** Each later step slides vertically by exactly the withdrawn
   value, because a step starts where the previous one ended and the previous one just changed. The
   bars keep their own lengths — a contribution is not resized by removing another one — and the
   connectors travel with them, so the bridge stays a bridge.
3. **The closing level recomputes.** The 2024 bar grows or shrinks from the zero baseline to the
   counterfactual total. Withdrawing the fossil decline is the striking one: the bar ends up **taller
   than 2015**, which is the beat's claim restated as a fact the reader produced.
4. **The new total is stated, on the picture.** The counterfactual total is printed above the
   recomputed bar, and the sentence under the control gives it with its net change against 2015
   (`−51,4` instead of `−143,2`). An addition whose answer is only in a caption is one the reader is
   asked to take on faith — `stack.ts`'s own lesson, applied to a subtraction.

### The second control, unchanged: ask a step

**`ask-a-mark`.** Every step answers with its own value, its share of all movement, and **the
counterfactual it produces** — the same number the control draws, so a keyboard reader who never
operates the radios still gets all three answers.

The answers are deliberately written to be **true in every state of the page**. The previous build's
answers said "part de 485 et arrive à 393" — a running level, which is precisely what the control now
moves, so those sentences would have been false the moment a reader chose an option and `data-detail`
is a build-time string no CSS can rewrite. The division of labour is now clean: **the picture carries
every running level; the tooltip carries only what is invariant** (a step's own size, its share, and
the total it would leave behind).

### What this page earns over a still, a video and a scrolly

It performs an arithmetic the reader chooses. The still asserts one sum; the video walks that one sum;
the scrolly narrates it. None of the three can run the sum again minus a term the reader names, because
there are three answers and the author does not know which one is wanted.

## Treatments spent

- `net-change-between-declared-levels` — a waterfall is honest only if **both ends are levels the page
  names**. Otherwise the steps float over nothing and a reader cannot tell whether they add up. Under
  a withdrawal the closing level is redrawn and **renamed**: the counterfactual total is printed where
  the measured one was, so the rule holds in all four states.
- `conservation-is-kept-visible` — the moves sum to the difference between the two levels, and the
  runner **checks it before drawing**, then checks again that the bridge lands on the declared level.
  **Each counterfactual is replayed the same way**: the withdrawn bridge is walked step by step and
  the level it lands on must equal the total the words print, or the render refuses.
- `sign-is-direction-and-hue-only-doubles-it` — a step's direction is up or down; colour repeats it.

## This type's trap, and what it turned out to be here

`references/types/waterfall.md` names one trap and it is arithmetic, not colour: **a "total" bar that
does not equal the running level the steps before it produced**, silently, because each bar shows only
its own delta and a reader cannot catch the error by looking. The literal form was already closed by
the runner (the moves are summed against the declared difference, and the walked bridge against the
declared closing level).

**The control reopens it in a new place, and that is the finding.** Three more closing levels now exist
that no measurement had ever covered: one per option, each drawn as a *scale factor* on the 2024 bar
and captioned with a number formatted separately in the runner. Nothing connected the two — a factor
computed from one arithmetic and words computed from another are exactly the two derivations of one
number the tree has paid for before. So `withdraw.ts` takes the counterfactual total **as a number**
beside the words and refuses an option whose printed total is not the level its own geometry lands on,
and the runner re-walks each withdrawn bridge rather than subtracting once. Four bridges are asserted
where the still asserts one.

The sheet's *accessibility* trap — a value label inside a bar, in white, landing on a bright decrease
colour — is closed here in its own way and was reopened by the control too: a label printed inside a
tall bar takes `inkOnFill`'s ink for **that fill**, and a withdrawn bar has no fill any more. The
colour of a value is therefore no longer an inline style (an inline style beats every generated rule);
it is a custom property per label, so the withdrawn step's number steps back to ink-on-ground in the
same rule that strikes it through.

## What the render taught

A value printed **above** its bar is right for a short step and wrong for a tall bar whose top is
already near the frame: at 375 px the plot is a hundred units tall and the label a fixed fourteen
pixels, so it lifted clean out of the svg, where the hit area cannot answer for it. A value goes
**inside** its own bar when the bar can hold it, in `inkOnFill`'s ink for that fill.

The counterfactual total is the one figure that never goes inside its bar: it stands on the ground
above the recomputed level, in ink. A measured total is printed on the thing measured; a total the
reader produced is printed on the page, and the two should not be confusable.

## Where this vocabulary does not yet reach the format's own guards

Both are named rather than worked around, because both are a LIST in a file this beat may not edit.

- **`interaction-plan.ts` cannot see this control.** Its census discovers a page's controls by their
  markup — `data-detail` answers, a `<details>` table, `chart-filter-*` / `chart-stack-*` /
  `chart-level-*` radios — so `chart-withdraw-*` is invisible to it and a withdrawal would ship
  unmeasured. Squatting on the stack's id prefix and note attribute to be discovered would make the
  census report a stack that is not one, which is the "one word, two behaviours" defect the twin has
  already paid for once. So the refusal ships **with the vocabulary**: `assertWithdrawChangesThePicture`
  holds the same line against the same definition, and the runner calls it on the page it just wrote.
  For the same reason this beat declares no `interaction` prop — a plan naming the gesture that
  actually ships would be refused for naming a control the census cannot find.
- **`verify-web.mjs`'s word check counts everything in `.overlay`.** It requires every word there to
  be drawn unconditionally, which is right for the plate's own figures and wrong for a figure that
  belongs to an option nobody has chosen — that file already carries three `:not(...)` exclusions for
  exactly this, one vocabulary over. A fourth is a list that grows once per vocabulary, so the
  recomputed totals live in their own layer over the same grid cell instead, and the plate's rule
  stays literally true of this page: everything in `.overlay` here IS drawn unconditionally.

## Verification

- `verify-web.mjs --file renders/creme.html` — **99 passed, 0 failed, 5 skipped**; `rapport` 93/0/5.
  `nocturne` 97/**2**/5, both the same pre-existing phone overflow: its five-line all-caps display
  title puts the document at 874px in an 812px window. The committed render before this work measured
  the same 874px, so the control is not what costs it; the caveat, the reading line and the control's
  own words were trimmed until it came back to exactly that number.
- **The control driven in a real browser, three directions × script on and script off — 174 checks,
  0 failed.** Per direction and per option: the withdrawn bar is emptied and outlined, the hole stays
  where the contribution was, every downstream step re-stepped while keeping its own length, the
  closing level is re-drawn to the counterfactual total with its bottom still on zero, the total is
  printed on the plot and carries the same number as the sentence, both invalidated connectors are cut
  and exactly one replacement spans the hole — plus the untouched option restoring the measured bridge
  to the pixel, and the radios operable from the keyboard alone. Real CDP input only.
- Mutations, each red with its own message: `closeTransform` forced to 1 (→ *"that is the default
  under a second name"*); the beat no longer cutting the connector leaving the hole (→ *"a line drawn
  from the end of a bar that is no longer there"*); a printed total one TWh off the walked one (→ *"the
  recomputed bar and its own caption disagree"*); every option's sentence replaced by words the page
  already prints (→ the render-time refusal, all three options named). And one against the driven
  check itself: the stylesheet stopping re-drawing the closing level turns 18 of its 174 green.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · Germany,
2015 and 2024. `data.csv` is a byte-for-byte copy of
`proof/static-germany-electricity-bridge/data.csv`.
