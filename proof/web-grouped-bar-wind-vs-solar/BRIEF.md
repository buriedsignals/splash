---
format: web
type: grouped-bar
medium: chart
grounding: supported
derived: v1
---

# Beat — La Suisse est la seule des six où le solaire dépasse l'éolien (web)

**Type:** grouped bar. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Wind and solar as shares of each country's own 2024 electricity. In five of six countries wind is the
taller column; **Switzerland is the exception — solar 7,2 % against wind 0,2 %.** The beat throws if
the number of countries where solar beats wind is not exactly one.

Same claim as `proof/static-wind-vs-solar`, same frozen file, byte for byte.

## THE INTERACTION, WRITTEN BEFORE THE CODE

### What the still does, and what this page takes away from it

The static plate **points**. It draws a callout with a leader line onto Switzerland's pair —
« Suisse : solaire 7,2 % > éolien 0,2 % » — and hands the reader the answer. The reader's own eye
never has to leave that one group.

**This page deletes the callout.** What replaces it is not a tooltip on the same picture: it is a
yardstick the reader parks wherever they like. A grouped bar's whole device is the group boundary,
and the boundary is what makes the *within-group* comparison easy and the *across-group* comparison
hard — the six wind columns are separated by six solar columns and vice versa. The still can only
assert that Switzerland is the odd one out. This page lets a reader lay any country's own two levels
flat across the other five and read the across-group comparison the boundary was built to discourage.

The finding that comes out of it, and the still has no way to draw it: **Switzerland's reversal is a
wind story, not a solar story.** Its solar is third of six, ahead of France, Sweden and Norway. Its
wind is last of six, and last by a factor of forty against the next-lowest. The plate shows the
reversal; only the yardstick shows which half of the pair causes it.

### Control 1 — « Mesurer les six à l'aune de »

- **The reader's question.** « La Suisse bascule — mais est-ce que son solaire est grand, ou son
  éolien absent ? Et ce pays-ci, où se situe-t-il face aux cinq autres ? »
- **The gesture.** `toggle-a-comparison` — native radios, one per country, plus « Chaque pays pour
  lui-même » which is checked on load and IS the plate.
- **What changes in the picture.** Two rules cross the entire plot, one at the chosen country's own
  wind share and one at its own solar share, each drawn in that series' own ink and carrying its own
  figure. The chosen country's two columns keep their series inks; the other five step back to the
  neutral. Its name goes to full ink. One sentence appears under the control with that country's
  rank on each of the two series and what its solar is worth against its own wind — three derived
  readings, none of them printed anywhere on the plate.

### Control 2 — « Demander à un groupe »

- **The reader's question.** « 7,2 % de quoi ? Combien de TWh y a-t-il derrière ces deux barres, et
  sur quelle production totale ? »
- **The gesture.** `ask-a-mark` — hover, tap or keyboard focus on any of the six groups.
- **What changes in the picture.** The group answers with the TWh behind each of its two shares and
  the country's total generation for the year — the quantities the percentage divided away, which no
  axis on this plate carries.

The two controls answer on two channels and they do not duplicate each other: the yardstick answers
**where a country sits among the six**, the ask answers **what one country's two bars are made of**.
`directed-interaction.md` says that in full: two controls may produce overlapping states, and the
sibling rule that refuses a repeated state does not transfer to this format.

### What this page earns

Carried into the render as `interaction.earns`, so the prose and the markup cannot drift:

> Un fixe peut désigner la Suisse et affirmer qu'elle est la seule à basculer ; cette page laisse le
> lecteur poser les deux niveaux suisses en travers des cinq autres pays et voir que son solaire est
> 3ᵉ des six pendant que son éolien est dernier — la moitié de la démonstration qu'un fixe n'a aucun
> moyen de dessiner.

### The controls that were NOT shipped, and the measurement behind each

- **A year toggle (2015 ↔ 2024).** The frozen file carries both years and the still spends only
  2024. Measured: in 2015 Switzerland is also the only reversal (solar 1,12 TWh against wind
  0,11 TWh), so every option answers the same. It would be a second picture of the same sentence,
  and `directed-interaction.md`'s repertoire is explicit that a gesture is reached for because a
  claim needs it. Not shipped.
- **A filter on the two series** (« l'éolien seul · le solaire seul »). It reads well and it is the
  wrong gesture: the repertoire's condition for a filter is that the part be ORTHOGONAL to the
  encoded variable, "so narrowing can never hide the claim". Here the series IS the encoded
  variable — colour carries it — so an option would take away half of the comparison the claim
  makes. Refused on the reference's own condition, not on taste.
- **Sorting the six countries.** It costs a script (the repertoire says so), and this format's
  no-JavaScript promise is the whole reason the yardstick is radios and generated CSS.

## Treatments spent, and one WITHDRAWN

- `the-group-boundary-is-drawn` — the two bars of one country sit tight against each other and the
  next country starts after a gap wider than the bars themselves. Without that a grouped bar reads as
  one long row of alternating colours and the grouping, which is the whole device, disappears.
- `the-subject-is-ringed-not-recoloured` — **newly spent, and it is a correction.** Switzerland's
  name used to be printed in `var(--accent)`, which on this page is one of the two SERIES inks. The
  treatment's own sentence is "recolouring spends a channel that is already carrying something", and
  here the channel was already carrying wind. The subject now takes full ink and weight; no hue.
- ~~`two-states-of-one-measure-are-one-hue-at-two-chromas`~~ — **withdrawn.** It was claimed on a
  precondition this data does not meet: wind and solar are not two states of one measure, they are
  two generation technologies, i.e. two categories. The treatment's own imported source says "two
  states of one measure should not read as two categories" — and the converse is what this page was
  doing. See `PALETTE.md` for what the page ships instead and what it measures.

## What the web adds

Two things a still cannot do, and they are the two controls above. Everything the still prints is
still printed: the title, the caveat, both series' figures on every bar, the legend, the axis, the
source line. Nothing argument-bearing sits behind a control.

## Verification

`verify-web.mjs --file renders/<direction>.html`, plus a driven pass that clicks every option with a
real pointer in all three directions and repeats it with JavaScript disabled. Numbers in
`.superpowers/sdd/2026-09-12-sp1-map-plan-contract/web-grouped-report.md`.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of `proof/static-wind-vs-solar/data.csv`.

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
    "one-shared-value-scale-from-zero": null,
    "the-beat-throws-if-the-number": null,
    "everything-the-still-printed-is-still": null,
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
