# every-bar-labelled-lets-the-axis-go

- kind: imported
- name: Where every bar carries its printed value, the value axis and its gridlines can go
- applies: the beat draws bars few enough for every one of them to carry a printed value
- draws: value
- priority: 6
- evidence: 100-datavizproject-com-data-type-viz25
- evidence: pewresearch-org-chart-self-reported-voting-patterns-in-2024-election-v
- detect: every bar in the delivered artifact has a text run carrying its value, AND the artifact
  carries no tick text and no gridline path along the value dimension

## The rule

The axis exists so a reader can estimate a length. Where nothing has to be estimated, it goes.

## The evidence

**Ferdio**, `viz25`: no axis, no ticks, no gridlines, not even a baseline rule. Six bars, six
numbers, and the labels sit *inside the feet of the bars* so they align into a row that does the
baseline's work. `viz84` and `viz99` do the same.

**Pew**: no axis and no gridline either, and all sixteen values printed.

## A licence, not an obligation, and the corpus is explicit about it

ONS keeps its axis and prints nothing on `dvc847` — fifteen categories against two series is too many
to label. And `dvc2203` does **both**: four groups, an axis, and every value printed. So the corpus
shows a clean one-directional rule and one desk that declines to choose, which is what makes this a
licence: labelling every bar *permits* dropping the axis, it does not require it.

## The counter-case that matters

Ferdio's `viz39`, the isometric plate, has neither an axis a reader can read against **nor** a
printed value anywhere. That is the state the rule forbids: one of the two has to be there.

## What limits it

**The bar count is the whole predicate.** Past the point where a label per mark collides, this
treatment stops applying and the axis is the only way a magnitude can be read. The floor it shares
with `value-on-the-mark` is measured against the filed evidence rather than chosen.

**And dropping the axis takes the unit with it.** Where the axis was the only place the unit was
stated, the beat's subtitle has to carry it, or the values do. A plate of bare numbers with no unit
anywhere is a worse failure than a redundant axis.

## Correction — the predicate was group-shaped and the evidence is not

Filed from the grouped-bar harvest, so it asked for two or more GROUPS. Ferdio's `viz25`, one of the
two publications under it, is **six bars and no groups at all**; Pew's is a set of strips. The first
ranking to come through the base — ten columns, ten printed values, no axis, no gridline — could not
claim a rule it plainly implements, and the rule was the reason it draws no axis.

It now reads the plate's BAR COUNT (`facts.barCount`), which a beat states with `bars` or which is
summed out of `groups` where it declares them, so every grouped beat answers exactly as before. A
line beat with 35 readings still gets neither this treatment nor `order-is-chosen-from-the-answer`,
because a reading is not a bar — the fix is a fact about bars, not a looser predicate.
