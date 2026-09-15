---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; the delivered page is drawn in
whichever direction governs it, never in this one.

## Three treatments, one ladder, and it is measured against the LAND

This page is not two states of one measure. It partitions **places by kind** — nuclear, hydro, and
wind-and-solar together — and the claim counts places by kind, so the three are three treatments
rather than three rungs of a ramp over a continuous quantity. The rare kind takes the direction's
accent, because that is what the argument is drawn in; the two common kinds are neutrals.

**Everything is measured against `plateLand`, the colour the page actually paints behind a dot** — a
step off the direction's ground toward its ink — and never against the paper. On this map the ground
a reader sees behind the field is the basemap, and the lightest neutral measured against the PAGE's
ground reads comfortably clear while being under the floor on the land it actually sits on.

**The two neutrals are a LADDER, and that is a defect this beat found by looking at its own render.**
Walked independently up to the same 3:1 floor against the same land, they came out adjacent by
construction: **1,211:1 on creme, 1,211:1 on rapport, 1,203:1 on nocturne** — two greys six per cent
apart, which is one treatment wearing two names. It is the same shape as "two colours pinned
independently to one floor come out identical" (1,023:1 and 1,000:1 elsewhere in this corpus). The
three treatments now step evenly in contrast against the land, between the lightest a reader can
still see and the accent itself — a geometric middle, monotone in lightness, so the order survives a
monochrome print and a colour-vision deficiency.

What the three directions deliver, measured on the colours the page really paints:

| direction | land | treatment 0 · 1 · 2 | vs land | step 0→1 | step 1→2 |
| --- | --- | --- | --- | ---: | ---: |
| creme | `#edeadd` | `#88867f` · `#706e68` · `#1755b2` | 3,02 / 4,23 / 5,85 | **1,399** | **1,383** |
| nocturne | `#222151` | `#6d6d8c` · `#9898ae` · `#53e1c1` | 3,00 / 5,30 / 9,19 | **1,764** | **1,736** |
| rapport | `#ededed` | `#888888` · `#6e6e6e` · `#1e5a88` | 3,03 / 4,36 / 6,24 | **1,438** | **1,433** |

Every treatment clears the non-text floor of 3:1 against the land, every neighbouring pair clears the
1,2:1 this beat asks of two kinds a reader has to tell apart across a field of thousands of one-pixel
dots, and on `nocturne` the ladder runs dark-to-light because the ground does — monotone, in one
direction, in every direction.

## What a pointed-at dot becomes, and what it may never be

A dose is **searched**, never set: walked off the dot's own colour until it stands 1,4:1 from the
colour it replaces AND still clears 3:1 against the land. Measured: 1,46 / 1,44 / 1,42 on creme,
1,43 / 1,41 / 1,44 on nocturne, 1,46 / 1,44 / 1,40 on rapport. A fixed dose was refused at 1,104:1 on
nocturne one beat over, and a `brightness()` filter lightens on a light ground and on a dark one
alike.

**And no dot changes SIZE under a pointer.** On a dot-density map the radius IS the dot value, so a
dot that grew to answer would be a dot that lied to answer — which is also why the 72 nuclear dots
are no longer drawn at twice the radius of the rest, as the SVG form of this beat drew them.

Nothing else on the page is chromatic. The study's own outline, the border of every other country,
the table's rules and the control's chrome are steps off the direction's ground computed by
`deriveFurniture` and by `control-chrome.ts` at render time, never written here as a literal.
