# rank-is-printed-on-the-entry

- kind: imported
- name: An entry's position travels with the entry, not only with its slot
- applies: the beat is a ranking with two or more states
- draws: value
- priority: 8
- evidence: projects-propublica-org-graphics-ncaa-bracket-2017
- evidence: espn-com-espn-feature-story-id-23519390-espn-world-fame-100-2018
- detect: every entry mark in the delivered artifact has a text run carrying its rank inside its own
  bounding box, or within one line-height of its label

## The rule

Print the ordinal with the entity, not only down the side of the plate.

## The evidence — two publications, two opposite stylings

**ProPublica**, the NCAA bracket: 63 runs of `graphik | 10 | 400` in `rgb(119, 119, 119)`, each the
school's seed set immediately before its name, against 132 runs of `graphik | 12 | 400` for the names
themselves. Two points down and grey.

**ESPN**, World Fame 100: the rank as a display-scale numeral in the accent, laid on the lower edge
of each entry's portrait. `#F0B74B` at 0.296 % of that crop is the numeral, corroborated by the style
route's mark `fill rgb(240, 183, 75)`.

**What is common is not the styling.** It is that the ordinal is attached to the ENTITY. A reader who
finds a school in round three, or arrives forty cards down a scroll, still has the number.
ProPublica's whole finding — a 12 seed reaching the final — is unreadable without it.

## What it replaces

A rank axis down the left edge and nothing else. The axis is correct and it is a lookup: the reader
carries a position across the plot to a column of numerals and reads back. Where the entity moves —
which is the whole subject of a ranking over time — the lookup has to be done twice.

## What limits it

**It is not the small-quiet-prefix.** ProPublica's grey ten-point seed is one publication's styling;
ESPN's gold display numeral is the other's, and they agree on nothing except attachment. A renderer
that copied ProPublica's size and colour would be copying a habit, which is what the evidence floor
exists to stop.

**And it costs room.** An ordinal in front of every name widens the label band at both edges. On a
plot with names at one edge only it is cheap; on one with names at both it is paid twice.
