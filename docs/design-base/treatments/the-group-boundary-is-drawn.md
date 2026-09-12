# the-group-boundary-is-drawn

- kind: imported
- name: The boundary between groups is stated with a mark, not with gap width alone
- applies: the beat draws two or more groups of two or more bars
- draws: axis
- priority: 4
- evidence: 100-datavizproject-com-data-type-viz84
- evidence: iea-org-data-and-statistics-charts-iea-total-oil-stocks-may-2026
- evidence: pewresearch-org-chart-self-reported-voting-patterns-in-2024-election-v
- detect: between each pair of adjacent groups the artifact carries a rule, or the baseline carries a
  tick, at the boundary coordinate

## The rule

State the group boundary with a mark. Whitespace alone is a measurement.

## Why it is not fussiness

With two or three bars to a group, gap width alone does not distinguish *two groups of two* from
*one group of four*: the reader has to measure two gaps and compare them. A mark removes the
measurement.

## Three publications, three different marks

- **Ferdio**, `viz84`: a **full-height hairline** between the two states.
- **IEA**: short verticals ticking the **baseline rule** at each boundary, so the axis states the
  grouping rather than a separate layer doing it.
- **Pew**: a **2 × 116 px rule** between strips — and there it does double duty, because the fourth
  series (`Another candidate`, values 1–2) has no bars at all: at 0.69 px per unit those bars would
  be a hairline, so the desk draws the rule where the bars would be and sets the numbers beside it.
  **A series whose values round to nothing is admitted as text against a rule rather than faked as
  geometry.**

What the three share is the statement, not the device. Any of the three satisfies the detect.

## What limits it

**A single group has no boundary**, and a beat with one bar per group is not grouped — the predicate
asks for both.

**And on a dense plate the mark competes with the bars.** Ferdio's full-height hairline works at six
groups; at forty it would be a second grid. The IEA's baseline tick is the cheaper device and is the
one to reach for as the group count rises.
