# zero-rule-painted-over-the-bars

- kind: imported
- name: The zero rule spans the plot and is painted after the bars
- applies: the beat's values fall on both sides of zero
- draws: axis
- priority: 6
- evidence: datawrapper-de-xfo0j
- evidence: statista-com-chart-15723-the-neat-seat-loss-gain-by-the-presidents-par
- evidence: ourworldindata-org-grapher-annual-change-forest-area
- detect: a rule exists at the zero coordinate, spans the full plot height, and no bar fill is
  painted over it

## The rule

Draw the line the bars grew from, across the whole plot, on top.

## Three publications, three weights

- **Datawrapper** draws a dark hairline the full height of the plot, over both its `#F3F3F3` row
  tracks and the bars.
- **Statista** draws a dark rule the full height of each of its two panels.
- **Our World in Data** draws a pale hairline and **nothing else** — no axis, no ticks, no
  gridlines. The zero rule is the only furniture on the plate.

In all three it is on top. A bar's fill never covers the line it grew from, which is what makes the
sign readable at the tip rather than inferred from which way the bar points.

## What limits it

**A beat with no negative value has no zero to rule.** The predicate asks the data, not the axis:
a scale that happens to include zero is not the same as a set of readings that straddle it.

**And the weight is the direction's.** Datawrapper's dark hairline and OWID's pale one are the same
decision at two strengths; nothing here says which, and the register system already decides how loud
furniture is on a given ground.
