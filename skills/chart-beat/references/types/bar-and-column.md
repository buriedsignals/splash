# Bar and column

**Argues:** One value per category, encoded as the LENGTH of a rectangle from a shared baseline.

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

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the tallest bar, which here is also the subject — the one case `static-discipline.md`'s one-accent rule warns about
- **Then** the dashed rule drawn at the subject's own level, running across every other bar: the comparison the claim makes is DRAWN, so a reader who ignores the colour entirely still sees the argument
- **Then** the caption on that rule, carrying the computed sum, moved clear of the subject's own label
- **Subordinate** — every other bar muted, the zero baseline kept as the floor the lengths are measured from, and no value axis at all
- **The claim lands on** the rule against the muted bars — the arithmetic, not the colour

## A choreography must NOT
- accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- send the reader to a legend for a reading a direct label could carry at the mark itself
- give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- start the value axis anywhere but zero — non-negotiable for a length encoding
- print a value label INSIDE a coloured fill: outside the mark the only contrast that has to hold is ink against the ground
- add a gridline set beside ten printed numbers — the same decoding work done twice, which "every layer earns its place" removes

## Precision to assert
- the members and their order are computed by ranking the frozen file, with aggregate rows dropped and both counts printed
- "the next five" is a search whose stop is computed, not a phrase typed into a title
- the number format is chosen so no two ranks print the same figure in a chart whose whole job is a ranking

## Devices the worked example implements
- **The comparison drawn as a rule** — the argument survives a reader who cannot see the accent (`TopEmittersColumns.tsx`)
- **Aggregates dropped by code shape** — only bare ISO-3166 alpha-3 rows are kept, which is what stops "Asia" topping a chart of countries (`render.mjs`)
- **Category labels wrapped on MEASURED width, never rotated** — the wrap width is the band width, so a label cannot outgrow its column (`DirectedColumns.tsx`)

## Worked example

`proof/static-bar-top-emitters-2024` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedColumns.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type bar-and-column --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
