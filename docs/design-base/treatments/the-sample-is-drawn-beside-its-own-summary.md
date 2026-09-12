# the-sample-is-drawn-beside-its-own-summary

- kind: imported
- name: The readings a summary stands for are drawn on the same axis as the summary
- applies: the beat carries the observations behind its summaries and no summary holds more than
  forty of them
- draws: value
- priority: 8
- evidence: nature-com-articles-nmeth-2813-figures-1
- evidence: nsidc-org-sea-ice-today-sea-ice-tools-charctic-interactive-sea-ice-gra
- detect: the delivered artifact carries one mark per reading, positioned on the same value scale as
  the summary it belongs to

## The rule

Draw the sample. A box is a claim about readings the reader cannot see; the readings cost one row.

## Why this one matters more than most

`references/types/boxplot.md` names the failure outright: **a box built from five points draws the
same confident rectangle as one built from five thousand.** Nature answers it by drawing the
twenty-point sample as open circles above the box, on the same axis, and printing `Sample, n = 20`
over them. NSIDC answers it by drawing every individual year over its own median and bands. Two
publications, one answer: show both.

On the beat this was filed from, it is not decoration but the difference between an honest plate and
a misleading one — seven decades of ten annual readings and one decade of **five**, because 2020–24
is a partial decade. The boxes are the same width and the same shape. The dots are not.

## What limits it

Past a few dozen readings per summary the dots stop being individuals and become a smear, so the
predicate caps it — forty, against Nature's twenty. Beyond that the honest move is a different form
(a strip, a density, a beeswarm), not a denser scatter of the same dots.
