# the-key-prints-its-breaks-in-the-data-s-units

- kind: imported
- name: The key is binned and prints its break values in the data's own units
- applies: the beat draws twenty or more cells on a shared ramp
- draws: axis, annot
- priority: 6
- evidence: ons-gov-uk-peoplepopulationandcommunity-birthsdeathsandmarriages-liveb
- evidence: abc-net-au-news-2017-12-13-australias-most-and-least-popular-birthdays
- detect: the delivered artifact carries a binned key whose break values are printed in the unit the
  cells are measured in

## The rule

Bin the ramp and print the breaks. A reader who can invert the colour can read the grid.

## The two publications

ONS prints its break values in the data's own units — this base's record: *"stronger than a gradient
bar and costs one row of small type"*. ABC bins so the classes are **roughly equal in count**, so no
single step swamps the picture. Datawrapper reaches the same end from the other side, putting the key
in the subtitle when the ramp is one hue: direction, range, and where the exact numbers are, in three
clauses.

## Why a gradient bar is weaker

A continuous bar tells a reader the direction and nothing else: to name a cell's value they must
interpolate a colour by eye against a strip, which is the reading this form is worst at. Bins turn
that into a lookup with as many answers as there are classes.
