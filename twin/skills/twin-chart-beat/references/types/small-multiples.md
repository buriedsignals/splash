# Small multiples

Small multiples isn't a chart type — it's a layout decision: instead of forcing every group into
one crowded chart, repeat the same small chart once per category, panel after panel, all built
the same way. It answers a question that a single crowded chart structurally can't: "how does the
same pattern vary across many groups," where the *comparison across panels* is the point, and
the repetition itself is what lets a reader's eye do that comparison — because every panel speaks
the same visual language, the only thing that differs from one to the next is the data, and
differences jump out precisely because everything else holds still.

Faceting earns its place exactly at the point where a single chart has started fighting itself —
too many bars in a group, too many overlapping lines, too many series wearing too many colours
for a legend to stay legible. As a rough feel for where that point sits: a grouped bar comparing
more than about three series per category starts reading as a picket fence, not a comparison; a
stack past about five series becomes an unreadable ribbon; a bar chart past twenty-some categories
becomes a comb nobody can parse one tooth at a time. Any of those is the moment to stop trying to
cram more into one frame and split into a grid instead.

Do not reach for it just because there happen to be multiple series. A time trend with several
lines — say, three countries' GDP over forty years — usually reads *better* overlaid in one
frame with each line direct-labelled at its end than split into three separate small panels; the
whole value of overlaying a trend is letting the reader compare slopes and crossings directly,
in the same visual field, which faceting would tear apart into three frames the eye has to hold
in memory and compare across. Small multiples is for when the count or the density of things
being compared has actually made a single frame illegible — it's not the default move whenever
more than one of something shows up. Reaching for it reflexively, on data that would have been
fine overlaid, is itself a documented mistake: a genuinely single-trend, multi-series time chart
got mis-turned into a per-period panel grid once, and the fix was recognizing that a shared-axis
overlay was the right read the whole time, not a symptom of needing to facet.

The one thing that goes wrong: letting each panel scale itself independently to its own data. It
feels natural — every panel "fits" its own range — and it is the single fastest way to make the
whole exercise pointless, because the entire premise of faceting is that panels are directly
comparable, and a panel with a narrow real range stretched to fill the same box as a panel with a
huge real range will *look* just as dramatic as it, for no reason connected to the actual
numbers. A small country's modest year-over-year wobble gets blown up to the same visual
amplitude as a large country's genuine boom-bust cycle, and a reader walks away with exactly the
wrong impression, confidently.

What has to stay identical across every panel, non-negotiably: the scale — same domain, same
axis, same units, on every single panel, full stop, even if that means some panels look nearly
flat and others look dramatic, because that flatness or drama *is* the finding. Panel size,
aspect ratio, and the position of the axis inside the panel stay identical too, so panels are
visually swappable except for the data itself; and if colour is used at all, the same category or
role maps to the same colour in every panel, not re-picked per facet. Order the panels
meaningfully — by the value the story cares about, geographically, or in a natural sequence —
rather than alphabetically by default, which buries the comparison the grid exists to enable.

There's no WCAG-specific trap unique to faceting, but there's a real repetition trap that behaves
like one: printing the full axis title, the unit, and the source line on every single panel in a
grid of a dozen is not reinforcement, it's redundant decoding work repeated a dozen times over —
put the shared axis label and unit once, at the level of the whole grid, and let each panel carry
only its own category name. A reader who has already read "GDP growth, %" on panel one shouldn't
have to re-verify it eleven more times to reach the panel that actually matters to them.
