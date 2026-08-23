Opened `renders/honey-yield-2025-still.png` at real size (1920 x 1080, the landscape row of the
export table, rasterised 1:1) and looked at it. Approved.

What the picture actually says, judged against the beat's own brief:

- The takeaway is on the frame in three places that agree: the title states Mississippi's 89 pounds,
  the accent outline and the label put it on the map, and the accent caret sits at the top of the
  class bar. Nothing else on the map is in the accent (`geo-discipline.md` rule 8).
- The reference is a MARK, not a sentence. 48.0 pounds is the boundary between the third and fourth
  class, so "above the national average" is the right-hand half of the bar and a reader can count
  the states in it. Eight of the twenty.
- Twenty-nine states and the District of Columbia carry the no-data hatch, and the hatch is named in
  the legend in the beat's own language ("not reported separately"). That is over half the frame,
  and it is the second half of the argument rather than a hole in the first: USDA publishes twenty
  states and pools the rest.
- The class scale was verified against the pixels, not against the code that drew them: ten interior
  points were projected from the bake's own `frameCorners`, sampled out of the delivered PNG and
  compared with `binIndexLowerInclusive` over the publisher's own values. Ten of ten agree, hatched
  states included.
- The credit is the last line before the bottom margin and carries the basemap credit with it,
  unsplit.

Recorded rather than hidden, three things:

1. **The lowest class is close to the plate's own land.** `#3f3d34` against the basemap's `#292929`
   is 10.9 ΔE76. Seven states are in it, and what separates them from unpainted ground is the white
   coastline stroke rather than the fill. That stroke is asserted at render time (3.04:1 at its
   worst, against the top class) rather than eyeballed, and it is why the ramp ends at 0.68 of the
   way to the accent rather than the seed's 0.78.
2. **`geo-discipline.md` rule 7a cannot be satisfied by its first branch on this palette.** The
   nearest ramp class is 15.13 ΔE76 from the water tint against the 23.77 that branch demands, at
   every (FROM, TO) pair. The rule's own second branch is taken and measured. See
   NOTES-FOR-MAINTAINER.md.
3. **Mississippi is a small shape.** At this camera it is about 40 px wide. The outline and the
   direct label are what make it locatable; the fill alone would not be, and a reader takes the
   number from the label.
