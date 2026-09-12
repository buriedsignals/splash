# the-ramp-is-monotone-in-lightness

- kind: imported
- name: A grid's ramp gets lighter or darker all the way, so ranking cells by darkness ranks them right
- applies: the beat draws twenty or more cells on a shared ramp
- draws: value
- priority: 9
- evidence: informationisbeautiful-net-visualizations-most-common-pin-codes
- evidence: projects-propublica-org-graphics-workers-comp-reform-by-state
- detect: sampling the delivered key from end to end gives a lightness sequence that never turns back

## The rule

A heatmap asks the reader to rank cells by how dark they are. A ramp that turns back on itself makes
that reading wrong — not harder, wrong.

## The counter-example, which the corpus holds on purpose

`100.datavizproject.com`'s viz49 runs white → pale blue → blue → **navy** → dark red → red. The navy
near the middle is darker than the red at the top, so Denmark's `10` reads as a heavier cell than
Sweden's `15`, and 15 is the larger number. That record's own words: *"a reader ranking cells by
darkness ranks them wrongly … this is the family's central failure and the corpus should hold an
example of it."*

## The two disciplined records, which run in opposite directions

Information is Beautiful's pin-code poster is on a **black** ground and puts its loud end at
**white** — sampled along the legend at y = 325: `#FFFFFF` → `#FFF394` → `#FBE184` → `#F5CE72` →
`#E9A951` → `#DB8136` → `#CF581F` → `#C94317` → `#9D7152` → `#434342` → `#242423`. Lightness falls
the whole way.

ProPublica's is diverging and monotone **within each arm**, out from a pale-yellow middle.

So the rule is not "dark means more". It is that the ramp never reverses. A ramp stepped between two
poles of the direction's own palette satisfies it by construction, which is what `METHOD.md`
correction 28 already asks for on other grounds.

## Its relation to the neighbouring rule

`a-sequential-grid-is-one-hue-cluster` says the ramp must read as ONE hue. This one says it must
read as one DIRECTION. A ramp can pass either and fail the other: viz49's is arguably two hues and
is certainly not monotone.
