# every-node-carries-its-own-total

- kind: imported
- name: Every node's label carries its own total, in one register, with no size hierarchy
- applies: the beat draws two or more flows between named nodes
- draws: annot, value
- priority: 8
- evidence: interactive-carbonbrief-org-carbon-offsets-2023-companies-html
- evidence: ec-europa-eu-eurostat-cache-sankey-energy-sankey-html
- evidence: flowcharts-llnl-gov
- detect: the delivered artifact carries a text run per node holding that node's name and its total,
  all of them set in one register

## The rule

Every node says how big it is, in words, in one register. The bar does the ranking.

## Three publications, three densities of the same idea

Carbon Brief puts the total in parentheses after the name — no legend, no axis, no size hierarchy
among nodes, and the reader can read any single value exactly. Eurostat sets name over value with
the unit, and repeats the unit on every label because the unit is a control the reader can change.
LLNL reverses name and total out of the node's own colour: identity, quantity and category in one
object.

## Why it is not optional on this form

A sankey has no axis. If the nodes do not carry their quantities, nothing on the plate can be read
exactly and the reader is left estimating areas — which is the one thing this form is worst at,
because a ribbon's apparent size depends on how it is bundled with its neighbours.
