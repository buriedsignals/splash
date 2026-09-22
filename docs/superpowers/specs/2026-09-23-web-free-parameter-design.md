# The free parameter — a choreography for the web export

**Status:** design, awaiting review
**Date:** 2026-09-23
**Owner's framing:** *"l'intérêt de faire un truc web interactif c'est d'avoir quelque chose qui va
plus loin que ce que peut produire du static, du scrolly ou de la vidéo. Donc c'est un truc qui se
fait en amont avec le journaliste mais qui, comme pour la chorégraphie pour le scrolly et la vidéo,
est un truc unique qui poussera la création des web à un niveau supérieur."*

---

## 1. What was measured

### 1.1 The three exports are not disciplined alike

| export | unit declared | mechanical rule |
| --- | --- | --- |
| video | **states**, one per event of the timing contract | `assertEventStates`: every state differs from the one before it, pairwise, across the whole sequence |
| scrolly | **states**, one per card | `assertStates`, `no-replay-static-plate` — same shape |
| web | **controls** — mechanisms drawn from a closed repertoire of ten gestures | one comparison, per control: the applied state differs from the default |

Video and scrolly choreograph a sequence of states the author owns, and the rule is *pairwise over
the whole sequence*. Web declares mechanisms, and the only comparison is control-by-control against
the landing view. Nothing asks whether a page's reachable states differ **from each other**.

### 1.2 The test that justifies the format does not discriminate

`shippedControls` accepts an `ask` control when its readings add a string the page does not already
print. Measured over the 30 web beats with a findable static sibling:

```
30 pairs of 30 → 100 % of readings are "beyond the still"
pages adding nothing                    → 0
```

Trivially true: a plate cannot print 639 readings, so any beat that puts a tooltip on its marks
clears the bar. What actually justifies the format is therefore `earns` — prose, validated at
"eight words or more" and nothing else.

### 1.3 What the catalogue spends

```
27 of 40 web beats declare an interaction plan · 13 declare none

25  ask-a-mark            2  ask-a-line
17  toggle-a-comparison   1  filter-to-a-subset
 8  find-your-own-case    1  zoom-and-pan
 7  open-the-full-table
never spent: sort-or-reorder, brush-a-range
```

### 1.4 And the discipline already exists, unwritten, 27 times out of 27

Every one of the 27 authored `earns` makes the same move, in the author's own words:

> `histogram`   — « Un fixe doit choisir une largeur de palier et le lecteur n'a qu'à la croire. »
> `scatter`     — « Un fixe peut tracer le seuil de l'auteur… il ne peut pas laisser le lecteur se placer ailleurs. »
> `line`        — « Une plaque n'a la place que d'une règle ; cette page rend la règle au lecteur. »
> `area`        — « Une plaque ne peut couper la surface qu'une fois, à l'année de l'auteur. »
> `pictogram`   — « Un still doit choisir ce que vaut un carré et demander qu'on lui fasse confiance. »
> `hex-grid`    — « Une planche fixe doit choisir l'échelle… et demander qu'on lui fasse confiance. »
> `symbol`      — « …un paramètre libre que l'auteur a fixé en silence. »
> `contour`     — "A still, a video and a scrolly must each pick one contour interval and can only SAY that they did."
> `dot-density` — "All have exactly one dot value, because a dot value is baked into the drawing."
> `lollipop`    — « Le fixe fige les deux bouts choisis par l'auteur… ici le lecteur choisit le pays à l'aune duquel les cinq autres sont mesurés. »

And a second clause recurs just as reliably — what does **not** move while the choice does:

> « sur un terrain dont aucun carré ne bouge » · « sous une légende qui ne change pas » ·
> « sur les mêmes axes » · « sans qu'un seul chiffre change » ·
> "the two ends of every band stay exactly where they are" · "nothing added and nothing removed"

The catalogue invented its own discipline and nobody extracted it. That is why `earns` is prose: the
rule was always there, it was never named.

---

## 2. The rule

> A fixed frame is **forced to settle one parameter on the reader's behalf** — a threshold, a bin
> width, a scale exponent, a unit, a reference year, a pivot, a class rule, a weighting, a
> denominator, a camera remove, a dot value — to print it, and to ask to be trusted. A video and a
> scrolly settle the same parameter **and fix the order** in which the alternatives are seen, which
> is already somebody's argument. **The web export is the one that hands that parameter back to the
> reader**, over a plate that does not otherwise move.

The name is the corpus's own: **the free parameter**.

This constrains the *argument*, never the mechanism. The parameter is whatever this type's fixed
frame had to freeze, which is different for every type — which is why the owner's "ça peut être
tout" is right, and why the repertoire of ten gestures stays exactly as it is.

**`ask-a-mark` is the degenerate case and it is legitimate.** Its free parameter is *which mark is in
question*, and a plate settles it by printing some readings and not others. The histogram beat states
the test itself: *« un histogramme dit combien sont tombés là et refuse de dire QUI »*.

---

## 3. What a beat declares

The existing block is **extended, never replaced** — 27 beats already carry it, and `earns`,
`question`, `changes` are sentences that stay exactly where they are.

```js
const interaction = {
  earns: "…",                                   // unchanged — the beat's own paragraph
  controls: [
    {
      question: "…",                            // unchanged — the reader's own question
      gesture: "ask-a-mark",                    // unchanged — the closed repertoire
      changes: "…",                             // unchanged — what moves in the picture

      // ── new: the four atoms the prose already carries ──────────────────────────────────────
      parameter: "the year the surface is cut at",
      authorPicked: "1950",
      readerPicks: ["1850", "1950", "2005"] | "every mark",
      heldStill: [".x-axis", ".chart-total", ".chart-legend"],
    },
  ],
};
```

- **`parameter`** — the decision a fixed frame has to make and print. A noun phrase, the beat's own.
- **`authorPicked`** — the value the still, the video and the scrolly of *this same claim* had to fix.
  It must be one of `readerPicks`: a page that cannot be put back into its siblings' view no longer
  carries the claim at rest.
- **`readerPicks`** — the values the reader can put it at. For a `<fieldset>` control, the option
  keys, checked against the markup rather than believed. For `ask-a-mark`, the literal string
  `"every mark"`, which resolves to the page's own marks.
- **`heldStill`** — CSS selectors, not prose, because prose is what made this unverifiable. Every
  element these name must render **pixel-identical** at every value of the parameter. This is the
  clause the corpus writes every time and nothing has ever measured.

The BRIEF's `## Interaction` table gains the same columns, so the journalist meets them upstream:

```
| # | le paramètre libre | ce que le fixe a dû trancher | ce que le lecteur peut poser | ce qui ne bouge pas | la lecture qui revient |
```

---

## 4. The refusals

| id | refusal | where it fires | today |
| --- | --- | --- | --- |
| `R1` | a parameter offering fewer than two values | `verify-web.mjs` — a fieldset must carry ≥ 2 native radios | **exists** |
| `R2` | `authorPicked` is not among `readerPicks` | build time, `assertInteractionPlan` | new |
| `R3` | two controls naming the same `parameter` | build time, `assertInteractionPlan` | new |
| `R4` | choosing a value does not repaint the plot | `verify-web.mjs`, against the landing view | **exists** |
| `R5` | **two values paint the same picture** | `verify-web.mjs`, **pairwise over `readerPicks`** | **new — the discriminant** |
| `R6` | **something named in `heldStill` does not hold** | `verify-web.mjs`, per selector, per value, as a frame comparison | **new** |
| `R7` | `heldStill` is empty | build time — a choice with nothing held is two pictures, not two readings | new |
| `R8` | the reading is already printed at rest | build time, `shippedControls` | **exists**, kept, no longer load-bearing |
| `R9` | for `ask-a-mark`, two marks whose reading is identical | build time — the same pairwise rule, on the cheap axis | new |

`R5` is `assertEventStates` transposed. Video compares `state(i)` to `state(i-1)` across the
sequence; the web has no sequence, but it has the values of a parameter, and the comparison is
exactly as mechanical: `picture(v_i) ≠ picture(v_j)` for every pair. Measured today, the verifier
compares each option to the **landing view only** (`"repaints the drawing — N pixels differ from the
landing view"`), so two options that produce the same drawing both pass.

`R6` is the other half and it is new work in the same loop: the frames are already captured per
option; what is missing is a second, smaller clip per declared selector, required to be identical
rather than different.

---

## 5. Where a beat is made to answer

A beat is refused **at G3, on approve** — `writeOutputReview({ decision: "approve" })` — and nowhere
earlier. Rejected alternatives, and why:

- **at scaffold time**: nothing exists to check yet.
- **at render time**: an author would be unable to look at their own draft, which is how a
  discipline turns into a workaround.
- **by enrolling scaffolded beats in the L5 census**: the census (`derivedBeats`) walks this
  repository, and would turn CI red on every unfinished scratch beat under `proof/`. It also cannot
  see a journalist's story at all — those live in the install root.

G3 is where a beat becomes approvable, it is the gate the journalist already meets, and an
unfinished beat is not red — it is simply not yet approvable.

### 5.1 The enrolment gap this closes

A catalogue BRIEF opens with front matter — `format`, `type`, `medium`, `grounding`, `derived: v1` —
and that front matter is what puts it under the editorial chain: 161 of 163 beats, all 40 web ones.

**Corrected against the code while implementing (2026-09-23).** The first draft of this section said
no scaffold wrote any front matter. Six of the eight already wrote `format` and `type`. What was
actually true: **no scaffold wrote `medium`**, and the two WEB scaffolds wrote no front matter at all
— `chart-web`'s inline `const BRIEF` template and `map-web`'s `BRIEF.md.tmpl`. So it was the web
export, the one this work is about, that was invisible to the chain, and `medium` was missing
everywhere. A beat scaffolded in either web format received the empty table as a prompt and nothing
ever read it back.

All eight now write `format`, `type` and `medium` — the three known at scaffold time — and G3 reads
them. `grounding` is the analyst's answer and is not written by a scaffold; `derived: v1` marks a
beat migrated into the L5 census, which a fresh beat has not been.

---

## 6. Scope

**In:** `chart-web` and `map-web` — the declaration, the four atoms, the BRIEF columns, `R2`, `R3`,
`R5`, `R6`, `R7`, `R9`, the G3 refusal, and the front matter written by all eight scaffolds.

**Out, and deliberately:**

- The ten-gesture repertoire is unchanged. This constrains the argument, not the mechanism.
- No generator, no default parameter, no "suggested" free parameter. Ruling R-D: the choreography is
  authored, per subject. A checker that can say what a beat's parameter *should be* is the clone
  factory R-D exists to prevent.
- The 13 web beats declaring nothing are not migrated by this work. They are listed in §1.3 and owe a
  declaration; G3 will refuse them when they are next approved, which is the correct moment.
- Video, scrolly and static keep their own choreographies untouched, except for the front matter.

## 7. Open question for review

`heldStill` as selectors is the one place this design asks the author for something the corpus writes
as prose. The alternative — infer what is held from what does not move between two frames — was
rejected: it would report whatever happens to be stable as if it had been promised, which is the
same weakness as `R8`. Naming it is the point.
