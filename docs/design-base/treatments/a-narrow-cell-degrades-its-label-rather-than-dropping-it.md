# a-narrow-cell-degrades-its-label-rather-than-dropping-it

- kind: imported
- name: A cell too narrow for its label shrinks it, then moves it out — it does not go unlabelled
- applies: the beat draws two or more columns whose width carries a second quantity
- draws: annot, value
- priority: 6
- evidence: visualcapitalist-com-wp-content-uploads-2022-11-what-percentage-of-men
- evidence: 100-datavizproject-com-data-type-viz9
- evidence: reuters-com-graphics-usa-election-swing-states-myvmadqlzvr
- detect: every column in the delivered artifact carries its name, inside the column where it fits
  and outside it where it does not

## The rule

Nothing goes unlabelled. The label shrinks, and then it moves out.

## The two publications

Visual Capitalist scales the type with the cell: China's name and its two percentages are set
enormous, Myanmar's tiny on a bar a few pixels thick, and Nepal, Ghana, Côte d'Ivoire and Canada —
thinner still — keep a percentage inside and have their **name moved outside**, to the right, in
grey. Its outlier, Nauru, is a hairline bar the story is about, and it gets its name and its number
at the far left of the plate on a long leader running back to the bar. Ferdio bottom-aligns two-line
cell labels, which is what makes a narrow band labellable at all.

## What it corrects

`references/types/` tells a small cell to go unlabelled rather than clip. These two publications show
the third way, and it is better: the label degrades in stages, the reading order survives, and every
row stays identifiable. Dropping a label makes a row invisible; clipping one makes it wrong.

## Its own limit

Moving labels out costs margin, and past a handful of narrow cells the outside gutter becomes a
second chart of its own. That is the point where the IEA's negative case applies instead: bucket the
units before drawing.

## A third publication, and a third mechanism — 2026-09-09

Reuters adds the move for labels that collide with each other rather than with their own cell:
**"stagger colliding value labels onto a second baseline rather than rotating or dropping them."**
Three publications, three mechanisms — shrink, move out, stagger — and one rule: the label survives.
Rotating is refused by name.
