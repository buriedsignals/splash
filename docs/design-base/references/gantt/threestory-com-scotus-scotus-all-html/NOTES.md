# Threestory Studio — all 116 justices, ranked by length of tenure

- url: https://threestory.com/scotus/scotus_all.html
- archive: url-list
- type: **ranked duration bars** — one row per justice, sorted longest first, the duration printed
  at the bar's end; a recency ramp and two overlay channels carry what the zero-anchored axis
  cannot. **Not a positioned-span gantt.**
- export: web (an inline `svg 640 × 1775` at `documentTop 565`, `nearTheTop`)
- readAs: the published page at 1440 × 900, no consent dialog and no entry screen. Both routes
  `ok`; the pixel route measured `graphic.png`.

## What it is

The companion to `threestory.com/scotus/` — **the same publication, the same subject, the other
question.** Where the seniority chart shows nine live spans in time, this one shows all 116
justices since 1789 as bars from zero, longest at the top: William Orville Douglas at 36 yrs 6 mon
down to John Rutledge at 0 yrs 4 mon.

## What it does with information

**The duration is printed at the end of every bar, in the unit it was measured in:
`34 YRS 10 MON`, `20 YRS 11 MON`, `0 YRS 5 MON`.** Not a decimal, not a day count — years and
months, small caps, right of the bar. Two things follow. The reader never has to interpolate against
a scale (and there is no numbered scale on this plate). And **the unit itself states that the length
is TIME**, which is the caption the type reference says is load-bearing, delivered 116 times instead
of once.

**Losing position in time is paid for with a ramp.** Sorting by length destroys chronology, so
recency is put back as lightness: the oldest justices are near-white, the most recent are dark grey,
and the eye can see that the very longest tenures are spread across the whole two centuries rather
than clustered in one era. `pixel.shape` reads **`sequential`** for this record and `ramped: 1` — a
correct machine reading of a chart whose principal palette is one ordered grey.

**Two categorical channels sit on top of the ramp without disturbing it.** `fill rgb(121, 157, 203)`
× 10 — the ten current justices, the only colour on a plate of 116 bars; and
`stroke rgb(0, 0, 0)` × 17 — the chief justices, outlined, keeping their ramp value. **Colour for
"now", outline for "role", lightness for "when", length for "how long"**: four readings on one bar,
and only one of them costs a hue.

**A name that appears twice appears twice.** `Charles Evans Hughes`, `Edward Douglass White`,
`William H. Rehnquist`, `John Rutledge`, `Harlan Fiske Stone` each have two rows, because each
served two separate terms — as associate and then as chief. The chart does not merge them into one
longer bar, which would be a different and false claim, and it does not annotate the repetition
either.

**The name is right-aligned into the axis and the bar grows away from it**, so 116 labels form a
single clean edge and the ragged edge is the data.

## What it does with style

Measured on the 1 136 000-px clip. Ground `#FFFFFF` at **76.787 %**. One chromatic of any weight:
`#799DCB` at **1.180 %** — the current justices — with `#AAC1DE` and `#7DA0CC` at **0.001 %** each
as its anti-aliasing. **One hue cluster in the whole record**, 214° at **1.182 %**, `size: 3`.

Everything else is the ramp, and it reads as neutral: `#DBDCDD` **1.382 %**, `#9B9C9D` **1.368 %**,
`#333333` **1.307 %**, `#828383` **1.279 %**, `#CACCCD` **1.086 %**, `#929495` **1.080 %**,
`#B2B3B4` **0.973 %**, `#AAACAC` **0.933 %**, `#8B8D8D` **0.903 %**. Nine grey values, all within
0.5 percentage points of each other by area — **an evenly spaced ramp, evenly used**, which is what
a ramp encoding a uniform century-by-century spread should measure like.

**Type** (`style.type`; the graphic is an inline `svg`, so this list is the chart's own document):
`ff-nuvo-sc-web-pro-1` 12.3 / **300** × **245**, in `rgb(90, 91, 93)` — a small-caps face at light
weight carrying all 116 names and all 116 durations, and it is the only text tuple in the plate
apart from the legend's `ff-nuvo-sc-web-pro-1 12.3 / 700` (sample: `Blue`). **One face, one size,
two weights, 245 strings.** The small-caps face is why `34 YRS 10 MON` sits quietly beside a proper
name without either shouting. The page's own furniture — proxima-nova at 17.6 / 14.7 / 13.8 / 12.5,
Josefin Sans 35.2 for the title, on a `rgb(72, 73, 75)` site ground — is separate from it.

## What is transferable

- **Print the duration in years and months at the bar's end.** The unit is the axis caption, and it
  is repeated on every row where it cannot be missed.
- **When you sort by length you lose time; buy it back with a lightness ramp.**
- **Stack the channels by cost**: length for the quantity, lightness for the ordered dimension,
  outline for a binary role, one hue for "current". Only the last is expensive and only one
  category gets it.
- **A repeated subject gets a repeated row.** Never merge two separate spans into one bar.
- **Right-align the name into the axis** so 116 labels make one edge and the data makes the other.
- **A small-caps face at light weight** lets a name and a measurement share a line at one size.

## What was not verified

**This is not a gantt** — the axis is time-from-zero, not a date scale — and no positioned-span
treatment may cite it. It is filed for the labelling, the ramp and the channel stacking.

**It is the same publication as `threestory-com-scotus`**, one studio, one designer, one dataset. The
two records must never be counted as two publications; where both are cited below or in the
proposal, they are cited as one.

The ramp's exact mapping ("shaded by date of oath", per the page's own caption text, which the style
route captured as `Shaded by date of oath. are active.` with the linked words stripped) was read
from that caption, not verified against the data. The count of 17 black strokes exceeds the number
of chief justices in the period, so at least some strokes belong to something else — the legend
swatches, most likely — and I did not establish which. Threestory Studio is a **design studio, not
a newsroom**; it is a publication for the purpose of the evidence floor, and it is not a desk.
