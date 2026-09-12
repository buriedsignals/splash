# a-radius-is-not-read-by-eye

- kind: imported
- name: Every spoke carries its own number, printed on the plate
- applies: the beat draws three or more spokes from a shared centre
- draws: value
- priority: 8
- evidence: blogarchive-statsbomb-com-articles-soccer-understanding-statsbomb-rada
- evidence: theanalyst-com-articles-introducing-opta-radars-compare-players
- detect: the delivered artifact carries a text run for every spoke's value, either inside the mark
  or along the spoke's own axis

## The rule

Print the number. A radar's radius is the hardest quantity on any chart to read — an area to the
eye, a length to the geometry, and the two disagree.

## Two publications, two answers

StatsBomb prints each spoke's own scale ALONG the spoke, in that spoke's real units: `0.57 0.52 0.48
0.44 …` down the xG axis, `3.9 3.7 3.4 …` down Shots. The radius is a percentile position and the
printed number is the per-90 quantity, so the spokes stay comparable in rank while staying honest
about being different units.

The Analyst writes the value INSIDE its own wedge — `92`, `80`, `89`, `78`, `66`, `19` — which
removes the ring-labelling problem entirely.

Different answers, one rule: **nobody in this family asks a reader to judge a radius against a
ring.**

## What it does not fix

Printing the number does not repair the axis-order problem `references/types/radar.md` calls this
type's structural weak point — a polygon's AREA is what the eye judges, and area moves with axis
order and count. That has to be an editorial decision, stated. Printed values make each axis
readable; they do not make the shape's size a measurement.
