---
size: landscape
type: line
---

# Beat — Life expectancy in Switzerland rose 15 years since 1950

**Type:** line. **Medium/genre:** chart / static. **Size:** landscape (1920 x 1080).

The size is in the front matter above as well as in that sentence, and the front matter is the one
that counts: `render.mjs` reads it with `readPinnedSize`. The `900 x 560` frame this beat used to
state in prose is gone — it was a third statement of a size nothing downstream read, beside the
component's own `const FRAME` and the two literals in the render script.

## Claim

Life expectancy in Switzerland rose by 15.0 years between 1950 and 2023, from 68.9 to 84.0,
crossing 80 in 2001. Every number in that sentence is computed by `render.mjs` from the frozen CSV
itself, not asserted from the brief's own approximation — the delta and the crossing year both
came out slightly different from the task's ballpark ("about 15 years", "early 2000s") and the
wording follows what the data actually says.

## Subject and accent

One series, one accent: `#0B7A75` (this codebase's house teal), reserved for the line and its 2023
end-point — the only coloured mark on the frame. No legend; the series is named where it ends,
directly at the last point, per `references/types/line.md`'s "direct end-label" rule. The y-axis
is fitted to the readings' own extent (`scaleLinear().domain(extent(readings)).nice()`) and starts
well above zero — a line encodes the 15-year climb by slope, and anchoring 69-84 at a zero floor
would put four-fifths of the frame under the actual readings.

## Source

UN, World Population Prospects (2024), via Our World in Data ·
`https://ourworldindata.org/grapher/life-expectancy.csv?country=~CHE&csvType=filtered` ·
Switzerland, 1950–2023, extracted 8 August 2026.

## What went wrong, caught by looking

Nothing in the render itself — the axis was fitted (not zero-anchored), the end label
("Switzerland 84.0 (2023)") sat clear of the frame edge, the title/source read correctly, and
neither the two COVID-era dips (2020, 2022) nor the tick labels overlapped anything. The one thing
`references/types/line.md` did catch before any drawing happened: its "Where it goes wrong"
section names zero-anchoring a line's y-axis as the specific, opposite-of-bars mistake this type
invites — worth naming explicitly because the sibling proof beat this one's file layout follows
(`static-swiss-age-pyramid`) is a *magnitude* type that correctly zero-anchors its own mirrored
scale, so copying that beat's scale logic by habit, instead of reading the line type's own sheet
first, is exactly the kind of cross-type mistake the doctrine's per-type reference files exist to
prevent.

## The three export sizes — one ships, two are refused, and the refusal is measured

Rendered at all three and opened. **Landscape 1920x1080 is what this beat delivers.** Portrait and
square are refused by `assertPlotAspect`, which is the guard for a type with no twin form:

| size | plot | aspect | verdict |
|---|---|---|---|
| landscape | 1232 x 634 | 1.94:1 | ships (`formForSize` answers `as-is` — landscape is the frame this corpus was designed at, and is not clamped) |
| square | 722 x 120 | **6.02:1** | refused, outside `line`'s measured 0.7–3.6 |
| portrait | 722 x 163 | **4.43:1** | refused, outside `line`'s measured 0.7–3.6 |

**A line's argument is its slope, so an aspect nobody chose is a slope nobody chose** — and at 6:1
the 15-year climb this beat exists to show reads as a shallow drift. Nothing is clipped and nothing
collides in either refused render; that is exactly the defect no counter in this project can see.

**What binds is the TITLE, and the ladder has no rung for it.** The claim sentence is 111 characters:
2 lines at landscape's 53 px, **5 lines at 72 px** on a 936 px column, which is 432 px of a 979 px
band. The plot needs 401 px of height to come inside 1.8:1 and it has 163. R2 is already applied
(five value ticks become three on a phone) and it is the only rung this beat has: there is no axis
title (R1), no standfirst (R3, R7) and no annotation (R4). R8 would mean thinning 74 annual
readings, which is the shape itself. So **R9** — and shortening the claim is the journalist's
decision, not one the producer takes silently.

**One real fix the tall frames forced, and it improved the beat at every size.** The direct end
label — `Switzerland 84.0 (2023)`, which `line.md` asks for instead of a legend — used to reserve a
right gutter unconditionally. That is 170 px at 900 px wide (19 % of the frame) and **520 px at a
phone's type scale, 48 % of a 1080 px frame**: the line would have been drawn in the strip that was
left. The label is now placed rather than fixed (`endLabelPlacement`) — it keeps the gutter while
that costs under a quarter of the frame's width, and above that it sits over the last point,
right-aligned to the plot's own edge. Still direct, never a legend. Without it the portrait plot
was 200 px wide instead of 722.

## The finding this beat raised, and how it was settled

`MEASURED_ASPECT.line` used to record **0.8–1.8**, taken from the portrait probe's three-point
derivation. This beat's ACCEPTED landscape render measures **1.94:1** — outside its own type's
recorded range, passing only because `formForSize` exempts landscape — and that was reported here
as a finding for the table's owner rather than worked around.

**Settled 2026-08-11 by re-measuring** (`proof/aspect-range-probe/ASPECT-VERDICT.md` §6). The range
is now **0.7–3.6**, swept rather than derived from three accepted frames, with both bounds bracketed
by arms that were opened: 0.5:1 breaks (62° end to end — a steady climb read as a cliff) and 0.7:1
reads; 3.6:1 reads (the 2020 dip small and still present) and 4.5:1 breaks (the dip gone). 1.94:1
now sits comfortably inside it. **This beat's two refusals are unchanged** — 6.02:1 and 4.43:1 are
outside the new ceiling too — so it still ships landscape only, and for the reason the section above
gives: the title, which the ladder has no rung for.

The one thing the wider range does NOT buy, recorded because a wider bound invites the assumption:
it does not make a narrow plot safe. The same probe showed a two-series line failing at 0.83:1 and
at 1.5:1 alike once its plot is 370px wide — the defect travels with the plot's WIDTH against the
ink drawn in it, and `assertPlotAspect` is blind to it by construction.
