# Pictogram (isotype)

## What it is for

A pictogram states a magnitude as a countable row of equal-size icons, where ONE icon always stands for
a stated number of units and count — never icon size — carries the value. That's a narrower, more
honest promise than a bar chart's length encoding: a bar requires reading an axis to recover a number,
where a pictogram's count can, in principle, be verified by a reader literally counting the icons on
the page. It is the type for when the concreteness of "this many actual things" serves the story better
than an abstract length would — a count of people, incidents, units — and specifically not a good fit
once the count runs long enough that counting icons stops being faster than reading a bar's length.

## When NOT to use it, and what to use instead

If the value doesn't resolve to a reasonably short row of icons at a sensible unit-per-icon, this type
stops delivering its one advantage — a hundred rows of tiny icons is harder to read than the bar chart
it's standing in for, not easier; pick a coarser unit-per-icon or switch to a bar chart once the count
gets long. And if the story's value is continuous rather than a genuine count of discrete things — a
rate, a percentage, a measurement with no natural "unit" to draw one icon per — forcing it through a
pictogram invents a countability the data doesn't have; a bar or gauge states a continuous value more
honestly.

## The one thing that goes wrong

The unit each icon stands for has to be stated to the reader explicitly — "each icon = 1,000 people" —
or the count is uninterpretable no matter how carefully the icons themselves are drawn; an undeclared
unit is the single most common way this type fails to communicate anything at all. The other real risk
sits in how a fractional remainder is handled: a value that resolves to, say, 2.2 icons needs that
partial 0.2 rendered as a genuinely partial icon — clipped at the right fraction of the glyph's own
visible ink, not the icon's whole bounding box, which has a margin before the glyph itself starts
drawing. Clip at the wrong reference point and a small-enough remainder disappears from the page
entirely, silently rounding a real fraction down to nothing with no visual trace that anything was
dropped.

## What the drawing actually needs

Icons are all rendered at one shared size across the entire chart — never scaled per-value, since size
is explicitly not the encoding here, count is — chosen so the longest row in the dataset still fits the
available width with a consistent gap between icons. The unit-per-icon should round to a clean,
memorable number (1, 2, 5, and their powers of ten are the readable choices) rather than an arbitrary
value that makes mental arithmetic hard, and it should be picked to keep the longest row at a length a
reader can actually count at a glance, not so fine that even the biggest category sprawls into dozens
of icons. A value small enough that it would round to zero icons under the chosen unit needs either a
finer unit or an explicit "fewer than one icon's worth" note — it must never simply vanish from the
chart as if the category had no data at all.

## The accessibility trap

Icon colour needs the same real, measured CVD-safe contrast check as every mark in this set — nothing
exempts a pictogram's glyphs from that discipline just because the shape itself (rather than colour) is
carrying the count. But the sharper, type-specific trap is the fractional-icon clipping failure
described above: a chart that silently drops a small remainder below some threshold is not a design
nuance, it's a correctness failure indistinguishable, on the page, from data simply being missing —
verify by eye that every row's rendered icon count, including its partial icon, actually reflects the
value behind it before treating a pictogram as ready to publish.
