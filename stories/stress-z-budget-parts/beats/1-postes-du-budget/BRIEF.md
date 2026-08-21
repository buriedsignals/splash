---
type: diverging-bar
reading: raw
---

# Beat — Le budget 2026 ne se partage pas

**Type:** diverging bar (horizontal bars, one per budget line, a shared zero inside the plot).
**Medium/format:** chart / web. **Size:** fluid — this format has no fixed pixel size, and
`STORYBOARD.md`'s slot deliberately carries no `size:` (ruling R2). **Language:** `fr`, the
article's own.

## The data, and the trap

`source/data.csv`, seven rows, sorted here by amount:

| poste | montant_meur | part_pct |
|---|---|---|
| Personnel | 412.5 | 38.1 |
| Investissement | 236.0 | 21.8 |
| Fonctionnement | 198.4 | 18.3 |
| Subventions | 151.9 | 14.0 |
| Divers | 101.3 | 9.4 |
| Dette | 88.2 | 8.1 |
| Recettes exceptionnelles | **−104.6** | **−9.7** |

The journalist asked for "un visuel qui montre le poids de chaque poste" — the sentence that asks
for a part-to-whole. **This table is not one.** One member is negative: a provision write-back
booked as negative expenditure, which the accounting nomenclature genuinely allows and which the
article states in its own words. The six expenditure lines sum to **1 188,3 M€**, which is
**109,7 %** of the 1 083,7 M€ budget they are lines of. The write-back of −104,6 M€ closes the gap.

`source/profile.json` records `part_pct` with `"sum": 100` — and that 100 is arithmetic, not
evidence. It is 100 only because −9,7 cancels the 9,7 points of overshoot. A reader told "the parts
sum to 100 %" has been told something true about a column and false about a budget.

## The decision, taken explicitly

**A part-to-whole treatment was refused, and this is the reasoning rather than a preference.**

- A **pie or donut** encodes each part as an angle. There is no angle for −104,6. The only two ways
  to draw it are to drop the row (the picture then asserts a 1 188,3 M€ budget, which is false) or
  to draw its magnitude (the picture then asserts that the write-back COSTS 104,6 M€, which is the
  opposite of the truth). The type's own sheet already refuses this table on a second ground:
  "If the parts don't sum to one meaningful whole … a pie is not just weak, it's making a claim —
  'these add up to something' — that the data doesn't support; use a bar." It also caps itself at
  five slices, and there are seven.
- A **treemap** encodes area. Same problem, no negative area, plus this table has no grouping to
  preserve, which is the only thing a treemap buys over a bar.
- A **stacked bar** encodes cumulative length. A negative segment either runs backwards over its
  neighbours or is dropped. Both lie about the total.
- A **waterfall** was the closest near-miss and is still wrong: its own sheet says not to reach for
  it "for part-to-whole of a single total, where the pieces are simultaneous shares rather than
  sequential changes." These seven lines are simultaneous. A bridge would assert an order and a
  causal sequence the budget does not have.

**A diverging bar is what is left, and it is not a consolation prize.** Its own sheet: "who gained
and who lost, and by how much, for a set of categories whose values are SIGNED." Every value is a
length from a shared zero, the sign is carried by direction, and the reader sees at a glance that
one line runs the other way. The total is *written*, in the caveat, rather than drawn — because it
is not the sum of what the reader sees, and drawing it would smuggle back the whole this table does
not make.

**The accent is spent on the write-back**, not on the largest line. Six expenditure bars take the
furniture's own `muted`, derived from the ground; `Recettes exceptionnelles` takes `#D4A853` on a
tinted row. Direction and colour say the same thing here, which is the one case where a second
encoding costs nothing — and the row it picks out is the row the takeaway is about.

## The framing, measured before anything was drawn

`render-web.mjs` calls `framingMeasurement` (`chart-beat/references/static-discipline.md`,
`framing-serves-the-point`) before any geometry is chosen. Printed verbatim by this beat's own
render:

```
framing: amounts run -104.6 to 412.5 M€, median 151.9; spread against extent 125.4% (over 100%
because the minimum is negative — this ratio was defined for a non-negative series), largest against
median 2.72x. The plot's own domain is [-104.6, 412.5], zero inside it
```

The measure's own limit is stated rather than hidden: `spreadAgainstExtent` is `(max − min) / max`,
which cannot stay under 1 on a signed series, so the number it prints is not the fraction of the
plot the story occupies. The extremes beside it are what was actually read, and the domain is
`[−104.6, 412.5]` with zero inside — the honest framing for a length encoding, no truncated axis.

## The reading

**`reading: raw`.** The frozen table carries no denominator column — `poste` is a label,
`montant_meur` and `part_pct` are the same quantity in two units, and there is no population,
household or staff count anywhere in it. The beat draws `montant_meur` raw and hover adds
`part_pct`, which is the article's own second reading, not a quotient this beat computed.

## What the interaction adds

The printed frame gives each line's amount in millions of euros. Hover, tap and keyboard focus add
that line's **share of the primitive budget**, which the drawing has no room to print seven times.
Nothing argument-bearing is behind the interaction: the title, the caveat, the zero line and its
label, every bar, every name and every amount are drawn unconditionally. The generic accessible
table (`chart-web/scripts/render-web.mjs`'s `accessibleTable`) carries all seven readings linearly
for a reader with no spatial access to the picture.

**No filter.** The three-part test in `chart-web/SKILL.md` fails at the first clause: seven budget
lines carry no dimension a reader would want to narrow, pick or isolate. A control here would be a
mechanism looking for a job.

## What was NOT drawn

The `part_pct` column is never drawn as geometry, only spoken in the tooltip and the accessible
table. Drawing it as a second bar family would put a second whole beside the first and ask the
reader to reconcile two encodings of one fact. The article's own total (1 083,7 M€) is stated in the
caveat and is not a mark on the chart.
