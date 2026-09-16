---
format: web
type: connected-scatter
medium: chart
grounding: supported
derived: v1
---

# Beat — Les seize ont tous nettoyé leur électricité, et cinq pèsent moins qu'avant (web)

**Type:** connected scatter. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Between 2000 and 2024, **all sixteen** countries raised the low-carbon share of their own
electricity — and **five of them now carry less of the sixteen's low-carbon total than they did**.
France gained 4,2 points at home and lost 11,8 points of European weight: it produced more, and the
others produced faster.

Every part is derived in the runner from the frozen file and asserted there. The beat refuses to
render if any country's own mix got dirtier, if the countries that lost weight are not a minority,
if the subject did not move right and down, or if any country's absolute low-carbon output fell.

## The interaction, written before the code

### What this type's own gesture is, and why the seven siblings' gestures are not it

A connected scatter is the only type in this catalogue whose **mark is a displacement**. A bar has a
length, a cell has an area, a band has a thickness; here the thing the reader looks at is a *vector*
— a tail, a head, and a direction between them — and the two axes are two independent measures, so
the direction carries meaning that neither axis carries alone.

That vector is the hypotenuse of a right triangle **nobody draws**. France's segment goes right and
down; the reader is asked to decompose it by eye into "+4,2 points at home" and "−11,8 points of
European weight", at two different scales, across a plate where fifteen other segments cross it.
Sixteen hypotenuses, thirty-two legs, none of them drawn.

So the reader chooses **which reading the arrow's head is aimed at** — `assets/aim.ts`, written for
this beat. The tail never moves: it is the country's 2000 position and it stays exactly where the
plate first drew it. Only the head swings, and **every head it swings to is a real point of the same
plane**, so no tick, no gridline and no axis label ever has to change its meaning:

| option | where the head lands | what the reader sees |
| --- | --- | --- |
| **Le trajet** (default) | (part 2024, poids 2024) | the full move — the plate this beat ships |
| **Chez eux** | (part 2024, **poids 2000**) | the horizontal leg alone: sixteen arrows, **every one pointing right** |
| **En Europe** | (**part 2000**, poids 2024) | the vertical leg alone: **eleven up, five down** |
| **Total figé** | (part 2024, poids rapportés au total 2000) | the counterfactual: **nobody goes down** |

The first three are the triangle: hypotenuse, then one leg, then the other. The fourth is the same
y-axis read against a denominator that does not grow, and it is the one that *explains* the claim
rather than restating it.

A still can draw exactly one of those four. A video can play them in the author's order, once. A
scrolly can too, on the author's scroll. **Here the reader goes back and forth between the leg and
the hypotenuse as many times as it takes**, on the same axes, with the same arrow, and the pointer
answers the same country in every one of them — which is the whole of what this format earns here.

### The controls

**1. « Il a bougé de combien chez lui, et de combien en Europe ? »**
*Gesture:* toggle a comparison — `aim.ts`, a new vocabulary (see below).
*What changes in the picture:* every arrow keeps its tail and swings its head onto the reading
chosen. Measured on this data, at this frame:

| option | arrows pointing right | pointing up | pointing down | longest | shortest |
| --- | ---: | ---: | ---: | --- | --- |
| Le trajet | 16 | 11 | 5 | Danemark | Suède |
| Chez eux | **16** | 0 | 0 | Danemark +73,7 pts | Suède +2,1 pts |
| En Europe | 0 | 11 | **5** | France −11,83 pts | Autriche −0,08 pt |
| Total figé | 16 | **16** | **0** | Espagne +9,45 pts | Belgique +0,70 pt |

**« Chez eux » is the half of the headline no ranking can show**: sixteen arrows on one horizontal
scale, all of them pointing the same way, from Sweden's +2,1 points to Denmark's +73,7. **« En
Europe » is the other half**: the same sixteen tails, and five heads below them. Neither is a
subset of the other and neither is the default — this is the decomposition, not a filter.

**2. « Pourquoi la France tombe-t-elle alors qu'elle produit plus ? »** — answered by the fourth
option, and it is the reason the control has four and not three. The five that lost weight all
produced **more** low-carbon electricity in 2024 than in 2000; they lost weight because the
denominator grew. Re-based on the sixteen's 2000 total — 1 258 TWh, against 2 008 in 2024, **+59,6 %**
— not one of the sixteen goes down, and France gains 4,0 points instead of losing 11,8. The
threshold is exact and it is on the record: **grow faster than 59,6 % and you gain European weight,
slower and you lose it, however clean you got at home.** The five are between +10 % (France) and
+56 % (Autriche); the slowest of the eleven that gained is Finland at +72 %.

**3. « Ce pays-là, c'est lequel, et il vaut combien en TWh ? »**
*Gesture:* ask a mark (hover, tap, Tab).
*What changes in the picture:* the country's own arrow — shaft and head together — lifts from its
own ink by a sought dose, and answers with both dates on both axes, the absolute low-carbon
generation behind them, its own growth against the sixteen's, and what it would weigh at the 2000
total. **TWh is on neither axis**: both are shares, and two shares can never state the quantity
underneath them. Five countries are named on the plate; the other eleven are named by the pointer.

### What is deliberately NOT shipped, and the measurement behind each refusal

- **A common origin for all sixteen arrows** — the "vector rose", every tail translated onto one
  point so the fan of bearings becomes one shape. It was the first design and it is refused: the
  moment the tails move, the x and y ticks stop being shares and start being *changes in* shares,
  so the entire furniture of the plate lies. Fixing that needs a second set of tick labels crossfaded
  against the first, which is two axes occupying one gutter. The decomposition above buys the same
  reading — all right, five down — **without a single number on the plate changing meaning.**
- **The full table.** Sixteen rows of four readings. Refused because the option « Chez eux » already
  puts the sixteen home gains on one common horizontal scale, which is the ordering a table would
  have given; a table here would be the same ranking in worse handwriting.
- **A second accent for the five that lose weight.** Refused after the control was designed: under
  « En Europe » those five are the five arrows pointing *down*, and direction says it without
  spending a colour. `PALETTE.md` records the measurement.

## The vocabulary: `aim.ts`, written for this beat

`stack.ts` is the near miss and the reason a new file exists. A `StackedColumn` is `{ key, dx, dy }`
— **one rigid displacement per member** — and a displacement is exactly what this control cannot
use: here the mark IS a displacement, so re-aiming it changes its *length and its angle* while its
origin stays nailed down. A `dx`/`dy` pair moves the whole arrow, tail included, which is the one
thing this control must never do, because the tail is what the pointer resolves on.

`hold.ts` is the second near miss, and closer: its own header says it exists to freeze one factor of
a product so the other becomes readable, which is the same *sentence* as « Chez eux ». Its unit is a
per-column `translate(tx,ty) scale(sx,sy)` over the columns of a mosaic, whose widths must sum to the
frame; it refuses a non-positive scale and requires a figure riding a column. An arrow re-aimed needs
a **rotation**, which no affine of that shape expresses, and the fourth option is not a hold of
anything — it is a different denominator.

`filter.ts` removes marks; nothing leaves here. `level.ts` lays a reference across a frame that
stays; there is no reference here. `withdraw.ts` subtracts a term from a sum; `fold.ts` lays one half
over the other; `brush.ts` picks a span of an axis; `trace.ts` and `follow.ts` pull one competitor out
of a tangle it crosses — `follow.ts` was read in full before this file was written, and its arithmetic
is a rank's (`position[i] − position[i−1] = passed − overtaken`, a bijection over a field). This data
has two dates and no ranking; there is no walk to follow and no crossing to audit.

So `aim.ts` says **where a displacement points**: one tail, several declared heads, and the
`rotate(θ) · length` that takes the arrow from one to the other, derived here rather than typed.

Its own refusals, each one a thing a re-aim can get wrong:

- **a head outside the plate's own frame** — an option that aims a country off the axes draws
  nothing and says nothing, silently. The counterfactual sends France to 42,4 % of a y-axis whose
  highest *default* reading is 38,4, so the ceiling had to be raised for it. **The mutation that
  tested this taught something about it**: topping the axis at 40 renders GREEN, because `fitY`
  leaves 6 % of headroom above the top tick and 42,4 fits inside it — the arrow lands above the last
  graduation but still on the plate. The refusal fires at 38, where the option genuinely aims off the
  frame, and at 35, where the *default* tail does. So the ceiling of 45 is set by the runner's own
  explicit `highest > Y_TOP` assertion, and this refusal is the second net, not the first. Both are
  kept: one says "your axis does not cover your readings", the other says "your option draws off the
  plate", and the mutation showed they are not the same sentence.
- **a tail that moves** — an option declaring a different origin for a key is refused in those
  words, because the format's pointer resolves on coordinates read once at init and the tail is
  where they are read.
- **an option that aims nothing** — every drawn arrow is named in every option (half the plate on
  one reading and half on another is not a state of anything), and at least one head must differ
  from the default's by more than a rounding: an option whose every head equals the default is the
  default under a second name.
- **two options that are the same picture** — two options whose whole head set agrees.
- **an option with no sentence, or with no figure on the plate** — the sentence is for the reader
  who is not looking, the figure for the one who is, and the figure must ride the head it describes.
- **the protected key** — the beat states which arrow its plate accents, and an option that fails to
  name it is refused: `directed-interaction.md` rule 5, and this control could otherwise leave the
  subject drawn at the default aim while the other fifteen swung away.
- **an accessible name that does not contain the visible one** — WCAG 2.5.3, checked rather than
  hoped for.

The mechanism is the shared one and nothing else: native `input[type=radio]` in a real `<fieldset>`,
plus CSS generated at build time (`:has()` + `:checked`). No script, no listener. With JavaScript off
the reader gets the complete default plate **and a working control**.

It emits `chart-stack-…` ids, `data-stack-note` and `data-stack-total`, which is not a copy-paste
slip: those three strings are the format's **discovery contract** for a control that moves the
picture, owes the reader a sentence and prints a figure on the plate (`interaction-plan.ts`, "a
moving or measuring control"; `verify-web.mjs`'s own exclusion list). `hold.ts` makes the same choice
for the same reason — a third grammar with its own spellings would be invisible to the guards written
to hold it. The third one was learned rather than remembered: this beat first spelled its figures
`data-aim-figure`, and `verify-web` failed all three directions on *"every argument-bearing word is
drawn unconditionally"* — correctly, because a figure belonging to an option nobody has chosen is not
a word the default view is missing, and the exclusion is keyed on the format's own spelling.

## Why the movement can be interpolated here, and how

The owner's fourth arbitrage: a state change lerps rather than jumps, and `display` does not
transition — what transitions is a property on an element that is **always rendered**. A shear
cannot (`floor.ts` says so: every step moves by a different amount, so each state is a different set
of paths). A re-aim can, and exactly:

- the shaft is a unit segment at the tail, placed by `translate(tail) rotate(θ) scale(L, 1)`;
- the head is a triangle placed by `translate(tail) rotate(θ) translate(L, 0)`.

Both transform lists interpolate componentwise, and both resolve the arrow's tip to
`tail + L·(cos θ, sin θ)` with the **same** θ and the same L at every frame of the transition — so
the head stays welded to the end of the shaft through the whole 420 ms instead of drifting off it,
which is what a chord-interpolated head over an arc-interpolated shaft would have done.
`transform-origin: 0 0` is stated explicitly on both: an SVG element's initial origin is the *centre
of the viewBox*, not its origin, and left alone every arrow would have rotated about the middle of
the plate (`hold.ts` records the same trap for a scale).

## Nothing on this page moves without a reason the reader can see

The owner's first arbitrage, and this composition is built around it rather than excused to it:

- **No text ever moves.** The five drawn country names sit at their **tails**, which no option
  touches. The static sibling's rule is the opposite — *"label the later state only, the ring carries
  nothing"* — and it is knowingly not kept here, with a reason: on that plate the later state is the
  only fixed thing about an entity, and on this one it is the only thing that is *not*. The tail is
  the invariant; a name that stayed on the head would be the one element on the page moving under
  every option.
- The per-option **figure** does not move either: each of the four is a separate span at its own
  option's head position, and the stylesheet reveals one. They appear and disappear; none travels.
- What does move is the arrows, under a control whose pills say which of their two components is
  being shown. That is the reason, and it is the picture itself.

## What the static sibling's rules are kept, and the one that is not

- **Hollow ring for the earlier state.** Kept, and it now carries more than it did: the ring is the
  fixed end, so it is also the answering mark and the anchor for the name.
- **A single accent for the subject, the other fifteen in a tint of it.** Kept — see `PALETTE.md`.
- **The link is curved and plainly not the shortest path**, so a straight segment cannot be read as
  interpolation between two dates the file does not hold. **Not kept, and this is the one departure
  that costs something.** The bow is refused here because the shaft's *angle* is the reader's own
  instrument under this control — it is what says "right and down" versus "right only" — and a bow
  gives one arrow two angles, so two options would differ by an amount the eye cannot attribute to
  the data. The disc at the later end becomes an **arrowhead** for the same reason: a disc says where,
  and this page has to say which way. What the bow was protecting is carried in words instead: the
  caveat states that the file holds two dates and nothing between them, and the pointer's answer
  names both of them explicitly.

## Treatments

The arbiter offers `accent-marks-the-thread`, `the-subject-is-ringed-not-recoloured` and
`value-on-the-mark` on this beat's facts. Two are spent, one is refused with its reason.

- `the-connector-is-either-furniture-or-the-mark` — here the connector **is** the mark, so it is
  drawn in ink weight with a head, it is what the pointer lights, and it is what the control aims.
- `accent-marks-the-thread` — **spent.** The accent marks the subject and keeps marking it in all
  four states; `aim.ts` refuses an option that does not name it.
- `value-on-the-mark` — **spent, once per state.** The figure rides the subject's own head under the
  reading that state shows, and each of the four is a different number: `+4,2 chez elle, −11,8 en
  Europe`, then `+4,2 points chez elle`, then `−11,8 points de poids européen`, then `+4,0 points, à
  total figé`.
- `the-subject-is-ringed-not-recoloured` — **refused, and the reason is the encoding channel it is
  written to protect.** Its own text is "so it keeps its category" and "emphasis costs no encoding
  channel". Here there IS no category to keep: every mark is one country, sixteen of sixteen, and
  colour encodes nothing at all before the accent is spent — which is exactly the case the static
  sibling's `PALETTE.md` argues, since sixteen hues are not a palette this base owns. And the ring is
  already taken: it is this type's own convention for the *earlier state*, so ringing the subject
  would mean drawing the mark that says "2000" around a mark that means "France". The subject is
  recoloured, and the ring goes on keeping time.
- `context-in-neutral-at-the-subject-scale` — the other fifteen in one measured tint of the same
  accent, never fifteen hues.

## The type sheet's trap, and what it turned out to be here

`types/connected-scatter.md` names one failure: *the path's order gets taken from whatever order the
source rows happen to arrive in, rather than from the actual time key* — and because a scatter's axes
do not encode "which came first", a mis-ordered path is fluent-looking and completely wrong.

Its literal form is absent: this file holds two dates per country, so there is no ordering to get
wrong. **Its reason is wide open, and one turn further than the sheet states it.** With two dates the
*direction* of every arrow is the entire content of the mark, and this page hands the reader a control
that re-aims it — so an option that swapped a head for a tail, or that aimed at a point the plate
never drew, would produce sixteen fluent arrows pointing at a story nobody measured, with nothing on
the chart to flag it. That is the sheet's trap wearing this format's clothes, and it is why the tail
is refused as mutable, why every head is checked against the frame, and why the length and the angle
are **derived from the two declared points** instead of being typed beside them.

## The hard-coded `lineHeight`

This beat is not on `KNOWN-STATE.md`'s list of ten, and it carries none: `grep -n lineHeight` over
the component returns nothing, and every text style spreads a register and adds nothing to it.
Checked rather than assumed.

## One number that had to come out of the words, and it came out of the plot first

At 375 px the first form of this beat's title — twenty words — set `nocturne`'s header to **486 px on
its own**. The plot was already pressed onto its 120 px floor, so the figure came to 878 px in an
812 px window and `verify-web` failed the window fit and the source line on that direction alone.
The words a beat spends on its title are height it takes out of its plot at the narrowest frame,
which is the one place the plot cannot give any back. The title is now the static sibling's own —
seven words — and the three pages fit with 75 px to spare.

## What 375 px looks like, named rather than hidden

The three pages fit the window at 375 x 812 and every check passes there, but the plate is not good
at that width and the brief says so instead of showing a laptop capture. The plot comes to
283 x 154 px, and inside it the five drawn names and the subject's figure are FIXED CSS sizes while
the geometry has shrunk to a third: *France : −11,8 points de poids européen* runs across the Suède
and Belgique labels, and *Autriche* sits on the x-axis title's line. The de-collision above keeps the
one pair that would print on top of each other at every width apart; it does not keep six fixed-size
words inside a plot a third of the size.

The right instrument is the one `proof/webx-electricity-mix` and the treemap beat already use — a
size container per label, asking the graphic in the reader's own pixels whether it can hold a line,
and degrading to the pointer where it cannot. It is not built here, deliberately: the owner's
standing instruction is desktop first and mobile once the desktop is validated, and this beat has not
had that read yet. What is built is the half that could not be retro-fitted — every name and every
figure already carries its own key and its own place, so a container rule drops one without moving
any other.

## Verification

- `verify-web.mjs`: **creme 105 passed / 0 failed / 6 skipped, nocturne 99 / 0 / 5, rapport
  99 / 0 / 5.** The skipped are the filter checks and the filter control's own affordance, which
  this beat has no filter for.
- Driven in a real browser at 1440x900, every pill clicked, **with the script on and with it off**.
  The two runs are identical, which is the whole claim the mechanism makes — and the numbers are the
  brief's own table, read back off the rendered transforms rather than off the declaration:

  | state | arrows pointing right | up | down | figure printed | sentence revealed |
  | --- | ---: | ---: | ---: | --- | --- |
  | Le trajet | 16 | 11 | 5 | +4,2 chez elle, −11,8 en Europe | none — it is the claim |
  | Chez eux | 16 | 0 | 0 | +4,2 points chez elle | the horizontal leg |
  | En Europe | 0 | 11 | 5 | −11,8 points de poids européen | the vertical leg |
  | Total figé | 16 | 16 | 0 | +4,0 points, à total figé | the counterfactual |

- Hover exercised in all three directions on Germany's ring: the arrow's shaft AND its head take the
  sought colour together (creme `#7892b5` to `#667c9a`), no neighbouring arrow moves, and the answer
  is `Allemagne · 2000 : 36,0 % de son mix, 16,29 % du bas-carbone des seize, 205,0 TWh · 2024 :
  58,6 %, 14,48 %, 290,9 TWh · production +42 % contre +59,6 % pour les seize · à total européen figé
  elle pèserait 23,11 %` — six readings, none of them on either axis.
- `bun test skills/chart-web/test skills/splash/test/web-interaction-changes-the-picture.test.ts
  skills/splash/test/no-cross-skill-imports.test.ts
  skills/splash/test/filter-vocabulary-parity.test.ts` — **410 pass, 1 fail**, the one being
  `chart-web — the canon's assets … preview.png is a current render of the seed`, a stale committed
  render of a seed this beat does not touch. And
  `bun test skills/splash/test/{a-directed-plate-names-no-colour-of-its-own,a-directed-layout-types-no-leading,a-leading-is-read-only-through-the-register,filters-are-declared-or-absent,number-format-honest,notes}.test.ts`
  — **310 pass, 0 fail**.

### Mutations

1. **The vertical ceiling lowered under the counterfactual's own reading.** At 40 it went **green**,
   and that is a finding about the frame rather than about the guard — see the refusal above. At 38
   and at 35 it is refused in all three directions, the runner exits 1, and each refused direction's
   previous render is now taken off the disk rather than left to be mistaken for this one.
2. **The answering layer cut back to the tails alone.** Refused in all three directions:
   *"AUT stands at (707.04, 427.51) in one of its states and no anchor covers it."* Austria's
   European weight moves 0,08 of a point, so the state that would have gone unanswerable is the one
   whose whole reading is that it barely moved.
3. **`aimCss` dropped from the beat's stylesheet — and this one went GREEN.** Five lines removed;
   `assertAimDeclaration` silent, `renderWeb` silent, `assertInteractionPlan` silent, and all **105**
   of `verify-web.mjs`'s checks passing in three directions. What shipped was sixteen arrows
   collapsed to one-unit stubs in the corner of the viewBox — an SVG element with no transform is
   drawn where its own coordinates put it, and every coordinate this vocabulary owns lives in the
   stylesheet — with all four states' figures printed on top of each other. This is `descend.ts`'s
   own recorded hole arriving at a second vocabulary, and the fix is the same: a vocabulary a beat
   brings with it has to check its own rules. `assertOneAim` now reads the WRITTEN PAGE and requires
   the `transform-origin` pair, the figure and note blankets, a placement rule per arrow, and a
   placement rule per arrow per option. Re-run, the mutation is refused in all three directions and
   the runner exits 1.
4. **An option aimed exactly where the default plate points.** Refused at the declaration: *"that is
   the untouched view under a second name, which this format refuses at the render."*

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2000 and
2024. `data.csv` is a byte-for-byte copy of
`proof/static-connected-scatter-lowcarbon/data.csv`. Low-carbon is the sum of the file's own six
low-carbon columns; a country's own mix is that sum over all nine generation columns; the European
weight is that sum over the sixteen countries' total in the same year.

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
    "the-path-drawn-order-matches-the": null,
    "the-beat-refuses-to-render-if": null,
    "each-option-decomposition-is-derived-from": null,
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
      "gesture": "toggle-a-comparison",
      "input": "tap"
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
