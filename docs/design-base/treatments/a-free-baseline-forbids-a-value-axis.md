# a-free-baseline-forbids-a-value-axis

- kind: imported
- name: Where the stack does not sit on zero, the value is printed rather than scaled off an axis
- applies: the beat stacks two or more layers on a baseline that is not zero
- draws: value, axis
- priority: 8
- evidence: 100-datavizproject-com-data-type-viz42
- evidence: gds-odsss-github-io-unhcr-dataviz-platform-tools-d3-d3-streamgraph-htm
- detect: the delivered artifact draws no value axis, and prints the quantities it wants read

## The rule

A free baseline makes a y-axis a lie. Print the numbers instead.

## The two publications, and the counter-example that proves it

Ferdio: *"print the value at the ends, outside the stack, rather than drawing a value axis. A free
baseline makes a y-axis a lie; a written number is not."*

UNHCR's documentation plate keeps a value axis over a centred offset, and this base's record calls
that **the strongest thing the record carries**: it prints NEGATIVE labels for a quantity that cannot
be negative. The counter-example is the evidence.

## What replaces the axis

The value at the ends of the bands the beat is about (Ferdio), and **the total drawn once, plainly,
outside the coloured stacks** (UNHCR's explorer), so "how big is the whole thing" does not have to be
inferred from a silhouette. Vertical gridlines may stay: the horizontal axis still means something.
