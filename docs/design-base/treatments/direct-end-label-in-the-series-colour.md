# direct-end-label-in-the-series-colour

- name: Every series is named at its own end, in its own colour
- applies: the beat draws one or more named series whose ends are separable at the delivered size
- draws: value
- priority: 7
- evidence: ourworldindata-org-grapher-co-emissions-per-capita
- evidence: 100-datavizproject-com-data-type-viz1
- detect: every named series in the delivered artifact has a text run within one line-height of its
  own last point, whose fill matches that series' stroke's ink role; and the artifact carries no
  detached legend

## The rule

Name each series where it ends, set in that series' own colour, and ship no legend.

## Why it is more than a nicety

`doctrine/references/visual-system.md` already holds it — *"a legend forces the reader to look away
from the evidence, hold a colour in memory, then look back — three steps a direct label collapses
into one glance"* — and allows a legend only where direct labelling would collide, "documented as a
last resort, not the default starting point."

What the evidence adds is **where the collision threshold actually is**. The usual objection is that
past three or four series direct labelling stops working. Our World in Data does it at **nine**, on
one axis, from 1750 to 2024, with no legend anywhere on the chart.

## Where it was seen

Our World in Data's per-capita CO₂ chart labels United States, Canada, China, South Africa, the
European Union, the World, the United Kingdom, India and Kenya at their own line ends, each in its
line's hue. Ferdio's `viz1` does the same for three countries at the right edge of their stacked
segments, each name in its segment's own colour.

## What limits it

Series whose ends converge cannot each hold a label, and the arbiter must drop or displace rather
than overlap. The label's ink is **not** inherited from the stroke: `visual-system.md`'s
second-measurement rule applies — a hue that is a legitimate mark can fail text contrast as a label
on the same canvas, and the ink escalates to whichever pole reads against what the label sits on.
