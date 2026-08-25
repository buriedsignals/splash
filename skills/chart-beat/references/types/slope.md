# Slope (slopegraph)

## What it is for

A slope chart answers "who moved, in which direction, and by how much, between exactly two moments"
— for many categories at once. Each category gets one line running from its value at period one to
its value at period two; the line's tilt IS the finding. It does a job a grouped bar chart at two
time points does badly: a slope chart lets a reader instantly single out the lines that buck the
overall trend, because a line tilting the wrong way against a field of lines tilting the same way is
one of the most immediately legible shapes in this whole family of charts.

## When NOT to use it, and what to use instead

Two points only. The moment there's a third time point per category, this is no longer a slope
chart — it's a line chart, and drawing three-or-more points as a "slope" either forces you to pick
just two of them (quietly discarding data) or draws two connected segments that isn't the shape this
type promises. If there are more than a handful of categories, the field of crossing lines gets busy
enough that individual slopes stop being legible — that's when a dumbbell (which drops the
connecting line's visual weight and can be sorted by gap size) or a small-multiples set of lines
reads better. And if the point is a single category's trajectory rather than a comparison across
many, this is just a two-point line — draw it as one.

## The one thing that goes wrong

A busy slope chart is genuinely unreadable without direct end labels, because unlike a bar chart's
shared baseline, there's no other way to know which line belongs to which category — and the moment
you have enough categories for a slope chart to be worth drawing, you also have enough lines that a
naive label placement collides. This isn't hypothetical: a fixed label gutter, sized for a typical
short category name, has previously forced the pipeline to truncate the actual category text to make
it fit — "Interm." standing in for "professions intermédiaires" — which is not a labelling
inconvenience, it's mutilating the data itself to solve a layout problem. The fix has to run the
other way: size the gutter to the label, wrapping it onto a second line if the widest label needs it,
and only shrink type as a last resort — the data is never allowed to be the thing that gives.

## What the drawing actually needs

Two vertical axes — one per period — with each category's two values plotted as points and joined by
a straight line between them. The value axis is position-encoded, the direct opposite of a bar's
length encoding, so it does NOT need to include zero; padding a slope chart's axis down to zero when
every value clusters in a narrow band buys nothing and just compresses the very slopes the chart
exists to show. Colour is deliberately restrained to at most two hues total: one neutral tone for the
ordinary context lines, and one accent reserved for whichever line the journalist actually wants the
reader to notice — a slope chart where every line is accented has no accent at all, and the one
signal that told the reader where to look is gone. Category labels sit in the side gutters at each
end and need vertical de-collision when lines land close together — spread them apart just enough to
stop overlapping, and if two labels still won't fit at full size shrink both together (never truncate)
before resorting to that. **Do not write that pass by hand: call `decollide` from
`render-still.mjs`**, the same module the measurer comes from. It is there because this paragraph
required a decision no skill offered, so the first beat that needed it wrote its own twice and
shipped two data-integrity bugs — a stack that inverted two regions' rank, and a delivered chart
that printed a value against the wrong row. `decollide` cannot do either: it returns rows in the
caller's own indexing, in its anchors' own order, so a chart with labels at BOTH ends calls it ONCE,
on the ranking it wants read down the page, and every gutter of row `i` takes `placed[i].y`. A label
it reports as `moved` owes the reader a leader line back to its own mark. `mislabelledRows`
(`detect-label-rows.mjs`) reads the delivered file and refuses a stack that broke either property.

Each period needs its own caption stating what it is (a year, a stage of a survey) — a slope chart with unlabelled ends is a chart of direction with no stated "from when to
when," which is half the claim.

## The accessibility trap

The value label at each line's end has the same "label carries the value, mark carries the hue"
discipline as every other chart in this family, and it's tempting to skip on a slope chart
specifically because there's already an accent colour doing visual work there — painting an accent
line's end-value label in that same accent hue is exactly the move that has previously failed WCAG
contrast in this codebase. Keep every value label in the page's neutral ink; let the line itself, not
its printed number, carry the accent.
