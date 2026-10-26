# Gesture grammar — the staging a beat composes

Plan: `docs/plans/2026-10-26-1646-feat-pi-harness-gesture-grammar-plan.md`. Research behind every table here:
`research/families.md` (families, interfaces, matrix, map constraints), `research/repo-research.md` (the bar kits in
depth), `research/kits-*.md` (per-type detail), `research/prohibitions.txt` (the type sheets' `no-…` ids).

**Authority.** Tom's logic and the Splash doctrine outrank this file: the repertoire is
`skills/chart-video/references/directed-type-choreography.md` ("The repertoire"), and ruling R-D
(`docs/editorial-chain.md`) says the choreography is authored per subject — "the chain supplies the frame, never the
content". This file is the frame. The beat composes; code checks.

## 1. What the 12B does, and what code does

- The 12B writes `gestures` in `beat.mjs`: an ordered list, in the order the story tells it.
- Code lists the gestures admissible for the beat's family and format, one line each (§3), and never proposes a
  sequence. A default sequence per family would be R-D's clone factory, and the owner rejected
  "reveal, name, pull back" staging on 2026-09-14 (`directed-type-choreography.md`, "What the owner rejected").
- Code resolves every mark on the rows the beat draws, derives every figure, checks every note's number against
  its figure, checks that every gesture serves the confirmed takeaway, and refuses conflicts. A refusal names the
  `beat.mjs` field to change and a value that works (§7).
- The family adapter says where marks are; the format scheduler says when each gesture's state shows (§5).

## 2. Declaration

```js
gestures: [
  { do: "highlight", mark: "Lisboa" },
  { do: "bracket", mark: "Lisboa", of: "whole", note: "214 of 394 million" },
  { do: "compare", marks: ["Lisboa", "Porto"], note: "more than twice Porto's 96 million" },
]
```

| field | meaning | used by |
|---|---|---|
| `do` | the gesture's name, from §3 | all |
| `mark` | one drawn row, by the name the rows carry | highlight, name, annotate, zoom (onto one mark) |
| `marks` | several drawn rows, in order | compare (exactly two: the subject first), bracket (a run of rows), filter, count |
| `of` | what a bracket or compare measures against: `"whole"` (the beat's total) or a list of rows | bracket, compare |
| `value` | a number (a reference line's level, a rescale's new top) or an order (`"descending"`, `"ascending"`) | reference, rescale, reorder |
| `note` | the words drawn with the gesture; every number in it is checked against the gesture's derived figure | bracket, compare, count, name, annotate, reference, zoom (its printed factor) |

Rules every list obeys:
- Order is story order. Formats keep it: the static plate draws all states at once, but where two gestures need
  the same place (two notes on one mark), the earlier one wins and the later one is refused (§7, conflicts).
- Marks are row names exactly as the drawn rows hold them (a translated name, a per-resident rate's row) — never
  a data column's raw name when the beat draws a renamed row.
- Words go in `note`; there is no free-floating text gesture.

## 3. Vocabulary

The doctrine repertoire (10) plus the static gestures (4). The one-line meanings are the text the 12B is shown.

| `do` | meaning shown to the 12B | source |
|---|---|---|
| `reveal` | marks appear one by one in their natural order (rank or time) | doctrine: reveal in order |
| `filter` | the rows the claim is about keep their ink; the others step back, nothing moves | doctrine: filter |
| `zoom` | the value scale enlarges onto a few rows to show what the overview cannot; the factor is printed | doctrine: zoom / focus |
| `reorder` | the same rows move into the order that answers the question | doctrine: reorder |
| `rescale` | the value axis travels to a new top, the marks glide with it — never between two shots being compared | doctrine: rescale |
| `count` | a figure climbs as the rows it counts appear; the note states where it ends | doctrine: count up |
| `compare` | two rows set side by side: a copy of the second's length laid against the first, the note states the gap or ratio | doctrine: compare |
| `trace` | a line or path draws itself in the order of its data | doctrine: trace |
| `name` | one row is ringed and labelled with its value | doctrine: name |
| `pull-back` | the frame returns to the whole chart, with what was shown still marked | doctrine: pull back |
| `highlight` | one row takes the accent colour; the others stay neutral | static gesture (treatment `accent-marks-the-thread`) |
| `bracket` | a bracket spans a run of rows (or one row against the whole) and prints their sum or share | static gesture (`the-set-a-claim-adds-up-is-drawn-as-a-set`) |
| `reference` | a rule at a stated value, named in its note | static gesture (reference line) |
| `annotate` | a short note written directly beside one row | static gesture (`value-on-the-mark`) |

**Candidates for Tom, not implemented** (each seen in several families, `research/families.md` §3): `morph` (one
encoding becomes another), `detach` (a part slides to a common baseline), `ghost` (an earlier state stays faint),
`gather` (units collect into an aggregate), `split` (a whole opens into its parts along seams).

## 4. Families

Eight geometric families; gestures are implemented once per family, not once per type. Detail and citations:
`research/families.md` §2.

| # | family | types | the mark | value as |
|---|---|---|---|---|
| F1 | Length | bar-and-column, grouped-bar, lollipop, bullet, diverging-bar, population-pyramid | rect or stem from a baseline | length on one value axis |
| F2 | Stack | stacked-bar, diverging-stacked-bar-likert, waterfall-bridge | segment `[from,to]` on a floating baseline | length; the whole is the sum |
| F3 | Position | dumbbell, slope, connected-scatter, scatter, dot-strip, beeswarm, box-plot | point(s) + optional link | position on a fitted axis |
| F4 | Time-series | line, area, streamgraph, bump, gantt | path, band or interval over time | y value, thickness, rank or row |
| F5 | Units → groups | histogram, pictogram | one mark per counted thing | count of marks |
| F6 | Part-to-whole | treemap, marimekko, pie-and-donut | tile or arc from a layout | area or angle share |
| F7 | Cell grid | heatmap-matrix, calendar-heatmap | cell | colour class |
| F8 | Geo | the 8 maps | fill, tile, point, band or field | class, area, width, count or level — never position |
| — | misfits | sankey; parallel-coordinates + radar ("profile"); small-multiples (a wrapper over an inner family) | own adapters | — |

### 4.1 Shared members (every family adapter)

| member | meaning |
|---|---|
| `resolve(name) → id` | fail-loud join from a story's word to a drawn row; every miss named with its closest row (as `iso3Of` in `_shared/countries.mjs`) |
| `anchor(id, state) → {x, y, bbox}` | where a word, ring or leader attaches, in frame px, in a given state |
| `emphasis(ids, role)` | roles `accent`, `ring`, `stepBack`, `hidden`; the family says which roles are legal |
| `derive(op, ids) → number` | `sum`, `diff`, `ratio`, `share`, `rank`, `count` (and `crossing` for F4) from the drawn rows |
| `states()`, `equal(a, b)` | a picture state as a flat record, and whether a gesture changed the picture |
| `invariants(state)` | the family's locks (§6), checked on every state |

### 4.2 Family-specific members

- **F1 Length** (phase 1): `valueAxis` from zero (diverging: a mid zero; pyramid: two zeros across a gutter — the
  data schema carries an optional sign so those extend it), `baselineOf(id)`, `order(keys)`, `window(domain)` (a zoom,
  factor printed), `copyOnto(id, target)`, `transpose(size)` (columns become rows when a name does not hold one line).
- **F2 Stack**: `segment(row, part)`, `partOrder` (locked), `whole(row)`, `anchorMode` (`zero | centre | running`),
  `detach(part)`, `conservation()`.
- **F3 Position**: `pos(id, state)`, `link(id)`, `stat(name)` (median, quartiles, floor, ceiling, mean),
  `packing`, `stateCount`.
- **F4 Time-series**: `xOf(t)` (linear), `playhead(t)`, `at(series, t)`, `crossing(a, b | level)` (solved, not
  seen), `rankAt(t)`, `interval(row, run)`; gaps refused.
- **F5 Units → groups**: `units()`, `partition(edges | cuts)` (fixed for the beat), `count(group)`, `layout`.
- **F6 Part-to-whole**: `cell(id[, sub])`, `share(id)`, `whole`, `relayout(subset)`, `remainder(ids)`,
  `moveConserving(ids, target)`.
- **F7 Cell grid**: `cell(row, col | date)`, `classOf(v)` (breaks fixed), `run(predicate)`, `reorderRows(minimal)`.
- **F8 Geo**: `seat(iso3, camera)` (only at a measured camera), `camera(name)`, `classLayer(classId)` (one layer
  per group moving together — membership known at plan time), `basemapMode`, `morph(geo → tiles)`. A map gesture
  compiles to a declaration (plan layers, state fields, cameras), never to a draw call (`research/families.md` §4).

## 5. Formats schedule states

One gesture list renders in any format; the format decides when each gesture's state shows.

| format | scheduling | fixed by the scheduler |
|---|---|---|
| static | every state composed on one plate; a temporal gesture (`reveal`, `count`, `pull-back`, `rescale`) draws its end state (a count's final figure, the whole chart) | title, standfirst, credit |
| web | the first gestures that can rest together form the resting state; each further gesture is one reader control; the page is complete with JS off (the resting state plus every control's note as text) | `ask-a-mark` on every mark |
| video | `establish` = title card and `reference` = the chart arriving on its scale are the scheduler's; the composed gestures fill `reveal`, `subject`, `conclusion` in order, so **a video takes exactly three gestures**; `conclusion` must show the whole chart (doctrine rule 9), so a `zoom` or `filter` there is refused naming `pull-back`; `hold` repeats `conclusion` | 6-event timing contract |
| scrolly | one card per gesture, continuously interpolated, then a closing card carrying the limits | the closing card |

## 6. Admissibility: gesture × family, and per-format conditions

Legend: ✓ available · ~ constrained · ✗ refused. Status per family: **F1 is phase 1** (implemented by U2–U7);
F2–F8 and misfits are **specified, not implemented** — `adapterFor` keeps their per-type kits.

| `do` | F1 Length | F2 Stack | F3 Position | F4 Time | F5 Units | F6 Part-whole | F7 Grid | F8 Geo |
|---|---|---|---|---|---|---|---|---|
| reveal | ✓ rank order | ✓ level order | ✓ | ✓ as a linear trace in t | ✓ | ✓ largest first | ✓ | ✓ classes or bands |
| filter | ✓ | ✓ rows | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ one layer per group |
| zoom | ✓ factor printed | ✓ detach + rescale | ✓ | ✓ window | ✗ | ~ relayout, not a zoom | ~ row height | ✓ camera, words only at a measured camera |
| reorder | ✓ (✗ pyramid) | rows ✓, parts ✗ | ✓ rows (✗ scatter) | ✗ | ✗ | ✗ | ~ heatmap rows | ✗ |
| rescale | ~ before a comparison only | ✓ | ✓ | ✓ | ✓ unit worth | ✓ | ✗ colour domain locked | ~ reclass, not an axis |
| count | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| compare | ✓ copy onto | ✓ copies | ✓ span copies | ✓ level rewind | ✓ | ✓ area-preserving | ✓ | ~ sidecar |
| trace | ✗ no path | ~ connectors | ✓ | ✓ | ✓ | ✓ | ✓ run outline | ✓ per sub-kind |
| name | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ measured camera only |
| pull-back | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| highlight | ✓ (grouped, pyramid: a series) | ~ name or total only | ~ ring, never recolour | ✓ | ✓ block head | ✓ (not the largest) | ~ | ~ ring |
| bracket | ✓ | ✓ | ✓ span | ✓ | ✓ | ✓ | ✓ | ~ sidecar |
| reference | ✓ | ✓ | ✓ | ✓ | ✓ bin edge | ~ | → cutoff | → class floor |
| annotate | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ measured words only |

### 6.1 Per-format conditions, F1 Length (bar-and-column in phase 1)

One definition per gesture; the condition below is the format's real limit, not a worked example's.

| `do` | static | web | video | scrolly |
|---|---|---|---|---|
| reveal | end state only (all marks) | resting state | any event but `conclusion` | one card |
| filter | step back the others | a control: the others leave (`filter-to-a-subset`), the scale does not move | not in `conclusion` | one card |
| zoom | note prints the factor | a control (`zoom-and-pan`), factor printed | not in `conclusion` | one card, factor printed |
| reorder | the plate is drawn in that order | a control (`sort-or-reorder`) | any event | one card |
| rescale | refused once a `compare` or `bracket` precedes it (`no-float-baseline-rescale`) | same | same | same |
| count | prints its final figure | the note in the resting state | the figure climbs over the event | the figure climbs over the card |
| compare | copy-onto tick + note on the subject | a control (`toggle-a-comparison`) | any event | one card |
| trace | ✗ | ✗ | ✗ | ✗ |
| name | ring + label | resting state | any event | one card |
| pull-back | no-op on one plate (accepted, draws nothing new) | resting state | `conclusion` | the closing card follows it |
| highlight | accent on the mark | resting state | any event | one card |
| bracket | a run of ≥ 2 contiguous drawn rows, or one row `of: "whole"` | a control (`toggle-a-comparison`) | a run of ≥ 2 rows piled under the leader, or one row of the whole | a run of ≥ 2 rows (`stackCount ≥ 2`), or one row of the whole |
| reference | rule + note | resting state | any event | one card |
| annotate | note beside the mark | resting state | any event | one card |

Video takes exactly three gestures (§5). Web needs at least one gesture beyond the resting state, or the page is
refused as having no reading the static frame lacks.

## 7. Refusals

Every refusal names the field (`gestures[i].note`, `gestures[i].mark`, the list length) and a value that works.
Following the suggested values always ends on an accepted list and never revisits one (plan R7): a refusal never
suggests a value the next check would refuse, and the core proves it on the eval rows (U2's refusal-chain test).

| check | refused when | the refusal suggests |
|---|---|---|
| vocabulary | `do` is not in §3, or not available for the family and format (§6) | the admissible `do` values for this family and format |
| marks | a `mark`/`marks` name is not a drawn row | the closest drawn row |
| figures | a number in `note` differs from the gesture's derived figure at the note's precision | the derived figure, formatted as the note writes it |
| rank words | a note on one row calls it highest, lowest, second, third or fourth and the row does not rank so (English words for now) | dropping the word, and the row that does rank so |
| claim | a gesture touches neither the takeaway's entity, its comparison entity, nor one of its figures | the takeaway's entities (claim fields, else subject/comparison answers, else row names found in the takeaway text) |
| change | a gesture leaves the picture as it was (a highlight on the already-highlighted row) | dropping it |
| conflict | two gestures on one scale, two notes on one mark, a broken family invariant (§8) | the gesture to drop or move (the later one) |
| format | the list breaks a format condition (video: not three; `zoom` in `conclusion`) | the count to add or the gesture to drop, or `pull-back` |

## 8. Family invariants (the type sheets' `no-…` ids)

| invariant | ids | families |
|---|---|---|
| one scale for everything compared, every state | `no-float-baseline-rescale`, `no-give-series-different`, `no-move-shared-zero`, `no-move-shared-centre` | F1, F2, misfits |
| a zoom prints its factor | `no-let-camera-magnification`, `no-magnify-printing-factor` | F1 |
| colour domain fixed | `no-let-colour-scale` | F7, F8 |
| order of parts fixed | `no-change-segment-order`, `no-reorder-spokes-nicer`, `no-reorder-rails-mid`, `no-reorder-rows-claim` | F2, F7, misfits |
| zero, or not zero | `no-lift-surface-zero`, `no-lift-stems-zero` vs `no-anchor-value-axis`, `no-anchor-value-axis-zero` | F1/F4-stock vs F3/F4-value |
| area or angle conserved in motion | `no-move-cell-conserving`, `no-reshape-cell-conserving`, `no-change-arc-angle`, `no-re-anchor-redrawing` | F6, F2 |
| partition fixed | `no-change-bin-edge`, `no-re-bin-between` | F5, F8 |
| a position is data | `no-let-point-move`, `no-stack-chips-sideways`, `no-let-dot-change` | F3 |
| emphasis by ring, not recolour | `no-recolour-cases`, `no-recolour-subject-row`, `no-let-chip-colour`, `no-spend-accent-country` | F3 |

Full list with texts: `research/prohibitions.txt`.

## 9. Mapping to the existing vocabularies (F1, phase 1)

| `do` | static treatment (`shared/chart-beat/treatments.mjs`) | web atom (`interaction-plan.ts`) and module | video event | scrolly card |
|---|---|---|---|---|
| highlight | `accent-marks-the-thread` | resting state | reveal / subject | one card |
| name | `value-on-the-mark` (ring + label) | resting state, `ask-a-mark` | any | one card |
| annotate | `value-on-the-mark` | resting state | any | one card |
| bracket | `the-set-a-claim-adds-up-is-drawn-as-a-set` | `toggle-a-comparison`, `stack` | subject | one card |
| compare | `the-set-a-claim-adds-up-is-drawn-as-a-set` (the copy) | `toggle-a-comparison`, `level` | subject / conclusion | one card |
| reference | `zero-rule-painted-over-the-bars` (a rule over the bars) | resting state, `level` | any | one card |
| reorder | `order-is-chosen-from-the-answer` | `sort-or-reorder` | any | one card |
| filter | `context-in-neutral-at-the-subject-scale` | `filter-to-a-subset`, `filter` | not conclusion | one card |
| zoom | — (the factor note) | `zoom-and-pan` | not conclusion | one card |
| count | `every-bar-labelled-lets-the-axis-go` (final figure) | resting note | any | one card |
| reveal, rescale, pull-back | — (end state) | resting state | any; pull-back fits `conclusion` | one card |

Web gestures without a Length atom (`trace`) are refused for web, naming the static or video alternative.

## 10. Status

| family | adapter | static | web | video | scrolly |
|---|---|---|---|---|---|
| F1 Length — bar-and-column | U3 | U4 | U7 | U5 | U6 |
| F1 Length — other members | specified | per-type kit | per-type kit | per-type kit | per-type kit |
| F2–F8, misfits | specified | per-type kit | per-type kit | per-type kit | per-type kit |
