# ribbons-are-translucent-so-crossings-are-honest

- kind: imported
- name: Flows are drawn at partial alpha, so a crossing reads as density rather than as draw order
- applies: the beat draws two or more flows between named nodes
- draws: value
- priority: 6
- evidence: iea-org-data-and-statistics-data-tools-energy-sankey
- evidence: interactive-carbonbrief-org-carbon-offsets-2023-companies-html
- detect: every flow in the delivered artifact carries a fill or stroke opacity below 1

## The rule

Draw the ribbons translucent. Where they cross, the crossing should darken.

## Why

The IEA draws at 0.6 and the record's own words are the argument: *"crossings resolve into visible
density instead of an arbitrary z-order, and the diagram stops depending on draw order to be true."*
Carbon Brief reaches the same place with translucent strokes — bundles darken, and nothing depends
on which link was drawn last.

An opaque ribbon set is a picture whose truth is a function of iteration order. That is a property
of the loop that drew it, not of the data.
