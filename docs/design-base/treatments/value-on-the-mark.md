# value-on-the-mark

- name: The value is printed on the mark it belongs to
- applies: the series has few enough marks that every one can carry its own number without collision
- draws: value
- priority: 3
- evidence: 100-datavizproject-com-data-type-viz1
- evidence: informationisbeautiful-net-visualizations-billions-2
- detect: every data mark in the delivered artifact has a text run whose measured box lies inside it
  or within one line-height of its edge

## The rule

Print each mark's value on or immediately beside the mark, rather than requiring the reader to
travel to an axis and back. An axis answers "roughly how much" for a whole series; a printed value
answers "exactly how much" for one mark, and the two are different questions.

## Why it is more than a nicety

It repairs the specific weakness of whatever encoding it is applied to. A treemap's areas cannot be
compared across non-adjacent cells; a packed cluster loses precision to gestalt; a stacked column
hides its own segments' sizes. In every case the printed number gives back exactly what the encoding
traded away. **An encoding that trades accuracy for shape owes the reader the numbers it gave up.**

## Where it was seen

`viz1` (Ferdio) prints each segment's value in white inside the segment, and its column totals in
bold above. `$$$Billions` (Information is Beautiful) prints every cell's amount in its display
register, which is what makes a treemap of non-comparable quantities readable at all.

## What limits it

A dense series cannot carry a label per mark, and the arbiter must drop them rather than overlap
them. Above roughly two dozen marks this treatment stops applying and direct labelling of the
extremes takes over.
