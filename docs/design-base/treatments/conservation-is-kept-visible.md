# conservation-is-kept-visible

- kind: imported
- name: A flow too small to draw is still drawn and still labelled, never dropped
- applies: the beat draws two or more flows between named nodes, at least one of them under 1 % of
  the total
- draws: value
- priority: 5
- evidence: iea-org-data-and-statistics-data-tools-energy-sankey
- evidence: interactive-carbonbrief-org-carbon-offsets-2023-companies-html
- detect: the number of flows drawn in the delivered artifact equals the number the beat's data
  carries, including those below a pixel

## The rule

Keep the hairline. Shrink the label if you must; never delete the flow.

## Why it is a claim rather than a nicety

Conservation is this form's promise — what goes into a node comes out of it — and a dropped flow
breaks that **invisibly**: the plate still looks balanced, the totals still line up to the eye, and
nothing tells the reader a term is missing. The IEA keeps its hairline flows and shrinks their label
instead of deleting them. Carbon Brief writes `< 0.001` rather than dropping a node.

## What it costs

Sub-pixel ribbons and labels that cannot be set at the plate's own type floor. The honest response
is to draw the ribbon at its minimum visible width and let the LABEL go, not the flow — the
arithmetic stays checkable through the node totals, which `every-node-carries-its-own-total` puts on
the plate.
