# a-sequential-grid-is-one-hue-cluster

- kind: imported
- name: A grid on a sequential ramp carries one hue cluster, tested by clustering rather than by eye
- applies: the beat draws twenty or more cells on a shared ramp
- draws: value
- priority: 8
- evidence: observablehq-com-observablehq-plot-seattle-temperature-heatmap
- evidence: ons-gov-uk-peoplepopulationandcommunity-birthsdeathsandmarriages-liveb
- detect: the delivered artifact's pixel palette reads `sequential` with a single hue cluster

## The rule

One hue. And the test is a measurement, not a look.

## The evidence, which is a measurement across the family

Observable's notebook draws this form with `turbo`, and **this base's own pixel route classified that
plate `categorical`, with four hue clusters** — where each of the four disciplined references in the
same family reads `sequential` with one. That record's own words: *"a ramp that a colour clustering
reads as four categories will read as four categories to a reader too."*

It is the strongest thing that record carries, and it is a refusal: no rainbow on this family, not as
taste but as a reading of the pixels.

## How to test a candidate ramp

`scripts/design-base/pixel-palette.mjs` on a render of it. The answer wanted is `shape: "sequential"`
with one cluster. A ramp built by stepping one hue between two poles of the direction's own palette
passes by construction, which is what `METHOD.md` correction 28 already asks for.
