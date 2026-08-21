---
ground: "#FFFFFF"
accent: "#5B8A8A"
origin: newsroom
---

# The palette for THIS beat, and why it is not the story's

The story's own `PALETTE.md` records the house pair: `#D4A853` on `#16191B`, 8.01:1. That record is
correct and stays. This beat cannot honour it, and the reason is the producer, not the story.

Datawrapper renders server-side on its own surface. `ChartSpec` (`dw-beat/scripts/validate-spec.mjs`)
requires an accent and has no field for a ground, so this producer never asks for one and never
can. The first production run reached `assertExportedSurface`
(`dw-beat/scripts/verify-owned.mjs`) and refused, correctly:

> the delegated export came back on the opposite side from the ground this story declared: ground
> #16191B (luminance 0.009), export luminance 0.991.

Two ways out, and only two: publish this beat on the light surface Datawrapper actually paints, or
drop the delegated producer and build the scatter as a custom component. The journalist asked for
Datawrapper by name and needs the chart in the CMS tonight, so this beat records the surface it
really lands on — white — with the house colours re-measured against it.

**The primary house accent does not survive that move.** `#D4A853` on `#FFFFFF` measures 2.20:1,
under the 3:1 non-text floor (WCAG 2.2 SC 1.4.11) — `assertLegible` refuses it and offers `#b28d46`
at 3.09:1 as the nearest passing variant. `#b28d46` is not a house colour. The newsroom's SECOND
recorded accent, `#5B8A8A`, is, and it measures 3.86:1 on white — a genuine house colour, with more
margin than the derived one. That is what this beat records.

What this record does NOT fix: the chart still lands light in a dark column if the newsroom's page
is the dark surface `NEWSROOM.md` declares. The guard is green here because the ground was recorded
against the artefact rather than against the page, which is the only reading available to a
producer that cannot send a background. A desk that needs a dark chart needs the custom producer.
