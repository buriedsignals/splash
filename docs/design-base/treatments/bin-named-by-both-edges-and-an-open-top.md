# bin-named-by-both-edges-and-an-open-top

- kind: imported
- name: Every bin carries both of its edges, and an unbounded tail is named as an inequality
- applies: the beat draws binned intervals of a continuous variable
- draws: axis
- priority: 4
- evidence: figure-nz-chart-9uo8rkrqhpwm7va4
- evidence: populationpyramid-net-world-2023
- detect: every bin's label names both of its edges in the variable's own unit, and where the beat
  declares its tail unbounded the last label is an inequality rather than a closed interval

## The rule

Name the interval at both ends. Refuse to close the top.

## The evidence

**Figure.NZ** — `$1-$10,000`, `$10,001-$20,000`, `$20,001-$30,000` … `$1m and over`. The `,001` is
the whole point: it states which side of $10,000 a reader earning exactly $10,000 falls on, without
a footnote and without the reader having to know a convention.

**PopulationPyramid.net** — `0-4`, `5-9`, `10-14` … `95-99`, and `100+`.

Two publications, two continents, two subjects, the same two decisions. They are independent by host
**and** by design authorship. `moneyhub.co.nz` shows the convention a third time and is **not**
counted: it re-publishes a Figure.NZ plate, wordmark and all, which is the host-is-not-the-author
failure two harvests met on the same day.

**And the corpus reaches it from the other side.** The map family's `legend` register rests partly on
the Guardian's `Multiple of £25,000 — 2 3 4 5 6 10+`, whose top class is open in exactly this way. A
chart family and a map family arriving at one convention independently is what an abstraction over
families is supposed to look like.

## What it replaces

A continuous value axis under a binned chart — `0 4 8 12 … 40` — which is the axis of the variable
rather than of the bars. It reads correctly and it answers a question the chart is not asking: a
histogram's bars are intervals, and a tick sitting under a boundary tells a reader where the
boundary is without telling them which bar owns it.

## What limits it

**Ten bins is comfortable; forty is not.** The labels are set in the `axis` register and a beat with
enough bins to crowd them has to drop to every other label or rotate, and this treatment says
nothing about which. The renderer's collision handling decides, as it does for any axis.

**And the open top is the beat's claim, not the renderer's.** The last bin is written as an
inequality only where the beat declares its tail unbounded. A closed final bin on data that really
does stop is correct, and Ferdio's specimen closing at `70-80` is the tell that it is a specimen — a
drawing has no living tail to account for.
