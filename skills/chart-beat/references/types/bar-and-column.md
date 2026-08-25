# Bar and column

## What it's for

One value per category, encoded as the LENGTH of a rectangle from a shared baseline. Length sits
near the top of what a reader can judge accurately, which makes this the safe default for two
questions a line or a scatter answer worse: "how big" and "what order." If the story is a ranking
or a straight side-by-side comparison of magnitudes, this is usually the right type before anything
fancier is.

## When not to reach for it

A real time series with many points and a trend to read between them is a line's job, not this
one's — past roughly eight periods, columns turn into a comb and the in-between shape of the change
is exactly what a bar can't show. Part-to-whole, where the pieces of a total matter as much as the
total itself, belongs to a stacked bar, or sparingly a pie — a flat bar per category can't carry
that relationship. And past roughly twenty to twenty-five categories, this becomes a comb no matter
how the story is framed; group the smallest into "Other," filter to what the headline is actually
about, or move to a dot plot or small multiples instead of shrinking every bar until none of them
is legible.

<!-- limit: periods > 8 -->

## Where it goes wrong

A truncated baseline. Bars encode value by length, so starting the value axis at 80 when every
reading runs 80–100 doesn't just crop the frame — it doubles the apparent gap between numbers that
are actually close, which is a false statement about the data dressed up as a stylistic choice.
This is non-negotiable, and it's worth naming the exact way it gets broken in practice: it's the
line chart's neighbouring rule — "fit the scale to the readings" — bleeding across into a bar chart
by habit, because a fitted scale looks like the more careful, more sophisticated choice. It isn't,
here. For a bar, the baseline is always zero; the line chart's honest-scale discipline belongs to
lines only. Order matters just as much and is easier to get wrong quietly: for a ranking, sort by
value; for a category with its own natural order (months, age bands), keep that order; leaving bars
in whatever sequence the source rows happened to arrive in is the default failure whenever the
headline is about magnitude, and it is worth checking deliberately rather than trusting whatever
order the data came in — a narrative or chronological order the story has already established
should never be silently overwritten by a default "sort by value" behaviour.

## What the drawing needs

Category maps to position along a band, with a consistent gap between bars — roughly a fifth to a
third of the band's width — so the bars read as discrete marks rather than a touching histogram.
Value maps to length from the zero baseline on the other axis. Every bar carries its own value,
printed directly outside the bar — above a column, to the right of a horizontal bar — so a short
bar's label is never clipped by the bar it belongs to. At most one bar is highlighted: the one the
headline is actually about, picked out by muting every OTHER bar to grey and leaving the subject in
the one accent colour that was already chosen for it — never swap in a second, brighter hue for the
highlight, and never highlight the tallest bar simply because it's tallest, which quietly lets the
data choose the story instead of the journalist. Long category names get a gutter sized to the
widest label actually present in the data, not a constant tuned against whatever sample rows were
on hand while building the chart — a fixed gutter is the reliable way to clip a real category name
down to an ellipsis the day the real dataset's names turn out longer than the ones it was built
against.

## The trap that's specific to this one

A value label printed inside or right up against a coloured bar needs real contrast against that
exact fill, and a naive rule — "below some luminance, use white text, otherwise dark" — gets it
wrong on mid-luminance hues. White text on a mid-toned green measures well under the 4.5:1 text
floor even though the same white reads fine on a darker or lighter fill; the dark ink option clears
the floor comfortably on that exact green. The only reliable fix is to measure both real contrast
ratios against the actual fill in front of you and use whichever one is higher — never a luminance
threshold standing in for a measurement.
